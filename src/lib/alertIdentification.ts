/**
 * Acta de Identificación de Alertas (Junta de Curso): el DECE arma una
 * "sesión" (una junta, por curso y fecha) con un código/enlace público, y
 * cada docente presente agrega, sin necesidad de cuenta, sus propias filas
 * de "estudiante en alerta" durante la reunión. Puro, sin base de datos, para
 * poder importarse también desde componentes de cliente.
 */

export interface AlertSessionAttendee {
  nombre: string;
  telefono: string;
}

export function parseAttendees(raw: string | null | undefined): AlertSessionAttendee[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? (v as AlertSessionAttendee[]) : [];
  } catch {
    return [];
  }
}

export const ACTA_ALERTAS_ACEPTACION_TEXT =
  "Para constancia de la conformidad de la presente acta y de aceptación de los miembros de la Reunión, firman los participantes a la reunión.";
export const ACTA_ALERTAS_NOTIFICACION_TEXT =
  "Los docentes que identificaren algún tipo de riesgo psicosocial notificarán de manera formal por escrito al profesional DECE encargado mediante la ficha de notificación de alerta dentro del lapso de las siguientes 48 horas laborables.";
export const ACTA_ALERTAS_ACEPTACION_NOTE =
  "NOTA: Si no existen observaciones a este documento en el periodo de dos (2) días laborales, se lo considera como aceptado.";

/** "Los docentes miembros de la junta de grado/curso conocen los casos de vulnerabilidad atendidos por el DECE durante el año lectivo {añoLectivo}." */
export function defaultObservaciones(schoolYearText: string): string {
  return `Los docentes miembros de la junta de grado/curso conocen los casos de vulnerabilidad atendidos por el DECE durante el año lectivo ${schoolYearText}.`;
}
