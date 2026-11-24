/**
 * Agregado y lectura del juego de Tarjetas de Arquetipos TaPas.
 * NO es una calificación psicométrica: sintetiza lo que el estudiante
 * construyó (arquetipos con los que se identifica, grupos de talentos y su
 * orden) y ofrece una lectura por «familias de talento» como orientación.
 */

import {
  ARCHETYPES,
  ARCHETYPE_MAP,
  TAPAS_FAMILIES,
  type TapasFamily,
  type TapasChoice,
  type TalentGroup,
} from "./archetypes";

export interface TapasResult {
  identifiedKeys: string[];
  identifiedCount: number;
  dudaCount: number;
  noCount: number;
  /** Conteo de arquetipos identificados por familia de talento. */
  familias: { familia: TapasFamily; label: string; color: string; count: number; pct: number }[];
  dominantFamilias: TapasFamily[]; // hasta 3
  groups: TalentGroup[]; // en el orden que dejó el estudiante (más fuerte -> más débil)
  groupCount: number;
}

export function scoreTapas(
  classification: Record<string, TapasChoice>,
  groups: TalentGroup[]
): TapasResult {
  const identifiedKeys = ARCHETYPES.filter((a) => classification[a.key] === "SI").map((a) => a.key);
  const dudaCount = ARCHETYPES.filter((a) => classification[a.key] === "DUDA").length;
  const noCount = ARCHETYPES.filter((a) => classification[a.key] === "NO").length;

  const counts: Record<TapasFamily, number> = {
    CREAR: 0, INDAGAR: 0, CONSTRUIR: 0, CUIDAR: 0, LIDERAR: 0, EXPLORAR: 0,
  };
  for (const k of identifiedKeys) {
    const a = ARCHETYPE_MAP[k];
    if (a) counts[a.familia]++;
  }
  const total = identifiedKeys.length || 1;
  const familias = (Object.keys(TAPAS_FAMILIES) as TapasFamily[])
    .map((familia) => ({
      familia,
      label: TAPAS_FAMILIES[familia].label,
      color: TAPAS_FAMILIES[familia].color,
      count: counts[familia],
      pct: Math.round((counts[familia] / total) * 100),
    }))
    .sort((a, b) => b.count - a.count);

  const dominantFamilias = familias.filter((f) => f.count > 0).slice(0, 3).map((f) => f.familia);

  const cleanGroups = groups
    .map((g) => ({
      name: (g.name || "").trim(),
      archetypes: (g.archetypes || []).filter((k) => ARCHETYPE_MAP[k]),
    }))
    .filter((g) => g.archetypes.length > 0);

  return {
    identifiedKeys,
    identifiedCount: identifiedKeys.length,
    dudaCount,
    noCount,
    familias,
    dominantFamilias,
    groups: cleanGroups,
    groupCount: cleanGroups.length,
  };
}

export const TAPAS_INTERPRETATION = {
  familias:
    "Las familias de talento agrupan los arquetipos por afinidad. Sirven para ver, de un vistazo, hacia dónde se inclinan los intereses del estudiante. No sustituyen a los grupos que armó el propio estudiante, que son el resultado central del juego.",
  grupos:
    "Los grupos de talentos son la lectura que hace el estudiante de sí mismo: qué habilidades siente que van juntas y cuáles son más fuertes. Se contrastan en la entrevista de orientación con sus intereses declarados, sus asignaturas y su Proyecto de Vida.",
} as const;

// ---------------------------------------------------------------------------------------------
// Agregado colectivo (informe del proceso)
// ---------------------------------------------------------------------------------------------

export interface ArquetiposAggregate {
  respondents: number;
  avgIdentified: number;
  /** Cuántos arquetipos identificados caen en cada familia, sumando a todo el grupo. */
  familias: { familia: TapasFamily; label: string; color: string; count: number; pct: number }[];
  /** Estudiantes cuya familia dominante es cada una. */
  dominantStudents: Record<string, number>;
  topArchetypes: { key: string; name: string; count: number }[];
  /** Verbos con los que arrancan los nombres de grupo (p. ej. «Crear», «Proteger»). */
  topVerbs: { text: string; count: number }[];
}

export function aggregateArquetipos(results: TapasResult[]): ArquetiposAggregate {
  const famCounts: Record<string, number> = {};
  const dominant: Record<string, number> = {};
  // Sin prototipo: hay un arquetipo «constructor» y {}.constructor existe en todo objeto.
  const arch: Record<string, number> = Object.create(null);
  const verbs = new Map<string, { text: string; count: number }>();
  let totalIdentified = 0;

  for (const r of results) {
    totalIdentified += r.identifiedCount || 0;
    for (const f of r.familias || []) famCounts[f.familia] = (famCounts[f.familia] || 0) + f.count;
    const top = r.dominantFamilias?.[0];
    if (top) dominant[top] = (dominant[top] || 0) + 1;
    for (const k of r.identifiedKeys || []) arch[k] = (arch[k] || 0) + 1;
    for (const g of r.groups || []) {
      const word = (g.name || "").trim().split(/\s+/)[0];
      if (!word) continue;
      const norm = word
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "");
      const cur = verbs.get(norm);
      if (cur) cur.count++;
      else verbs.set(norm, { text: word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(), count: 1 });
    }
  }

  const totalFam = Object.values(famCounts).reduce((a, b) => a + b, 0) || 1;
  const familias = (Object.keys(TAPAS_FAMILIES) as TapasFamily[])
    .map((familia) => ({
      familia,
      label: TAPAS_FAMILIES[familia].label,
      color: TAPAS_FAMILIES[familia].color,
      count: famCounts[familia] || 0,
      pct: Math.round(((famCounts[familia] || 0) / totalFam) * 100),
    }))
    .sort((a, b) => b.count - a.count);

  return {
    respondents: results.length,
    avgIdentified: results.length ? Math.round((totalIdentified / results.length) * 10) / 10 : 0,
    familias,
    dominantStudents: dominant,
    topArchetypes: Object.entries(arch)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 10)
      .map(([key, count]) => ({ key, name: ARCHETYPE_MAP[key]?.name || key, count })),
    topVerbs: [...verbs.values()].sort((a, b) => b.count - a.count || a.text.localeCompare(b.text, "es")).slice(0, 10),
  };
}
