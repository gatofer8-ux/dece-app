export const REQUESTER_ROLE_OPTIONS = [
  { value: "ESTUDIANTE", label: "Estudiante" },
  { value: "REPRESENTANTE", label: "Representante / familiar" },
  { value: "DOCENTE", label: "Docente" },
  { value: "OTRO", label: "Otro" },
];

export const REQUEST_STATUS_LABELS: Record<string, string> = {
  PENDIENTE: "Pendiente de revisión",
  CONFIRMADA: "Confirmada",
  RECHAZADA: "Rechazada",
  CANCELADA: "Cancelada",
};

export function requesterRoleLabel(value: string): string {
  return REQUESTER_ROLE_OPTIONS.find((o) => o.value === value)?.label || value;
}
