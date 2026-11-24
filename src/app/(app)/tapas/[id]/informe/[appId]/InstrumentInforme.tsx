import Link from "next/link";
import PrintButton from "@/components/PrintButton";
import DocumentHeader from "@/components/DocumentHeader";
import PerfilResultView, { PERFIL_ENTREVISTA_PREGUNTAS } from "@/components/tapas/PerfilResultView";
import ExperimentoResultView from "@/components/tapas/ExperimentoResultView";
import { TAPAS_SOURCE } from "@/lib/tapas/archetypes";
import { TAPAS_INSTRUMENTS, TAPAS_NIVELES, isTapasInstrument, isTapasNivel, type TapasInstrument, type TapasNivel } from "@/lib/tapas/niveles";
import { experimentoProgress, sanitizeExperimento, type PerfilResult } from "@/lib/tapas/instruments";
import type { InstitutionRow, TapasApplicationRow, TapasSessionRow } from "@/lib/types";

/** Recomendaciones del manual según el nivel y la herramienta (pp. 23, 27 y 47). */
export function recomendaciones(nivel: TapasNivel, instrument: TapasInstrument): string[] {
  if (nivel === "INICIAL") {
    return [
      "Conversar con la niña o el niño sobre lo que más le gusta hacer y reconocerlo como una fortaleza, sin etiquetarlo de forma fija.",
      "Ofrecer en el aula y en casa oportunidades para que practique y disfrute aquello que le gusta (juego, arte, movimiento, cuidado de otros).",
      "Compartir el resultado con la familia como una mirada de talentos y pasiones, no como una evaluación.",
    ];
  }
  if (nivel === "BASICA") {
    return [
      "Conversar con la o el estudiante sobre lo que hace bien y lo que disfruta, y reconocer que los talentos cambian y crecen con la práctica.",
      instrument === "EXPERIMENTO"
        ? "Acordar con la o el estudiante un nuevo experimento de talento sobre uno de los desafíos que identificó."
        : "Elegir con la o el estudiante el talento por el que siente más pasión y proponerle un experimento de talento para explorarlo.",
      "Informar a la familia y al docente tutor para que puedan apoyar el desarrollo de esos talentos.",
    ];
  }
  return [
    "Conectar el perfil con la perspectiva a largo plazo del estudiante: identificar con él o ella entre 5 y 10 áreas de estudio o campos profesionales relacionados con sus talentos preferidos y elegir los 3 más atractivos.",
    "Motivar conversaciones con personas que se dediquen a esos campos o la búsqueda de biografías y videos sobre su quehacer profesional; considerar la oferta educativa cercana, los costos y las becas disponibles.",
    instrument === "EXPERIMENTO"
      ? "El nuevo perfil de talentos es la base para nuevos experimentos: todas las personas pueden seguir descubriendo y desarrollando sus talentos, incluso si el experimento no tuvo los resultados esperados."
      : "Para el desarrollo de talentos, marcar el talento por el que más pasión siente y aplicar el Experimento de talento, definiendo un criterio claro para evaluar su éxito.",
    "Este resultado aporta a la dimensión de autoconocimiento del Proyecto de Vida.",
  ];
}

/** Informe individual imprimible de Perfil de talentos (1 y 2) y del Experimento de talento. */
export default function InstrumentInforme({
  s,
  app,
  institution,
}: {
  s: TapasSessionRow;
  app: TapasApplicationRow;
  institution: InstitutionRow;
}) {
  const instrument = isTapasInstrument(app.instrument) ? app.instrument : "ARQUETIPOS";
  const nivel = isTapasNivel(s.nivel) ? s.nivel : "BACHILLERATO";
  const info = TAPAS_INSTRUMENTS[instrument];
  const p = "text-[10.5pt] text-justify leading-snug mb-1.5";
  const h = "text-[#17365D] font-bold text-[12pt] mt-4 mb-1";

  let sections: React.ReactNode = null;
  let questions: string[] = [];
  if (instrument === "EXPERIMENTO") {
    let raw: unknown = {};
    try {
      raw = app.data_json ? JSON.parse(app.data_json) : {};
    } catch {
      raw = {};
    }
    const data = sanitizeExperimento(raw);
    sections = (
      <ExperimentoResultView
        data={data}
        print
        headingClass="text-[10.5pt] font-bold text-slate-900"
        textClass="text-[10pt]"
        sesion2Completa={experimentoProgress(data, nivel).sesion2Complete && app.status === "FINALIZADA"}
      />
    );
  } else {
    let result: PerfilResult | null = null;
    try {
      result = app.result_json ? (JSON.parse(app.result_json) as PerfilResult) : null;
    } catch {
      result = null;
    }
    if (result) {
      sections = <PerfilResultView result={result} print headingClass="text-[10.5pt] font-bold text-slate-900" textClass="text-[10pt]" />;
      questions = PERFIL_ENTREVISTA_PREGUNTAS;
    }
  }

  return (
    <div className="max-w-3xl mx-auto bg-white">
      <div className="no-print p-3 bg-slate-100 border-b flex items-center justify-between mb-4 rounded-lg">
        <Link href={`/tapas/${s.id}/resultado/${app.id}`} className="text-xs text-slate-600 font-semibold">← Volver</Link>
        <div className="flex items-center gap-2">
          {app.student_id ? (
            <Link href={`/ovp/consolidado/${app.student_id}`} className="text-xs bg-indigo-50 border border-indigo-200 text-indigo-800 px-3 py-1.5 rounded font-semibold hover:bg-indigo-100 flex items-center gap-1">
              <span>🧠</span> Consolidado
            </Link>
          ) : null}
          <PrintButton hideWordButton />
        </div>
      </div>

      <div id="printable-content" className="p-6 print:p-0 font-serif text-black">
        <style>{`@media print { @page { size: A4; margin: 1.6cm; } }`}</style>
        <DocumentHeader
          docKind="ovp"
          title={info.reportTitle}
          subtitle="Orientación Vocacional y Profesional — Departamento de Consejería Estudiantil"
          institutionName={institution.name}
          sealImage={institution.seal_image}
          compact
        />

        <h2 className={h}>1. Datos del estudiante</h2>
        <p className={p}>
          <strong>Nombre:</strong> {app.student_name} &nbsp;·&nbsp;
          <strong>Curso:</strong> {[app.course_snapshot, app.parallel_snapshot].filter(Boolean).join(" ") || "—"} &nbsp;·&nbsp;
          <strong>Nivel:</strong> {TAPAS_NIVELES[nivel].label} &nbsp;·&nbsp;
          <strong>Fecha:</strong> {(app.finished_at || app.updated_at || "").slice(0, 10)}
        </p>
        <p className={p}>
          <strong>Herramienta:</strong> {info.label} (Manual de uso de las herramientas TaPas, {info.manualPages}).
        </p>

        <h2 className={h}>2. Resultados</h2>
        {sections || <p className={p}>Todavía no hay resultados.</p>}

        {questions.length > 0 && (
          <>
            <h2 className={h}>3. Preguntas para la entrevista de orientación</h2>
            <ul className="list-disc pl-5 text-[10.5pt] leading-snug space-y-1">
              {questions.map((q) => <li key={q}>{q}</li>)}
            </ul>
          </>
        )}

        <h2 className={h}>{questions.length > 0 ? "4." : "3."} Recomendaciones para el acompañamiento</h2>
        <ul className="list-disc pl-5 text-[10.5pt] leading-snug space-y-1">
          {recomendaciones(nivel, instrument).map((r) => <li key={r}>{r}</li>)}
        </ul>

        <p className="text-[8pt] text-slate-400 mt-6">Fuente: {TAPAS_SOURCE}</p>
      </div>
    </div>
  );
}
