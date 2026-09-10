import { notFound } from "next/navigation";
import Link from "next/link";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import { ARCHETYPE_MAP, TAPAS_FAMILIES, type TapasFamily } from "@/lib/tapas/archetypes";
import { TAPAS_INTERPRETATION, type TapasResult } from "@/lib/tapas/tapasScoring";
import { getDeckKeySet } from "@/lib/tapas/cardDeck";
import type { TapasSessionRow, TapasApplicationRow } from "@/lib/types";
import TapasAreasHelper from "./TapasAreasHelper";

export default async function TapasResultPage({ params }: { params: { id: string; appId: string } }) {
  const session = await requireRole(["ADMIN", "DECE", "AUTORIDAD"]);
  const institutionId = requireInstitutionId(session);

  const s = db
    .prepare("SELECT * FROM tapas_sessions WHERE id = ? AND institution_id = ?")
    .get(params.id, institutionId) as TapasSessionRow | undefined;
  const app = db
    .prepare("SELECT * FROM tapas_applications WHERE id = ? AND session_id = ? AND institution_id = ?")
    .get(params.appId, params.id, institutionId) as TapasApplicationRow | undefined;
  if (!s || !app || !app.result_json) notFound();

  const r = JSON.parse(app.result_json) as TapasResult;
  const maxFam = Math.max(1, ...r.familias.map((f) => f.count));
  const deckKeys = getDeckKeySet(institutionId);
  const cardUrl = (k: string) => (deckKeys.has(k) ? `/api/tapas/deck-admin/${k}` : null);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Perfil de talentos — ${app.student_name}`}
        description={`${s.title} · ${[app.course_snapshot, app.parallel_snapshot].filter(Boolean).join(" ")}`}
        action={
          <div className="flex items-center gap-2">
            <Link href={`/tapas/${s.id}`} className="btn-secondary text-xs">← Volver</Link>
            <a href={`/tapas/${s.id}/informe/${app.id}`} className="btn-primary text-xs">📄 Informe</a>
          </div>
        }
      />

      <div className="card p-5">
        <h3 className="text-sm font-semibold text-slate-700 mb-1">Grupos de talentos (del más fuerte al más débil)</h3>
        <p className="text-[11px] text-slate-400 mb-3">{TAPAS_INTERPRETATION.grupos}</p>
        <ol className="space-y-3">
          {r.groups.map((g, i) => (
            <li key={i} className="border border-slate-200 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="w-6 h-6 rounded-full bg-brand-600 text-white text-xs font-bold flex items-center justify-center">
                  {i + 1}
                </span>
                <span className="text-sm font-semibold text-slate-900">{g.name || "(sin nombre)"}</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {g.archetypes.map((k) => {
                  const a = ARCHETYPE_MAP[k];
                  if (!a) return null;
                  const url = cardUrl(k);
                  return url ? (
                    <span key={k} className="w-16 text-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt={a.name} className="w-full aspect-[62/88] object-contain rounded border border-slate-200" />
                      <span className="block text-[9px] text-slate-500 leading-tight truncate">{a.name}</span>
                    </span>
                  ) : (
                    <span
                      key={k}
                      className="text-[11px] px-2 py-0.5 rounded-full border h-fit"
                      style={{ borderColor: TAPAS_FAMILIES[a.familia].color, color: TAPAS_FAMILIES[a.familia].color }}
                    >
                      {a.emoji} {a.name}
                    </span>
                  );
                })}
              </div>
            </li>
          ))}
        </ol>
      </div>

      <div className="card p-5">
        <h3 className="text-sm font-semibold text-slate-700 mb-1">Familias de talento</h3>
        <p className="text-[11px] text-slate-400 mb-3">{TAPAS_INTERPRETATION.familias}</p>
        <div className="space-y-2">
          {r.familias.map((f) => (
            <div key={f.familia} className="flex items-center gap-3 text-xs">
              <span className="w-48 font-medium text-slate-700">
                {TAPAS_FAMILIES[f.familia as TapasFamily].emoji} {f.label}
              </span>
              <div className="flex-1 bg-slate-100 rounded h-5 overflow-hidden">
                <div className="h-full" style={{ width: `${(f.count / maxFam) * 100}%`, backgroundColor: f.color }} />
              </div>
              <span className="w-24 text-right text-slate-500">{f.count} · {f.pct}%</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-500 mt-2">
          Se identifica con <strong>{r.identifiedCount}</strong> arquetipos ({r.dudaCount} con dudas · {r.noCount} descartados).
        </p>
      </div>

      <TapasAreasHelper groups={r.groups} />

      {(app.reflection || app.future_letter) && (
        <div className="card p-5 space-y-3">
          {app.reflection && (
            <div>
              <h4 className="text-xs font-semibold text-slate-500 uppercase mb-1">Reflexión del estudiante</h4>
              <p className="text-sm text-slate-800 whitespace-pre-wrap">{app.reflection}</p>
            </div>
          )}
          {app.future_letter && (
            <div>
              <h4 className="text-xs font-semibold text-slate-500 uppercase mb-1">Carta a su yo del futuro</h4>
              <p className="text-sm text-slate-800 whitespace-pre-wrap">{app.future_letter}</p>
            </div>
          )}
        </div>
      )}

      <div className="card p-5">
        <h3 className="text-sm font-semibold text-slate-700 mb-2">Clasificación completa de arquetipos</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          {(["SI", "DUDA", "NO"] as const).map((choice) => {
            const cls = JSON.parse(app.classification_json || "{}") as Record<string, string>;
            const items = Object.entries(cls)
              .filter(([, v]) => v === choice)
              .map(([k]) => ARCHETYPE_MAP[k]?.name)
              .filter(Boolean);
            const title = choice === "SI" ? "😊 Me identifico" : choice === "DUDA" ? "🤔 Tengo dudas" : "😐 No me identifico";
            return (
              <div key={choice}>
                <p className="font-semibold text-slate-600 mb-1">{title} ({items.length})</p>
                <ul className="text-slate-500 space-y-0.5">
                  {items.map((n, i) => <li key={i}>{n}</li>)}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
