// Entrevista a estudiantes "por preguntas": estructura por defecto y utilidades
// para que cada institución muestre/oculte secciones y preguntas o las renombre.

export const DOC_TYPE_ENTREVISTA_PREGUNTAS = "ENTREVISTA_PREGUNTAS";

export interface QuestionDef {
  id: string;
  text: string;
  visible: boolean;
}

export interface SectionDef {
  id: string;
  title: string;
  visible: boolean;
  questions: QuestionDef[];
}

export interface InterviewStructure {
  title: string;
  sections: SectionDef[];
}

export interface Letterhead {
  institutionName: string;
  motto: string;
  department: string;
  showSchoolYear: boolean;
  showLogo: boolean;
}

export const MAX_TEMPLATE_BYTES = 2 * 1024 * 1024;
export const MAX_TEXT = 600;

const q = (id: string, text: string): QuestionDef => ({ id, text, visible: true });

export const DEFAULT_STRUCTURE: InterviewStructure = {
  title: "ENTREVISTA A ESTUDIANTES",
  sections: [
    {
      id: "A",
      title: "A.- MOTIVO",
      visible: true,
      questions: [
        q("a1", "¿Conoces el motivo de haberte convocado al departamento de consejería estudiantil? o ¿cuál es el motivo por el cual acuden al departamento de consejería estudiantil?"),
        q("a2", "¿Cuáles crees que son las causas de esas dificultades?"),
        q("a3", "¿Cómo te sientes con lo que está sucediendo?"),
        q("a4", "¿Has tratado de solucionar el problema? ¿Cómo?"),
      ],
    },
    {
      id: "B",
      title: "B.- ADAPTACIÓN EN EL CONTEXTO EDUCATIVO",
      visible: true,
      questions: [
        q("b1", "¿Cómo te sientes en la institución educativa?"),
        q("b2", "¿Cómo te sientes con tus compañeros/as de aula?"),
        q("b3", "¿Hay alguna/a materia/s que te generen preocupación? ¿Qué te preocupa?"),
        q("b4", "¿De qué manera recibes apoyo de tu docente tutor, otro/as docentes y autoridades de la institución? (sientes confianza para plantear preguntas; sientes apertura para expresar tu opinión; sientes que te escucha)"),
        q("b5", "¿Qué cosa te gusta hacer en el recreo?"),
        q("b6", "¿Qué opinas sobre la amistad? ¿Cuántos amigos/as tienes? ¿Qué hacen cuando están juntos/as? ¿Quiénes son tus amigos/as?"),
        q("b7", "¿Hay alguna situación que suceda al interior y/o exterior de la institución educativa que te preocupa?"),
      ],
    },
    {
      id: "C",
      title: "C.- RELACIONES FAMILIARES",
      visible: true,
      questions: [
        q("c1", "¿Cómo te sientes en tu hogar?"),
        q("c2", "¿Quiénes conforman tu hogar?"),
        q("c3", "¿Qué haces en tu tiempo libre en la casa?"),
        q("c4", "¿Cuánto tiempo comparten en familia? (entre semana, fines de semana, feriados, vacaciones)"),
        q("c5", "¿Cómo te relacionas con los integrantes de tu familia?"),
        q("c6", "¿Qué reglas usan en tu hogar para mantener un orden?"),
      ],
    },
    {
      id: "D",
      title: "D.- OTROS ASPECTOS",
      visible: true,
      questions: [
        q("d1", "¿Asistes a un curso o actividad antes/ después de clases o los fines de semana?"),
        q("d2", "¿Qué logros has alcanzado en tu vida? o ¿Qué es lo que más disfrutas hacer?"),
        q("d3", "¿Cuál es el mayor reto que tienes en este momento?"),
      ],
    },
  ],
};

export function defaultLetterhead(institutionName: string): Letterhead {
  return {
    institutionName,
    motto: "",
    department: "DEPARTAMENTO DE CONSEJERÍA ESTUDIANTIL",
    showSchoolYear: true,
    showLogo: true,
  };
}

function clean(v: unknown, max = MAX_TEXT): string {
  return typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "";
}

/** Normaliza una estructura venida de la base o del formulario; nunca lanza. */
export function parseStructure(raw: unknown): InterviewStructure {
  let obj: any = raw;
  if (typeof raw === "string") {
    try {
      obj = JSON.parse(raw);
    } catch {
      return structuredClone(DEFAULT_STRUCTURE);
    }
  }
  if (!obj || !Array.isArray(obj.sections)) return structuredClone(DEFAULT_STRUCTURE);

  const usedIds = new Set<string>();
  const uid = (base: string) => {
    let id = base || "x";
    let n = 2;
    while (usedIds.has(id)) id = `${base}_${n++}`;
    usedIds.add(id);
    return id;
  };

  const sections: SectionDef[] = obj.sections.slice(0, 20).map((s: any, i: number) => ({
    id: uid(clean(s?.id, 20).replace(/[^A-Za-z0-9_]/g, "") || `S${i + 1}`),
    title: clean(s?.title, 160) || `SECCIÓN ${i + 1}`,
    visible: s?.visible !== false,
    questions: (Array.isArray(s?.questions) ? s.questions : []).slice(0, 40).map((qq: any, j: number) => ({
      id: uid(clean(qq?.id, 20).replace(/[^A-Za-z0-9_]/g, "") || `p${i + 1}_${j + 1}`),
      text: clean(qq?.text) || "(pregunta sin texto)",
      visible: qq?.visible !== false,
    })),
  }));

  return { title: clean(obj.title, 160) || DEFAULT_STRUCTURE.title, sections };
}

export function parseLetterhead(raw: unknown, institutionName: string): Letterhead {
  const base = defaultLetterhead(institutionName);
  let obj: any = raw;
  if (typeof raw === "string") {
    try {
      obj = JSON.parse(raw);
    } catch {
      return base;
    }
  }
  if (!obj || typeof obj !== "object") return base;
  return {
    institutionName: clean(obj.institutionName, 200) || base.institutionName,
    motto: clean(obj.motto, 250),
    department: clean(obj.department, 200) || base.department,
    showSchoolYear: obj.showSchoolYear !== false,
    showLogo: obj.showLogo !== false,
  };
}

/** Solo lo visible, sin secciones que queden vacías. */
export function visibleStructure(s: InterviewStructure): InterviewStructure {
  return {
    title: s.title,
    sections: s.sections
      .filter((sec) => sec.visible)
      .map((sec) => ({ ...sec, questions: sec.questions.filter((qq) => qq.visible) }))
      .filter((sec) => sec.questions.length > 0),
  };
}

/** Agrupa preguntas de a dos por fila (la última queda a ancho completo si es impar). */
export function pairQuestions<T>(items: T[]): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += 2) rows.push(items.slice(i, i + 2));
  return rows;
}

export type Answers = Record<string, string>;

export function parseAnswers(raw: unknown): Answers {
  try {
    const obj = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!obj || typeof obj !== "object") return {};
    const out: Answers = {};
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      if (typeof v === "string") out[k] = v.slice(0, 5000);
    }
    return out;
  } catch {
    return {};
  }
}

/* ------------------------------------------------------------------------- */
/* Reparto del relato libre en las preguntas (IA)                            */
/* ------------------------------------------------------------------------- */

export const MAX_NARRATIVE = 8000;

/** Marcadores que deja el seudonimizado y que no deben quedar en el texto final. */
const PLACEHOLDERS: [RegExp, string][] = [
  [/\[estudiante\]/gi, "el/la estudiante"],
  [/\[representante\]/gi, "el representante"],
  [/\[padre\]/gi, "el padre"],
  [/\[madre\]/gi, "la madre"],
  [/\[la instituci[oó]n\]/gi, "la institución"],
  [/\[direcci[oó]n\]/gi, "el domicilio"],
  [/\[(?:tel[eé]fono|correo|documento|ruc)\]/gi, ""],
];

export function restorePlaceholders(text: string): string {
  let out = text;
  for (const [re, rep] of PLACEHOLDERS) out = out.replace(re, rep);
  return out.replace(/[ \t]{2,}/g, " ").replace(/\s+([.,;:])/g, "$1").trim();
}

/**
 * Lee la respuesta de la IA (un objeto JSON {idPregunta: texto}) y se queda solo con
 * preguntas que existen y respuestas con contenido. Nunca lanza.
 */
export function parseDistribution(raw: string, allowedIds: string[]): Record<string, string> {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return {};
  let obj: unknown;
  try {
    obj = JSON.parse(match[0]);
  } catch {
    return {};
  }
  if (!obj || typeof obj !== "object") return {};
  const allowed = new Set(allowedIds);
  const out: Record<string, string> = {};
  for (const [id, value] of Object.entries(obj as Record<string, unknown>)) {
    if (!allowed.has(id) || typeof value !== "string") continue;
    const text = restorePlaceholders(value.replace(/\r/g, "").trim()).slice(0, 2000);
    // La IA a veces responde "No aplica"/"Sin información" para lo que no se dijo: se deja vacío.
    if (!text || /^(?:sin informaci[oó]n|no se (?:menciona|refiere|indica)|n\/a|ninguno)\.?$/i.test(text)) continue;
    out[id] = text;
  }
  return out;
}

/** 2026-11-09 -> 09/11/2026 (formato de fecha del documento institucional). Vacío si no es una fecha ISO. */
export function isoToDmy(iso: string | null | undefined): string {
  const m = (iso || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : "";
}
