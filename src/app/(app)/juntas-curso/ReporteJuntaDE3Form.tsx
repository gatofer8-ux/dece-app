"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import VoiceDictationButton from "@/components/VoiceDictationButton";
import AIAssistButton from "@/components/AIAssistButton";
import type { CourseBoardReportCaseItem, CourseBoardReportRow, SchoolYearRow, Trimester } from "@/lib/types";
import { TRIMESTER_LABELS } from "@/lib/types";
import { actionTypesSummary, alertsObservation, localIsoDate } from "@/lib/juntasCursoConstants";
import { countCourseAlertsAction, getCourseDetailsAndCasesAction, saveReporteJuntaDE3Action } from "./actions";

const DOC_TYPE = "Reporte para Juntas de Grado/Curso (E.D1.C2.DE3)";
const RULES = [
  "Lenguaje técnico, formal y respetuoso, con enfoque de derechos y sin revictimizar.",
  "No incluir nombres, cédulas ni datos que identifiquen al estudiante.",
  "Redacción breve, en viñetas cuando sea una lista de acciones.",
  "No inventes actividades, fechas, cifras ni hechos que no estén en el contenido actual o en el contexto; si faltan datos, deja [completar].",
];

interface CourseOption {
  course: string;
  parallel: string;
  jornada: string;
  tutor_name?: string | null;
}

type Row = CourseBoardReportCaseItem;

const newRow = (): Row => ({
  id: `r${Math.random().toString(36).slice(2, 9)}`,
  student_name: "",
  problematic: "",
  actions_taken: "",
  teacher_advice: "",
  observations: "",
  recommendations: {},
});

function parseRows(json?: string | null): Row[] {
  try {
    const v = JSON.parse(json || "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function FieldTools({ id, label, purpose, context, caseId, onResult }: {
  id: string;
  label: string;
  purpose: string;
  context: string;
  caseId?: string;
  onResult: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-1.5 shrink-0">
      <VoiceDictationButton targetId={id} compact onResult={onResult} />
      <AIAssistButton
        targetId={id}
        caseId={caseId}
        fieldLabel={label}
        documentType={DOC_TYPE}
        sectionPurpose={purpose}
        customContext={context}
        institutionalRules={RULES}
        onResult={onResult}
        compact
      />
    </div>
  );
}

export default function ReporteJuntaDE3Form({
  report,
  availableCourses,
  schoolYears,
  selectedYearId,
  currentUserName,
  currentRoleLabel,
}: {
  report?: CourseBoardReportRow;
  availableCourses: CourseOption[];
  schoolYears: SchoolYearRow[];
  selectedYearId?: string;
  currentUserName: string;
  currentRoleLabel: string;
}) {
  const router = useRouter();
  const initialYear =
    schoolYears.find((y) => y.id === (report?.school_year_id || selectedYearId)) || schoolYears[0];

  const [yearId, setYearId] = useState(initialYear?.id || "");
  const [trimester, setTrimester] = useState<Trimester>((report?.trimester as Trimester) || "1T");
  const [course, setCourse] = useState(report?.course || "");
  const [parallel, setParallel] = useState(report?.parallel || "");
  const [jornada, setJornada] = useState(report?.jornada || "MATUTINA");
  const [tutor, setTutor] = useState(report?.tutor_name || "");
  const [reportDate, setReportDate] = useState(report?.report_date || localIsoDate());
  const [roleLabel, setRoleLabel] = useState(report?.user_role_label || currentRoleLabel || "ANALISTA DECE");
  const [vicerrector, setVicerrector] = useState(report?.vicerrector_name || "");
  const [rows, setRows] = useState<Row[]>(() => {
    const r = parseRows(report?.cases_json);
    return r.length ? r : [];
  });
  const [actividades, setActividades] = useState(report?.general_actions || "");
  const [observaciones, setObservaciones] = useState(report?.observaciones_generales || "");

  const [loadingCourse, setLoadingCourse] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const touchedObs = useRef(!!report?.observaciones_generales);

  const yearText = schoolYears.find((y) => y.id === yearId)?.name || "";
  const trimesterLabel = TRIMESTER_LABELS[trimester];
  const courseKey = (c: CourseOption) => `${c.course}|${c.parallel}|${c.jornada}`;
  const selectedKey = course ? `${course}|${parallel}|${jornada}` : "";

  const baseContext = useMemo(
    () =>
      `Reporte para la Junta de Docentes del ${trimesterLabel.toLowerCase()} del año lectivo ${yearText}. ` +
      `Curso: ${course} "${parallel}", jornada ${jornada}. Estudiantes atendidos por el DECE en el reporte: ${rows.length}. ` +
      `Tipos de caso: ${[...new Set(rows.map((r) => r.problematic).filter(Boolean))].join(", ") || "sin casos"}.`,
    [trimesterLabel, yearText, course, parallel, jornada, rows]
  );

  async function loadCourse(opt: CourseOption, replaceCases: boolean) {
    setCourse(opt.course);
    setParallel(opt.parallel);
    setJornada(opt.jornada);
    if (opt.tutor_name) setTutor(opt.tutor_name);
    setLoadingCourse(true);
    setMessage(null);
    try {
      const [details, alerts] = await Promise.all([
        getCourseDetailsAndCasesAction({
          schoolYearText: yearText,
          trimester,
          course: opt.course,
          parallel: opt.parallel,
          jornada: opt.jornada,
        }),
        countCourseAlertsAction({ schoolYearId: yearId, course: opt.course, parallel: opt.parallel }),
      ]);
      if (details.tutorName) setTutor(details.tutorName);
      if (replaceCases) {
        setRows(
          details.cases.map((c) => ({
            ...c,
            actions_taken: actionTypesSummary(c.actions_taken || ""),
            teacher_advice: "",
            observations: "",
            recommendations: {},
          }))
        );
      }
      if (!touchedObs.current) setObservaciones(alertsObservation(alerts.count, yearText));
      setMessage({
        kind: "ok",
        text: replaceCases
          ? `Se cargaron ${details.cases.length} estudiante${details.cases.length === 1 ? "" : "s"} con casos en el DECE. Revisa y completa cada fila.`
          : "Datos del curso actualizados.",
      });
    } catch {
      setMessage({ kind: "error", text: "No se pudieron cargar los datos del curso." });
    } finally {
      setLoadingCourse(false);
    }
  }

  // En un reporte nuevo, al elegir curso se cargan sus casos automáticamente.
  useEffect(() => {
    if (!report && !course && availableCourses.length === 1) loadCourse(availableCourses[0], true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateRow = (i: number, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r, k) => (k === i ? { ...r, ...patch } : r)));

  async function save() {
    setSaving(true);
    setMessage(null);
    const res = await saveReporteJuntaDE3Action({
      id: report?.id,
      schoolYearId: yearId,
      schoolYearText: yearText,
      trimester,
      course,
      parallel,
      jornada,
      reportDate,
      userRoleLabel: roleLabel,
      userName: currentUserName,
      tutorName: tutor,
      vicerrectorName: vicerrector,
      cases: rows.filter((r) => r.student_name.trim() || r.problematic.trim() || r.actions_taken.trim()),
      generalActions: actividades,
      observacionesGenerales: observaciones,
    });
    setSaving(false);
    if (!res.success || !res.id) {
      setMessage({ kind: "error", text: res.error || "No se pudo guardar." });
      return;
    }
    router.push(`/juntas-curso/${res.id}`);
  }

  return (
    <div className="max-w-5xl space-y-6">
      <div className="card p-5 space-y-1">
        <p className="text-[11px] font-semibold text-slate-500 uppercase">Formato E.D1.C2.DE3 · Ministerio de Educación</p>
        <h1 className="text-lg font-bold text-slate-900">Reporte para Juntas de Grado/Curso</h1>
        <p className="text-xs text-slate-500">
          Reporta, de manera específica, en la Junta de Docentes de Grado o Curso, las acciones tomadas a fin de garantizar
          la accesibilidad y exigibilidad de los derechos de la población estudiantil.
        </p>
        {!report && (
          <p className="text-[11px] text-slate-500 pt-1">
            ¿Necesitas el informe técnico anterior?{" "}
            <Link href="/juntas-curso/nuevo?formato=anterior" className="text-brand-700 underline">
              Usar el formato anterior
            </Link>
          </p>
        )}
      </div>

      {/* Encabezado y datos informativos */}
      <section className="card p-5 space-y-4">
        <h2 className="text-sm font-semibold text-slate-800">1.- Datos informativos</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="label text-xs">Año lectivo</label>
            <select className="select" value={yearId} onChange={(e) => setYearId(e.target.value)}>
              {schoolYears.map((y) => (
                <option key={y.id} value={y.id}>{y.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label text-xs">Trimestre</label>
            <select className="select" value={trimester} onChange={(e) => setTrimester(e.target.value as Trimester)}>
              {(["1T", "2T", "3T"] as Trimester[]).map((t) => (
                <option key={t} value={t}>{TRIMESTER_LABELS[t]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label text-xs">Fecha del reporte</label>
            <input type="date" className="input" value={reportDate} onChange={(e) => setReportDate(e.target.value)} />
          </div>
        </div>

        <div>
          <label className="label text-xs">Grado/Curso, paralelo y jornada</label>
          <div className="flex flex-wrap gap-2">
            <select
              className="select flex-1 min-w-[240px]"
              value={selectedKey}
              onChange={(e) => {
                const opt = availableCourses.find((c) => courseKey(c) === e.target.value);
                if (opt) loadCourse(opt, rows.length === 0 || confirm("¿Reemplazar la nómina por los casos de este curso?"));
              }}
            >
              <option value="">Selecciona el curso…</option>
              {availableCourses.map((c) => (
                <option key={courseKey(c)} value={courseKey(c)}>
                  {c.course} “{c.parallel}” — {c.jornada}
                </option>
              ))}
            </select>
            {course && (
              <button
                type="button"
                className="btn-secondary text-xs"
                disabled={loadingCourse}
                onClick={() => {
                  if (rows.length === 0 || confirm("¿Reemplazar la nómina por los casos actuales del curso?")) {
                    loadCourse({ course, parallel, jornada }, true);
                  }
                }}
              >
                {loadingCourse ? "Cargando…" : "↻ Cargar casos del curso"}
              </button>
            )}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-4">
          <div className="sm:col-span-2">
            <label className="label text-xs">Grado/Curso</label>
            <input className="input" value={course} onChange={(e) => setCourse(e.target.value)} maxLength={200} />
          </div>
          <div>
            <label className="label text-xs">Paralelo</label>
            <input className="input" value={parallel} onChange={(e) => setParallel(e.target.value)} maxLength={20} />
          </div>
          <div>
            <label className="label text-xs">Jornada</label>
            <input className="input" value={jornada} onChange={(e) => setJornada(e.target.value)} maxLength={40} />
          </div>
          <div className="sm:col-span-4">
            <label className="label text-xs">Docente Tutor/a</label>
            <input className="input" value={tutor} onChange={(e) => setTutor(e.target.value)} maxLength={200} />
          </div>
        </div>
      </section>

      {/* Nómina de estudiantes */}
      <section className="card p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">Nómina de estudiantes atendidos por el DECE</h2>
            <p className="text-[11px] text-slate-500">
              {trimesterLabel} · año lectivo {yearText}. Al elegir el curso se cargan los estudiantes con casos en el DECE.
            </p>
          </div>
          <button type="button" className="btn-secondary text-xs" onClick={() => setRows((rs) => [...rs, newRow()])}>
            + Añadir estudiante
          </button>
        </div>

        {rows.length === 0 && (
          <p className="text-sm text-slate-400">Sin estudiantes en la nómina. Elige el curso o añade filas a mano.</p>
        )}

        {rows.map((r, i) => {
          const ctx = `${baseContext} Fila ${i + 1} de la nómina. Tipo de caso reportado: ${r.problematic || "sin especificar"}.`;
          return (
            <div key={r.id} className="rounded-lg border border-slate-200 p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-500">N.º {String(i + 1).padStart(2, "0")}</span>
                <button
                  type="button"
                  className="text-xs text-rose-600 hover:underline"
                  onClick={() => setRows((rs) => rs.filter((_, k) => k !== i))}
                >
                  Quitar
                </button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="label text-xs">Nombre y apellido del estudiante</label>
                  <input className="input" value={r.student_name} maxLength={200}
                    onChange={(e) => updateRow(i, { student_name: e.target.value })} />
                </div>
                <div>
                  <label className="label text-xs">Tipo de caso reportado</label>
                  <input className="input" value={r.problematic} maxLength={300}
                    onChange={(e) => updateRow(i, { problematic: e.target.value })} />
                </div>
              </div>

              {([
                ["actions_taken", `de3_actions_${i}`, "Reporte de acciones realizadas de atención psicosocial", "Acciones del DECE con el estudiante en el trimestre (detección, derivación interna, entrevistas, seguimiento, informes).", "-Detección\n-Derivación interna: socialización del caso a docentes.\n-Informe de seguimiento bimensual."],
                ["teacher_advice", `de3_advice_${i}`, "Asesoramiento individual a profesionales de educación", "Recomendaciones y orientaciones dadas a los docentes sobre este estudiante.", "Recomendaciones a los docentes, específicamente del estudiante en mención."],
                ["observations", `de3_obs_${i}`, "Observaciones", "Observaciones adicionales sobre el caso para la Junta de Curso.", ""],
              ] as const).map(([key, id, label, purpose, placeholder]) => (
                <div key={key}>
                  <div className="flex items-center justify-between gap-2">
                    <label htmlFor={id} className="label text-xs flex-1">{label}</label>
                    <FieldTools
                      id={id}
                      label={`${label} (estudiante N.º ${i + 1})`}
                      purpose={purpose}
                      context={ctx}
                      caseId={r.case_id}
                      onResult={(v) => updateRow(i, { [key]: v } as Partial<Row>)}
                    />
                  </div>
                  <textarea
                    id={id}
                    className="textarea"
                    rows={key === "observations" ? 2 : 4}
                    value={(r[key] as string) || ""}
                    placeholder={placeholder}
                    onChange={(e) => updateRow(i, { [key]: e.target.value } as Partial<Row>)}
                  />
                </div>
              ))}
            </div>
          );
        })}
      </section>

      {/* 2 y 3 */}
      <section className="card p-5 space-y-5">
        <div>
          <div className="flex items-center justify-between gap-2">
            <label htmlFor="de3_actividades" className="text-sm font-semibold text-slate-800 flex-1">
              2.- Actividades desarrolladas entorno al plan de acción del DECE
            </label>
            <FieldTools
              id="de3_actividades"
              label="Actividades desarrolladas entorno al plan de acción del DECE"
              purpose="Actividades preventivas, talleres, socializaciones y acciones del plan de acción del DECE realizadas con el curso en el trimestre."
              context={baseContext}
              onResult={setActividades}
            />
          </div>
          <textarea id="de3_actividades" className="textarea mt-1" rows={6} value={actividades}
            onChange={(e) => setActividades(e.target.value)}
            placeholder="Ej.: Taller de prevención del acoso escolar (fecha). Socialización de rutas y protocolos con el curso..." />
        </div>

        <div>
          <div className="flex items-center justify-between gap-2">
            <label htmlFor="de3_observaciones" className="text-sm font-semibold text-slate-800 flex-1">3.- Observaciones</label>
            <FieldTools
              id="de3_observaciones"
              label="Observaciones (casos reportados por docentes mediante ficha de notificación de alerta)"
              purpose="Indicar si existieron o no casos reportados por los docentes a través de la ficha de notificación de alerta, y observaciones generales para la Junta."
              context={baseContext}
              onResult={(v) => {
                touchedObs.current = true;
                setObservaciones(v);
              }}
            />
          </div>
          <textarea id="de3_observaciones" className="textarea mt-1" rows={3} value={observaciones}
            onChange={(e) => {
              touchedObs.current = true;
              setObservaciones(e.target.value);
            }}
            placeholder="¿Existieron o no casos reportados por los docentes a través de ficha de notificación de alerta?" />
          <p className="text-[11px] text-slate-500 mt-1">Se sugiere automáticamente según las fichas de alerta registradas del curso en el año lectivo.</p>
        </div>
      </section>

      {/* Firmas */}
      <section className="card p-5 space-y-3">
        <h2 className="text-sm font-semibold text-slate-800">Desarrollo y recepción del documento</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="label text-xs">Elaborado por</label>
            <input className="input bg-slate-50" value={report?.user_name || currentUserName} readOnly />
          </div>
          <div>
            <label className="label text-xs">Cargo</label>
            <input className="input" value={roleLabel} onChange={(e) => setRoleLabel(e.target.value)} maxLength={120} />
          </div>
          <div>
            <label className="label text-xs">Vicerrector/a de la jornada (recepción)</label>
            <input className="input" value={vicerrector} onChange={(e) => setVicerrector(e.target.value)} maxLength={200}
              placeholder="Opcional" />
          </div>
        </div>
        <p className="text-[11px] text-slate-500">
          La recepción la firman el/la tutor/a y el/la vicerrector/a en el documento impreso.
        </p>
      </section>

      {message && (
        <p className={`text-sm ${message.kind === "ok" ? "text-emerald-700" : "text-rose-600"}`}>{message.text}</p>
      )}

      <div className="flex justify-end gap-3">
        <Link href={report ? `/juntas-curso/${report.id}` : "/juntas-curso"} className="btn-secondary">Cancelar</Link>
        <button type="button" onClick={save} disabled={saving || !course} className="btn-primary disabled:opacity-60">
          {saving ? "Guardando…" : report ? "Guardar cambios" : "Guardar reporte"}
        </button>
      </div>
    </div>
  );
}
