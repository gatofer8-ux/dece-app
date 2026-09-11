/**
 * Informe del Diagnóstico Institucional sobre la ENEIS — documento narrativo
 * de levantamiento inicial (una vez por institución/año), distinto de los
 * informes periódicos automáticos. Puro, sin base de datos.
 */

export interface EneisDiagnosticoResultadoEje {
  eje: string;
  componentes: string;
  fuente: string;
  dificultades: string;
  positivos: string;
  negativos: string;
  sesgados: string;
}
export interface EneisDiagnosticoResponsable {
  nombre: string;
  cargo: string;
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
function safeStringArray(raw: string | null | undefined): string[] {
  return safeArray<string>(raw).filter((s): s is string => typeof s === "string");
}

export const parseEneisDiagnosticoObjetivos = (raw: string | null | undefined) => safeStringArray(raw);
export const parseEneisDiagnosticoActividades = (raw: string | null | undefined) => safeStringArray(raw);
export const parseEneisDiagnosticoResultados = (raw: string | null | undefined) =>
  safeArray<EneisDiagnosticoResultadoEje>(raw);
export const parseEneisDiagnosticoResponsables = (raw: string | null | undefined) =>
  safeArray<EneisDiagnosticoResponsable>(raw);

/**
 * Guía de reflexión "DIAGNÓSTICO INSTITUCIONAL SOBRE LA ENEIS" que acompaña
 * el formato original como anexo de referencia (no se llena por campo: se
 * usa como insumo para redactar antecedentes/conclusiones).
 */
export const ENEIS_DIAGNOSTICO_GUIA_PREGUNTAS = [
  "¿Qué acciones ha tomado la institución para hablar sobre educación sexual, salud reproductiva y prevención del embarazo?",
  "¿Existen resistencias culturales o religiosas en la comunidad que puedan influir en la enseñanza de la educación integral en sexualidad?",
  "¿Considera que la información que recibe sobre sexualidad y salud reproductiva es suficiente y adecuada?",
  "¿Qué tan cómodo/a se siente al hablar sobre temas relacionados con la sexualidad y la salud sexual en la comunidad educativa?",
  "¿Cree que es necesario fortalecer la capacitación sobre bienestar emocional, educación sexual integral y respeto a la diversidad de género en la institución?",
];
