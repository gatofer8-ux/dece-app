/**
 * Cálculo del año lectivo en curso a partir de la fecha actual.
 * Módulo puro (sin base de datos ni next/headers) para poder usarlo también
 * en componentes y en la generación de documentos Word.
 *
 * Se usa SOLO como valor por defecto cuando no hay un año lectivo activo
 * configurado en la institución; si lo hay, siempre manda ese.
 */

export type SchoolYearRegime = "SIERRA_AMAZONIA" | "COSTA" | string;

/**
 * Devuelve el año lectivo en curso, p. ej. "2026-2027".
 * - Sierra-Amazonía: el año lectivo arranca en septiembre.
 * - Costa: arranca alrededor de mayo.
 */
export function currentSchoolYearText(
  regime: SchoolYearRegime = "SIERRA_AMAZONIA",
  now: Date = new Date()
): string {
  const y = now.getFullYear();
  const m = now.getMonth(); // 0 = enero
  // Inicio del año lectivo: Costa ~mayo (4), Sierra-Amazonía ~septiembre (8).
  const startMonth = String(regime).toUpperCase().includes("COSTA") ? 4 : 8;
  const startYear = m >= startMonth ? y : y - 1;
  return `${startYear}-${startYear + 1}`;
}

/** Igual que currentSchoolYearText pero con espacios: "2026 - 2027". */
export function currentSchoolYearSpaced(regime?: SchoolYearRegime, now?: Date): string {
  return currentSchoolYearText(regime, now).replace("-", " - ");
}
