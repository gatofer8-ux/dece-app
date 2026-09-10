/**
 * Ficha de planificación del Círculo Restaurativo del DECE.
 * Calca fiel del formato "FICHA CÍRCULO RESTAURATIVO" (Unidad Educativa).
 * Módulo puro, sin base de datos.
 *
 * Marco legal y técnico de referencia para la IA y las pautas:
 *  - Ley Orgánica de Educación Intercultural (LOEI) y su Reglamento.
 *  - Código de la Niñez y Adolescencia.
 *  - Guía de aplicación de Prácticas Restaurativas / Rutas y Protocolos de
 *    actuación frente a situaciones de violencia (MinEduc), enfoque de
 *    justicia restaurativa: reparación del daño, responsabilidad activa,
 *    reintegración y no revictimización, en lugar del enfoque punitivo.
 */

export const CIRCLE_TYPES = ["Reactivo", "Proactivo"] as const;
export type CircleType = (typeof CIRCLE_TYPES)[number];

/**
 * Modalidad del círculo. Determina si la IA formula preguntas dirigidas al
 * grupo/comunidad (aula completa) o a personas concretas con roles definidos
 * (quien causó el daño / quien fue afectado), o una combinación de ambas.
 */
export const CIRCLE_MODALITIES = [
  {
    value: "grupal",
    label: "Grupal / de aula o comunidad",
    hint: "Todo un curso o grupo. Preguntas colectivas, construcción de convivencia y acuerdos comunes.",
  },
  {
    value: "individual",
    label: "Individual / entre partes",
    hint: "Pocas personas con roles concretos (quien causó el daño y quien fue afectado). Preguntas dirigidas por rol y reparación.",
  },
  {
    value: "mixto",
    label: "Mixto",
    hint: "Parte del trabajo es entre las personas directamente implicadas y parte con el grupo.",
  },
] as const;

export type CircleModality = (typeof CIRCLE_MODALITIES)[number]["value"];

export function circleModalityLabel(value: string | null | undefined): string {
  return CIRCLE_MODALITIES.find((m) => m.value === value)?.label || "";
}

/** Las cuatro fases de preguntas del círculo, en el orden del formato. */
export const QUESTION_STAGES = [
  {
    key: "q_icebreaker",
    numeral: "5.1",
    title: "Pregunta o dinámica para romper el hielo",
  },
  {
    key: "q_intro",
    numeral: "5.2",
    title:
      "Preguntas para introducir a la temática (para reflexionar sobre cómo nos sentimos y sobre nuestras acciones)",
  },
  {
    key: "q_develop",
    numeral: "5.3",
    title:
      "Preguntas para desarrollar la temática (para reflexionar sobre cómo nos sentimos y sobre nuestras acciones)",
  },
  {
    key: "q_actions",
    numeral: "5.4",
    title: "Preguntas para definir acciones y compromisos",
  },
] as const;

export type QuestionStageKey = (typeof QUESTION_STAGES)[number]["key"];

export const AI_FIELD_LABELS = {
  diagnostico:
    "Diágnostico de la problemática en la Ficha de Círculo Restaurativo del DECE (contexto de cómo se detectó la problemática, quiénes intervienen, curso y paralelo, en 3.ª persona, estilo institucional del Ministerio de Educación del Ecuador, sin datos personales de estudiantes)",
  objetivos:
    "Objetivo(s) del Círculo Restaurativo del DECE (1 a 3 objetivos formativos, iniciando con verbo en infinitivo, enfoque restaurativo y de derechos, sin datos personales)",
  declaracion_inicial:
    "Declaración afectiva / declaración inicial del facilitador para abrir un Círculo Restaurativo con estudiantes (bienvenida cálida, agradecimiento, encuadre de normas y del objeto de la palabra, tono cercano y respetuoso)",
  declaracion_cierre:
    "Declaración de cierre de un Círculo Restaurativo con estudiantes (agradecimiento y mensaje breve de esperanza y compromiso con la convivencia)",
  informe_circulo:
    "Informe del círculo realizado en la Ficha de Círculo Restaurativo del DECE (relato de la jornada: fecha, hora, participantes, curso, desarrollo y participación observada, y las orientaciones dadas sobre la problemática y las rutas de apoyo del DECE)",
  conclusion:
    "Conclusión de la información recolectada en la Ficha de Círculo Restaurativo del DECE (3 a 5 conclusiones sobre avances observados, factores identificados y apoyo requerido, en lista numerada)",
} as const;

export type AiFieldKey = keyof typeof AI_FIELD_LABELS;

/** Prompt para que la IA genere preguntas restaurativas a partir de la problemática. */
export interface GeneratedQuestions {
  q_icebreaker: string[];
  q_intro: string[];
  q_develop: string[];
  q_actions: string[];
}

export function splitLines(t: string | null | undefined): string[] {
  return (t || "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Correlativo simple de la ficha dentro de la institución y el año en curso. */
export function buildFichaCode(acronym: string, year: number | string, seq: number): string {
  return `CR-DECE-${acronym}-${year}-${String(seq).padStart(3, "0")}`;
}
