/**
 * Acta de Reunión del DECE — formato oficial del Ministerio de Educación
 * ("Acta de Reunión", Dirección Nacional de Administración de Procesos, v2.0).
 * Puro, sin base de datos.
 */

export interface MeetingAttendee {
  nombre: string;
  correo: string;
  cargo: string;
}
export interface MeetingAgendaItem {
  tema: string;
  compromiso: string;
  responsable: string;
  fecha_plazo: string;
}
export interface MeetingSignatory {
  nombre: string;
}

export const ACCEPTANCE_TEXT =
  "Para constancia de la conformidad de la presente acta y de aceptación de los miembros de la Reunión firman los participantes a la reunión.";
export const ACCEPTANCE_NOTE =
  "NOTA: Si no existen observaciones a este documento en el periodo de dos (2) días laborales, se lo considera como aceptado.";

export const AI_FIELD_LABELS = {
  thematic_background:
    "Antecedentes de la temática de un acta de reunión del DECE (contexto breve y formal de por qué se convoca la reunión, en 3.ª persona, estilo institucional del Ministerio de Educación del Ecuador, sin nombres de estudiantes ni datos personales)",
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

export const parseAttendees = (raw: string | null | undefined) => safeArray<MeetingAttendee>(raw);
export const parseAgenda = (raw: string | null | undefined) => safeArray<MeetingAgendaItem>(raw);
export const parseSignatories = (raw: string | null | undefined) => safeArray<MeetingSignatory>(raw);

/** Correlativo simple del acta dentro de la institución y el año en curso. */
export function buildMeetingCode(acronym: string, year: number | string, seq: number): string {
  return `ACTA-DECE-${acronym}-${year}-${String(seq).padStart(3, "0")}`;
}
