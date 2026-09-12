/**
 * Acta de Reunión del DECE — formato oficial del Ministerio de Educación
 * ("Acta de Reunión", Dirección Nacional de Administración de Procesos, v2.0).
 * Puro, sin base de datos.
 */

export interface MeetingAttendee {
  nombre: string;
  telefono: string;
}
/** @deprecated Se reemplazó por un solo bloque narrativo (`desarrollo_narrativo`). Se conserva para imprimir actas antiguas que ya tenían compromisos guardados. */
export interface MeetingAgendaItem {
  tema: string;
  compromiso: string;
  responsable: string;
  fecha_plazo: string;
}
export interface MeetingSignatory {
  nombre: string;
  tipo?: "digital" | "fisica";
  firma_data_url?: string;
  referencia_fisica?: string;
  fecha_firma?: string;
  respaldo_archivo_url?: string;
  respaldo_nombre?: string;
  observacion_firma?: string;
}

export const ACCEPTANCE_TEXT =
  "Para constancia de la conformidad de la presente acta y de aceptación de los miembros de la Reunión firman los participantes a la reunión.";
export const ACCEPTANCE_NOTE =
  "NOTA: Si no existen observaciones a este documento en el periodo de dos (2) días laborales, se lo considera como aceptado.";

/** Nombre completo de la dependencia, tal como figura en el formato oficial. */
export const DEPENDENCIA_LABEL = "DEPARTAMENTO DE CONSEJERÍA ESTUDIANTIL";

export const AI_FIELD_LABELS = {
  thematic_background:
    "Antecedentes de la temática de un acta de reunión del DECE (contexto breve y formal de por qué se convoca la reunión, en 3.ª persona, estilo institucional del Ministerio de Educación del Ecuador, sin nombres de estudiantes ni datos personales)",
  desarrollo_narrativo:
    "Desarrollo de la reunión de un acta del DECE (narrativa formal en 3.ª persona de lo tratado, acuerdos y compromisos de la reunión, estilo institucional del Ministerio de Educación del Ecuador, sin nombres de estudiantes ni datos personales)",
} as const;

function safeArray<T>(raw: string | null | undefined): T[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? (v as T[]) : [];
  } catch {
    return [];
  }
}

/** Lee asistentes; acepta el campo antiguo `correo` como respaldo del actual `telefono` (actas guardadas antes de este cambio). */
export function parseAttendees(raw: string | null | undefined): MeetingAttendee[] {
  const arr = safeArray<{ nombre?: string; telefono?: string; correo?: string }>(raw);
  return arr.map((a) => ({ nombre: a.nombre || "", telefono: a.telefono || a.correo || "" }));
}
export const parseAgenda = (raw: string | null | undefined) => safeArray<MeetingAgendaItem>(raw);
export const parseSignatories = (raw: string | null | undefined) => safeArray<MeetingSignatory>(raw);

/** Correlativo simple del acta dentro de la institución y el año en curso. */
export function buildMeetingCode(acronym: string, year: number | string, seq: number): string {
  return `ACTA-DECE-${acronym}-${year}-${String(seq).padStart(3, "0")}`;
}
