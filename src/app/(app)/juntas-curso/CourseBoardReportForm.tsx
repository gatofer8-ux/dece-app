"use client";

import { useState, useTransition, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import VoiceDictationButton from "@/components/VoiceDictationButton";
import type {
  CourseBoardReportRow,
  CourseBoardReportCaseItem,
  Trimester,
  UserCoverage,
  SchoolYearRow,
} from "@/lib/types";
import { TRIMESTER_LABELS } from "@/lib/types";
import {
  DEFAULT_ANTECEDENTES,
  DEFAULT_OBJETIVO,
  DEFAULT_GENERAL_ACTIONS,
  DEFAULT_CONCLUSIONES,
  DEFAULT_RECOMENDACIONES,
} from "@/lib/juntasCursoConstants";
import {
  saveCourseBoardReportAction,
  fetchCasesForCourseAction,
  getCourseDetailsAndCasesAction,
  generateCaseRecommendationsAiAction,
  generateConclusionsAiAction,
} from "./actions";

interface CourseOption {
  course: string;
  parallel: string;
  jornada: string;
  tutor_name?: string | null;
}

export default function CourseBoardReportForm({
  report,
  coverage,
  availableCourses,
  schoolYears,
  selectedYearId,
  currentUserName,
  currentUserEmail,
  isCoordinatorOrAdmin,
}: {
  report?: CourseBoardReportRow;
  coverage: UserCoverage;
  availableCourses: CourseOption[];
  schoolYears: SchoolYearRow[];
  selectedYearId?: string;
  currentUserName: string;
  currentUserEmail?: string;
  isCoordinatorOrAdmin: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Años lectivos
  const activeYear = schoolYears.find((y) => y.id === (report?.school_year_id || selectedYearId)) || schoolYears[0];
  const [schoolYearId, setSchoolYearId] = useState(report?.school_year_id || activeYear?.id || "");
  const [schoolYearText, setSchoolYearText] = useState(
    report?.school_year_text || activeYear?.name || "2025-2026"
  );

  // Trimestre
  const [trimester, setTrimester] = useState<Trimester>(report?.trimester || "1T");

  // Filtrado de cursos según cobertura del usuario
  // Si no es admin y tiene cobertura definida, filtramos solo los cursos y paralelos de su cobertura
  const filteredCourses = isCoordinatorOrAdmin || coverage.isAllInstitutional
    ? availableCourses
    : availableCourses.filter((c) => {
        const matchesCourse = coverage.courses.length === 0 || coverage.courses.some(
          (cov) => cov.toLowerCase().trim() === c.course.toLowerCase().trim()
        );
        const matchesParallel = coverage.parallels.length === 0 || coverage.parallels.some(
          (cov) => cov.toUpperCase().trim() === c.parallel.toUpperCase().trim()
        );
        const matchesJornada = coverage.jornadas.length === 0 || coverage.jornadas.some(
          (cov) => cov.toUpperCase().trim() === c.jornada.toUpperCase().trim()
        );
        return matchesCourse && (coverage.parallels.length === 0 || matchesParallel) && (coverage.jornadas.length === 0 || matchesJornada);
      });

  const defaultOption = filteredCourses[0] || {
    course: "Primero BGU",
    parallel: "A",
    jornada: "MATUTINA",
  };

  const [course, setCourse] = useState(report?.course || defaultOption.course);
  const [parallel, setParallel] = useState(report?.parallel || defaultOption.parallel);
  const [jornada, setJornada] = useState(report?.jornada || defaultOption.jornada);

  // Fecha de informe
  const [reportDate, setReportDate] = useState(
    report?.report_date || new Date().toISOString().split("T")[0]
  );

  // Datos del Profesional DECE
  const [userRoleLabel, setUserRoleLabel] = useState(
    report?.user_role_label || (isCoordinatorOrAdmin ? "COORDINADOR/A DECE" : "ANALISTA DECE")
  );
  const [userContact, setUserContact] = useState(report?.user_contact || "");
  const [userEmail, setUserEmail] = useState(report?.user_email || currentUserEmail || "");
  const [userExtension, setUserExtension] = useState(report?.user_extension || "");

  // Datos del Docente Tutor
  const [tutorName, setTutorName] = useState(report?.tutor_name || "");
  const [tutorRoleLabel, setTutorRoleLabel] = useState(report?.tutor_role_label || "DOCENTE TUTOR");
  const [tutorContact, setTutorContact] = useState(report?.tutor_contact || "");
  const [tutorEmail, setTutorEmail] = useState(report?.tutor_email || "");
  const [tutorExtension, setTutorExtension] = useState(report?.tutor_extension || "");

  // Código de informe
  const [reportCode, setReportCode] = useState(report?.report_code || "");

  // Secciones narrativas
  const [antecedentes, setAntecedentes] = useState(
    report?.antecedentes || DEFAULT_ANTECEDENTES(TRIMESTER_LABELS[trimester], schoolYearText)
  );
  const [alcance, setAlcance] = useState(
    report?.alcance ||
      `Del Departamento de Consejería Estudiantil al Docente Tutor ${tutorName || "[Nombre del Tutor]"} de ${course} ${parallel} Jornada ${jornada}`
  );
  const [objetivo, setObjetivo] = useState(report?.objetivo || DEFAULT_OBJETIVO);

  // Casos atendidos
  const [cases, setCases] = useState<CourseBoardReportCaseItem[]>(() => {
    if (report?.cases_json) {
      try {
        return JSON.parse(report.cases_json);
      } catch {}
    }
    return [];
  });

  const [generalActions, setGeneralActions] = useState(
    report?.general_actions || DEFAULT_GENERAL_ACTIONS
  );
  const [conclusiones, setConclusiones] = useState(
    report?.conclusiones || DEFAULT_CONCLUSIONES(TRIMESTER_LABELS[trimester])
  );
  const [recomendaciones, setRecomendaciones] = useState(
    report?.recomendaciones || DEFAULT_RECOMENDACIONES
  );

  // Estados de carga y feedback
  const [loadingCases, setLoadingCases] = useState(false);
  const [aiGeneratingCaseId, setAiGeneratingCaseId] = useState<string | null>(null);
  const [aiGeneratingConclusions, setAiGeneratingConclusions] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Auto-inicializar código y datos para nuevo informe al montar
  useEffect(() => {
    if (!report) {
      let isMounted = true;
      getCourseDetailsAndCasesAction({
        schoolYearText,
        trimester,
        course,
        parallel,
        jornada,
      })
        .then((res) => {
          if (!isMounted) return;
          if (res.reportCode && !reportCode) {
            setReportCode(res.reportCode);
          }
          if (res.tutorName && !tutorName) {
            setTutorName(res.tutorName);
            setAlcance(
              `Del Departamento de Consejería Estudiantil al Docente Tutor ${res.tutorName} de ${course} ${parallel} Jornada ${jornada}`
            );
          } else if (!tutorName) {
            const matched = availableCourses.find(
              (c) =>
                c.course.toLowerCase().trim() === course.toLowerCase().trim() &&
                c.parallel.toUpperCase().trim() === parallel.toUpperCase().trim()
            );
            if (matched?.tutor_name) {
              setTutorName(matched.tutor_name);
              setAlcance(
                `Del Departamento de Consejería Estudiantil al Docente Tutor ${matched.tutor_name} de ${course} ${parallel} Jornada ${jornada}`
              );
            }
          }
          if (res.cases && res.cases.length > 0 && cases.length === 0) {
            setCases(res.cases);
          }
        })
        .catch(() => {});
      return () => {
        isMounted = false;
      };
    }
  }, []);

  // Cambiar trimestre actualiza textos por defecto y correlativo
  const handleTrimesterChange = async (newTrimester: Trimester) => {
    setTrimester(newTrimester);
    if (!report) {
      setAntecedentes(DEFAULT_ANTECEDENTES(TRIMESTER_LABELS[newTrimester], schoolYearText));
      setConclusiones(DEFAULT_CONCLUSIONES(TRIMESTER_LABELS[newTrimester]));
      try {
        const res = await getCourseDetailsAndCasesAction({
          schoolYearText,
          trimester: newTrimester,
          course,
          parallel,
          jornada,
        });
        if (res.reportCode) {
          setReportCode(res.reportCode);
        }
      } catch {}
    }
  };

  // Cambio reactivo de curso / paralelo / jornada:
  // 1. Limpia inmediatamente los casos anteriores para evitar mezclar información
  // 2. Consulta tutor asignado y casos registrados en BD
  // 3. Genera correlativo actualizado
  const handleCourseChange = async (newCourse: string, newParallel: string, newJornada: string) => {
    setCourse(newCourse);
    setParallel(newParallel);
    setJornada(newJornada);

    // Limpiar inmediatamente el array de casos para evitar cruces
    setCases([]);
    setLoadingCases(true);

    try {
      const res = await getCourseDetailsAndCasesAction({
        schoolYearText,
        trimester,
        course: newCourse,
        parallel: newParallel,
        jornada: newJornada,
      });

      if (!report && res.reportCode) {
        setReportCode(res.reportCode);
      }

      let resolvedTutor = res.tutorName;
      if (!resolvedTutor) {
        const matched = availableCourses.find(
          (c) =>
            c.course.toLowerCase().trim() === newCourse.toLowerCase().trim() &&
            c.parallel.toUpperCase().trim() === newParallel.toUpperCase().trim() &&
            c.jornada.toUpperCase().trim() === newJornada.toUpperCase().trim()
        );
        if (matched?.tutor_name) {
          resolvedTutor = matched.tutor_name;
        }
      }

      if (resolvedTutor) {
        setTutorName(resolvedTutor);
      }

      setAlcance(
        `Del Departamento de Consejería Estudiantil al Docente Tutor ${resolvedTutor || tutorName || "[Nombre del Tutor]"} de ${newCourse} ${newParallel} Jornada ${newJornada}`
      );

      if (res.cases && res.cases.length > 0) {
        setCases(res.cases);
        setSaveStatus({
          type: "success",
          message: `✓ Se detectaron y cargaron ${res.cases.length} caso(s) de atención DECE en ${newCourse} "${newParallel}".`,
        });
      } else {
        setCases([]);
        setSaveStatus({
          type: "success",
          message: `Curso ${newCourse} "${newParallel}" seleccionado. Sin casos previos registrados; puedes redactar o agregarlos manualmente.`,
        });
      }
    } catch (err: any) {
      console.error("[handleCourseChange]", err);
    } finally {
      setLoadingCases(false);
      setTimeout(() => setSaveStatus(null), 4000);
    }
  };

  // Cargar casos del curso desde la base de datos
  const handleLoadCases = async () => {
    setLoadingCases(true);
    try {
      const res = await fetchCasesForCourseAction(course, parallel, jornada);
      if (res.cases && res.cases.length > 0) {
        setCases(res.cases);
        setSaveStatus({
          type: "success",
          message: `Se cargaron ${res.cases.length} caso(s) registrado(s) en ${course} "${parallel}".`,
        });
      } else {
        setSaveStatus({
          type: "error",
          message: `No se encontraron casos registrados previamente para ${course} "${parallel}". Puedes añadirlos manualmente con el botón inferior.`,
        });
      }
    } catch {
      setSaveStatus({
        type: "error",
        message: "Error al consultar los casos del curso.",
      });
    } finally {
      setLoadingCases(false);
      setTimeout(() => setSaveStatus(null), 5000);
    }
  };

  // Añadir caso manualmente
  const handleAddCase = () => {
    const newCase: CourseBoardReportCaseItem = {
      id: `manual_${Date.now()}`,
      student_name: "",
      problematic: "",
      actions_taken:
        "• Detección y registro en DECE\n• Entrevista y contención socioemocional\n• Diálogo y coordinación con docente tutor",
      recommendations: {
        coordination: "• Coordinación constante entre docentes y DECE. Mantener confidencialidad.",
        academic: "• Aplicar ajustes razonables (DUA) y flexibilización según necesidad socioeducativa.",
        climate: "• Acompañamiento socioemocional y fomento de un ambiente protector y empático.",
        protocols: "• Notificación oportuna ante cualquier alerta o vulneración de derechos.",
      },
    };
    setCases([...cases, newCase]);
  };

  // Declarar el informe formalmente sin casos en este trimestre
  const handleSetNoCases = () => {
    setCases([]);
    setGeneralActions(
      `Durante el presente trimestre escolar no se reportaron ni receptaron derivaciones de situaciones de vulnerabilidad o riesgo psicosocial en ${course} "${parallel}". Se ejecutaron acciones de promoción, prevención, articulación con el docente tutor y observación periódica en el aula conforme a las competencias del Modelo de Gestión DECE.`
    );
    setConclusiones(
      `- Durante el ${TRIMESTER_LABELS[trimester].toLowerCase()} no se receptaron derivaciones ni se identificaron situaciones de vulneración de derechos o riesgo psicosocial en ${course} "${parallel}".\n- Se mantuvo la observación preventiva y articulación continua con el docente tutor y equipo de docentes del grado/curso.\n- Los docentes miembros de la Junta de Curso toman conocimiento formal de que no existen casos abiertos de atención o acompañamiento psicosocial en el período.`
    );
    setRecomendaciones(
      `- Se recomienda a los docentes de todas las asignaturas mantener la observación atenta y activa en el aula, y remitir oportunamente al DECE cualquier alerta conductual, socioemocional o pedagógica mediante la ficha de notificación oficial.\n- Se recomienda que el Docente Tutor continúe manteniendo comunicación constante, pertinente y oportuna con los representantes legales según lo determina el Reglamento LOEI.\n- Notificar inmediatamente al Profesional DECE ante presuntas situaciones de vulneración de derechos para activar de forma oportuna las rutas y protocolos del MINEDUC.`
    );
    setSaveStatus({
      type: "success",
      message: `✓ Se configuró el informe: "Sin casos reportados en el ${TRIMESTER_LABELS[trimester]}". Se actualizaron las conclusiones y recomendaciones preventivas oficiales.`,
    });
    setTimeout(() => setSaveStatus(null), 5000);
  };

  const handleRemoveCase = (index: number) => {
    setCases(cases.filter((_, i) => i !== index));
  };

  const handleUpdateCase = (index: number, field: keyof CourseBoardReportCaseItem, value: any) => {
    const updated = [...cases];
    updated[index] = { ...updated[index], [field]: value };
    setCases(updated);
  };

  const handleUpdateCaseRecommendation = (
    index: number,
    subfield: "coordination" | "academic" | "climate" | "protocols",
    value: string
  ) => {
    const updated = [...cases];
    updated[index] = {
      ...updated[index],
      recommendations: {
        ...updated[index].recommendations,
        [subfield]: value,
      },
    };
    setCases(updated);
  };

  // IA para recomendaciones de un caso
  const handleGenerateCaseAi = async (index: number) => {
    const targetCase = cases[index];
    if (!targetCase.student_name && !targetCase.problematic) {
      alert("Ingresa al menos el nombre del estudiante y la problemática para que la IA genere recomendaciones.");
      return;
    }

    setAiGeneratingCaseId(targetCase.id);
    try {
      const res = await generateCaseRecommendationsAiAction({
        studentName: targetCase.student_name || "Estudiante",
        course: `${course} "${parallel}"`,
        problematic: targetCase.problematic || "Acompañamiento socioemocional",
        actionsTaken: targetCase.actions_taken,
        currentRecommendations: targetCase.recommendations,
      });

      if ("error" in res) {
        alert(res.error);
      } else {
        const updated = [...cases];
        updated[index] = {
          ...updated[index],
          recommendations: {
            coordination: res.coordination || updated[index].recommendations.coordination,
            academic: res.academic || updated[index].recommendations.academic,
            climate: res.climate || updated[index].recommendations.climate,
            protocols: res.protocols || updated[index].recommendations.protocols,
          },
        };
        setCases(updated);
      }
    } catch {
      alert("Error al conectar con la Inteligencia Artificial.");
    } finally {
      setAiGeneratingCaseId(null);
    }
  };

  // IA para conclusiones y recomendaciones globales
  const handleGenerateConclusionsAi = async () => {
    setAiGeneratingConclusions(true);
    try {
      const casesSummary = cases.map((c, i) => `${i + 1}. ${c.student_name}: ${c.problematic} (Acciones: ${c.actions_taken})`).join("\n");
      const res = await generateConclusionsAiAction({
        course,
        parallel,
        trimesterLabel: TRIMESTER_LABELS[trimester],
        casesSummary,
        generalActions,
      });

      if ("error" in res) {
        alert(res.error);
      } else {
        if (res.conclusiones) setConclusiones(res.conclusiones);
        if (res.recomendaciones) setRecomendaciones(res.recomendaciones);
      }
    } catch {
      alert("Error al generar conclusiones con IA.");
    } finally {
      setAiGeneratingConclusions(false);
    }
  };

  // Guardar informe
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!tutorName.trim()) {
      alert("Por favor ingresa el nombre del Docente Tutor que preside la junta de curso.");
      return;
    }

    startTransition(async () => {
      const res = await saveCourseBoardReportAction({
        id: report?.id,
        schoolYearId,
        schoolYearText,
        trimester,
        course,
        parallel,
        jornada,
        reportDate,
        userRoleLabel,
        userContact,
        userEmail,
        userExtension,
        tutorName,
        tutorRoleLabel,
        tutorContact,
        tutorEmail,
        tutorExtension,
        reportCode,
        antecedentes,
        alcance,
        objetivo,
        cases,
        generalActions,
        conclusiones,
        recomendaciones,
      });

      if (res.success && res.id) {
        setSaveStatus({
          type: "success",
          message: "Informe técnico guardado exitosamente. Redirigiendo a vista de impresión...",
        });
        setTimeout(() => {
          router.push(`/juntas-curso/${res.id}/imprimir`);
        }, 1200);
      } else {
        setSaveStatus({
          type: "error",
          message: res.error || "Error al guardar el informe técnico.",
        });
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-5xl mx-auto pb-16">
      {/* Encabezado del Formulario */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-5">
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
              📋 Formato Oficial MINEDUC-2024-00066-A
            </span>
            <h1 className="text-2xl font-bold text-slate-900 mt-2">
              {report ? "Editar Informe Técnico Juntas de Curso" : "Nuevo Informe Técnico Juntas de Curso"}
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Elaboración del informe trimestral por curso y paralelo según cobertura del distributivo DECE.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/juntas-curso"
              className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={isPending}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold shadow transition-all disabled:opacity-50"
            >
              {isPending ? "Guardando..." : "Guardar e Imprimir"}
            </button>
          </div>
        </div>

        {saveStatus && (
          <div
            className={`mt-4 p-4 rounded-lg text-sm font-medium ${
              saveStatus.type === "success"
                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                : "bg-red-50 text-red-800 border border-red-200"
            }`}
          >
            {saveStatus.message}
          </div>
        )}

        {/* 1. Selección de Período, Trimestre y Cobertura */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
              Año Lectivo
            </label>
            <select
              value={schoolYearId}
              onChange={(e) => {
                const yId = e.target.value;
                setSchoolYearId(yId);
                const found = schoolYears.find((y) => y.id === yId);
                if (found) {
                  const yText = found.name;
                  setSchoolYearText(yText);
                  setAntecedentes(DEFAULT_ANTECEDENTES(TRIMESTER_LABELS[trimester], yText));
                }
              }}
              className="w-full text-sm border-slate-300 rounded-lg px-3 py-2 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500"
            >
              {schoolYears.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
              Trimestre Escolar
            </label>
            <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-lg">
              {(["1T", "2T", "3T"] as Trimester[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => handleTrimesterChange(t)}
                  className={`py-1.5 text-xs font-bold rounded-md transition-all ${
                    trimester === t
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="md:col-span-2">
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                Curso, Paralelo y Jornada (Tu Cobertura)
              </label>
              {!isCoordinatorOrAdmin && (
                <span className="text-[11px] text-indigo-600 font-medium">
                  ✓ Filtrado por distributivo DECE
                </span>
              )}
            </div>
            <select
              value={`${course}___${parallel}___${jornada}`}
              onChange={(e) => {
                const [c, p, j] = e.target.value.split("___");
                handleCourseChange(c, p, j);
              }}
              className="w-full text-sm border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-indigo-500 font-medium"
            >
              {filteredCourses.map((opt, idx) => (
                <option key={idx} value={`${opt.course}___${opt.parallel}___${opt.jornada}`}>
                  {opt.course} - Paralelo "{opt.parallel}" ({opt.jornada}){opt.tutor_name ? ` · Tutor: ${opt.tutor_name}` : ""}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Botón para autodetectar casos del curso */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 bg-indigo-50/70 border border-indigo-100 rounded-lg p-3">
          <div className="text-xs text-indigo-900">
            <strong>Detección Rápida de Casos:</strong> Importa automáticamente los expedientes y bitácoras de
            atención del DECE registrados en <strong>{course} "{parallel}"</strong>.
          </div>
          <button
            type="button"
            onClick={handleLoadCases}
            disabled={loadingCases}
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
          >
            {loadingCases ? (
              <span>Cargando casos...</span>
            ) : (
              <>
                <span>🔍</span>
                <span>Detectar Casos del Curso</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 2. DATOS GENERALES (Estructura oficial idéntica a la plantilla) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
        <h2 className="text-base font-bold text-slate-800 uppercase tracking-wide border-b border-slate-200 pb-2">
          1. Datos Generales del Informe
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Fecha de Informe</label>
            <input
              type="date"
              value={reportDate}
              onChange={(e) => setReportDate(e.target.value)}
              className="w-full text-sm border-slate-300 rounded-lg px-3 py-2"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              No. De Informe (Generación oficial automática)
            </label>
            <input
              type="text"
              value={reportCode}
              onChange={(e) => setReportCode(e.target.value)}
              placeholder="Automático (ej: INF-001-JC-1T-UESR-2025-2026-MJ_1BGU A MAT)"
              className="w-full text-sm border-slate-300 rounded-lg px-3 py-2 font-mono bg-slate-50"
            />
          </div>
        </div>

        {/* Funcionario Responsable y Docente Tutor en columnas paralelas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          {/* Funcionario Responsable DECE */}
          <div className="bg-slate-50/70 border border-slate-200 rounded-lg p-4 space-y-3">
            <h3 className="text-xs font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
              <span>👤</span> Funcionario Responsable de Informe (DECE)
            </h3>
            <div>
              <label className="block text-[11px] font-medium text-slate-500">Nombres y Apellidos</label>
              <input
                type="text"
                value={currentUserName}
                disabled
                className="w-full text-xs font-bold bg-white border-slate-200 rounded px-2.5 py-1.5 text-slate-700"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-medium text-slate-500">Cargo</label>
                <input
                  type="text"
                  value={userRoleLabel}
                  onChange={(e) => setUserRoleLabel(e.target.value)}
                  className="w-full text-xs bg-white border-slate-200 rounded px-2.5 py-1.5 uppercase font-medium"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-500">Contacto (Celular)</label>
                <input
                  type="text"
                  value={userContact}
                  onChange={(e) => setUserContact(e.target.value)}
                  placeholder="099..."
                  className="w-full text-xs bg-white border-slate-200 rounded px-2.5 py-1.5"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <label className="block text-[11px] font-medium text-slate-500">Correo Electrónico</label>
                <input
                  type="email"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  className="w-full text-xs bg-white border-slate-200 rounded px-2.5 py-1.5"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-500">Extensión</label>
                <input
                  type="text"
                  value={userExtension}
                  onChange={(e) => setUserExtension(e.target.value)}
                  placeholder="Opcional"
                  className="w-full text-xs bg-white border-slate-200 rounded px-2.5 py-1.5"
                />
              </div>
            </div>
          </div>

          {/* Recipiente: Docente Tutor */}
          <div className="bg-slate-50/70 border border-slate-200 rounded-lg p-4 space-y-3">
            <h3 className="text-xs font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
              <span>🎓</span> Recipiente de Informe (Docente Tutor)
            </h3>
            <div>
              <label className="block text-[11px] font-medium text-slate-500">
                Nombres y Apellidos del Docente Tutor *
              </label>
              <input
                type="text"
                value={tutorName}
                onChange={(e) => {
                  setTutorName(e.target.value);
                  setAlcance(
                    `Del Departamento de Consejería Estudiantil al Docente Tutor ${e.target.value || "[Nombre del Tutor]"} de ${course} ${parallel} Jornada ${jornada}`
                  );
                }}
                placeholder="Ej: Mg. Wilson Gaibor"
                required
                className="w-full text-xs font-bold bg-white border-slate-200 rounded px-2.5 py-1.5 text-slate-800"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-medium text-slate-500">Cargo</label>
                <input
                  type="text"
                  value={tutorRoleLabel}
                  onChange={(e) => setTutorRoleLabel(e.target.value)}
                  className="w-full text-xs bg-white border-slate-200 rounded px-2.5 py-1.5 uppercase font-medium"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-500">Contacto (Teléfono)</label>
                <input
                  type="text"
                  value={tutorContact}
                  onChange={(e) => setTutorContact(e.target.value)}
                  placeholder="Opcional"
                  className="w-full text-xs bg-white border-slate-200 rounded px-2.5 py-1.5"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <label className="block text-[11px] font-medium text-slate-500">Correo Docente</label>
                <input
                  type="email"
                  value={tutorEmail}
                  onChange={(e) => setTutorEmail(e.target.value)}
                  placeholder="docente@educacion.gob.ec"
                  className="w-full text-xs bg-white border-slate-200 rounded px-2.5 py-1.5"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-500">Extensión</label>
                <input
                  type="text"
                  value={tutorExtension}
                  onChange={(e) => setTutorExtension(e.target.value)}
                  placeholder="Opcional"
                  className="w-full text-xs bg-white border-slate-200 rounded px-2.5 py-1.5"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. ANTECEDENTES, ALCANCE Y OBJETIVO */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-5">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <h2 className="text-base font-bold text-slate-800 uppercase tracking-wide">
            2. Antecedentes, 3. Alcance y 4. Objetivo
          </h2>
          <VoiceDictationButton targetId="input_antecedentes" compact />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            2. Antecedentes (Cita Jurídica Acuerdo MINEDUC-MINEDUC-2024-00066-A Arts. 15 y 16)
          </label>
          <textarea
            id="input_antecedentes"
            rows={4}
            value={antecedentes}
            onChange={(e) => setAntecedentes(e.target.value)}
            className="w-full text-xs border-slate-300 rounded-lg p-3 leading-relaxed text-slate-700 font-sans"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700">3. Alcance</label>
              <VoiceDictationButton targetId="input_alcance" compact />
            </div>
            <input
              id="input_alcance"
              type="text"
              value={alcance}
              onChange={(e) => setAlcance(e.target.value)}
              className="w-full text-xs border-slate-300 rounded-lg p-2.5 text-slate-800"
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700">4. Objetivo</label>
              <VoiceDictationButton targetId="input_objetivo" compact />
            </div>
            <input
              id="input_objetivo"
              type="text"
              value={objetivo}
              onChange={(e) => setObjetivo(e.target.value)}
              className="w-full text-xs border-slate-300 rounded-lg p-2.5 text-slate-800"
            />
          </div>
        </div>
      </div>

      {/* 4. DESARROLLO O ANÁLISIS: TABLA DE CASOS ATENDIDOS (4 COLUMNAS OFICIALES) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-200 pb-3">
          <div>
            <h2 className="text-base font-bold text-slate-800 uppercase tracking-wide">
              5. Desarrollo o Análisis - Casos Atendidos
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Casos atendidos en el DECE durante el {TRIMESTER_LABELS[trimester].toLowerCase()} del año lectivo {schoolYearText}.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSetNoCases}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-300 hover:border-emerald-300 rounded-lg text-xs font-semibold shadow-sm transition-all"
              title="Ajusta el informe y las conclusiones indicando que no se reportaron casos en el período"
            >
              <span>🟢</span> Declarar Sin Casos
            </button>
            <button
              type="button"
              onClick={handleAddCase}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
            >
              <span>+</span> Añadir Caso
            </button>
          </div>
        </div>

        {cases.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed border-emerald-300 rounded-xl bg-emerald-50/50 p-6">
            <span className="text-3xl block mb-2">🟢</span>
            <p className="text-sm font-bold text-emerald-900">
              Curso sin casos reportados en este trimestre
            </p>
            <p className="text-xs text-emerald-700 mt-1 max-w-lg mx-auto leading-relaxed">
              No se han reportado ni derivado casos al DECE en este grado o curso durante el {TRIMESTER_LABELS[trimester].toLowerCase()}. Se mantendrán las conclusiones y recomendaciones preventivas para dar cumplimiento oficial ante la Junta de Curso.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={handleSetNoCases}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-bold shadow-sm"
              >
                ✓ Aplicar Plantilla Oficial Sin Casos
              </button>
              <button
                type="button"
                onClick={handleLoadCases}
                disabled={loadingCases}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-xs font-semibold"
              >
                🔍 Buscar Casos en DECE
              </button>
              <button
                type="button"
                onClick={handleAddCase}
                className="px-3.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-md text-xs font-semibold"
              >
                + Añadir Caso Manualmente
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {cases.map((c, index) => (
              <div
                key={c.id || index}
                className="border border-slate-300 rounded-xl overflow-hidden shadow-sm bg-white"
              >
                {/* Cabecera del Caso */}
                <div className="bg-slate-100 px-4 py-2.5 border-b border-slate-200 flex flex-wrap justify-between items-center gap-2">
                  <div className="flex items-center gap-2">
                    <span className="h-6 w-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">
                      {index + 1}
                    </span>
                    <span className="text-xs font-bold text-slate-800">
                      Caso: {c.student_name || "Sin nombre asignado"}
                    </span>
                    {c.case_code && (
                      <span className="text-[10px] font-mono bg-slate-200 text-slate-700 px-2 py-0.5 rounded">
                        {c.case_code}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleGenerateCaseAi(index)}
                      disabled={aiGeneratingCaseId === c.id}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded text-xs font-semibold transition-all disabled:opacity-50"
                      title="Genera con IA recomendaciones DUA, clima escolar y coordinación"
                    >
                      <span>✨</span>
                      <span>{aiGeneratingCaseId === c.id ? "Generando DUA..." : "Sugerir DUA con IA"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveCase(index)}
                      className="text-xs text-red-600 hover:text-red-800 font-medium px-2 py-1"
                      title="Eliminar este caso"
                    >
                      ✕ Quitar
                    </button>
                  </div>
                </div>

                {/* Campos del Caso (4 Columnas Oficiales) */}
                <div className="p-4 grid grid-cols-1 lg:grid-cols-12 gap-4">
                  {/* Columna 1: Estudiante */}
                  <div className="lg:col-span-3 space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[11px] font-bold text-slate-700 uppercase">
                          Estudiante *
                        </label>
                        <VoiceDictationButton targetId={`student_name_${index}`} compact />
                      </div>
                      <input
                        id={`student_name_${index}`}
                        type="text"
                        value={c.student_name}
                        onChange={(e) => handleUpdateCase(index, "student_name", e.target.value)}
                        placeholder="APELLIDOS Y NOMBRES"
                        required
                        className="w-full text-xs font-bold uppercase border-slate-300 rounded p-2"
                      />
                    </div>

                    {/* Columna 2: Problemática */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[11px] font-bold text-slate-700 uppercase">
                          Problemática *
                        </label>
                        <VoiceDictationButton targetId={`problematic_${index}`} compact />
                      </div>
                      <textarea
                        id={`problematic_${index}`}
                        rows={3}
                        value={c.problematic}
                        onChange={(e) => handleUpdateCase(index, "problematic", e.target.value)}
                        placeholder="Ej. Embarazo adolescente / Rezago escolar / Trabajo infantil"
                        required
                        className="w-full text-xs border-slate-300 rounded p-2"
                      />
                    </div>
                  </div>

                  {/* Columna 3: Acciones Realizadas / Avances del caso */}
                  <div className="lg:col-span-4">
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] font-bold text-slate-700 uppercase">
                        Acciones Realizadas / Avances
                      </label>
                      <VoiceDictationButton targetId={`actions_${index}`} compact />
                    </div>
                    <textarea
                      id={`actions_${index}`}
                      rows={8}
                      value={c.actions_taken}
                      onChange={(e) => handleUpdateCase(index, "actions_taken", e.target.value)}
                      placeholder="• Consentimiento informado
• Entrevista estudiante y representante
• Socialización con docentes
• Activación de rutas"
                      className="w-full text-xs border-slate-300 rounded p-2.5 font-sans leading-relaxed"
                    />
                  </div>

                  {/* Columna 4: Asesoramiento y Recomendaciones (A la Junta de Docentes) */}
                  <div className="lg:col-span-5 space-y-2.5">
                    <label className="block text-[11px] font-bold text-slate-800 uppercase tracking-wide border-b pb-1">
                      Asesoramiento y Recomendaciones (A la Junta)
                    </label>

                    {/* Comunicación y Coordinación */}
                    <div>
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[10px] font-bold text-indigo-900 uppercase">
                          a) Comunicación y Coordinación
                        </span>
                        <VoiceDictationButton targetId={`rec_coord_${index}`} compact />
                      </div>
                      <textarea
                        id={`rec_coord_${index}`}
                        rows={2}
                        value={c.recommendations?.coordination || ""}
                        onChange={(e) => handleUpdateCaseRecommendation(index, "coordination", e.target.value)}
                        placeholder="Confidencialidad, no estigmatización..."
                        className="w-full text-xs border-slate-300 rounded p-1.5"
                      />
                    </div>

                    {/* Académico / Ajustes Razonables (DUA) */}
                    <div>
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[10px] font-bold text-indigo-900 uppercase">
                          b) Académico / Ajustes Razonables (DUA)
                        </span>
                        <VoiceDictationButton targetId={`rec_acad_${index}`} compact />
                      </div>
                      <textarea
                        id={`rec_acad_${index}`}
                        rows={2}
                        value={c.recommendations?.academic || ""}
                        onChange={(e) => handleUpdateCaseRecommendation(index, "academic", e.target.value)}
                        placeholder="Flexibilización, adaptaciones curriculares, evaluación formativa..."
                        className="w-full text-xs border-slate-300 rounded p-1.5"
                      />
                    </div>

                    {/* Clima Escolar / Convivencia */}
                    <div>
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[10px] font-bold text-indigo-900 uppercase">
                          c) Clima Escolar / Convivencia
                        </span>
                        <VoiceDictationButton targetId={`rec_climate_${index}`} compact />
                      </div>
                      <textarea
                        id={`rec_climate_${index}`}
                        rows={2}
                        value={c.recommendations?.climate || ""}
                        onChange={(e) => handleUpdateCaseRecommendation(index, "climate", e.target.value)}
                        placeholder="Acompañamiento socioemocional, ambiente protector..."
                        className="w-full text-xs border-slate-300 rounded p-1.5"
                      />
                    </div>

                    {/* Protección y Protocolos */}
                    <div>
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[10px] font-bold text-indigo-900 uppercase">
                          d) Protección y Protocolos
                        </span>
                        <VoiceDictationButton targetId={`rec_prot_${index}`} compact />
                      </div>
                      <textarea
                        id={`rec_prot_${index}`}
                        rows={2}
                        value={c.recommendations?.protocols || ""}
                        onChange={(e) => handleUpdateCaseRecommendation(index, "protocols", e.target.value)}
                        placeholder="Activación de rutas, medidas administrativas..."
                        className="w-full text-xs border-slate-300 rounded p-1.5"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Acciones Generales en el Paralelo */}
        <div className="pt-2">
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-bold text-slate-800 uppercase">
              Acciones Generales Realizadas en el Curso
            </label>
            <VoiceDictationButton targetId="input_general_actions" compact />
          </div>
          <textarea
            id="input_general_actions"
            rows={2}
            value={generalActions}
            onChange={(e) => setGeneralActions(e.target.value)}
            className="w-full text-xs border-slate-300 rounded-lg p-2.5 text-slate-700"
          />
        </div>
      </div>

      {/* 5. CONCLUSIONES Y RECOMENDACIONES (ACUERDO 00066-A) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-200 pb-3">
          <div>
            <h2 className="text-base font-bold text-slate-800 uppercase tracking-wide">
              6. Conclusiones y 7. Recomendaciones
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Conforme a la normativa del Acuerdo Nro. MINEDUC-MINEDUC-2024-00066-A y Reglamento LOEI.
            </p>
          </div>
          <button
            type="button"
            onClick={handleGenerateConclusionsAi}
            disabled={aiGeneratingConclusions}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
          >
            <span>✨</span>
            <span>{aiGeneratingConclusions ? "Redactando con IA..." : "Pulir con IA"}</span>
          </button>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-bold text-slate-700 uppercase">
              6. Conclusiones *
            </label>
            <VoiceDictationButton targetId="input_conclusiones" compact />
          </div>
          <textarea
            id="input_conclusiones"
            rows={4}
            value={conclusiones}
            onChange={(e) => setConclusiones(e.target.value)}
            required
            className="w-full text-xs border-slate-300 rounded-lg p-3 font-sans leading-relaxed text-slate-800"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-bold text-slate-700 uppercase">
              7. Recomendaciones *
            </label>
            <VoiceDictationButton targetId="input_recomendaciones" compact />
          </div>
          <textarea
            id="input_recomendaciones"
            rows={5}
            value={recomendaciones}
            onChange={(e) => setRecomendaciones(e.target.value)}
            required
            className="w-full text-xs border-slate-300 rounded-lg p-3 font-sans leading-relaxed text-slate-800"
          />
        </div>
      </div>

      {/* Barra Inferior de Acción */}
      <div className="flex items-center justify-end gap-3 bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
        <Link
          href="/juntas-curso"
          className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
        >
          Cancelar
        </Link>
        <button
          type="submit"
          disabled={isPending}
          className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold shadow transition-all disabled:opacity-50"
        >
          {isPending ? "Guardando..." : "Guardar e Imprimir Informe"}
        </button>
      </div>
    </form>
  );
}
