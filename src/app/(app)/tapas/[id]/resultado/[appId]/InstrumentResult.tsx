import Link from "next/link";
import { PageHeader } from "@/components/ui";
import PerfilResultView, { PERFIL_ENTREVISTA_PREGUNTAS } from "@/components/tapas/PerfilResultView";
import ExperimentoResultView from "@/components/tapas/ExperimentoResultView";
import {
  TAPAS_INSTRUMENTS,
  TAPAS_NIVELES,
  isTapasInstrument,
  isTapasNivel,
} from "@/lib/tapas/niveles";
import { experimentoProgress, sanitizeExperimento, type PerfilResult } from "@/lib/tapas/instruments";
import type { TapasApplicationRow, TapasSessionRow } from "@/lib/types";

/** Resultado en pantalla de Perfil de talentos (1 y 2) y del Experimento de talento. */
export default function InstrumentResult({ s, app }: { s: TapasSessionRow; app: TapasApplicationRow }) {
  const instrument = isTapasInstrument(app.instrument) ? app.instrument : "ARQUETIPOS";
  const nivel = isTapasNivel(s.nivel) ? s.nivel : "BACHILLERATO";
  const info = TAPAS_INSTRUMENTS[instrument];

  let body: React.ReactNode = null;
  if (instrument === "EXPERIMENTO") {
    let raw: unknown = {};
    try {
      raw = app.data_json ? JSON.parse(app.data_json) : {};
    } catch {
      raw = {};
    }
    const data = sanitizeExperimento(raw);
    body = <ExperimentoResultView data={data} sesion2Completa={experimentoProgress(data, nivel).sesion2Complete && app.status === "FINALIZADA"} />;
  } else {
    let result: PerfilResult | null = null;
    try {
      result = app.result_json ? (JSON.parse(app.result_json) as PerfilResult) : null;
    } catch {
      result = null;
    }
    body = result ? (
      <>
        <PerfilResultView result={result} />
        <div className="card p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">Preguntas para la entrevista de orientación</h3>
          <p className="text-[11px] text-slate-400 mb-2">Del Manual TaPas, pp. 22-23.</p>
          <ul className="list-disc pl-5 space-y-1 text-sm text-slate-700">
            {PERFIL_ENTREVISTA_PREGUNTAS.map((q) => <li key={q}>{q}</li>)}
          </ul>
        </div>
      </>
    ) : (
      <p className="text-sm text-slate-500">Todavía no hay resultados.</p>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${info.emoji} ${app.student_name}`}
        description={`${info.label} · Nivel ${TAPAS_NIVELES[nivel].label} · ${s.title} · ${[app.course_snapshot, app.parallel_snapshot].filter(Boolean).join(" ")}`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/tapas/${s.id}`} className="btn-secondary text-xs">← Volver</Link>
            <Link href={`/tapas/${s.id}/informe/${app.id}`} className="btn-secondary text-xs">📄 Informe individual</Link>
            {app.student_id ? (
              <Link href={`/ovp/consolidado/${app.student_id}`} className="btn-primary text-xs flex items-center gap-1 font-bold bg-indigo-600 hover:bg-indigo-700 text-white">
                <span>🧠</span> Informe Consolidado
              </Link>
            ) : null}
          </div>
        }
      />
      {body}
    </div>
  );
}
