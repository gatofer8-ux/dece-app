// Estructuras para el Acta de Asesoramiento a la Máxima Autoridad
// Institucional, transcrito de la plantilla institucional.

export interface ParticipantEntry {
  nombre: string;
  cargo: string;
  funcion: string; // función en el asesoramiento
}

export function parseJsonArray<T>(json: string): T[] {
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// Prefijos ordinales usados en la sección "MEDIDAS DE PROTECCIÓN DISPUESTAS",
// tal como aparecen en la plantilla (PRIMERO., SEGUNDO., ...).
export const ORDINAL_WORDS = [
  "PRIMERO",
  "SEGUNDO",
  "TERCERO",
  "CUARTO",
  "QUINTO",
  "SEXTO",
  "SÉPTIMO",
  "OCTAVO",
];

export function ordinalWord(index: number): string {
  return ORDINAL_WORDS[index] || `${index + 1}°`;
}
