import { notFound } from "next/navigation";
import Link from "next/link";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { db } from "@/lib/db";
import PrintButton from "@/components/PrintButton";
import DocumentHeader from "@/components/DocumentHeader";
import { TAPAS_FAMILIES, TAPAS_SOURCE, type TapasFamily } from "@/lib/tapas/archetypes";
import {
  TAPAS_INSTRUMENTS,
  TAPAS_NIVELES,
  archetypesForNivel,
  isTapasNivel,
  type TapasInstrument,
  type TapasNivel,
} from "@/lib/tapas/niveles";
import { aggregateArquetipos, type TapasResult } from "@/lib/tapas/tapasScoring";
import {
  QUADRANTS,
  QUADRANT_ORDER,
  PROFILE_SET_LABELS,
  EXPERIMENTO_OBJETIVOS,
  aggregateExperimento,
  aggregatePerfil,
  experimentoProgress,
  sanitizeExperimento,
  type ExperimentoData,
  type PerfilResult,
  type ProfileSet,
} from "@/lib/tapas/instruments";
import { getTapasSessionRoster } from "@/lib/tapas/tapasSessions";
import { recomendacionesGrupales } from "@/lib/tapas/groupReport";
import { isMultiHoja, parsePlan } from "@/lib/tapas/plan";
import type { InstitutionRow, TapasApplicationRow, TapasSessionRow } from "@/lib/types";

export const metadata = { title: "Informe colectivo — TaPas" };

const p = "text-[10.5pt] text-justify leading-snug mb-1.5";
const h = "text-[#17365D] font-bold text-[12pt] mt-4 mb-1";
const h3 = "text-[#2E74B5] font-bold text-[11pt] mt-3 mb-1";
const th = "border border-slate-500 px-2 py-1 bg-slate-100 text-left";
const td = "border border-slate-500 px-2 py-1";

function parse<T>(raw: string | null | undefined, fallback: T): T {
  try {
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

const isStarted = (a: TapasApplicationRow) =>
  a.status === "FINALIZADA" || !!a.data_json || (a.instrument === "ARQUETIPOS" && !!a.classification_json && a.classification_json !== "{}");

interface Follow {
  name: string;
  hoja: TapasInstrument;
  reason: string;
}

/** Resultados del grupo en una hoja + estudiantes a quienes conviene dar seguimiento. */
function hojaSection(instrument: TapasInstrument, apps: TapasApplicationRow[], nivel: TapasNivel): { node: React.ReactNode; follow: Follow[] } {
  const cfg = TAPAS_NIVELES[nivel];
  const finalized = apps.filter((a) => a.status === "FINALIZADA");
  const follow: Follow[] = [];
  const list = (items: { text: string; count: number }[]) =>
    items.length ? <p className="text-[10pt]">{items.map((f) => `${f.text} (${f.count})`).join("; ")}.</p> : <p className="text-[10pt] text-slate-400">Sin datos.</p>;

  if (instrument === "ARQUETIPOS") {
    if (!finalized.length) return { node: <p className={p}>Todavía no hay juegos finalizados.</p>, follow };
    const results = finalized.map((a) => ({ a, r: parse<TapasResult | null>(a.result_json, null) })).filter((x) => x.r);
    const agg = aggregateArquetipos(results.map((x) => x.r!));
    const total = archetypesForNivel(nivel).length;
    for (const { a, r } of results) {
      if (r!.identifiedCount < cfg.minIdentified + 2) follow.push({ name: a.student_name, hoja: instrument, reason: `Se identificó con pocas tarjetas (${r!.identifiedCount} de ${total}).` });
    }
    return {
      follow,
      node: (
        <>
          <p className={p}>
            {agg.respondents} estudiantes finalizaron. En promedio se identificaron con <strong>{agg.avgIdentified}</strong> de {total} tarjetas.
          </p>
          <table className="w-full border-collapse text-[10pt]">
            <thead><tr><th className={th}>Familia de talento</th><th className={`${th} w-20`}>Tarjetas</th><th className={`${th} w-16`}>%</th><th className={`${th} w-28`}>Estudiantes (dominante)</th></tr></thead>
            <tbody>
              {agg.familias.map((f) => (
                <tr key={f.familia}>
                  <td className={td}>{TAPAS_FAMILIES[f.familia as TapasFamily].label}</td>
                  <td className={`${td} text-center`}>{f.count}</td>
                  <td className={`${td} text-center`}>{f.pct}%</td>
                  <td className={`${td} text-center`}>{agg.dominantStudents[f.familia] || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-[10pt] font-semibold mt-3 mb-1">Arquetipos con los que más se identifica el grupo</p>
          <ol className="list-decimal pl-5 text-[10pt]">{agg.topArchetypes.map((t) => <li key={t.key}>{t.name} — {t.count} estudiante(s)</li>)}</ol>
          {agg.topVerbs.length > 0 && (
            <p className={`${p} mt-3`}>
              <strong>{nivel === "INICIAL" ? "Tarjetas favoritas más elegidas:" : "Verbos más usados al nombrar los grupos de talentos:"}</strong>{" "}
              {agg.topVerbs.map((v) => `${v.text} (${v.count})`).join(", ")}.
            </p>
          )}
        </>
      ),
    };
  }

  if (instrument === "PERFIL_V1" || instrument === "PERFIL_V2") {
    if (!finalized.length) return { node: <p className={p}>Todavía no hay perfiles finalizados.</p>, follow };
    const version = instrument === "PERFIL_V1" ? 1 : 2;
    const results = finalized.map((a) => ({ a, r: parse<PerfilResult | null>(a.result_json, null) })).filter((x) => x.r);
    const agg = aggregatePerfil(results.map((x) => x.r!), version);
    for (const { a, r } of results) {
      if (r!.strengths.length === 0) follow.push({ name: a.student_name, hoja: instrument, reason: "No ubicó nada en «lo hago bien y me gusta»: explorar sus intereses en entrevista." });
    }
    const sets = (version === 1 ? ["own", "other"] : ["studies", "free"]) as ProfileSet[];
    return {
      follow,
      node: (
        <>
          <p className={p}>
            {agg.respondents} estudiantes finalizaron; <strong>{agg.withStrengths}</strong> ({agg.respondents ? Math.round((agg.withStrengths / agg.respondents) * 100) : 0}%) identificó al menos un talento con pasión.
            {agg.coincidenceRate !== null && ` En el ${agg.coincidenceRate}% coincidió al menos una característica entre lo que dice la persona y lo que ve otra.`}
          </p>
          <table className="w-full border-collapse text-[10pt]">
            <thead>
              <tr><th className={th}>Plano</th>{QUADRANT_ORDER.map((q) => <th key={q} className={`${th} text-center`}>{QUADRANTS[q].signs} {QUADRANTS[q].label}</th>)}</tr>
            </thead>
            <tbody>
              {sets.map((set) => (
                <tr key={set}>
                  <td className={td}>{PROFILE_SET_LABELS[set]}</td>
                  {QUADRANT_ORDER.map((q) => <td key={q} className={`${td} text-center`}>{agg.quadrants[set]?.[q] ?? 0}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-[10pt] font-semibold mt-3 mb-1">Talentos con pasión más frecuentes (+ +)</p>
          {list(agg.strengths)}
          <p className="text-[10pt] font-semibold mt-2 mb-1">Pasiones por desarrollar (− +)</p>
          {list(agg.toDevelop)}
          <p className="text-[10pt] font-semibold mt-2 mb-1">Habilidades sin pasión (+ −)</p>
          {list(agg.skillsWithoutPassion)}
        </>
      ),
    };
  }

  // EXPERIMENTO: cuenta también a quienes van en la sesión 1
  const rows = apps
    .map((a) => ({ a, d: a.data_json ? sanitizeExperimento(parse<unknown>(a.data_json, {})) : null }))
    .filter((x): x is { a: TapasApplicationRow; d: ExperimentoData } => !!x.d);
  if (!rows.length) return { node: <p className={p}>Todavía nadie empezó el experimento.</p>, follow };
  const agg = aggregateExperimento(rows.map((x) => x.d), nivel);
  for (const { a, d } of rows) {
    const pr = experimentoProgress(d, nivel);
    if (pr.sesion1Complete && a.status !== "FINALIZADA") follow.push({ name: a.student_name, hoja: instrument, reason: "Planificó su experimento pero no ha enviado la sesión 2 (evaluación)." });
  }
  return {
    follow,
    node: (
      <>
        <p className={p}>
          {agg.total} estudiantes empezaron: <strong>{agg.sesion1Completa}</strong> completaron la sesión 1 (planificar) y{" "}
          <strong>{rows.filter((x) => x.a.status === "FINALIZADA").length}</strong> la sesión 2 (evaluar). Promedio de anotaciones en el registro de la semana: {agg.promedioDiario}.
        </p>
        <p className="text-[10pt] font-semibold mt-2 mb-1">Talentos que eligieron para experimentar</p>
        {list(agg.talentos)}
        <p className="text-[10pt] font-semibold mt-2 mb-1">Objetivos del experimento</p>
        <ul className="list-disc pl-5 text-[10pt]">
          {(Object.keys(EXPERIMENTO_OBJETIVOS) as (keyof typeof agg.objetivos)[]).map((o) => <li key={o}>{EXPERIMENTO_OBJETIVOS[o].label}: {agg.objetivos[o]}</li>)}
        </ul>
        <p className="text-[10pt] font-semibold mt-2 mb-1">Desafíos más frecuentes</p>
        {list(agg.desafios)}
        {agg.aprendizajes.length > 0 && (
          <>
            <p className="text-[10pt] font-semibold mt-2 mb-1">Aprendizajes que compartieron (muestra)</p>
            <ul className="list-disc pl-5 text-[10pt]">{agg.aprendizajes.map((x, i) => <li key={i}>{x}</li>)}</ul>
          </>
        )}
      </>
    ),
  };
}

export default async function TapasInformeColectivoPage({ params }: { params: { id: string } }) {
  const session = await requireRole(["ADMIN", "DECE", "AUTORIDAD"]);
  const institutionId = requireInstitutionId(session);

  const s = db
    .prepare("SELECT * FROM tapas_sessions WHERE id = ? AND institution_id = ?")
    .get(params.id, institutionId) as TapasSessionRow | undefined;
  if (!s) notFound();
  const institution = db.prepare("SELECT * FROM institutions WHERE id = ?").get(institutionId) as InstitutionRow;
  const apps = db
    .prepare("SELECT * FROM tapas_applications WHERE session_id = ? ORDER BY student_name")
    .all(s.id) as TapasApplicationRow[];

  const plan = parsePlan(s);
  const multi = isMultiHoja(plan);
  const nivel = isTapasNivel(s.nivel) ? s.nivel : "BACHILLERATO";
  const cfg = TAPAS_NIVELES[nivel];
  const roster = getTapasSessionRoster(s);

  // Participación por hoja (en una aplicación simple, la única hoja)
  const perHoja = plan.instruments.map((i) => {
    const rows = apps.filter((a) => (multi ? a.instrument === i : true));
    const finalized = rows.filter((a) => a.status === "FINALIZADA");
    const started = rows.filter(isStarted);
    return { instrument: i, rows, finalized: finalized.length, inProgress: started.length - finalized.length };
  });

  // Personas: en un proceso, una por participant_id; en una hoja, una por fila.
  const people = new Map<string, TapasApplicationRow[]>();
  for (const a of apps) {
    const key = a.participant_id || a.id;
    people.set(key, [...(people.get(key) || []), a]);
  }
  const completedAll = [...people.values()].filter((rows) => plan.instruments.every((i) => rows.some((r) => (multi ? r.instrument === i : true) && r.status === "FINALIZADA"))).length;
  const startedStudentIds = new Set(apps.filter(isStarted).map((a) => a.student_id).filter(Boolean));
  const notStarted = roster.filter((r) => !startedStudentIds.has(r.id));
  const completedIds = new Set(
    [...people.values()]
      .filter((rows) => plan.instruments.every((i) => rows.some((r) => (multi ? r.instrument === i : true) && r.status === "FINALIZADA")))
      .map((rows) => rows[0].student_id)
      .filter(Boolean)
  );
  const pending = roster.filter((r) => !completedIds.has(r.id));
  const participation = roster.length ? Math.round((completedAll / roster.length) * 100) : null;

  const sections = plan.instruments.map((i) => ({ instrument: i, ...hojaSection(i, multi ? apps.filter((a) => a.instrument === i) : apps, nivel) }));
  const follow = sections.flatMap((x) => x.follow);
  const recs = Array.from(new Set(plan.instruments.flatMap((i) => recomendacionesGrupales(i, nivel, { participation }))));

  const title = multi ? "Informe Colectivo del Proceso TaPas" : "Informe Colectivo TaPas";
  const subtitle = multi
    ? `Proceso de ${plan.instruments.length} hojas — Nivel ${cfg.label} — Departamento de Consejería Estudiantil`
    : `${TAPAS_INSTRUMENTS[plan.instruments[0]].label} — Nivel ${cfg.label} — Departamento de Consejería Estudiantil`;

  return (
    <div className="max-w-3xl mx-auto bg-white">
      <div className="no-print p-3 bg-slate-100 border-b flex items-center justify-between mb-4 rounded-lg">
        <Link href={`/tapas/${s.id}`} className="text-xs text-slate-600 font-semibold">← Volver</Link>
        <PrintButton hideWordButton />
      </div>

      <div id="printable-content" className="p-6 print:p-0 font-serif text-black">
        <style>{`@media print { @page { size: A4; margin: 1.6cm; } }`}</style>
        <DocumentHeader docKind="ovp" title={title} subtitle={subtitle} institutionName={institution.name} sealImage={institution.seal_image} compact />

        <h2 className={h}>1. Datos de la aplicación</h2>
        <table className="w-full border-collapse text-[10pt]">
          <tbody>
            <tr><td className={`${td} w-40 font-semibold`}>Referencia</td><td className={td}>{s.title}</td></tr>
            <tr>
              <td className={`${td} font-semibold`}>{multi ? "Hojas" : "Herramienta"}</td>
              <td className={td}>{plan.instruments.map((i) => `${TAPAS_INSTRUMENTS[i].label} (manual ${TAPAS_INSTRUMENTS[i].manualPages})`).join("; ")}</td>
            </tr>
            {multi && (
              <tr>
                <td className={`${td} font-semibold`}>Modalidad</td>
                <td className={td}>{plan.modo === "VARIAS" ? `En varias horas de clase (${plan.minutosHora} min)` : "En una sola sesión"}</td>
              </tr>
            )}
            <tr><td className={`${td} font-semibold`}>Nivel</td><td className={td}>{cfg.label} — {cfg.cursos} ({cfg.edades})</td></tr>
            <tr><td className={`${td} font-semibold`}>Grupo</td><td className={td}>{[s.course, s.parallel && `"${s.parallel}"`, s.jornada].filter(Boolean).join(" ") || "Sin curso definido"}</td></tr>
            <tr><td className={`${td} font-semibold`}>Aplicación</td><td className={td}>Creada el {s.created_at.slice(0, 10)} · Estado: {s.status === "ABIERTA" ? "abierta" : "cerrada"}</td></tr>
          </tbody>
        </table>

        <h2 className={h}>2. Participación</h2>
        <table className="w-full border-collapse text-[10pt]">
          <thead>
            <tr><th className={th}>{multi ? "Hoja" : "Herramienta"}</th><th className={`${th} w-24 text-center`}>Finalizaron</th><th className={`${th} w-24 text-center`}>En progreso</th></tr>
          </thead>
          <tbody>
            {perHoja.map((x) => (
              <tr key={x.instrument}>
                <td className={td}>{TAPAS_INSTRUMENTS[x.instrument].emoji} {TAPAS_INSTRUMENTS[x.instrument].label}</td>
                <td className={`${td} text-center`}>{x.finalized}</td>
                <td className={`${td} text-center`}>{x.inProgress}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-[10pt] mt-1">
          Estudiantes en la lista: {roster.length || "— (sin lista de curso)"} · {multi ? "Completaron todo el proceso" : "Finalizaron"}: <strong>{completedAll}</strong>
          {participation !== null ? ` (${participation}%)` : ""} · Sin iniciar: {roster.length ? notStarted.length : "—"}.
        </p>
        {roster.length > 0 && pending.length > 0 && (
          <p className="text-[9.5pt] text-slate-600 mt-1">
            <strong>{multi ? "Aún no completan el proceso" : "Pendientes"}:</strong> {pending.map((r) => r.full_name).join("; ")}.
          </p>
        )}

        <h2 className={h}>3. Resultados del grupo</h2>
        {sections.map((x, idx) => (
          <div key={x.instrument}>
            {multi && (
              <p className={h3}>
                3.{idx + 1}. {TAPAS_INSTRUMENTS[x.instrument].emoji} {TAPAS_INSTRUMENTS[x.instrument].label}
              </p>
            )}
            {x.node}
          </div>
        ))}

        {follow.length > 0 && (
          <>
            <h2 className={h}>4. Estudiantes para seguimiento individual</h2>
            <table className="w-full border-collapse text-[10pt]">
              <thead><tr><th className={th}>Estudiante</th>{multi && <th className={th}>Hoja</th>}<th className={th}>Motivo</th></tr></thead>
              <tbody>
                {follow.map((f, i) => (
                  <tr key={i}>
                    <td className={td}>{f.name}</td>
                    {multi && <td className={td}>{TAPAS_INSTRUMENTS[f.hoja].label.split(":")[0]}</td>}
                    <td className={td}>{f.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        <h2 className={h}>{follow.length > 0 ? "5." : "4."} Recomendaciones para el trabajo con el grupo</h2>
        <ul className="list-disc pl-5 text-[10.5pt] leading-snug space-y-1">{recs.map((r) => <li key={r}>{r}</li>)}</ul>

        <div className="grid grid-cols-2 gap-10 mt-14 text-[10pt] text-center">
          <div>
            <div className="border-t border-black pt-1">{session.user.name}</div>
            <div className="text-[9pt] text-slate-600">Elaborado por — Profesional DECE</div>
          </div>
          <div>
            <div className="border-t border-black pt-1">&nbsp;</div>
            <div className="text-[9pt] text-slate-600">Revisado por — Autoridad institucional</div>
          </div>
        </div>

        <p className="text-[8pt] text-slate-400 mt-6">Fuente: {TAPAS_SOURCE}</p>
      </div>
    </div>
  );
}
