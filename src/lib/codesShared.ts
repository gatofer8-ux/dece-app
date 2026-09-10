/**
 * Helpers puros de codificación de casos, sin dependencias de base de datos
 * (para poder usarlos también dentro del arranque de `db.ts` sin ciclos de
 * importación).
 *
 * Formato de código: `SIGLAS-DOCUMENTO-AÑO-NN`
 *   Ej.: `UESR-1805123456-2026-01`
 */

const ACRONYM_STOPWORDS = new Set(["DE", "DEL", "LA", "EL", "LOS", "LAS", "Y", "E", "A", "EN"]);

/** Deriva unas siglas legibles a partir del nombre de la institución. */
export function deriveAcronym(name: string | null | undefined): string {
  if (!name) return "IE";
  const words = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/["“”'.·]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .filter((w) => !ACRONYM_STOPWORDS.has(w));
  const acr = words.map((w) => w[0]).join("").slice(0, 5);
  return acr.length >= 2 ? acr : "IE";
}

/** Siglas efectivas de una institución (campo configurado o derivadas). */
export function institutionAcronym(
  inst: { acronym?: string | null; name?: string | null } | null | undefined
): string {
  const configured = inst?.acronym?.trim();
  if (configured) {
    const clean = configured
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 8);
    return clean || deriveAcronym(inst?.name);
  }
  return deriveAcronym(inst?.name);
}

/** Normaliza el documento del estudiante para usarlo dentro del código. */
export function documentToken(documentId: string | null | undefined, studentId: string): string {
  const clean = (documentId || "").replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  if (clean.length >= 4) return clean;
  // Estudiante sin documento (extranjero en trámite, dato pendiente…):
  // fragmento estable del id interno para no chocar con otros.
  return "SD" + studentId.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 6);
}

/** Compone un código de caso a partir de sus partes. */
export function buildCaseCode(
  acronym: string,
  docToken: string,
  year: number | string,
  seq: number
): string {
  return `${acronym}-${docToken}-${year}-${String(seq).padStart(2, "0")}`;
}
