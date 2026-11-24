import { ARCHETYPES } from "./archetypes";

/**
 * Cartillas incluidas en la app (public/tapas-cards). Provienen del juego oficial gratuito
 * «Tarjetas de arquetipos» del Proyecto TaPas (VVOB Education for Development y TaPasCity),
 * generadas con scripts/buildTapasBuiltinDeck.mjs. Cada cartilla conserva sus logos y
 * créditos originales. Si una institución sube su propio mazo (Cartillas), ese reemplaza a
 * este, tarjeta por tarjeta.
 */

export const BUILTIN_CARDS_BASE = "/tapas-cards";

export function builtinCardUrl(key: string): string {
  return `${BUILTIN_CARDS_BASE}/${key}.jpg`;
}

/** Tarjetas de categoría del juego («Me identifico», «No sé, tengo dudas», «No me identifico»). */
export const BUILTIN_CATEGORY_CARDS: Record<"SI" | "DUDA" | "NO", string> = {
  SI: `${BUILTIN_CARDS_BASE}/cat_si.jpg`,
  DUDA: `${BUILTIN_CARDS_BASE}/cat_duda.jpg`,
  NO: `${BUILTIN_CARDS_BASE}/cat_no.jpg`,
};

/** Claves de todos los arquetipos que tienen cartilla incluida (los 74). */
export const BUILTIN_DECK_KEYS: string[] = ARCHETYPES.map((a) => a.key);
