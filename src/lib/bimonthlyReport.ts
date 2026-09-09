import type { BimonthlyProcessItem } from "./types";

/**
 * Obtiene las iniciales de una persona separadas por puntos (ej. L.A.S.A.)
 * Utilizado por protocolo de confidencialidad en casos de violencia sexual.
 */
export function getStudentInitials(fullName: string): string {
  if (!fullName) return "";
  const clean = fullName.trim();
  if (/^[A-Z](\.[A-Z])*\.?$/.test(clean)) return clean;

  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  return parts.map((p) => p[0].toUpperCase() + ".").join("");
}

/**
 * Periodos bimensuales estándar del año lectivo en Ecuador
 */
export const BIMONTHLY_PERIODS = [
  "Mayo - Junio",
  "Julio - Agosto",
  "Septiembre - Octubre",
  "Noviembre - Diciembre",
  "Enero - Febrero",
  "Marzo - Abril",
];

/**
 * Plantilla base con los 8 procesos estándar de seguimiento al plan de acompañamiento
 * institucional para casos de violencia sexual, con redacción institucional predeterminada.
 */
export function getDefaultBimonthlyProcesses(): BimonthlyProcessItem[] {
  return [
    {
      id: "proc-1",
      process_name: "Acompañamiento legal",
      executed_by:
        "Se brinda el acompañamiento y seguimiento continuo desde las siguientes instancias:\n• Fiscalía\n• Junta Cantonal de Protección de Derechos\n• Junta Distrital de Resolución de Conflictos.",
      beneficiaries_count: "1",
      start_date: "",
      end_date: "Se desconoce",
    },
    {
      id: "proc-2",
      process_name: "Acompañamiento psicológico a la o a las víctimas",
      executed_by:
        "• Centro de Salud / MSP (o Viceministerio de la Mujer)\nLa estudiante y su representante legal refieren que el proceso de atención psicológica se mantiene en seguimiento continuo.\n• DECE\nSe brinda acompañamiento socioemocional periódico, evidenciando estabilidad emocional, adecuado desenvolvimiento escolar y red de apoyo familiar.\n• Docente Tutor\nEn diálogo con el docente tutor se informa que la estudiante se encuentra tranquila, participativa y sin alertas socioafectivas en el aula.\n• Representante Legal\nRefiere una dinámica familiar favorable, con diálogo y acompañamiento constante en el hogar.\n• Estudiante\nManifiesta sentirse respaldada, tranquila y motivada en sus actividades escolares.",
      beneficiaries_count: "1",
      start_date: "",
      end_date: "",
    },
    {
      id: "proc-3",
      process_name: "Apoyo psicológico a familiares de la o las víctimas",
      executed_by:
        "NO APLICA\nRepresentante legal refiere que no asiste a terapia psicológica o no se cuenta con consentimiento informado.",
      beneficiaries_count: "NO APLICA",
      start_date: "NO APLICA",
      end_date: "NO APLICA",
    },
    {
      id: "proc-4",
      process_name: "Apoyo psicológico a la comunidad educativa",
      executed_by:
        "• DECE (Atención psicosocial)\nTalleres preventivos en el aula sobre prevención de violencia sexual, habilidades para la vida y resolución pacífica de conflictos.",
      beneficiaries_count: "25 estudiantes",
      start_date: "",
      end_date: "",
    },
    {
      id: "proc-5",
      process_name: "Acompañamiento médico a la o a las víctimas",
      executed_by:
        "NO APLICA\nLa representante refiere que la estudiante no recibe acompañamiento médico especializado en el período.",
      beneficiaries_count: "NO APLICA",
      start_date: "NO APLICA",
      end_date: "NO APLICA",
    },
    {
      id: "proc-6",
      process_name: "Acompañamiento médico a familiares de la o las víctimas",
      executed_by:
        "NO APLICA\nRepresentante refiere que no recibe acompañamiento médico.",
      beneficiaries_count: "NO APLICA",
      start_date: "NO APLICA",
      end_date: "NO APLICA",
    },
    {
      id: "proc-7",
      process_name: "Acompañamiento pedagógico a la o a las víctimas",
      executed_by:
        "• DECE\nDiálogo continuo con Estudiante, Representante, Docente Tutor y Vicerrector. Asistencia a Juntas de Curso.\n• Docente Tutor / Docentes\nSegún refiere el docente tutor, la estudiante mantiene un desempeño académico favorable, cumplimiento puntual en tareas y adecuada adaptación escolar.\n• Vicerrectorado\nNo se registran novedades académicas ni reportes disciplinarios. Se garantizan medidas institucionales de protección y permanencia educativa.\n• Juntas de Curso\nSe ratifica el cumplimiento satisfactorio de los criterios de evaluación y aprobación del periodo académico.\n• DAI / UDAI\nNO APLICA\n• Representante legal\nAcompañamiento constante desde el hogar en las actividades escolares.",
      beneficiaries_count: "1",
      start_date: "",
      end_date: "",
    },
    {
      id: "proc-8",
      process_name: "Acciones preventivas a favor de la comunidad educativa",
      executed_by:
        "• DECE\n- Prevención \"Mi cuerpo se cuida y se respeta\"\n- Convivencia armónica y prevención de acoso escolar (bullying)\n- Prevención de consumo de alcohol y otras sustancias\n- Normas de conducta y rutas de actuación institucional",
      beneficiaries_count: "100 estudiantes",
      start_date: "",
      end_date: "",
    },
  ];
}

export function parseProcessesData(json: string): BimonthlyProcessItem[] {
  try {
    const data = JSON.parse(json);
    if (Array.isArray(data) && data.length > 0) return data;
  } catch {}
  return getDefaultBimonthlyProcesses();
}

