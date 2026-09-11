/**
 * Utilidades para el procesamiento de dictado por voz en el sistema DECE.
 * Normaliza comandos de puntuación hablados en español ecuatoriano a signos formales
 * y capitaliza oraciones tras punto.
 */

export function processDictationPunctuation(rawText: string): string {
  if (!rawText) return "";

  let text = rawText
    // Saltos de párrafo y línea (consumir espacios adyacentes)
    .replace(/\s*\b(?:punto\s+y\s+aparte|punto\s+aparte)\b\s*/gi, ".\n\n")
    .replace(/\s*\b(?:salto\s+de\s+l[ií]nea|nueva\s+l[ií]nea)\b\s*/gi, "\n")
    // Puntuación básica
    .replace(/\s*\bpunto\s+seguido\b\s*/gi, ". ")
    .replace(/\s*\bpunto\s+y\s+coma\b\s*/gi, "; ")
    .replace(/\s*\bdos\s+puntos\b\s*/gi, ": ")
    .replace(/\s*\bcoma\b\s*/gi, ", ")
    .replace(/\s*\bpunto\s+final\b\s*/gi, ".")
    // Interrogación y admiración: apertura ANTES de cierre
    .replace(/\s*\babrir\s+(?:signo\s+de\s+)?interrogaci[oó]n\b\s*/gi, " ¿")
    .replace(/\s*\babrir\s+(?:signo\s+de\s+)?(?:admiraci[oó]n|exclamaci[oó]n)\b\s*/gi, " ¡")
    .replace(/\s*\b(?:cerrar\s+)?(?:signo\s+de\s+)?interrogaci[oó]n\b\s*/gi, "? ")
    .replace(/\s*\b(?:cerrar\s+)?(?:signo\s+de\s+)?(?:admiraci[oó]n|exclamaci[oó]n)\b\s*/gi, "! ")
    // Paréntesis y comillas
    .replace(/\s*\babrir\s+par[eé]ntesis\b\s*/gi, " (")
    .replace(/\s*\bcerrar\s+par[eé]ntesis\b\s*/gi, ") ")
    .replace(/\s*\bguion\s+medio\b\s*/gi, " - ")
    // Punto simple
    .replace(/\s*\bpunto\b\s*/gi, ". ")
    // Colapsar espacios horizontales respetando saltos de línea (\n)
    .replace(/[^\S\r\n]+/g, " ")
    // Eliminar espacios antes de signos de cierre
    .replace(/\s+([.,;:!?%])/g, "$1")
    // Asegurar espacio después de coma, punto y coma, dos puntos, punto si le sigue una letra
    .replace(/([,;:])([a-zA-ZáéíóúñÁÉÍÓÚÑ])/g, "$1 $2")
    .replace(/(\.)([a-zA-ZáéíóúñÁÉÍÓÚÑ])/g, "$1 $2")
    // Eliminar espacios después de signos de apertura
    .replace(/([¿¡(])\s+/g, "$1")
    // Normalizar múltiples saltos de línea (máximo 2)
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  // Capitalizar la primera letra del texto y la primera tras un punto, signo de interrogación o admiración
  text = text.replace(/(?:^|[.!?]\s+|[¿¡])([a-záéíóúñ])/g, (match, letter) => {
    // Si contiene signo de apertura ¿ o ¡, mantenerlo y capitalizar la letra
    if (match.startsWith("¿")) return `¿${letter.toUpperCase()}`;
    if (match.startsWith("¡")) return `¡${letter.toUpperCase()}`;
    return match.toUpperCase();
  });

  // Capitalizar tras salto de línea
  text = text.replace(/\n\n\s*([a-záéíóúñ])/g, (match, letter) => {
    return `\n\n${letter.toUpperCase()}`;
  });

  return text;
}
