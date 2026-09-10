import { notFound } from "next/navigation";
import Link from "next/link";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import { IPPJ_SCALE_META, IPPJ_SURVEY_QUESTIONS } from "@/lib/ovp/ippjInstrument";
import { IPPJ_INTERPRETATION_NOTES, type IppjScoreResult } from "@/lib/ovp/ippjScoring";
import { suggestedAreasFor } from "@/lib/ovp/ippjCareers";
import type { OvpSessionRow, OvpApplicationRow } from "@/lib/types";

function levelColor(level: string) {
  return level === "Alta" ? "bg-emerald-500" : level === "Media" ? "bg-amber-400" : "bg-slate-300";
}

export default async function OvpResultPage({ params }: { params: { id: string; appId: string } }) {
  const session = await requireRole(["ADMIN", "DECE", "AUTORIDAD"]);
  const institutionId = requireInstitutionId(session);

  const s = db
    .prepare("SELECT * FROM ovp_sessions WHERE id = ? AND institution_id = ?")
    .get(params.id, institutionId) as OvpSessionRow | undefined;
  const app = db
    .prepare("SELECT * FROM ovp_applications WHERE id = ? AND session_id = ? AND institution_id = ?")
    .get(params.appId, params.id, institutionId) as OvpApplicationRow | undefined;
  if (!s || !app || !app.result_json) notFound();

  const r = JSON.parse(app.result_json) as IppjScoreResult;
  const survey = JSON.parse(app.survey_json || "{}") as Record<string, unknown>;
  const areas = suggestedAreasFor(r.topTypes);
  const maxSten = 10;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Perfil vocacional — ${app.student_name}`}
        description={`${s.title} · ${[app.course_snapshot, app.parallel_snapshot].filter(Boolean).join(" ")} · Género aplicado al baremo: ${r.gender}`}
        action={
          <div className="flex items-center gap-2">
            <Link href={`/ovp/${s.id}`} className="btn-secondary text-xs">← Volver</Link>
            <a href={`/ovp/${s.id}/informe/${app.id}`} className="btn-primary text-xs">📄 Informe</a>
          </div>
        }
      />

      <div className="card p-5">
        <h3 className="text-sm font-semibold text-slate-700 mb-1">Tipo vocacional (código Holland)</h3>
        <p className="text-3xl font-black tracking-widest text-brand-700">{r.hollandCode}</p>
        <p className="text-sm text-slate-600 mt-1">
          {r.topTypes.map((t) => IPPJ_SCALE_META[t].label).join(" · ")}
        </p>
        <p className="text-xs text-slate-500 mt-2">{IPPJ_SCALE_META[r.topTypes[0]].description}</p>
      </div>

      <div className="card p-5">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Puntajes por tipo (STEN 1–10)</h3>
        <div className="space-y-2">
          {r.ranked.map((sc) => (
            <div key={sc.scale} className="flex items-center gap-3 text-xs">
              <span className="w-32 font-medium text-slate-700">
                {IPPJ_SCALE_META[sc.scale].letter} · {IPPJ_SCALE_META[sc.scale].label}
              </span>
              <div className="flex-1 bg-slate-100 rounded h-5 overflow-hidden">
                <div className={`${levelColor(sc.level)} h-full`} style={{ width: `${(sc.sten / maxSten) * 100}%` }} />
              </div>
              <span className="w-24 text-right text-slate-500">
                STEN {sc.sten} · <span className="font-semibold">{sc.level}</span>
              </span>
              <span className="w-14 text-right text-slate-400">bruto {sc.raw}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-4">
          <div className="text-xs text-slate-500 mb-1">Intensidad</div>
          <div className="text-lg font-bold text-slate-800">{r.intensidad.level}</div>
          <div className="text-xs text-slate-400">STEN {r.intensidad.sten} · bruto {r.intensidad.raw}/300</div>
          <p className="text-[11px] text-slate-500 mt-2">{IPPJ_INTERPRETATION_NOTES.intensidad}</p>
        </div>
        <div className="card p-4">
          <div className="text-xs text-slate-500 mb-1">Consistencia</div>
          <div className="text-lg font-bold text-slate-800">{r.consistencia.overall}</div>
          <p className="text-[11px] text-slate-500 mt-2">{IPPJ_INTERPRETATION_NOTES.consistencia}</p>
        </div>
        <div className="card p-4">
          <div className="text-xs text-slate-500 mb-1">Diferenciación</div>
          <div className="text-lg font-bold text-slate-800">{r.diferenciacion.nivel}</div>
          <div className="text-xs text-slate-400">amplitud {r.diferenciacion.spread} STEN</div>
          <p className="text-[11px] text-slate-500 mt-2">{IPPJ_INTERPRETATION_NOTES.diferenciacion}</p>
        </div>
      </div>

      <div className="card p-5">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Áreas y campos ocupacionales sugeridos</h3>
        <div className="space-y-3">
          {areas.map(({ fromType, area }) => (
            <div key={area.area} className="border border-slate-200 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-brand-50 text-brand-700">
                  {IPPJ_SCALE_META[fromType].letter}
                </span>
                <span className="text-sm font-semibold text-slate-800">{area.area}</span>
              </div>
              <p className="text-xs text-slate-600">{area.ejemplos.join(" · ")}</p>
              <p className="text-[11px] text-slate-400 mt-1">Ruta: {area.bachillerato}</p>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-slate-400 mt-3">
          Sugerencias generales. La entrevista de orientación debe contrastarlas con la oferta educativa cercana, los costos y las becas disponibles para el estudiante.
        </p>
      </div>

      <div className="card p-5">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Encuesta previa del estudiante</h3>
        <dl className="space-y-3">
          {IPPJ_SURVEY_QUESTIONS.map((q) => {
            const val = survey[q.key];
            let display: string;
            if (Array.isArray(val)) display = val.filter(Boolean).join(" · ") || "—";
            else display = String(val ?? "").trim() || "—";
            return (
              <div key={q.key}>
                <dt className="text-xs font-medium text-slate-500">{q.text}</dt>
                <dd className="text-sm text-slate-800">{display}</dd>
              </div>
            );
          })}
        </dl>
      </div>

      <div className="card p-5">
        <h3 className="text-sm font-semibold text-slate-700 mb-2">Consistencia por pares del hexágono</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
          {r.consistencia.pairs.map((p, i) => (
            <div key={i} className="flex justify-between border-b border-slate-100 py-1">
              <span className="text-slate-600">
                {IPPJ_SCALE_META[p.pair[0]].label} – {IPPJ_SCALE_META[p.pair[1]].label}
              </span>
              <span className="font-semibold text-slate-700">{p.nivel} (Δ{p.deltaSten})</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
