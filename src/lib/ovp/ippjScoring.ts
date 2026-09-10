/**
 * Calificación automática del IPPJ (MINEDUC).
 *
 * Reproduce la lógica de la hoja "fórmulas" del instrumento oficial en Excel:
 *  - Puntaje bruto por tipo = suma de los 10 ítems del tipo (rango 10–50).
 *  - Conversión a STEN con baremos diferenciados por género (tablas oficiales).
 *  - Intensidad total = suma de los 6 brutos (rango 60–300), con su baremo.
 *  - Consistencia (pares adyacentes del hexágono RIASEC) y diferenciación.
 *
 * Género no informado u "OTRO": se promedian los umbrales femenino/masculino.
 */

import { IPPJ_ITEMS, IPPJ_SCALES, IPPJ_SCALE_META, type IppjScale } from "./ippjInstrument";

export type IppjGender = "FEMENINO" | "MASCULINO" | "OTRO";

type Band = readonly [threshold: number, sten: number][];

// raw > threshold  =>  sten  (se evalúa de mayor a menor)
const STEN_F: Record<IppjScale, Band> = {
  REALISTA: [[46, 10], [44, 9], [41, 8], [38, 7], [34, 6], [29, 5], [25, 4], [19, 3], [13, 2], [9, 1]],
  INVESTIGADORA: [[48, 10], [46, 9], [44, 8], [41, 7], [37, 6], [33, 5], [28, 4], [23, 3], [17, 2], [9, 1]],
  ARTISTICA: [[47, 10], [45, 9], [42, 8], [39, 7], [35, 6], [31, 5], [27, 4], [22, 3], [16, 2], [9, 1]],
  SOCIAL: [[48, 10], [46, 9], [44, 8], [41, 7], [37, 6], [33, 5], [28, 4], [23, 3], [17, 2], [9, 1]],
  EMPRENDEDORA: [[47, 10], [45, 9], [42, 8], [39, 7], [35, 6], [31, 5], [27, 4], [22, 3], [16, 2], [9, 1]],
  CONVENCIONAL: [[48, 10], [46, 9], [44, 8], [41, 7], [37, 6], [33, 5], [28, 4], [23, 3], [17, 2], [9, 1]],
};

const STEN_M: Record<IppjScale, Band> = {
  REALISTA: [[48, 10], [46, 9], [44, 8], [42, 7], [39, 6], [36, 5], [32, 4], [28, 3], [23, 2], [10, 1]],
  INVESTIGADORA: [[48, 10], [46, 9], [44, 8], [41, 7], [37, 6], [33, 5], [28, 4], [23, 3], [17, 2], [9, 1]],
  ARTISTICA: [[47, 10], [45, 9], [42, 8], [39, 7], [35, 6], [31, 5], [27, 4], [22, 3], [16, 2], [9, 1]],
  SOCIAL: [[44, 10], [42, 9], [39, 8], [36, 7], [32, 6], [28, 5], [24, 4], [20, 3], [15, 2], [9, 1]],
  EMPRENDEDORA: [[45, 10], [43, 9], [41, 8], [38, 7], [35, 6], [32, 5], [29, 4], [25, 3], [21, 2], [9, 1]],
  CONVENCIONAL: [[49, 10], [47, 9], [46, 8], [43, 7], [40, 6], [37, 5], [34, 4], [30, 3], [25, 2], [9, 1]],
};

const INTENSIDAD_F: Band = [[276, 10], [267, 9], [261, 8], [232, 7], [218, 6], [203, 5], [188, 4], [174, 3], [159, 2], [59, 1]];
const INTENSIDAD_M: Band = [[282, 10], [266, 9], [251, 8], [235, 7], [219, 6], [204, 5], [189, 4], [173, 3], [157, 2], [59, 1]];

function bandLookup(raw: number, band: Band): number {
  for (const [threshold, sten] of band) {
    if (raw > threshold) return sten;
  }
  return 1;
}

function averageBand(a: Band, b: Band): Band {
  return a.map(([t, s], i) => [Math.round((t + b[i][0]) / 2), s] as const);
}

function stenTableFor(gender: IppjGender, scale: IppjScale): Band {
  if (gender === "FEMENINO") return STEN_F[scale];
  if (gender === "MASCULINO") return STEN_M[scale];
  return averageBand(STEN_F[scale], STEN_M[scale]);
}

function intensidadTableFor(gender: IppjGender): Band {
  if (gender === "FEMENINO") return INTENSIDAD_F;
  if (gender === "MASCULINO") return INTENSIDAD_M;
  return averageBand(INTENSIDAD_F, INTENSIDAD_M);
}

/** STEN >= 7 Alta · 5–6 Media · <= 4 Baja (igual que la hoja oficial). */
export function stenLevel(sten: number): "Alta" | "Media" | "Baja" {
  if (sten >= 7) return "Alta";
  if (sten >= 5) return "Media";
  return "Baja";
}

// Orden del hexágono RIASEC (adyacentes = consistentes).
const HEX_ORDER: IppjScale[] = ["REALISTA", "INVESTIGADORA", "ARTISTICA", "SOCIAL", "EMPRENDEDORA", "CONVENCIONAL"];

function hexDistance(a: IppjScale, b: IppjScale): number {
  const ia = HEX_ORDER.indexOf(a);
  const ib = HEX_ORDER.indexOf(b);
  const d = Math.abs(ia - ib);
  return Math.min(d, 6 - d); // 0..3
}

export interface IppjScaleResult {
  scale: IppjScale;
  letter: string;
  label: string;
  raw: number;
  sten: number;
  level: "Alta" | "Media" | "Baja";
}

export interface IppjScoreResult {
  gender: IppjGender;
  answered: number;
  complete: boolean;
  scales: IppjScaleResult[];
  /** Ordenados de mayor a menor por STEN (desempate por bruto). */
  ranked: IppjScaleResult[];
  hollandCode: string; // p.ej. "SEC"
  topTypes: IppjScale[]; // 3 primeros
  intensidad: { raw: number; sten: number; level: "Alta" | "Media" | "Baja" };
  consistencia: {
    pairs: { pair: [IppjScale, IppjScale]; deltaSten: number; nivel: "Alta" | "Media" | "Baja" }[];
    overall: "Alta" | "Media" | "Baja"; // basada en los 2 tipos dominantes
  };
  diferenciacion: { spread: number; nivel: "Alta" | "Media" | "Baja" };
}

const ADJACENT_PAIRS: [IppjScale, IppjScale][] = [
  ["REALISTA", "INVESTIGADORA"],
  ["INVESTIGADORA", "ARTISTICA"],
  ["ARTISTICA", "SOCIAL"],
  ["SOCIAL", "EMPRENDEDORA"],
  ["EMPRENDEDORA", "CONVENCIONAL"],
  ["CONVENCIONAL", "REALISTA"],
];

/**
 * @param answers  Mapa { numeroDeItem(1-60): valor(1-5) }. Los ítems sin
 *                 responder se toman como 0 y se marca `complete: false`.
 */
export function scoreIppj(answers: Record<number, number>, gender: IppjGender): IppjScoreResult {
  const rawByScale: Record<IppjScale, number> = {
    REALISTA: 0, INVESTIGADORA: 0, ARTISTICA: 0, SOCIAL: 0, EMPRENDEDORA: 0, CONVENCIONAL: 0,
  };
  let answered = 0;
  for (const item of IPPJ_ITEMS) {
    const v = Number(answers[item.n]) || 0;
    if (v >= 1 && v <= 5) {
      rawByScale[item.scale] += v;
      answered++;
    }
  }
  const complete = answered === IPPJ_ITEMS.length;

  const scales: IppjScaleResult[] = IPPJ_SCALES.map((scale) => {
    const raw = rawByScale[scale];
    const sten = bandLookup(raw, stenTableFor(gender, scale));
    return {
      scale,
      letter: IPPJ_SCALE_META[scale].letter,
      label: IPPJ_SCALE_META[scale].label,
      raw,
      sten,
      level: stenLevel(sten),
    };
  });

  const ranked = [...scales].sort((a, b) => b.sten - a.sten || b.raw - a.raw);
  const topTypes = ranked.slice(0, 3).map((s) => s.scale);
  const hollandCode = ranked.slice(0, 3).map((s) => s.letter).join("");

  const intensidadRaw = IPPJ_SCALES.reduce((sum, s) => sum + rawByScale[s], 0);
  const intensidadSten = bandLookup(intensidadRaw, intensidadTableFor(gender));

  const stenOf = (s: IppjScale) => scales.find((x) => x.scale === s)!.sten;
  const pairs = ADJACENT_PAIRS.map((pair) => {
    const deltaSten = Math.abs(stenOf(pair[0]) - stenOf(pair[1]));
    const nivel = deltaSten > 6 ? "Baja" : deltaSten > 3 ? "Media" : "Alta";
    return { pair, deltaSten, nivel: nivel as "Alta" | "Media" | "Baja" };
  });
  const d = hexDistance(ranked[0].scale, ranked[1].scale);
  const overall: "Alta" | "Media" | "Baja" = d <= 1 ? "Alta" : d === 2 ? "Media" : "Baja";

  const spread = ranked[0].sten - ranked[ranked.length - 1].sten;
  const difNivel: "Alta" | "Media" | "Baja" = spread >= 5 ? "Alta" : spread >= 3 ? "Media" : "Baja";

  return {
    gender,
    answered,
    complete,
    scales,
    ranked,
    hollandCode,
    topTypes,
    intensidad: { raw: intensidadRaw, sten: intensidadSten, level: stenLevel(intensidadSten) },
    consistencia: { pairs, overall },
    diferenciacion: { spread, nivel: difNivel },
  };
}

export const IPPJ_INTERPRETATION_NOTES = {
  intensidad:
    "La intensidad indica cuán marcadas están las preferencias profesionales en general. Una intensidad alta refleja intereses definidos; una baja sugiere que el estudiante aún explora o responde con poca implicación.",
  consistencia:
    "La consistencia mide qué tan compatibles entre sí son los dos tipos dominantes. Alta consistencia (tipos adyacentes en el hexágono) facilita elegir una carrera coherente; baja consistencia (tipos opuestos) sugiere intereses diversos que conviene conversar en la entrevista de orientación.",
  diferenciacion:
    "La diferenciación indica cuánto sobresalen unos tipos sobre otros. Alta diferenciación da un perfil claro; baja diferenciación (perfil plano) requiere acompañamiento para precisar la elección.",
} as const;
