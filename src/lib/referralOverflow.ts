/**
 * Estimación (aproximada, sin renderizar) de si la Ficha de Derivación se va a
 * pasar de UNA hoja horizontal al descargar/imprimir. Sirve para avisar al
 * profesional de que resuma la información antes de guardar o imprimir.
 *
 * Puro (sin base de datos) para poder usarse en el formulario (cliente) y en la
 * previsualización (servidor).
 */

export interface ReferralOverflowInput {
  current_situation_history?: string | null;
  background_summary?: string | null;
  actions_taken?: string | null;
  care_type_required?: string | null;
  observations?: string | null;
  student_address?: string | null;
}

export interface ReferralOverflowEstimate {
  /** true si es probable que la ficha ocupe más de una hoja. */
  overflow: boolean;
  /** 0..1+ : proporción estimada del alto disponible para texto libre que se usa. */
  ratio: number;
  /** líneas estimadas por encima del presupuesto de una hoja (0 si cabe). */
  linesOver: number;
}

// Caracteres que caben por línea en las celdas anchas (~24 cm a 9 pt Calibri).
const WIDE_CHARS_PER_LINE = 150;
// Presupuesto de líneas de texto libre en una hoja (el resto del formato es fijo).
const FREE_TEXT_LINE_BUDGET = 12;

function countLines(text: string | null | undefined, charsPerLine = WIDE_CHARS_PER_LINE): number {
  const t = (text || "").trim();
  if (!t) return 0;
  // Cada salto de línea explícito es al menos una línea; además cada tramo
  // largo envuelve según el ancho de la celda.
  return t
    .split("\n")
    .reduce((sum, seg) => sum + Math.max(1, Math.ceil(seg.trim().length / charsPerLine)), 0);
}

export function estimateReferralOverflow(input: ReferralOverflowInput): ReferralOverflowEstimate {
  const historia = input.current_situation_history || input.background_summary || "";
  // Acciones y observaciones van "en línea continua" en el documento, así que
  // se mide su longitud total, no el número de viñetas.
  const accionesInline = (input.actions_taken || "").split("\n").map((s) => s.trim()).filter(Boolean).join("     ");
  const obsInline = (input.observations || "").split("\n").map((s) => s.trim()).filter(Boolean).join("     ");

  const usedLines =
    countLines(historia) +
    countLines(accionesInline) +
    countLines(obsInline) +
    countLines(input.care_type_required) +
    countLines(input.student_address, 60); // la dirección va en una columna más estrecha

  const linesOver = Math.max(0, usedLines - FREE_TEXT_LINE_BUDGET);
  return {
    overflow: usedLines > FREE_TEXT_LINE_BUDGET,
    ratio: usedLines / FREE_TEXT_LINE_BUDGET,
    linesOver,
  };
}

export const REFERRAL_OVERFLOW_MESSAGE =
  "Es probable que esta ficha ocupe más de una hoja al descargar. Revisa y resume la Historia de la situación actual, las Acciones y las Observaciones para que entre en una sola página.";
