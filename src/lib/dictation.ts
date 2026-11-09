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

/* ------------------------------------------------------------------------- */
/* Filtro anti-alucinaciones de Whisper                                      */
/* ------------------------------------------------------------------------- */

export interface WhisperSegment {
  text?: string;
  no_speech_prob?: number;
  avg_logprob?: number;
  compression_ratio?: number;
}

// Umbrales estándar de Whisper (los mismos que usa su transcripción por defecto).
const NO_SPEECH_THRESHOLD = 0.6;
const LOGPROB_THRESHOLD = -1.0;
const COMPRESSION_RATIO_THRESHOLD = 2.4;

// Frases que Whisper inventa cuando el audio está vacío o con ruido.
const KNOWN_HALLUCINATIONS = [
  "dictado formal",
  "subtitulos realizados por",
  "subtitulos por la comunidad",
  "amara org",
  "gracias por ver",
  "suscribete",
  "no se escucha",
  "no hay audio",
];

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * ¿El texto es, en esencia, la "pista" (prompt) que se le dio al modelo repetida?
 * Cuando el audio llega vacío, Whisper tiende a devolver la pista tal cual.
 */
export function looksLikePromptEcho(text: string, prompt: string): boolean {
  const t = normalize(text);
  const p = normalize(prompt);
  if (!t || !p) return false;
  const words = t.split(" ");
  // Frases cortas ("representante legal", "acta de reunión") pueden ser dictado legítimo: solo
  // se considera eco a partir de 4 palabras seguidas copiadas de la pista.
  if (words.length < 4) return false;
  if (p.includes(t)) return true;
  if (words.length < 5) return false;
  const promptWords = new Set(p.split(" "));
  const inPrompt = words.filter((w) => promptWords.has(w)).length;
  return inPrompt / words.length >= 0.8;
}

export function hasKnownHallucination(text: string): boolean {
  const t = normalize(text);
  return KNOWN_HALLUCINATIONS.some((h) => t.includes(h));
}

/** Una misma frase repetida 3 o más veces seguidas (bucle típico de Whisper). */
export function hasRepetitionLoop(text: string): boolean {
  const t = normalize(text);
  const words = t.split(" ");
  if (words.length < 6) return false;
  for (let n = 1; n <= 8; n++) {
    for (let i = 0; i + n * 3 <= words.length; i++) {
      const a = words.slice(i, i + n).join(" ");
      if (a.length < 3) continue;
      if (a === words.slice(i + n, i + 2 * n).join(" ") && a === words.slice(i + 2 * n, i + 3 * n).join(" ")) return true;
    }
  }
  return false;
}

/**
 * Une los segmentos confiables de una respuesta `verbose_json` de Whisper.
 * Devuelve "" si no hay voz real (silencio, ruido o texto inventado).
 */
export function filterWhisperSegments(data: { text?: string; segments?: WhisperSegment[] }, prompt = ""): string {
  const segments = Array.isArray(data.segments) ? data.segments : null;

  const keep = (text: string): boolean => {
    const t = text.trim();
    if (!t) return false;
    if (hasKnownHallucination(t)) return false;
    if (prompt && looksLikePromptEcho(t, prompt)) return false;
    if (hasRepetitionLoop(t)) return false;
    return true;
  };

  if (!segments || segments.length === 0) {
    return keep(data.text || "") ? (data.text || "").trim() : "";
  }

  const good = segments.filter((s) => {
    const silent = (s.no_speech_prob ?? 0) > NO_SPEECH_THRESHOLD && (s.avg_logprob ?? 0) < LOGPROB_THRESHOLD;
    const looping = (s.compression_ratio ?? 0) > COMPRESSION_RATIO_THRESHOLD;
    return !silent && !looping && keep(s.text || "");
  });

  return good.map((s) => (s.text || "").trim()).join(" ").replace(/\s+/g, " ").trim();
}
