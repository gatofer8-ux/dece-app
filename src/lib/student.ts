// Catálogos y helpers para la ficha ampliada del estudiante (ronda 17),
// basados en el formato oficial "FICHA ESTUDIANTE-2025" usado por la
// institución (datos de nacimiento, datos familiares, necesidad educativa
// específica, datos médicos).

export function parseJsonArray<T>(json: string): T[] {
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export const JORNADA_OPTIONS = ["MATUTINA", "VESPERTINA", "NOCTURNA"] as const;

export const LIVES_WITH_OPTIONS = [
  { value: "PADRES", label: "Padres" },
  { value: "MADRE", label: "Madre" },
  { value: "PADRE", label: "Padre" },
  { value: "ABUELITA", label: "Abuelita/o" },
  { value: "OTRO", label: "Otro" },
] as const;

export const LEGAL_GUARDIAN_OPTIONS = [
  { value: "PADRE", label: "Padre" },
  { value: "MADRE", label: "Madre" },
  { value: "REPRESENTANTE", label: "Representante" },
] as const;

export const NEE_TYPE_OPTIONS = [
  { value: "NINGUNA", label: "Ninguna" },
  { value: "FISICA", label: "Física" },
  { value: "INTELECTUAL", label: "Intelectual" },
  { value: "VISUAL", label: "Visual" },
  { value: "AUDITIVA", label: "Auditiva" },
  { value: "MULTIDISCAPACIDAD", label: "Multidiscapacidad" },
  { value: "PSICOLOGICA", label: "Psicológica" },
] as const;

export const NEE_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  NEE_TYPE_OPTIONS.map((o) => [o.value, o.label])
);

export const LIVES_WITH_LABELS: Record<string, string> = Object.fromEntries(
  LIVES_WITH_OPTIONS.map((o) => [o.value, o.label])
);

export const LEGAL_GUARDIAN_LABELS: Record<string, string> = Object.fromEntries(
  LEGAL_GUARDIAN_OPTIONS.map((o) => [o.value, o.label])
);

// Nivel educativo (ronda 18) — EGB (Educación General Básica) o Bachillerato.
// La especialidad/figura profesional del Bachillerato Técnico (contabilidad,
// electricidad, informática, etc.) varía por institución, así que se guarda
// como texto libre y solo aplica cuando el nivel es BACHILLERATO.
export const EDUCATION_LEVEL_OPTIONS = [
  { value: "EGB", label: "Educación General Básica (EGB)" },
  { value: "BACHILLERATO", label: "Bachillerato" },
] as const;

export const EDUCATION_LEVEL_LABELS: Record<string, string> = Object.fromEntries(
  EDUCATION_LEVEL_OPTIONS.map((o) => [o.value, o.label])
);

/** Edad cumplida en años a partir de la fecha de nacimiento (para la ficha impresa). */
export function computeAge(birthDate: string | null | undefined): number | null {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  if (Number.isNaN(birth.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const beforeBirthdayThisYear =
    now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate());
  if (beforeBirthdayThisYear) age -= 1;
  return age >= 0 ? age : null;
}

/**
 * Año lectivo actual, estimado con el calendario más común en Ecuador
 * (régimen Sierra/Amazonía, agosto a julio). Es solo una referencia inicial
 * para la ficha impresa — el régimen exacto (Sierra/Costa) varía por
 * institución y se dejaba en blanco en la plantilla oficial para llenarlo a
 * mano si no corresponde.
 */
export function currentSchoolYearLabel(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1-12
  return month >= 8 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
}
