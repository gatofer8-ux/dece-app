import type { ObservationSubnivel, ObservationRiskLevel, ObservationContext } from "./types";

/**
 * Catálogo textual fiel a "FICHA DE OBSERVACIÓN PSICOSOCIAL – DECE" (E.D3.C1.DE11.c.),
 * formato checklist de uso institucional, no diagnóstica.
 */

export const SUBNIVEL_LABELS: Record<ObservationSubnivel, string> = {
  ELEMENTAL: "Subnivel Elemental",
  BASICA_MEDIA: "Subnivel Básica Media",
  SUPERIOR_BACHILLERATO: "Subnivel Superior (Bachillerato)",
};

export const CONTEXT_LABELS: Record<ObservationContext, string> = {
  AULA: "Aula",
  ENTREVISTA: "Entrevista",
  OTRO: "Otro",
};

export const RISK_LEVEL_LABELS: Record<ObservationRiskLevel, string> = {
  BAJO: "Riesgo Bajo",
  MEDIO: "Riesgo Medio",
  ALTO: "Riesgo Alto",
  CRITICO: "Riesgo Crítico",
};

export const RISK_LEVEL_DESCRIPTIONS: Record<ObservationRiskLevel, string[]> = {
  BAJO: ["1–2 indicadores leves", "Sin ideación suicida"],
  MEDIO: ["3 o más indicadores persistentes", "Afectación emocional o conductual"],
  ALTO: ["Ideación suicida presente", "Múltiples indicadores de riesgo"],
  CRITICO: ["Ideación activa con plan", "Autolesiones o intento previo"],
};

interface IndicatorCatalog {
  ansiosa: string[];
  depresiva: string[];
  suicida: string[];
  suicidaLabel: string;
}

export const INDICATOR_CATALOGS: Record<ObservationSubnivel, IndicatorCatalog> = {
  ELEMENTAL: {
    ansiosa: [
      "Miedo excesivo o recurrente",
      "Inquietud constante o dificultad para permanecer tranquilo",
      "Evita separarse de figuras de cuidado",
      "Llanto ante situaciones nuevas o demandantes",
      "Quejas somáticas frecuentes sin causa médica (dolor de estómago, cabeza)",
      "Sobresaltos frecuentes o hipervigilancia",
    ],
    depresiva: [
      "Llanto frecuente sin causa aparente",
      "Desinterés por el juego o actividades habituales",
      "Aislamiento o retraimiento",
      "Expresiones verbales de tristeza",
      "Irritabilidad persistente",
      "Disminución de la expresión emocional positiva",
    ],
    suicida: [
      "Comentarios sobre desaparecer o morir",
      "Juego simbólico reiterado relacionado con muerte",
      "Autolesiones leves (rasguños, golpes intencionales)",
      "Expresiones de desvalorización personal",
    ],
    suicidaLabel: "Indicadores de alerta de conducta suicida",
  },
  BASICA_MEDIA: {
    ansiosa: [
      "Preocupación excesiva",
      "Inquietud psicomotora",
      "Evitación social o escolar",
      "Tensión constante",
      "Quejas somáticas recurrentes",
      "Dificultad para concentrarse",
      "Temor excesivo a la evaluación o al error",
    ],
    depresiva: [
      "Tristeza persistente",
      "Apatía o desmotivación",
      "Baja autoestima",
      "Llanto frecuente",
      "Fatiga constante",
      "Irritabilidad sostenida",
      "Disminución del interés académico o social",
    ],
    suicida: [
      "Comentarios sobre morir o no existir",
      "Ideación suicida verbalizada",
      "Conductas autolesivas",
      "Aislamiento marcado",
      "Expresiones de desesperanza",
    ],
    suicidaLabel: "Indicadores de alerta de conducta suicida",
  },
  SUPERIOR_BACHILLERATO: {
    ansiosa: [
      "Ansiedad persistente",
      "Preocupación intensa por el futuro",
      "Evitación significativa de situaciones",
      "Insomnio referido",
      "Nerviosismo o tensión constante",
      "Dificultad para concentrarse",
      "Sensación de pérdida de control",
    ],
    depresiva: [
      "Tristeza profunda y sostenida",
      "Pérdida de interés generalizada",
      "Expresiones de vacío o desesperanza",
      "Culpa excesiva o autorreproches",
      "Baja energía o fatiga constante",
      "Desvalorización personal",
      "Aislamiento social progresivo",
    ],
    suicida: [
      "Ideación suicida",
      "Planificación suicida",
      "Intento suicida previo",
      "Despedidas inusuales",
      "Autolesiones recurrentes",
      "Expresiones verbales de desesperanza extrema",
    ],
    suicidaLabel: "Indicadores de alerta de conducta suicida (CRÍTICO)",
  },
};

export const PROTECTIVE_FACTORS = [
  "Apoyo familiar",
  "Vínculos positivos",
  "Habilidades de afrontamiento",
  "Proyecto de vida o motivación académica",
  "Acceso a apoyo institucional",
];

export const INSTITUTIONAL_ACTIONS = [
  "Observación y seguimiento DECE",
  "Entrevista individual",
  "Entrevista con familia",
  "Derivación a psicología / red de apoyo",
  "Activación de protocolo institucional",
];

/** Parsea un campo JSON de la ficha (arreglo de strings) de forma segura. */
export function parseIndicatorList(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

// ============================================================================
// FORMATO OFICIAL MINISTERIAL (FICHA DE OBSERVACIÓN DECE - CALCA FIEL)
// ============================================================================

export interface OfficialObservationQuestionDef {
  id: number;
  question: string;
  guidance: string; // Orientación técnica para el profesional DECE
}

export const OFFICIAL_OBSERVATION_QUESTIONS: OfficialObservationQuestionDef[] = [
  {
    id: 1,
    question: "¿Se evidencian conductas de agresividad?",
    guidance: "Observa reacciones verbales, físicas o gestuales desproporcionadas, hostilidad hacia pares, docentes o materiales.",
  },
  {
    id: 2,
    question: "¿Se evidencia llanto frágil o tendencia a llorar?",
    guidance: "Observa episodios de llanto contenido, susceptibilidad manifiesta ante preguntas o recuerdos, necesidad de pausas emocionales.",
  },
  {
    id: 3,
    question: "¿Se evidencia falta de adecuación al grupo?",
    guidance: "Observa dificultades para integrarse en actividades grupales, marginación voluntaria o rechazo evidente de pares.",
  },
  {
    id: 4,
    question: "¿Se evidencia desmotivación y o decaimiento?",
    guidance: "Observa postura corporal encorvada, desinterés en clase, tono de voz disminuido, expresión facial de cansancio o pesadumbre.",
  },
  {
    id: 5,
    question: "¿Se evidencian frecuentes cambios de actitud?",
    guidance: "Observa fluctuaciones repentinas de ánimo (calma a irritabilidad, tranquilidad a tristeza o ansiedad) en periodos breves.",
  },
  {
    id: 6,
    question: "¿Se evidencian dificultades de relacionamiento con sus compañeros/as de aula?",
    guidance: "Observa interacciones conflictivas, tensión al comunicarse, retraimiento o rechazo explícito hacia compañeros de paralelo.",
  },
  {
    id: 7,
    question: "¿Se identifican problemas para concentrarse   probablemente por problemas emocionales?",
    guidance: "Observa mirada perdida, dificultad para seguir instrucciones, pensamientos recurrentes expresados o bloqueo cognitivo ante la tarea.",
  },
  {
    id: 8,
    question: "¿Se evidencia dificultad de gestionar sus emociones?",
    guidance: "Observa desbordes afectivos, impotencia para autorregularse, temblores, hiperventilación, frustración intensa o confusión.",
  },
  {
    id: 9,
    question: "¿Se evidencia somnolencia durante las clases?",
    guidance: "Observa bostezos constantes, apoyar la cabeza en el pupitre, adormecimiento o referencias de insomnio y pesadillas nocturnas.",
  },
  {
    id: 10,
    question: "¿Se evidencian dificultades de relacionarse con  su docente?",
    guidance: "Observa temor, evasión de contacto visual, rechazo a la autoridad docente o silencios prolongados ante llamados del profesor/a.",
  },
  {
    id: 11,
    question: "¿Se evidencia dificultad de resolver conflictos?",
    guidance: "Observa conductas de huida/evitación extrema, sumisión paralizante o respuestas impulsivas que incrementan la tensión.",
  },
  {
    id: 12,
    question: "¿Se evidencia extrema sensibilidad?",
    guidance: "Observa respuestas emocionales intensas ante comentarios cotidianos, susceptibilidad al juicio ajeno o necesidad de contención constante.",
  },
  {
    id: 13,
    question: "¿Se identifican conductas de riesgo?",
    guidance: "Observa signos de alarma como autolesiones visibles, verbalizaciones de desesperanza, consumo de sustancias o ideación de riesgo.",
  },
  {
    id: 14,
    question: "¿Se aísla y no comparte actividades con sus compañeros/as?",
    guidance: "Observa si permanece solo/a durante recreos, horas libres o talleres, evitando espacios comunes o la compañía de pares.",
  },
  {
    id: 15,
    question: "¿Se evidencia falta de participación en las actividades?",
    guidance: "Observa negativa a intervenir oralmente, desinterés en dinámicas de aula, apatía o inhibición persistente frente al grupo.",
  },
  {
    id: 16,
    question: "¿Se observaron otras conductas que requieran atención? ¿Cuál o cuáles?",
    guidance: "Describe cualquier manifestación conductual atípica adicional (ej. hipervigilancia, sobresaltos, temores específicos o quejas somáticas).",
  },
  {
    id: 17,
    question: "¿Se observaron alguna o algunas conductas con mayor frecuencia? ¿Cuál o cuáles?",
    guidance: "Sintetiza cuáles de las conductas observadas se presentaron con carácter reiterado, intensidad predominante o impacto más significativo.",
  },
];

import type { OfficialObservationData } from "./types";

export function getDefaultOfficialObservationData(professionalName?: string): OfficialObservationData {
  return {
    duration: "",
    is_aulica: false,
    is_externa: false,
    questions: OFFICIAL_OBSERVATION_QUESTIONS.map((q) => ({
      id: q.id,
      question: q.question,
      answer: "",
      comment: "",
    })),
    care_types: {
      requires_dece: { answer: "", detail: "" },
      requires_other: { answer: "", detail: "" },
    },
    referrals: {
      internal: {
        answer: "",
        inspeccion: false,
        inclusion: false,
        medico: false,
        otro: false,
        otro_detail: "",
      },
      external: {
        answer: "",
        medica: false,
        psicologica: false,
        udai: false,
        otro: false,
        otro_detail: "",
      },
    },
    professional_name: professionalName || "",
    application_date: new Date().toISOString().slice(0, 10),
  };
}

export function parseOfficialObservationData(
  raw: any,
  professionalName?: string
): OfficialObservationData {
  const def = getDefaultOfficialObservationData(professionalName);
  if (!raw) return def;

  let parsed: any = raw;
  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return def;
    }
  }

  if (typeof parsed !== "object" || parsed === null) return def;

  return {
    duration: String(parsed.duration || ""),
    is_aulica: Boolean(parsed.is_aulica),
    is_externa: Boolean(parsed.is_externa),
    questions: Array.isArray(parsed.questions) && parsed.questions.length === OFFICIAL_OBSERVATION_QUESTIONS.length
      ? parsed.questions.map((q: any, i: number) => ({
          id: OFFICIAL_OBSERVATION_QUESTIONS[i].id,
          question: OFFICIAL_OBSERVATION_QUESTIONS[i].question,
          answer: q?.answer === "SI" || q?.answer === "NO" ? q.answer : "",
          comment: String(q?.comment || ""),
        }))
      : def.questions,
    care_types: {
      requires_dece: {
        answer: parsed.care_types?.requires_dece?.answer === "SI" || parsed.care_types?.requires_dece?.answer === "NO" ? parsed.care_types.requires_dece.answer : "",
        detail: String(parsed.care_types?.requires_dece?.detail || ""),
      },
      requires_other: {
        answer: parsed.care_types?.requires_other?.answer === "SI" || parsed.care_types?.requires_other?.answer === "NO" ? parsed.care_types.requires_other.answer : "",
        detail: String(parsed.care_types?.requires_other?.detail || ""),
      },
    },
    referrals: {
      internal: {
        answer: parsed.referrals?.internal?.answer === "SI" || parsed.referrals?.internal?.answer === "NO" ? parsed.referrals.internal.answer : "",
        inspeccion: Boolean(parsed.referrals?.internal?.inspeccion),
        inclusion: Boolean(parsed.referrals?.internal?.inclusion),
        medico: Boolean(parsed.referrals?.internal?.medico),
        otro: Boolean(parsed.referrals?.internal?.otro),
        otro_detail: String(parsed.referrals?.internal?.otro_detail || ""),
      },
      external: {
        answer: parsed.referrals?.external?.answer === "SI" || parsed.referrals?.external?.answer === "NO" ? parsed.referrals.external.answer : "",
        medica: Boolean(parsed.referrals?.external?.medica),
        psicologica: Boolean(parsed.referrals?.external?.psicologica),
        udai: Boolean(parsed.referrals?.external?.udai),
        otro: Boolean(parsed.referrals?.external?.otro),
        otro_detail: String(parsed.referrals?.external?.otro_detail || ""),
      },
    },
    professional_name: String(parsed.professional_name || professionalName || ""),
    application_date: String(parsed.application_date || def.application_date),
  };
}
