// Catálogo para el Plan de Atención Psicosocial y Seguimiento.
// Transcrito de la plantilla institucional "Plan de atención" del DECE.

export const INTERVENTION_TYPE_OPTIONS = [
  { value: "INDIVIDUAL", label: "Individual" },
  { value: "FAMILIAR", label: "Familiar" },
  { value: "GRUPAL", label: "Grupal" },
];

// La Ficha de Seguimiento de la Atención Psicosocial (registro sesión por
// sesión de lo que efectivamente se hizo) usa un catálogo de 4 opciones,
// una más que el Plan de Atención (que define lo que se hará): agrega
// "En crisis", transcrito verbatim de la plantilla institucional.
export const CARE_FOLLOWUP_TYPE_OPTIONS = [
  { value: "INDIVIDUAL", label: "Individual" },
  { value: "FAMILIAR", label: "Familiar" },
  { value: "GRUPAL", label: "Grupal" },
  { value: "CRISIS", label: "En crisis" },
];

export function careFollowupTypeLabel(value: string): string {
  return CARE_FOLLOWUP_TYPE_OPTIONS.find((o) => o.value === value)?.label || value;
}

export interface CarePlanAction {
  accion: string;
  profesional: string;
  tiempo: string;
  observaciones: string;
}

export function parseCarePlanActions(json: string): CarePlanAction[] {
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function parseStringList(json: string): string[] {
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
