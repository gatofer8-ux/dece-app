"use client";

import { useState, useTransition, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import VoiceDictationButton from "@/components/VoiceDictationButton";
import { currentSchoolYearText } from "@/lib/schoolYearText";
import type {
  AnnualManagementReportRow,
  ManagementReportType,
  ManagementReportRecipientItem,
  ManagementReportProfessionalItem,
  CounselingStatRow,
  CaseTypologyStatRow,
  ComparativeAnalysisRow,
  PreventionProjectRow,
  ManagementReportSignatureItem,
  SchoolYearRow,
  UserRow,
} from "@/lib/types";
import {
  DEFAULT_ANTECEDENTES_LEGAL,
  DEFAULT_ALCANCE_TEMPLATE,
  DEFAULT_OBJETIVO_TEMPLATE,
  DEFAULT_PSYCHOSOCIAL_NOTE,
  OFFICIAL_COUNSELING_CATEGORIES,
  OFFICIAL_CASE_TYPOLOGIES,
  OFFICIAL_PREVENTION_THEMES,
} from "@/lib/informeGestionConstants";
import {
  saveAnnualReportAction,
  aggregateAnnualStatsAction,
  generateSituationalDiagnosisAiAction,
  generateComparativeAnalysisAiAction,
  generateAnnualConclusionsAiAction,
  generateAnnualAchievementsKnotsAiAction,
} from "./actions";

interface Props {
  report?: AnnualManagementReportRow;
  schoolYears: SchoolYearRow[];
  selectedYearId?: string;
  defaultReportCode?: string;
  currentUserId: string;
  currentUserName: string;
  currentUserEmail?: string;
  currentUserRole: string;
  institutionName: string;
  institutionDistrict?: string;
  deceTeam?: UserRow[];
}

export default function AnnualReportForm({
  report,
  schoolYears,
  selectedYearId,
  defaultReportCode,
  currentUserId,
  currentUserName,
  currentUserEmail,
  currentUserRole,
  institutionName,
  institutionDistrict,
  deceTeam,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [aiLoading, setAiLoading] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Año lectivo
  const activeYear =
    schoolYears.find((y) => y.id === (report?.school_year_id || selectedYearId)) ||
    schoolYears[0];
  const [schoolYearId, setSchoolYearId] = useState(
    report?.school_year_id || activeYear?.id || ""
  );
  const [schoolYearText, setSchoolYearText] = useState(
    report?.school_year_text || activeYear?.name || currentSchoolYearText()
  );

  // Modalidad de Informe (Departamental vs Individual)
  const [reportType, setReportType] = useState<ManagementReportType>(
    report?.report_type || "DEPARTAMENTAL"
  );

  // Código correlativo y Fecha
  const [reportCode, setReportCode] = useState(
    report?.report_code || defaultReportCode || `Mineduc-CZ3-18D02-UESR-DECE-MJ-${schoolYearText.replace(/\s+/g, "")}-001`
  );
  const [reportDate, setReportDate] = useState(
    report?.report_date || new Date().toISOString().split("T")[0]
  );
  const [titleTopic, setTitleTopic] = useState(
    report?.title_topic ||
      `INFORME DE GESTIÓN DEL DECE DE LA ${institutionName.toUpperCase()} DURANTE EL AÑO LECTIVO ${schoolYearText}`
  );

  // 1. Destinatarios
  const [recipients, setRecipients] = useState<ManagementReportRecipientItem[]>(
    () => {
      if (report?.recipients_json) {
        try { return JSON.parse(report.recipients_json); } catch {}
      }
      return [
        { name: "", cargo: "RECTOR / RECTORA DE LA IE", extension: "", email: "" },
        { name: "", cargo: `DECE DISTRITAL - ${institutionDistrict ? `DISTRITO ${institutionDistrict}` : "DISTRITO DE EDUCACIÓN"}`, extension: "", email: "" },
      ];
    }
  );

  // 1. Profesionales Responsables
  const [professionals, setProfessionals] = useState<ManagementReportProfessionalItem[]>(
    () => {
      if (report?.professionals_json) {
        try { return JSON.parse(report.professionals_json); } catch {}
      }
      if (deceTeam && deceTeam.length > 0) {
        return deceTeam.map((u) => ({
          user_id: u.id,
          name: u.name,
          cargo: u.role === "ADMIN" ? "COORDINADORA DECE" : "ANALISTA DECE",
          extension: "",
          email: u.email || "",
          coverage_students: 0,
          coverage_jornadas: "Matutina",
          coverage_levels: "Inicial, Básica, Bachillerato",
          tenure_time: `Durante el año lectivo ${schoolYearText}`,
        }));
      }
      return [
        {
          user_id: currentUserId,
          name: currentUserName,
          cargo: currentUserRole === "ADMIN" ? "COORDINADORA DECE" : "ANALISTA DECE",
          extension: "",
          email: currentUserEmail || "",
          coverage_students: 0,
          coverage_jornadas: "Matutina",
          coverage_levels: "Inicial, Básica, Bachillerato",
          tenure_time: `Durante el año lectivo ${schoolYearText}`,
        },
      ];
    }
  );

  // 2. Antecedentes
  const [antecedentesLegal, setAntecedentesLegal] = useState(
    report?.antecedentes_legal || DEFAULT_ANTECEDENTES_LEGAL
  );
  const [situationalDiagnosis, setSituationalDiagnosis] = useState(
    report?.situational_diagnosis || ""
  );

  // 3 & 4. Alcance y Objetivos
  const [alcance, setAlcance] = useState(
    report?.alcance ||
      DEFAULT_ALCANCE_TEMPLATE.replace("{INSTITUCION}", institutionName).replace(
        "{DISTRITO}",
        institutionDistrict ? `Distrito ${institutionDistrict}` : "Distrital"
      )
  );
  const [objetivos, setObjetivos] = useState(
    report?.objetivos || DEFAULT_OBJETIVO_TEMPLATE.replace("{ANIO_LECTIVO}", schoolYearText)
  );

  // 4.1 Eje de Consejería: Tabla de Atenciones (6 categorías)
  const [counselingStats, setCounselingStats] = useState<CounselingStatRow[]>(() => {
    if (report?.counseling_stats_json) {
      try { return JSON.parse(report.counseling_stats_json); } catch {}
    }
    return OFFICIAL_COUNSELING_CATEGORIES.map((cat) => ({
      category: cat,
      values_by_professional: { [currentUserName]: 0 },
      total: 0,
    }));
  });

  // 4.1 Eje de Consejería: Tabla de Tipologías (28 tipologías)
  const [caseTypologies, setCaseTypologies] = useState<CaseTypologyStatRow[]>(() => {
    if (report?.case_typologies_json) {
      try { return JSON.parse(report.case_typologies_json); } catch {}
    }
    return OFFICIAL_CASE_TYPOLOGIES.map((typ) => ({
      typology: typ,
      values_by_professional: { [currentUserName]: 0 },
      total: 0,
    }));
  });

  // 4.1 Análisis Comparativo 2 años lectivos
  const [comparativeAnalysis, setComparativeAnalysis] = useState<ComparativeAnalysisRow[]>(
    () => {
      if (report?.comparative_analysis_json) {
        try { return JSON.parse(report.comparative_analysis_json); } catch {}
      }
      return OFFICIAL_CASE_TYPOLOGIES.map((typ) => ({
        typology: typ,
        previous_year_count: 0,
        current_year_count: 0,
        comparative_analysis: "Sin variación significativa registrada.",
      }));
    }
  );

  // 4.2 Eje de Atención Psicosocial (Nota)
  const [psychosocialNote, setPsychosocialNote] = useState(
    report?.psychosocial_note || DEFAULT_PSYCHOSOCIAL_NOTE
  );

  // 4.3 Eje Promoción y Prevención
  const [preventionProjects, setPreventionProjects] = useState<PreventionProjectRow[]>(
    () => {
      if (report?.prevention_projects_json) {
        try { return JSON.parse(report.prevention_projects_json); } catch {}
      }
      return OFFICIAL_PREVENTION_THEMES.map((theme) => ({
        theme,
        activities_count: 0,
        students_beneficiaries: 0,
        families_beneficiaries: 0,
        authorities_beneficiaries: 0,
        teachers_beneficiaries: 0,
      }));
    }
  );

  // 4.4 Procesos Pendientes
  const [pendingProcesses, setPendingProcesses] = useState(
    report?.pending_processes ||
      `1. Seguimiento continuo a derivaciones externas remitidas a centros de salud (MSP) y JCPDNA.\n2. Casos con medidas de protección administrativa en etapa de monitoreo.\n3. Acompañamiento a estudiantes en proceso de reinserción escolar.`
  );

  // 4.5 Logros y Nudos Críticos
  const [achievements, setAchievements] = useState(
    report?.achievements ||
      `1. Atención y acompañamiento psicosocial oportuno al 100% de alertas docentes y situaciones de vulnerabilidad detectadas.\n2. Ejecución integral de talleres de sensibilización y proyectos de prevención en violencia, proyecto de vida y habilidades socioemocionales.\n3. Articulación interdisciplinaria constante con autoridades institucionales, docentes tutores y entidades de protección.`
  );
  const [criticalKnots, setCriticalKnots] = useState(
    report?.critical_knots ||
      `1. Demora en la asignación de citas y turnos en centros especializados externos de salud mental para atención psicoterapéutica.\n2. Intermitencia o falta de compromiso de ciertos representantes legales en las convocatorias y acuerdos de corresponsabilidad.\n3. Alta demanda de atención psicosocial que sobrepasa el ratio técnico de estudiantes asignados por profesional DECE.`
  );

  // Conclusiones (4 Ejes)
  const [conclusionsCounseling, setConclusionsCounseling] = useState(
    report?.conclusions_counseling ||
      `Eje de Consejería:\nSe brindó atención oportuna, orientación psicosocial y asesoramiento constante a estudiantes, familias y docentes. Se priorizó el diálogo reflexivo, la resolución pacífica de conflictos y la activación ágil de protocolos ministeriales ante cualquier vulneración de derechos.`
  );
  const [conclusionsPrevention, setConclusionsPrevention] = useState(
    report?.conclusions_prevention ||
      `Eje de Promoción y Prevención:\nSe consolidaron espacios de participación estudiantil mediante campañas de prevención de violencia, proyecto de vida y fortalecimiento de factores protectores, reduciendo situaciones de riesgo dentro del entorno escolar.`
  );
  const [conclusionsPsychosocial, setConclusionsPsychosocial] = useState(
    report?.conclusions_psychosocial ||
      `Eje de Atención Psicosocial:\nDurante el año lectivo se brindó acompañamiento técnico a los casos reportados, coordinando planes de restitución y derivaciones externas con la debida reserva, sin incurrir en tratamientos clínicos, en estricto apego al Modelo de Gestión DECE.`
  );
  const [conclusionsInclusion, setConclusionsInclusion] = useState(
    report?.conclusions_inclusion ||
      `Eje de Inclusión Socioeducativa:\nSe promovieron adaptaciones y ajustes razonables (DUA) para estudiantes con necesidades educativas específicas y en situación de vulnerabilidad, garantizando su permanencia y culminación exitosa del año escolar.`
  );

  // Recomendaciones
  const [recommendationsInstitutional, setRecommendationsInstitutional] = useState(
    report?.recommendations_institutional ||
      `1. Mantener y fortalecer la articulación periódica entre los docentes tutores y el equipo DECE para la remisión inmediata de alertas tempranas.\n2. Impulsar espacios continuos de capacitación docente sobre el Diseño Universal para el Aprendizaje (DUA) y estrategias de manejo de aula inclusivas.\n3. Fomentar la corresponsabilidad obligatoria de padres y madres de familia en el seguimiento académico y comportamental de sus representados.`
  );
  const [recommendationsDistrict, setRecommendationsDistrict] = useState(
    report?.recommendations_district ||
      `1. Gestionar mesas intersectoriales distritales con el Ministerio de Salud Pública (MSP) para agilizar la atención psicológica especializada a estudiantes derivados.\n2. Dotar de mayor equipamiento tecnológico y espacios físicos confidenciales adecuados para la labor de los profesionales DECE en las instituciones educativas.\n3. Promover capacitaciones técnicas continuas desde la Dirección Distrital sobre reformas normativas y protocolos de actuación DECE.`
  );

  // Firmas
  const [signatures, setSignatures] = useState<ManagementReportSignatureItem[]>(
    () => {
      if (report?.signatures_json) {
        try { return JSON.parse(report.signatures_json); } catch {}
      }
      return [
        {
          name: currentUserName,
          cargo: currentUserRole === "ADMIN" ? "COORDINADORA DECE" : "ANALISTA DECE",
          date: reportDate,
          type: "DESARROLLO",
        },
        {
          name: "",
          cargo: "RECTOR / RECTORA DE LA IE",
          date: reportDate,
          type: "APROBACION",
        },
      ];
    }
  );

  // Nombres de profesionales actuales
  const professionalNames = useMemo(
    () => professionals.map((p) => p.name || "Profesional DECE"),
    [professionals]
  );

  // ⚡ Autocarga inteligente de estadísticas desde la base de datos
  const handleAutoLoadStats = () => {
    if (!schoolYearId) {
      alert("Por favor selecciona primero un año lectivo.");
      return;
    }
    setAiLoading("autoload");
    startTransition(async () => {
      const res = await aggregateAnnualStatsAction(schoolYearId, reportType);
      setAiLoading(null);
      if (res.error) {
        setErrorMessage(res.error);
        return;
      }
      if (res.stats) {
        const s = res.stats;
        setReportCode(s.reportCode);
        setTitleTopic(s.titleTopic);
        setRecipients(s.recipients);
        setProfessionals(s.professionals);
        setAntecedentesLegal(s.antecedentesLegal);
        setSituationalDiagnosis(s.situationalDiagnosis);
        setAlcance(s.alcance);
        setObjetivos(s.objetivos);
        setCounselingStats(s.counselingStats);
        setCaseTypologies(s.caseTypologies);
        setComparativeAnalysis(s.comparativeAnalysis);
        setPsychosocialNote(s.psychosocialNote);
        setPreventionProjects(s.preventionProjects);
        setPendingProcesses(s.pendingProcesses);
        setAchievements(s.achievements);
        setCriticalKnots(s.criticalKnots);
        setConclusionsCounseling(s.conclusionsCounseling);
        setConclusionsPrevention(s.conclusionsPrevention);
        setConclusionsPsychosocial(s.conclusionsPsychosocial);
        setConclusionsInclusion(s.conclusionsInclusion);
        setRecommendationsInstitutional(s.recommendationsInstitutional);
        setRecommendationsDistrict(s.recommendationsDistrict);
        setSignatures(s.signatures);
        setSuccessMessage("¡Datos del año lectivo precargados y totalizados exitosamente desde el sistema!");
      }
    });
  };

  // Agregar profesional manual
  const handleAddProfessional = () => {
    const newName = `Profesional ${professionals.length + 1}`;
    const newP: ManagementReportProfessionalItem = {
      name: newName,
      cargo: "ANALISTA DECE",
      coverage_students: 0,
      coverage_jornadas: "Matutina",
      coverage_levels: "Básica y Bachillerato",
      tenure_time: `Durante el año lectivo ${schoolYearText}`,
    };
    setProfessionals([...professionals, newP]);

    // Actualizar columnas en counselingStats y caseTypologies
    setCounselingStats((prev) =>
      prev.map((row) => ({
        ...row,
        values_by_professional: { ...row.values_by_professional, [newName]: 0 },
      }))
    );
    setCaseTypologies((prev) =>
      prev.map((row) => ({
        ...row,
        values_by_professional: { ...row.values_by_professional, [newName]: 0 },
      }))
    );

    // Agregar firma de desarrollo
    setSignatures((prev) => [
      ...prev.filter((s) => s.type === "DESARROLLO"),
      { name: newName, cargo: "ANALISTA DECE", date: reportDate, type: "DESARROLLO" },
      ...prev.filter((s) => s.type === "APROBACION"),
    ]);
  };

  // Quitar profesional
  const handleRemoveProfessional = (index: number) => {
    if (professionals.length <= 1) {
      alert("Debe haber al menos un profesional en el informe.");
      return;
    }
    const removedName = professionals[index].name;
    const newProfs = professionals.filter((_, i) => i !== index);
    setProfessionals(newProfs);

    setCounselingStats((prev) =>
      prev.map((row) => {
        const copy = { ...row.values_by_professional };
        delete copy[removedName];
        const newTotal = Object.values(copy).reduce((a, b) => a + (Number(b) || 0), 0);
        return { ...row, values_by_professional: copy, total: newTotal };
      })
    );

    setCaseTypologies((prev) =>
      prev.map((row) => {
        const copy = { ...row.values_by_professional };
        delete copy[removedName];
        const newTotal = Object.values(copy).reduce((a, b) => a + (Number(b) || 0), 0);
        return { ...row, values_by_professional: copy, total: newTotal };
      })
    );
  };

  // Modificar valor en tabla 1 (Atenciones)
  const handleCounselingValueChange = (catIdx: number, profName: string, valStr: string) => {
    const val = parseInt(valStr, 10) || 0;
    setCounselingStats((prev) => {
      const next = [...prev];
      const row = { ...next[catIdx] };
      const values = { ...row.values_by_professional, [profName]: val };
      const total = Object.values(values).reduce((a, b) => a + (Number(b) || 0), 0);
      row.values_by_professional = values;
      row.total = total;
      next[catIdx] = row;
      return next;
    });
  };

  // Modificar valor en tabla 2 (Tipologías)
  const handleTypologyValueChange = (typIdx: number, profName: string, valStr: string) => {
    const val = parseInt(valStr, 10) || 0;
    setCaseTypologies((prev) => {
      const next = [...prev];
      const row = { ...next[typIdx] };
      const values = { ...row.values_by_professional, [profName]: val };
      const total = Object.values(values).reduce((a, b) => a + (Number(b) || 0), 0);
      row.values_by_professional = values;
      row.total = total;
      next[typIdx] = row;
      return next;
    });

    // Actualizar también current_year_count en la tabla comparativa
    setComparativeAnalysis((prev) => {
      const next = [...prev];
      if (next[typIdx]) {
        const currTotal = Object.values({
          ...caseTypologies[typIdx].values_by_professional,
          [profName]: val,
        }).reduce((a, b) => a + (Number(b) || 0), 0);
        next[typIdx] = { ...next[typIdx], current_year_count: currTotal };
      }
      return next;
    });
  };

  // IA: Diagnóstico Situacional
  const handleAiDiagnosis = async () => {
    setAiLoading("diagnosis");
    const res = await generateSituationalDiagnosisAiAction({
      schoolYearText,
      reportType,
      professionalsCount: professionals.length,
    });
    setAiLoading(null);
    if ("error" in res) {
      setErrorMessage(res.error);
    } else if (res.text) {
      setSituationalDiagnosis(res.text);
      setSuccessMessage("¡Diagnóstico situacional redactado con éxito!");
    }
  };

  // IA: Análisis Comparativo de Tendencias
  const handleAiComparativeAnalysis = async () => {
    setAiLoading("comparative");
    const typData = comparativeAnalysis.map((c) => ({
      typology: c.typology,
      prev: c.previous_year_count,
      curr: c.current_year_count,
    }));
    const res = await generateComparativeAnalysisAiAction({ typologiesData: typData });
    setAiLoading(null);
    if ("error" in res) {
      setErrorMessage(res.error);
    } else {
      setComparativeAnalysis((prev) =>
        prev.map((c) => ({
          ...c,
          comparative_analysis: res[c.typology] || c.comparative_analysis,
        }))
      );
      setSuccessMessage("¡Análisis comparativo de tendencias generado por IA!");
    }
  };

  // IA: Conclusiones y Recomendaciones
  const handleAiConclusions = async () => {
    setAiLoading("conclusions");
    const totalAttentions = counselingStats.reduce((acc, row) => acc + row.total, 0);
    const totalCases = caseTypologies.reduce((acc, row) => acc + row.total, 0);
    const topTyp = caseTypologies
      .filter((t) => t.total > 0)
      .map((t) => `${t.typology} (${t.total})`)
      .join(", ") || "Acompañamiento preventivo";

    const res = await generateAnnualConclusionsAiAction({
      schoolYearText,
      totalAttentions,
      totalCases,
      topTypologies: topTyp,
      reportType,
    });
    setAiLoading(null);
    if ("error" in res) {
      setErrorMessage(res.error);
    } else {
      setConclusionsCounseling(res.conclusionsCounseling);
      setConclusionsPrevention(res.conclusionsPrevention);
      setConclusionsPsychosocial(res.conclusionsPsychosocial);
      setConclusionsInclusion(res.conclusionsInclusion);
      setRecommendationsInstitutional(res.recommendationsInstitutional);
      setRecommendationsDistrict(res.recommendationsDistrict);
      setSuccessMessage("¡Conclusiones por ejes y recomendaciones generadas con éxito!");
    }
  };

  // IA: Logros y Nudos Críticos
  const handleAiAchievementsKnots = async () => {
    setAiLoading("knots");
    const totalAttentions = counselingStats.reduce((acc, row) => acc + row.total, 0);
    const totalCases = caseTypologies.reduce((acc, row) => acc + row.total, 0);

    const res = await generateAnnualAchievementsKnotsAiAction({
      schoolYearText,
      totalAttentions,
      totalCases,
    });
    setAiLoading(null);
    if ("error" in res) {
      setErrorMessage(res.error);
    } else {
      setAchievements(res.achievements);
      setCriticalKnots(res.criticalKnots);
      setSuccessMessage("¡Logros alcanzados y nudos críticos redactados con IA!");
    }
  };

  // Guardar Informe
  const handleSave = () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    startTransition(async () => {
      const distributivoSummary = {
        nucleoName: institutionName,
        totalProfessionals: professionals.length,
        rows: professionals.map((p, idx) => ({
          orderNum: idx + 1,
          name: p.name,
          cargo: p.cargo,
          coverageStudents: p.coverage_students || 0,
          coverageJornadas: p.coverage_jornadas || "Matutina",
          coverageLevels: p.coverage_levels || "Básica y Bachillerato",
          tenureTime: p.tenure_time || `Durante el año lectivo ${schoolYearText}`,
        })),
      };

      const res = await saveAnnualReportAction({
        id: report?.id,
        school_year_id: schoolYearId,
        school_year_text: schoolYearText,
        report_type: reportType,
        report_code: reportCode,
        report_date: reportDate,
        title_topic: titleTopic,
        recipients_json: JSON.stringify(recipients),
        professionals_json: JSON.stringify(professionals),
        antecedentes_legal: antecedentesLegal,
        situational_diagnosis: situationalDiagnosis,
        distributivo_summary_json: JSON.stringify(distributivoSummary),
        alcance,
        objetivos,
        counseling_stats_json: JSON.stringify(counselingStats),
        case_typologies_json: JSON.stringify(caseTypologies),
        comparative_analysis_json: JSON.stringify(comparativeAnalysis),
        psychosocial_note: psychosocialNote,
        prevention_projects_json: JSON.stringify(preventionProjects),
        pending_processes: pendingProcesses,
        achievements,
        critical_knots: criticalKnots,
        conclusions_counseling: conclusionsCounseling,
        conclusions_prevention: conclusionsPrevention,
        conclusions_psychosocial: conclusionsPsychosocial,
        conclusions_inclusion: conclusionsInclusion,
        recommendations_institutional: recommendationsInstitutional,
        recommendations_district: recommendationsDistrict,
        annexes_notes: "Registro fotográfico de proyectos de promoción y prevención sustentado en archivo digital/físico DECE.",
        annex_photos_json: "[]",
        signatures_json: JSON.stringify(signatures),
      });

      if (res.error) {
        setErrorMessage(res.error);
      } else {
        router.push(`/informe-gestion/${res.id}/imprimir`);
      }
    });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-24">
      {/* Barra de Encabezado Superior */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/informe-gestion"
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
            >
              ← Volver a Informes de Gestión
            </Link>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
            {report ? "Editar Informe de Fin de Gestión" : "Nuevo Informe de Fin de Gestión DECE"}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Formato técnico ministerial anual conforme al Acuerdo Nro. MINEDUC-MINEDUC-2023-00010-A.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleAutoLoadStats}
            disabled={isPending || !!aiLoading}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
            title="Calcula y carga las atenciones, tipologías de casos, proyectos y distributivo desde el sistema"
          >
            {aiLoading === "autoload" ? (
              <span className="animate-spin inline-block mr-1">⏳</span>
            ) : (
              <span>⚡</span>
            )}
            Autocargar Datos del Año Lectivo
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isPending || !!aiLoading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
          >
            {isPending ? "Guardando..." : "💾 Guardar y Ver Formato Oficial"}
          </button>
        </div>
      </div>

      {/* Alertas de Estado */}
      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-medium">
          ⚠️ {errorMessage}
        </div>
      )}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-700 font-medium">
          ✅ {successMessage}
        </div>
      )}

      {/* Selector de Modalidad (Departamental vs Individual) */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-xs font-bold text-blue-900 uppercase tracking-wider">
              Modalidad de Elaboración del Informe
            </span>
            <p className="text-xs text-blue-700 mt-0.5">
              Elige si consolidas a todo el equipo o si generas tu informe individual autónomo.
            </p>
          </div>

          <div className="inline-flex rounded-lg border border-blue-300 bg-white p-1 shadow-sm">
            <button
              type="button"
              onClick={() => {
                setReportType("DEPARTAMENTAL");
                setReportCode((prev) => prev.replace("INF-IND-DECE", "INF-GESTION-DECE"));
              }}
              className={`px-3.5 py-1.5 rounded-md text-xs font-bold transition-all ${
                reportType === "DEPARTAMENTAL"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              🏢 Departamental / Consolidado
            </button>
            <button
              type="button"
              onClick={() => {
                setReportType("INDIVIDUAL");
                setReportCode((prev) => prev.replace("INF-GESTION-DECE", "INF-IND-DECE"));
              }}
              className={`px-3.5 py-1.5 rounded-md text-xs font-bold transition-all ${
                reportType === "INDIVIDUAL"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              👤 Individual del Profesional
            </button>
          </div>
        </div>

        {reportType === "INDIVIDUAL" ? (
          <div className="mt-3 text-xs bg-white/80 p-2.5 rounded border border-blue-200 text-blue-800">
            <strong>Modo Individual Activo:</strong> El informe contendrá únicamente tu cobertura de estudiantes, atenciones registradas, casos abordados y firmas personales. Ideal si tus colegas no utilizan el sistema.
          </div>
        ) : (
          <div className="mt-3 text-xs bg-white/80 p-2.5 rounded border border-blue-200 text-blue-800">
            <strong>Modo Departamental Activo:</strong> El informe consolida y totaliza a todos los profesionales DECE de la institución. Puedes agregar colegas manualmente o editar sus columnas estadísticas libremente.
          </div>
        )}
      </div>

      {/* 1. DATOS GENERALES */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 space-y-4">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-200 pb-2 flex items-center justify-between">
          <span>1. Datos Generales del Informe</span>
          <span className="text-[11px] font-normal text-slate-500">Plantilla Oficial MINEDUC</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Año Lectivo</label>
            <select
              value={schoolYearId}
              onChange={(e) => {
                const sId = e.target.value;
                setSchoolYearId(sId);
                const match = schoolYears.find((y) => y.id === sId);
                if (match) setSchoolYearText(match.name);
              }}
              className="w-full text-xs p-2 border border-slate-300 rounded-lg bg-white"
            >
              {schoolYears.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.name} {y.is_active ? " (Activo)" : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Código del Informe (Oficial)</label>
            <input
              type="text"
              value={reportCode}
              readOnly
              className="w-full text-xs p-2 border border-slate-300 rounded-lg font-mono font-bold bg-slate-100 text-slate-800 cursor-not-allowed select-all"
              title="Generado automáticamente según la codificación oficial DECE"
            />
            <p className="text-[10px] text-slate-400 mt-0.5">Consecutivo oficial inmutable</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Fecha de Emisión</label>
            <input
              type="date"
              value={reportDate}
              onChange={(e) => setReportDate(e.target.value)}
              className="w-full text-xs p-2 border border-slate-300 rounded-lg"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Tema Oficial del Informe</label>
          <input
            type="text"
            value={titleTopic}
            onChange={(e) => setTitleTopic(e.target.value)}
            className="w-full text-xs p-2 border border-slate-300 rounded-lg font-semibold text-slate-800"
          />
        </div>

        {/* Destinatarios */}
        <div className="pt-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-700 uppercase">Informe dirigido a:</span>
            <button
              type="button"
              onClick={() =>
                setRecipients([...recipients, { name: "", cargo: "AUTORIDAD / DECE", extension: "", email: "" }])
              }
              className="text-[11px] font-semibold text-blue-600 hover:text-blue-800"
            >
              + Agregar Destinatario
            </button>
          </div>
          <div className="space-y-2">
            {recipients.map((r, idx) => (
              <div key={idx} className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded border border-slate-200">
                <input
                  type="text"
                  placeholder="Nombre de la autoridad (ej. Psc. Fernando Pérez)"
                  value={r.name}
                  onChange={(e) => {
                    const next = [...recipients];
                    next[idx].name = e.target.value;
                    setRecipients(next);
                  }}
                  className="text-xs p-1.5 border border-slate-300 rounded bg-white"
                />
                <input
                  type="text"
                  placeholder="Cargo (ej. RECTOR / DECE DISTRITAL)"
                  value={r.cargo}
                  onChange={(e) => {
                    const next = [...recipients];
                    next[idx].cargo = e.target.value;
                    setRecipients(next);
                  }}
                  className="text-xs p-1.5 border border-slate-300 rounded bg-white"
                />
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Contacto / Correo"
                    value={r.email || r.extension || ""}
                    onChange={(e) => {
                      const next = [...recipients];
                      next[idx].email = e.target.value;
                      setRecipients(next);
                    }}
                    className="text-xs p-1.5 border border-slate-300 rounded bg-white flex-1"
                  />
                  {recipients.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setRecipients(recipients.filter((_, i) => i !== idx))}
                      className="text-red-500 hover:text-red-700 text-xs px-2 py-1"
                      title="Quitar"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Profesionales Responsables */}
        <div className="pt-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-700 uppercase">
              Funcionarios Responsables ({professionals.length})
            </span>
            {reportType === "DEPARTAMENTAL" && (
              <button
                type="button"
                onClick={handleAddProfessional}
                className="text-[11px] font-semibold text-blue-600 hover:text-blue-800"
              >
                + Agregar Profesional DECE
              </button>
            )}
          </div>
          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-2">Nombre y Apellido</th>
                  <th className="p-2">Cargo</th>
                  <th className="p-2 text-center">Estudiantes</th>
                  <th className="p-2">Jornadas</th>
                  <th className="p-2">Niveles Educativos</th>
                  <th className="p-2">Tiempo de Labor</th>
                  {reportType === "DEPARTAMENTAL" && <th className="p-2 text-center">Acción</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {professionals.map((p, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="p-2 font-medium">
                      <input
                        type="text"
                        value={p.name}
                        onChange={(e) => {
                          const next = [...professionals];
                          next[idx].name = e.target.value;
                          setProfessionals(next);
                        }}
                        className="w-full text-xs p-1 border border-slate-300 rounded"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="text"
                        value={p.cargo}
                        onChange={(e) => {
                          const next = [...professionals];
                          next[idx].cargo = e.target.value;
                          setProfessionals(next);
                        }}
                        className="w-full text-xs p-1 border border-slate-300 rounded"
                      />
                    </td>
                    <td className="p-2 text-center">
                      <input
                        type="number"
                        value={p.coverage_students || 0}
                        onChange={(e) => {
                          const next = [...professionals];
                          next[idx].coverage_students = parseInt(e.target.value, 10) || 0;
                          setProfessionals(next);
                        }}
                        className="w-20 text-xs p-1 border border-slate-300 rounded text-center"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="text"
                        value={p.coverage_jornadas || "Matutina"}
                        onChange={(e) => {
                          const next = [...professionals];
                          next[idx].coverage_jornadas = e.target.value;
                          setProfessionals(next);
                        }}
                        className="w-full text-xs p-1 border border-slate-300 rounded"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="text"
                        value={p.coverage_levels || "Básica y Bachillerato"}
                        onChange={(e) => {
                          const next = [...professionals];
                          next[idx].coverage_levels = e.target.value;
                          setProfessionals(next);
                        }}
                        className="w-full text-xs p-1 border border-slate-300 rounded"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="text"
                        value={p.tenure_time || `Durante el año lectivo ${schoolYearText}`}
                        onChange={(e) => {
                          const next = [...professionals];
                          next[idx].tenure_time = e.target.value;
                          setProfessionals(next);
                        }}
                        className="w-full text-xs p-1 border border-slate-300 rounded"
                      />
                    </td>
                    {reportType === "DEPARTAMENTAL" && (
                      <td className="p-2 text-center">
                        {professionals.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveProfessional(idx)}
                            className="text-red-500 hover:text-red-700 font-bold"
                            title="Quitar profesional"
                          >
                            ✕
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 2. ANTECEDENTES Y DIAGNÓSTICO SITUACIONAL */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 space-y-4">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-200 pb-2">
          2. Antecedentes y Diagnóstico Situacional
        </h2>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Base Legal (Art. 26 Constitución, Art. 50.2 LOEI, Acuerdo Nro. MINEDUC-MINEDUC-2023-00010-A)
          </label>
          <textarea
            rows={4}
            value={antecedentesLegal}
            onChange={(e) => setAntecedentesLegal(e.target.value)}
            className="w-full text-xs p-2.5 border border-slate-300 rounded-lg bg-slate-50 text-slate-700 leading-relaxed font-mono"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-semibold text-slate-700">
              Diagnóstico situacional de la institución educativa
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleAiDiagnosis}
                disabled={aiLoading === "diagnosis"}
                className="text-[11px] px-2 py-1 bg-purple-50 text-purple-700 border border-purple-200 rounded hover:bg-purple-100 font-semibold flex items-center gap-1"
              >
                {aiLoading === "diagnosis" ? "Redactando..." : "✨ Diagnóstico con IA"}
              </button>
              <VoiceDictationButton targetId="input_recommendations_district" compact onResult={(text: string) => setRecommendationsDistrict((prev) => (prev ? `${prev}\n${text}` : text))} />
            </div>
            <textarea id="input_recommendations_district" rows={4} value={recommendationsDistrict}
              onChange={(e) => setRecommendationsDistrict(e.target.value)}
              className="w-full text-xs p-2.5 border border-slate-300 rounded-lg text-slate-800 leading-relaxed"
            />
          </div>
        </div>
      </div>

      {/* FIRMAS DE LEGALIZACIÓN */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 space-y-4">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-200 pb-2">
          Firmas de Legalización
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border border-slate-200 rounded-lg p-3 bg-slate-50 space-y-2">
            <span className="text-xs font-bold text-blue-900 uppercase">
              Desarrollo del Documento (Profesionales DECE)
            </span>
            {signatures
              .filter((s) => s.type === "DESARROLLO")
              .map((s, idx) => (
                <div key={idx} className="bg-white p-2 rounded border border-slate-200 text-xs">
                  <p className="font-bold text-slate-800">{s.name}</p>
                  <p className="text-slate-500">{s.cargo}</p>
                  <p className="text-[11px] text-slate-400 mt-1">Fecha: {s.date || reportDate}</p>
                </div>
              ))}
          </div>

          <div className="border border-slate-200 rounded-lg p-3 bg-slate-50 space-y-2">
            <span className="text-xs font-bold text-blue-900 uppercase">
              Aprobación del Documento (Rectorado)
            </span>
            {signatures
              .filter((s) => s.type === "APROBACION")
              .map((s, idx) => (
                <div key={idx} className="bg-white p-2 rounded border border-slate-200 text-xs space-y-2">
                  <input
                    type="text"
                    placeholder="Nombre del Rector/a o Autoridad"
                    value={s.name}
                    onChange={(e) => {
                      const next = [...signatures];
                      const targetIdx = next.findIndex((item) => item.type === "APROBACION");
                      if (targetIdx >= 0) {
                        next[targetIdx].name = e.target.value;
                        setSignatures(next);
                      }
                    }}
                    className="w-full text-xs p-1.5 border border-slate-300 rounded font-semibold"
                  />
                  <input
                    type="text"
                    placeholder="Cargo de la Autoridad"
                    value={s.cargo}
                    onChange={(e) => {
                      const next = [...signatures];
                      const targetIdx = next.findIndex((item) => item.type === "APROBACION");
                      if (targetIdx >= 0) {
                        next[targetIdx].cargo = e.target.value;
                        setSignatures(next);
                      }
                    }}
                    className="w-full text-xs p-1.5 border border-slate-300 rounded"
                  />
                  <p className="text-[11px] text-slate-400">Fecha: {s.date || reportDate}</p>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Botón Flotante / Inferior de Guardar */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
        <Link
          href="/informe-gestion"
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
        >
          Cancelar
        </Link>
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending || !!aiLoading}
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shadow-md flex items-center gap-2"
        >
          {isPending ? "Guardando..." : "💾 Guardar y Generar Documento Oficial"}
        </button>
      </div>
    </div>
  );
}
