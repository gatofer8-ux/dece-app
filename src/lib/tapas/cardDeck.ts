import fs from "fs";
import path from "path";
import { db } from "@/lib/db";
import { UPLOADS_DIR } from "@/lib/uploads";
import { ARCHETYPES } from "./archetypes";

/**
 * Mazo de cartillas ilustradas por institución. Cada institución sube su propia
 * copia de la herramienta oficial gratuita (Tarjetas de arquetipos, Proyecto
 * TaPas – VVOB / MinEduc) y el sistema la guarda como una imagen por arquetipo,
 * dentro del almacenamiento de la institución. Las ilustraciones no están en el
 * código del sistema.
 */

export const TAPAS_CARDS_DIR = path.join(UPLOADS_DIR, "tapas-cards");

export interface TapasCardDeckRow {
  institution_id: string;
  cards_json: string;
  card_count: number;
  source_note: string | null;
  uploaded_by_id: string | null;
  created_at: string;
  updated_at: string;
}

export function getDeckRow(institutionId: string): TapasCardDeckRow | null {
  return (
    (db.prepare("SELECT * FROM tapas_card_decks WHERE institution_id = ?").get(institutionId) as
      | TapasCardDeckRow
      | undefined) || null
  );
}

/** Mapa { archetypeKey: rutaRelativa } de las cartillas cargadas por la institución. */
export function getDeckCards(institutionId: string): Record<string, string> {
  const row = getDeckRow(institutionId);
  if (!row) return {};
  try {
    const parsed = JSON.parse(row.cards_json || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

/** Conjunto de claves de arquetipo con cartilla, para saber qué falta. */
export function getDeckKeySet(institutionId: string): Set<string> {
  return new Set(Object.keys(getDeckCards(institutionId)));
}

export function resolveCardPath(relativePath: string): string | null {
  const full = path.normalize(path.join(UPLOADS_DIR, relativePath));
  if (!full.startsWith(UPLOADS_DIR)) return null;
  if (!fs.existsSync(full)) return null;
  return full;
}

/** Normaliza un nombre de cartilla para emparejarlo con un arquetipo. */
export function normalizeCardName(s: string): string {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const NAME_INDEX: { key: string; norms: string[] }[] = ARCHETYPES.map((a) => {
  // "Abogada / abogado" -> variantes "abogada abogado", "abogado", "abogada"
  const raw = normalizeCardName(a.name);
  const parts = a.name.split("/").map((p) => normalizeCardName(p)).filter(Boolean);
  const norms = new Set<string>([raw, ...parts, normalizeCardName(a.key.replace(/_/g, " "))]);
  return { key: a.key, norms: [...norms] };
});

/** Empareja el nombre impreso de una cartilla con la clave del arquetipo (o null). */
export function matchArchetypeKey(cardName: string): string | null {
  const n = normalizeCardName(cardName);
  if (!n) return null;
  // coincidencia exacta con alguna variante
  for (const item of NAME_INDEX) {
    if (item.norms.includes(n)) return item.key;
  }
  // coincidencia por contención de tokens (ambos sentidos)
  const nTokens = new Set(n.split(" "));
  let best: { key: string; score: number } | null = null;
  for (const item of NAME_INDEX) {
    for (const variant of item.norms) {
      const vTokens = variant.split(" ").filter(Boolean);
      if (vTokens.length === 0) continue;
      const overlap = vTokens.filter((t) => nTokens.has(t)).length;
      const score = overlap / Math.max(vTokens.length, nTokens.size);
      if (overlap >= 1 && (!best || score > best.score)) best = { key: item.key, score };
    }
  }
  return best && best.score >= 0.5 ? best.key : null;
}
