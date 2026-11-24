/**
 * Perfil de talentos (versiones 1 y 2) y Experimento de talento del Proyecto TaPas.
 * Tipos de datos, validación por nivel, resultado individual y agregados colectivos.
 *
 * NO es una prueba psicométrica: ordena lo que la persona escribió y ubicó para
 * conversarlo en la entrevista de orientación.
 */

import { TAPAS_NIVELES, type TapasNivel } from "./niveles";

// ---------------------------------------------------------------------------------------------
// Perfil de talentos: plano de coordenadas
// ---------------------------------------------------------------------------------------------

/**
 * Ítem ubicado en el plano. x: de -1 («no me gusta») a +1 («sí me gusta»).
 * y: de -1 («lo hago mal») a +1 («lo hago bien»). null = todavía sin ubicar.
 */
export interface ProfileItem {
  id: string;
  text: string;
  emoji?: string;
  x: number | null;
  y: number | null;
}

export interface PerfilV1Data {
  version: 1;
  /** «Desde mi perspectiva». */
  own: ProfileItem[];
  /** «Desde la perspectiva de otra persona». */
  other: ProfileItem[];
  closing: string;
}

export interface PerfilV2Data {
  version: 2;
  /** Asignaturas: eje y = qué tan buenos son los resultados. */
  studies: ProfileItem[];
  /** Actividades de tiempo libre: eje y = qué tan bien las hace. */
  free: ProfileItem[];
  /** ¿Percibes una relación entre lo que disfrutas en tus estudios y en tu tiempo libre? */
  relation: string;
  closing: string;
}

export type PerfilData = PerfilV1Data | PerfilV2Data;
export type ProfileSet = "own" | "other" | "studies" | "free";

export type Quadrant = "BIEN_GUSTA" | "BIEN_NOGUSTA" | "MAL_GUSTA" | "MAL_NOGUSTA";

export const QUADRANTS: Record<
  Quadrant,
  { signs: string; label: string; studyLabel: string; color: string; meaning: string }
> = {
  BIEN_GUSTA: {
    signs: "+ +",
    label: "Lo hago bien y me gusta",
    studyLabel: "Buenos resultados y me gusta",
    color: "#16A34A",
    meaning: "Talento con pasión: lo más probable es que sea un talento propio para potenciar.",
  },
  BIEN_NOGUSTA: {
    signs: "+ −",
    label: "Lo hago bien, pero no me gusta",
    studyLabel: "Buenos resultados, pero no me gusta",
    color: "#2563EB",
    meaning: "Habilidad sin pasión: conviene preguntarse si se hace por costumbre o porque «me dicen que lo hago bien».",
  },
  MAL_GUSTA: {
    signs: "− +",
    label: "Lo hago mal, pero me gusta",
    studyLabel: "Malos resultados, pero me gusta",
    color: "#EA580C",
    meaning: "Pasión por desarrollar: hay interés; con práctica y apoyo puede convertirse en talento.",
  },
  MAL_NOGUSTA: {
    signs: "− −",
    label: "Lo hago mal y no me gusta",
    studyLabel: "Malos resultados y no me gusta",
    color: "#94A3B8",
    meaning: "No es prioridad por ahora: ni da energía ni se hace con facilidad.",
  },
};

export const QUADRANT_ORDER: Quadrant[] = ["BIEN_GUSTA", "MAL_GUSTA", "BIEN_NOGUSTA", "MAL_NOGUSTA"];

export function quadrantOf(x: number | null | undefined, y: number | null | undefined): Quadrant | null {
  if (typeof x !== "number" || typeof y !== "number") return null;
  if (Number.isNaN(x) || Number.isNaN(y)) return null;
  const likes = x >= 0;
  const good = y >= 0;
  if (good && likes) return "BIEN_GUSTA";
  if (good && !likes) return "BIEN_NOGUSTA";
  if (!good && likes) return "MAL_GUSTA";
  return "MAL_NOGUSTA";
}

/** Texto en minúsculas, sin tildes ni signos, para comparar ítems escritos a mano. */
export function normalizeText(s: string): string {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9ñ]+/g, " ")
    .trim();
}

const SETS_BY_VERSION: Record<1 | 2, ProfileSet[]> = { 1: ["own", "other"], 2: ["studies", "free"] };

export const PROFILE_SET_LABELS: Record<ProfileSet, string> = {
  own: "Desde mi perspectiva",
  other: "Desde la perspectiva de otra persona",
  studies: "Estudios",
  free: "Tiempo libre",
};

function itemsOf(data: PerfilData, set: ProfileSet): ProfileItem[] {
  if (data.version === 1) return set === "own" ? data.own : set === "other" ? data.other : [];
  return set === "studies" ? data.studies : set === "free" ? data.free : [];
}

function cleanItems(items: ProfileItem[] | undefined): ProfileItem[] {
  return (items || [])
    .map((it) => ({
      id: String(it.id || ""),
      text: String(it.text || "").trim().slice(0, 160),
      emoji: it.emoji ? String(it.emoji).slice(0, 8) : undefined,
      x: typeof it.x === "number" && Math.abs(it.x) <= 1 ? it.x : null,
      y: typeof it.y === "number" && Math.abs(it.y) <= 1 ? it.y : null,
    }))
    .filter((it) => it.text.length > 0)
    .slice(0, 12);
}

/** Normaliza lo que llega del navegador (nunca confiar en el cliente). */
export function sanitizePerfilData(raw: unknown, version: 1 | 2): PerfilData {
  const d = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const closing = String(d.closing || "").slice(0, 2000);
  if (version === 1) {
    return { version: 1, own: cleanItems(d.own as ProfileItem[]), other: cleanItems(d.other as ProfileItem[]), closing };
  }
  return {
    version: 2,
    studies: cleanItems(d.studies as ProfileItem[]),
    free: cleanItems(d.free as ProfileItem[]),
    relation: String(d.relation || "").slice(0, 2000),
    closing,
  };
}

/** Errores que impiden enviar el perfil (lista vacía = válido). */
export function validatePerfil(data: PerfilData, nivel: TapasNivel): string[] {
  const cfg = TAPAS_NIVELES[nivel].profile;
  const errors: string[] = [];
  const mainSet: ProfileSet = data.version === 1 ? "own" : "studies";
  const sets: ProfileSet[] = data.version === 1 ? ["own", "other"] : ["studies", "free"];

  for (const set of sets) {
    const items = itemsOf(data, set);
    const required = set === "other" ? 0 : cfg.min;
    if (items.length < required) {
      errors.push(`«${PROFILE_SET_LABELS[set]}»: escribe al menos ${required}.`);
    }
    if (items.some((it) => it.x === null || it.y === null)) {
      errors.push(`«${PROFILE_SET_LABELS[set]}»: ubica todas en el plano.`);
    }
  }
  void mainSet;
  return errors;
}

export interface PerfilItemResult extends ProfileItem {
  quadrant: Quadrant | null;
}

export interface PerfilResult {
  version: 1 | 2;
  sets: Partial<Record<ProfileSet, PerfilItemResult[]>>;
  /** Conteo de ítems por cuadrante, por conjunto. */
  quadrantCounts: Partial<Record<ProfileSet, Record<Quadrant, number>>>;
  /** Talentos con pasión (++), propios o de estudios/tiempo libre. */
  strengths: string[];
  /** Pasiones por desarrollar (−+). */
  toDevelop: string[];
  /** Habilidades sin pasión (+−). */
  skillsWithoutPassion: string[];
  /** Versión 1: características que coinciden entre lo que dice la persona y lo que ve otra. */
  coincidences: string[];
  /** Versión 2: asignaturas y actividades de tiempo libre que comparten un mismo cuadrante fuerte (++). */
  bridges: { studies: string[]; free: string[] } | null;
  closing: string;
  relation: string;
  placedCount: number;
  totalCount: number;
}

function emptyCounts(): Record<Quadrant, number> {
  return { BIEN_GUSTA: 0, BIEN_NOGUSTA: 0, MAL_GUSTA: 0, MAL_NOGUSTA: 0 };
}

export function scorePerfil(data: PerfilData): PerfilResult {
  const sets = SETS_BY_VERSION[data.version];
  const out: PerfilResult = {
    version: data.version,
    sets: {},
    quadrantCounts: {},
    strengths: [],
    toDevelop: [],
    skillsWithoutPassion: [],
    coincidences: [],
    bridges: null,
    closing: data.closing || "",
    relation: data.version === 2 ? data.relation || "" : "",
    placedCount: 0,
    totalCount: 0,
  };

  for (const set of sets) {
    const items: PerfilItemResult[] = itemsOf(data, set).map((it) => ({ ...it, quadrant: quadrantOf(it.x, it.y) }));
    out.sets[set] = items;
    const counts = emptyCounts();
    for (const it of items) {
      out.totalCount++;
      if (it.quadrant) {
        counts[it.quadrant]++;
        out.placedCount++;
        if (it.quadrant === "BIEN_GUSTA") out.strengths.push(it.text);
        if (it.quadrant === "MAL_GUSTA") out.toDevelop.push(it.text);
        if (it.quadrant === "BIEN_NOGUSTA") out.skillsWithoutPassion.push(it.text);
      }
    }
    out.quadrantCounts[set] = counts;
  }

  if (data.version === 1) {
    const own = new Set((out.sets.own || []).map((i) => normalizeText(i.text)));
    out.coincidences = (out.sets.other || []).map((i) => i.text).filter((t) => own.has(normalizeText(t)));
  } else {
    const best = (set: ProfileSet) => (out.sets[set] || []).filter((i) => i.quadrant === "BIEN_GUSTA").map((i) => i.text);
    out.bridges = { studies: best("studies"), free: best("free") };
  }
  return out;
}

// ---------------------------------------------------------------------------------------------
// Experimento de talento
// ---------------------------------------------------------------------------------------------

export type ExperimentoObjetivo = "CONFIRMAR" | "EXTENSION" | "PASION";

export const EXPERIMENTO_OBJETIVOS: Record<ExperimentoObjetivo, { label: string; help: string }> = {
  CONFIRMAR: {
    label: "Confirmar la naturaleza del talento",
    help: "Comprobar a qué se refiere exactamente ese talento (por ejemplo, «cocinar»: ¿mezclar con precisión o inventar recetas?).",
  },
  EXTENSION: {
    label: "Conocer la extensión del talento",
    help: "Probar hasta dónde llega (por ejemplo, en el canto, qué tipo de voz tengo).",
  },
  PASION: {
    label: "Identificar el nivel de pasión y energía que genera",
    help: "Comprobar si hacerlo todos los días me estimula y motiva, o más bien me desgasta.",
  },
};

export interface ExperimentoData {
  /** Sesión que está trabajando la persona. */
  sesion: 1 | 2;
  // ---- Sesión 1 (puntos 1 a 5 del formato)
  p1: string[]; // resumen de mi perfil: cosas que me gustan y puedo hacer bien
  p2: string; // talento con el que quiero experimentar (concreto y observable)
  objetivos: ExperimentoObjetivo[];
  p3: string; // qué quiero descubrir sobre mi talento
  pregunta: { concisa: boolean; alcanzable: boolean; relevante: boolean };
  p4: string; // mi experimento consiste en
  p5: string[]; // formas de verificar que fue exitoso
  sesion1At?: string;
  // ---- Registro diario durante la semana del experimento
  diary: { date: string; note: string }[];
  // ---- Sesión 2 (puntos 6 a 10)
  p6: string; // resumen de resultados
  p7: { reto: string; mejora: string }[]; // desafíos -> cómo puedo mejorar
  p8: string; // lo más importante que he aprendido
  p9: string; // la próxima vez necesito esto de las demás personas
  p10: string; // así es como se ve mi perfil de talentos ahora
}

export function emptyExperimento(): ExperimentoData {
  return {
    sesion: 1,
    p1: [],
    p2: "",
    objetivos: [],
    p3: "",
    pregunta: { concisa: false, alcanzable: false, relevante: false },
    p4: "",
    p5: [],
    diary: [],
    p6: "",
    p7: [],
    p8: "",
    p9: "",
    p10: "",
  };
}

const str = (v: unknown, max = 2000) => String(v ?? "").slice(0, max);
const strList = (v: unknown, max: number) =>
  (Array.isArray(v) ? v : []).map((s) => str(s, 400).trim()).filter(Boolean).slice(0, max);

export function sanitizeExperimento(raw: unknown): ExperimentoData {
  const d = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const q = (d.pregunta && typeof d.pregunta === "object" ? d.pregunta : {}) as Record<string, unknown>;
  const objetivos = (Array.isArray(d.objetivos) ? d.objetivos : []).filter((o): o is ExperimentoObjetivo =>
    ["CONFIRMAR", "EXTENSION", "PASION"].includes(String(o))
  );
  const diary = (Array.isArray(d.diary) ? d.diary : [])
    .map((e) => {
      const r = (e && typeof e === "object" ? e : {}) as Record<string, unknown>;
      return { date: str(r.date, 10), note: str(r.note, 800).trim() };
    })
    .filter((e) => e.note)
    .slice(0, 31);
  const p7 = (Array.isArray(d.p7) ? d.p7 : [])
    .map((e) => {
      const r = (e && typeof e === "object" ? e : {}) as Record<string, unknown>;
      return { reto: str(r.reto, 300).trim(), mejora: str(r.mejora, 300).trim() };
    })
    .filter((e) => e.reto || e.mejora)
    .slice(0, 8);
  return {
    sesion: d.sesion === 2 ? 2 : 1,
    p1: strList(d.p1, 5),
    p2: str(d.p2, 400).trim(),
    objetivos: Array.from(new Set(objetivos)),
    p3: str(d.p3, 600).trim(),
    pregunta: { concisa: !!q.concisa, alcanzable: !!q.alcanzable, relevante: !!q.relevante },
    p4: str(d.p4, 1500).trim(),
    p5: strList(d.p5, 6),
    sesion1At: d.sesion1At ? str(d.sesion1At, 30) : undefined,
    diary,
    p6: str(d.p6, 2000).trim(),
    p7,
    p8: str(d.p8, 1500).trim(),
    p9: str(d.p9, 1500).trim(),
    p10: str(d.p10, 2000).trim(),
  };
}

/** Errores que impiden cerrar la sesión indicada (1 = planificar, 2 = evaluar). */
export function validateExperimento(data: ExperimentoData, sesion: 1 | 2, nivel: TapasNivel): string[] {
  const cfg = TAPAS_NIVELES[nivel].experimento;
  const e: string[] = [];
  if (sesion === 1 || sesion === 2) {
    if (!data.p2) e.push("Escribe el talento con el que quieres experimentar (punto 2).");
    if (!data.p3) e.push("Escribe qué quieres descubrir sobre tu talento (punto 3).");
    if (!data.p4) e.push("Describe en qué consiste tu experimento (punto 4).");
    if (data.p5.length < cfg.verifyMin) {
      e.push(`Anota al menos ${cfg.verifyMin} formas de verificar si tu experimento fue exitoso (punto 5).`);
    }
  }
  if (sesion === 2) {
    if (!data.p6) e.push("Resume los resultados de tu experimento (punto 6).");
    const retos = data.p7.filter((r) => r.reto);
    if (retos.length < cfg.challengeMin) e.push("Anota al menos un desafío y cómo puedes mejorar (punto 7).");
    if (!data.p8) e.push("Escribe lo más importante que aprendiste (punto 8).");
  }
  return e;
}

export function experimentoProgress(data: ExperimentoData, nivel: TapasNivel) {
  return {
    sesion1Complete: validateExperimento(data, 1, nivel).length === 0,
    sesion2Complete: validateExperimento(data, 2, nivel).length === 0,
  };
}

export interface ExperimentoResult {
  talento: string;
  objetivos: ExperimentoObjetivo[];
  pregunta: string;
  verificaciones: number;
  diasRegistrados: number;
  desafios: number;
  aprendizaje: string;
  sesion2Completa: boolean;
}

export function scoreExperimento(data: ExperimentoData, nivel: TapasNivel): ExperimentoResult {
  return {
    talento: data.p2,
    objetivos: data.objetivos,
    pregunta: data.p3,
    verificaciones: data.p5.length,
    diasRegistrados: data.diary.length,
    desafios: data.p7.filter((r) => r.reto).length,
    aprendizaje: data.p8,
    sesion2Completa: experimentoProgress(data, nivel).sesion2Complete,
  };
}

// ---------------------------------------------------------------------------------------------
// Agregados colectivos (informe del proceso)
// ---------------------------------------------------------------------------------------------

export interface FrequencyItem {
  text: string;
  count: number;
}

/** Cuenta textos iguales (sin tildes ni mayúsculas) y devuelve los más frecuentes. */
export function topFrequencies(texts: string[], limit = 10): FrequencyItem[] {
  const map = new Map<string, { text: string; count: number }>();
  for (const t of texts) {
    const k = normalizeText(t);
    if (!k) continue;
    const cur = map.get(k);
    if (cur) cur.count++;
    else map.set(k, { text: t.trim(), count: 1 });
  }
  return [...map.values()].sort((a, b) => b.count - a.count || a.text.localeCompare(b.text, "es")).slice(0, limit);
}

export interface PerfilAggregate {
  version: 1 | 2;
  respondents: number;
  /** Totales por conjunto y cuadrante. */
  quadrants: Partial<Record<ProfileSet, Record<Quadrant, number>>>;
  strengths: FrequencyItem[];
  toDevelop: FrequencyItem[];
  skillsWithoutPassion: FrequencyItem[];
  /** Estudiantes con al menos un talento con pasión. */
  withStrengths: number;
  coincidenceRate: number | null;
}

export function aggregatePerfil(results: PerfilResult[], version: 1 | 2): PerfilAggregate {
  const quadrants: PerfilAggregate["quadrants"] = {};
  for (const set of SETS_BY_VERSION[version]) quadrants[set] = emptyCounts();
  for (const r of results) {
    for (const set of SETS_BY_VERSION[version]) {
      const c = r.quadrantCounts[set];
      if (!c) continue;
      for (const q of QUADRANT_ORDER) quadrants[set]![q] += c[q];
    }
  }
  const withCoincidence = results.filter((r) => r.coincidences.length > 0).length;
  return {
    version,
    respondents: results.length,
    quadrants,
    strengths: topFrequencies(results.flatMap((r) => r.strengths)),
    toDevelop: topFrequencies(results.flatMap((r) => r.toDevelop)),
    skillsWithoutPassion: topFrequencies(results.flatMap((r) => r.skillsWithoutPassion)),
    withStrengths: results.filter((r) => r.strengths.length > 0).length,
    coincidenceRate: version === 1 && results.length ? Math.round((withCoincidence / results.length) * 100) : null,
  };
}

export interface ExperimentoAggregate {
  total: number;
  sesion1Completa: number;
  sesion2Completa: number;
  talentos: FrequencyItem[];
  objetivos: Record<ExperimentoObjetivo, number>;
  aprendizajes: string[];
  desafios: FrequencyItem[];
  promedioDiario: number;
}

export function aggregateExperimento(datas: ExperimentoData[], nivel: TapasNivel): ExperimentoAggregate {
  const objetivos: Record<ExperimentoObjetivo, number> = { CONFIRMAR: 0, EXTENSION: 0, PASION: 0 };
  for (const d of datas) for (const o of d.objetivos) objetivos[o]++;
  const progress = datas.map((d) => experimentoProgress(d, nivel));
  const totalDiary = datas.reduce((n, d) => n + d.diary.length, 0);
  return {
    total: datas.length,
    sesion1Completa: progress.filter((p) => p.sesion1Complete).length,
    sesion2Completa: progress.filter((p) => p.sesion2Complete).length,
    talentos: topFrequencies(datas.map((d) => d.p2)),
    objetivos,
    aprendizajes: datas.map((d) => d.p8).filter(Boolean).slice(0, 8),
    desafios: topFrequencies(datas.flatMap((d) => d.p7.map((r) => r.reto))),
    promedioDiario: datas.length ? Math.round((totalDiary / datas.length) * 10) / 10 : 0,
  };
}
