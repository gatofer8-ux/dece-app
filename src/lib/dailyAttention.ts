// Catálogo para el Registro de Atención Diaria (Estudiantes / Representantes /
// Docentes y Autoridades), transcrito de las 3 plantillas institucionales:
// "REGISTRO ATENCIÓN ESTUDIANTES", "REGISTRO ATENCIÓN PADRES Y REPRESENTANTES"
// y "REGISTRO DE ATENCIÓN A DOCENTES Y AUTORIDADES".

export type AttendeeType = "ESTUDIANTE" | "REPRESENTANTE" | "DOCENTE_AUTORIDAD";

export const ATTENDEE_TYPE_OPTIONS: { value: AttendeeType; label: string }[] = [
  { value: "ESTUDIANTE", label: "Estudiantes" },
  { value: "REPRESENTANTE", label: "Padres y representantes" },
  { value: "DOCENTE_AUTORIDAD", label: "Docentes y autoridades" },
];

export function attendeeTypeLabel(value: string): string {
  return ATTENDEE_TYPE_OPTIONS.find((o) => o.value === value)?.label || value;
}

// Catálogo unificado de ejes/acciones. Cada plantilla usa un subconjunto distinto
// (ver ACTION_AXIS_BY_TYPE), pero se guarda con el mismo catálogo de valores.
export const ACTION_AXIS_OPTIONS = [
  { value: "PROMOCION", label: "Promoción" },
  { value: "DETECCION", label: "Detección" },
  { value: "INTERVENCION_INDIVIDUAL", label: "Intervención — Individual" },
  { value: "INTERVENCION_FAMILIAR", label: "Intervención — Familiar" },
  { value: "INTERVENCION_CRISIS", label: "Intervención — En crisis" },
  { value: "MEDIACION_ESCOLAR", label: "Mediación escolar" },
  { value: "DERIVACION", label: "Derivación" },
  { value: "SEGUIMIENTO", label: "Seguimiento" },
];

export const ACTION_AXIS_BY_TYPE: Record<AttendeeType, string[]> = {
  ESTUDIANTE: ["DETECCION", "INTERVENCION_INDIVIDUAL", "INTERVENCION_FAMILIAR", "INTERVENCION_CRISIS", "DERIVACION", "SEGUIMIENTO"],
  REPRESENTANTE: [
    "DETECCION",
    "INTERVENCION_INDIVIDUAL",
    "INTERVENCION_FAMILIAR",
    "INTERVENCION_CRISIS",
    "MEDIACION_ESCOLAR",
    "DERIVACION",
    "SEGUIMIENTO",
  ],
  DOCENTE_AUTORIDAD: ["PROMOCION", "DETECCION", "DERIVACION", "SEGUIMIENTO"],
};

export function actionAxisOptionsFor(type: string): { value: string; label: string }[] {
  const allowed = ACTION_AXIS_BY_TYPE[type as AttendeeType] || ACTION_AXIS_OPTIONS.map((o) => o.value);
  return ACTION_AXIS_OPTIONS.filter((o) => allowed.includes(o.value));
}

export function actionAxisLabel(value: string): string {
  return ACTION_AXIS_OPTIONS.find((o) => o.value === value)?.label || value;
}

export function parseStringList(json: string): string[] {
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
