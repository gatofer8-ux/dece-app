/**
 * Acta de reunión ENEIS — formato propio de seguimiento mensual de la
 * Comisión/Red institucional ENEIS (distinto del acta general del DECE en
 * /actas-reunion). Puro, sin base de datos.
 */

export interface EneisActaParticipant {
  nombre: string;
  cargo: string;
}
export interface EneisActaCompromiso {
  compromiso: string;
  responsable: string;
  fecha: string;
}

function safeArray<T>(raw: string | null | undefined): T[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? (v as T[]) : [];
  } catch {
    return [];
  }
}

export const parseEneisActaParticipants = (raw: string | null | undefined) =>
  safeArray<EneisActaParticipant>(raw);
export const parseEneisActaCompromisos = (raw: string | null | undefined) =>
  safeArray<EneisActaCompromiso>(raw);
