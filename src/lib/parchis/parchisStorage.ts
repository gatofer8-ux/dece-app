import type { ParchisGameState } from "./types";
import { createInitialGameState } from "./parchisEngine";

const STORAGE_KEY = "sadex_parchis_game_state_v1";

export function loadParchisState(): ParchisGameState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ParchisGameState;
    if (parsed && Array.isArray(parsed.teams) && parsed.teams.length >= 2) {
      return parsed;
    }
  } catch (err) {
    console.error("Error al cargar estado del Parchís Inclusivo:", err);
  }
  return null;
}

export function saveParchisState(state: ParchisGameState): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.error("Error al guardar estado del Parchís Inclusivo:", err);
  }
}

export function clearParchisState(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.error("Error al limpiar estado del Parchís Inclusivo:", err);
  }
}
