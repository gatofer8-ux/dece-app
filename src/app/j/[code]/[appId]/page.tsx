import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getTapasSessionByCode, isTapasSessionOpen } from "@/lib/tapas/tapasSessions";
import { resolveDeckUrls } from "@/lib/tapas/cardDeck";
import { isTapasInstrument, isTapasNivel, type TapasNivel } from "@/lib/tapas/niveles";
import { sanitizeExperimento, sanitizePerfilData, topFrequencies, type PerfilResult } from "@/lib/tapas/instruments";
import { isHojaOpen, isMultiHoja, parsePlan } from "@/lib/tapas/plan";
import type { TapasApplicationRow } from "@/lib/types";
import TapasGame from "./TapasGame";
import PerfilGame from "./PerfilGame";
import ExperimentoGame from "./ExperimentoGame";

export const metadata = { title: "TaPas — Talentos y Pasiones" };

/** Talentos que la persona ya descubrió en otras herramientas TaPas, para ayudarla en el experimento. */
function priorTalents(institutionId: string, studentId: string | null, studentName: string): string[] {
  const rows = db
    .prepare(
      `SELECT instrument, result_json FROM tapas_applications
       WHERE institution_id = ? AND status = 'FINALIZADA' AND result_json IS NOT NULL
         AND (student_id = ? OR (student_id IS NULL AND student_name = ?))
       ORDER BY finished_at DESC LIMIT 6`
    )
    .all(institutionId, studentId, studentName) as { instrument: string; result_json: string }[];
  const out: string[] = [];
  for (const r of rows) {
    try {
      const parsed = JSON.parse(r.result_json);
      if (r.instrument === "ARQUETIPOS") for (const g of parsed.groups || []) out.push(String(g.name || ""));
      else if (Array.isArray((parsed as PerfilResult).strengths)) out.push(...(parsed as PerfilResult).strengths);
    } catch {
      /* noop */
    }
  }
  return topFrequencies(out.filter(Boolean), 10).map((f) => f.text);
}

function NotAvailable({ text, href }: { text: string; href?: string }) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3 p-4">
      <p className="text-slate-600 text-sm text-center">{text}</p>
      {href && (
        <a href={href} className="text-sm font-semibold text-emerald-700 underline">
          ← Volver a mis hojas
        </a>
      )}
    </div>
  );
}

export default function TapasGamePage({ params }: { params: { code: string; appId: string } }) {
  const s = getTapasSessionByCode(params.code);
  if (!s) notFound();
  const app = db
    .prepare("SELECT * FROM tapas_applications WHERE id = ? AND session_id = ?")
    .get(params.appId, s.id) as TapasApplicationRow | undefined;
  if (!app) notFound();

  if (app.status === "FINALIZADA") redirect(`/j/${params.code}/${params.appId}/gracias`);
  if (!isTapasSessionOpen(s)) return <NotAvailable text="Este juego está cerrado. Consulta con el DECE." />;

  const instrument = isTapasInstrument(app.instrument) ? app.instrument : "ARQUETIPOS";
  const plan = parsePlan(s);
  const hubHref = app.participant_id ? `/j/${params.code}/h/${app.participant_id}` : undefined;
  if (isMultiHoja(plan) && !isHojaOpen(plan, instrument)) {
    return <NotAvailable text="Esta hoja todavía no está habilitada. Espera a que el DECE la abra en tu hora de clase." href={hubHref} />;
  }
  const nivel: TapasNivel = isTapasNivel(s.nivel) ? s.nivel : "BACHILLERATO";

  let saved: unknown = null;
  try {
    saved = app.data_json ? JSON.parse(app.data_json) : null;
  } catch {
    saved = null;
  }

  if (instrument === "PERFIL_V1" || instrument === "PERFIL_V2") {
    const version = instrument === "PERFIL_V1" ? 1 : 2;
    return (
      <PerfilGame
        code={params.code}
        appId={params.appId}
        studentName={app.student_name}
        version={version}
        nivel={nivel}
        initialData={saved ? sanitizePerfilData(saved, version) : null}
        hubHref={hubHref}
      />
    );
  }

  if (instrument === "EXPERIMENTO") {
    return (
      <ExperimentoGame
        code={params.code}
        appId={params.appId}
        studentName={app.student_name}
        nivel={nivel}
        initialData={saved ? sanitizeExperimento(saved) : null}
        suggestions={priorTalents(s.institution_id, app.student_id, app.student_name)}
        hubHref={hubHref}
      />
    );
  }

  let classification: Record<string, "SI" | "DUDA" | "NO"> = {};
  let groups: { id: string; name: string; archetypes: string[] }[] = [];
  try {
    classification = JSON.parse(app.classification_json || "{}");
  } catch {
    classification = {};
  }
  try {
    const raw = JSON.parse(app.groups_json || "[]");
    groups = Array.isArray(raw)
      ? raw.map((g: { name?: string; archetypes?: string[] }, i: number) => ({
          id: `g${i + 1}`,
          name: g.name || "",
          archetypes: Array.isArray(g.archetypes) ? g.archetypes : [],
        }))
      : [];
  } catch {
    groups = [];
  }

  const deck = resolveDeckUrls(s.institution_id, (key) => `/api/tapas/deck/${params.code}/${key}`);

  return (
    <TapasGame
      code={params.code}
      appId={params.appId}
      studentName={app.student_name}
      nivel={nivel}
      initialClassification={classification}
      initialGroups={groups}
      initialReflection={app.reflection || ""}
      initialLetter={app.future_letter || ""}
      deck={deck}
      hubHref={hubHref}
    />
  );
}
