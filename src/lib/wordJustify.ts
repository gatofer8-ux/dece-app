import { AlignmentType } from "docx";

/**
 * Decide la alineación de un párrafo al exportar a Word.
 *
 * Problema: al justificar, Word (y LibreOffice) estiran TODAS las líneas de un
 * párrafo menos la última. Si el texto es corto y se parte en dos líneas, la
 * primera queda con huecos enormes entre palabras. Es lo que se ve en algunos
 * formatos descargados con poco contenido.
 *
 * Solución: justificar solo párrafos suficientemente largos (varios renglones),
 * donde el estiramiento se reparte y no se nota. Los cortos van a la izquierda.
 *
 * `minChars` ≈ largo a partir del cual el párrafo ocupa 2+ líneas completas en
 * un ancho de página A4 con márgenes normales.
 */
export function smartAlign(
  text: string | null | undefined,
  minChars = 170
): (typeof AlignmentType)[keyof typeof AlignmentType] {
  const t = (text || "").trim();
  if (t.length < minChars) return AlignmentType.LEFT;
  // Si hay saltos de línea, mirar la línea más larga: si ninguna llega al
  // umbral, tampoco conviene justificar.
  const longestLine = Math.max(...t.split("\n").map((l) => l.trim().length), 0);
  if (longestLine < minChars) return AlignmentType.LEFT;
  return AlignmentType.JUSTIFIED;
}
