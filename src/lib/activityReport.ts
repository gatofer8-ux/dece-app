/**
 * Catálogos y helpers del "INFORME DE TALLERES" (actividades de promoción y
 * prevención del DECE). Puro, sin base de datos.
 */

export const ACTIVITY_REPORT_AXIS_OPTIONS = [
  "PROMOCIÓN Y PREVENCIÓN",
  "CONVIVENCIA",
  "PARTICIPACIÓN ESTUDIANTIL",
];

/** Mapea el eje interno de la actividad al texto que va en la tabla ACTIVIDAD. */
export function axisToReportLabel(axis: string | null | undefined): string {
  switch ((axis || "").toUpperCase()) {
    case "PROMOCION":
    case "PREVENCION":
      return "PROMOCIÓN Y PREVENCIÓN";
    case "CONVIVENCIA":
      return "CONVIVENCIA";
    default:
      return "PROMOCIÓN Y PREVENCIÓN";
  }
}

const LOEI_ART73 =
  "LEY ORGÁNICA REFORMATORIA DE LA LEY ORGÁNICA DE EDUCACIÓN INTERCULTURAL.\n" +
  "En atención a lo manifestado en la LOEI, Art. 73.- Atribuciones del Departamento de Consejería Estudiantil.- " +
  "Las atribuciones del Departamento de Consejería Estudiantil para el cumplimiento de sus funciones son las siguientes: " +
  "a. Asesorar a la institución educativa en la implementación de estrategias para contribuir en la construcción de " +
  "relaciones pacíficas y armónicas, en el marco de una cultura de paz y no violencia, garantizando una amplia " +
  "participación de la comunidad educativa. b. Promover en común con la comunidad educativa, espacios dignos, " +
  "participativos y seguros; así como el desarrollo y la implementación participativa de los planes y programas de " +
  "prevención de los factores de riesgo individual, psicosocial, comunitario y en emergencias naturales y antrópicas.";

/** Texto de "Base legal" sugerido según el tema de prevención de la actividad. */
export function legalBasisForTheme(theme: string | null | undefined): string {
  const extra: Record<string, string> = {
    DROGAS:
      "\n\nAsimismo, la normativa vigente sobre prevención integral del fenómeno socioeconómico de las drogas en el ámbito educativo dispone la implementación de acciones de promoción y prevención en la comunidad educativa.",
    VIOLENCIA:
      "\n\nEn concordancia con los protocolos y rutas de actuación frente a situaciones de violencia detectadas o cometidas en el sistema educativo, y con la obligación institucional de desarrollar acciones preventivas sostenidas.",
    SUICIDIO:
      "\n\nEn concordancia con los lineamientos para la prevención, detección y abordaje de situaciones de riesgo de suicidio en el ámbito educativo.",
    EMBARAZO_ADOLESCENTE:
      "\n\nEn el marco de la Estrategia Nacional de Educación Integral en Sexualidad (ENEIS) y las acciones de prevención del embarazo en niñas y adolescentes.",
    ENEIS:
      "\n\nEn el marco de la Estrategia Nacional de Educación Integral en Sexualidad (ENEIS).",
    ACOSO_CIBERACOSO:
      "\n\nEn concordancia con las directrices para la prevención y el abordaje del acoso entre pares y el ciberacoso en el sistema educativo nacional.",
  };
  return LOEI_ART73 + (extra[(theme || "").toUpperCase()] || "");
}

/** Compone el TEMA del informe: "INFORME DE TALLER SOBRE '…' DIRIGIDO A …". */
export function composeTema(topic: string | null | undefined, audience: string | null | undefined): string {
  const t = (topic || "").trim().replace(/^["“”']+|["“”']+$/g, "");
  const a = (audience || "").trim();
  const base = t ? `INFORME DE TALLER SOBRE “${t.toUpperCase()}”` : "INFORME DE TALLER";
  return a ? `${base} DIRIGIDO A ${a.toUpperCase()}` : base;
}

/** Alcance por defecto: del DECE hacia la máxima autoridad. */
export function composeScope(authorityName: string | null | undefined, institutionName: string | null | undefined): string {
  const auth = (authorityName || "la máxima autoridad").trim();
  const inst = (institutionName || "la institución educativa").trim();
  return `Del Departamento de Consejería Estudiantil hacia ${auth}, de ${inst}.`;
}

export const ACTIVITY_REPORT_FIELD_LABELS = {
  legal_basis: "Base legal del informe de taller (según normativa educativa)",
  objective_general: "Objetivo general del taller",
  objectives_specific: "Objetivos específicos del taller (lista)",
  development_analysis: "Desarrollo o análisis del taller (narrativa institucional)",
  advances: "Avances o logros del taller (lista breve)",
  critical_nodes: "Nudos críticos del taller (lista breve)",
  conclusions: "Conclusiones del informe de taller (lista)",
  recommendations: "Recomendaciones del informe de taller (lista)",
} as const;
