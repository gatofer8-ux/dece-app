// Catálogo para la Ficha de Derivación oficial del DECE.
// Transcrito de la plantilla institucional "FICHA DE DERIVACIÓN.xlsx".

export interface DestinationOption {
  value: string;
  label: string;
  group: "INTERNA_IE" | "INTERNA_MINEDUC" | "EXTERNA";
}

export const DESTINATION_OPTIONS: DestinationOption[] = [
  // INTERNA A LA INSTITUCIÓN EDUCATIVA
  { value: "DEPARTAMENTO_INCLUSION", label: "Departamento de Inclusión Educativa", group: "INTERNA_IE" },
  { value: "DOCENTE_APOYO_INCLUSION", label: "Docente de apoyo a la inclusión", group: "INTERNA_IE" },
  { value: "RECTORADO_VICERRECTORADO", label: "Rectorado / Vicerrectorado", group: "INTERNA_IE" },
  { value: "INSPECCION", label: "Inspección", group: "INTERNA_IE" },
  { value: "OTRO_INTERNA_IE", label: "Otro (interna a la institución)", group: "INTERNA_IE" },
  // INTERNA AL MINISTERIO DE EDUCACIÓN
  { value: "UDAI", label: "Unidad Distrital de Apoyo a la Inclusión (UDAI)", group: "INTERNA_MINEDUC" },
  { value: "DIRECCION_DISTRITAL", label: "Dirección Distrital de Educación", group: "INTERNA_MINEDUC" },
  { value: "OTRO_INTERNA_MINEDUC", label: "Otro (interna al Ministerio de Educación)", group: "INTERNA_MINEDUC" },
  // EXTERNA AL MINISTERIO DE EDUCACIÓN
  { value: "POLICIA_ESPECIALIZADA", label: "Unidades especializadas de la policía", group: "EXTERNA" },
  { value: "SALUD_PUBLICA", label: "Establecimiento de salud pública", group: "EXTERNA" },
  { value: "SALUD_PRIVADA", label: "Establecimiento de salud privada", group: "EXTERNA" },
  { value: "MIES", label: "Ministerio de Inclusión Económica y Social (MIES)", group: "EXTERNA" },
  { value: "MINISTERIO_MUJER_DDHH", label: "Ministerio de la Mujer y Derechos Humanos", group: "EXTERNA" },
  { value: "OTRO_EXTERNA", label: "Otro (externa)", group: "EXTERNA" },
];

export const DESTINATION_GROUP_LABELS: Record<DestinationOption["group"], string> = {
  INTERNA_IE: "Interna — a la institución educativa",
  INTERNA_MINEDUC: "Interna — al Ministerio de Educación",
  EXTERNA: "Externa al Ministerio de Educación",
};

export function destinationLabel(value: string | null): string {
  if (!value) return "—";
  return DESTINATION_OPTIONS.find((o) => o.value === value)?.label || value;
}

export function destinationGroup(value: string | null): DestinationOption["group"] | null {
  if (!value) return null;
  return DESTINATION_OPTIONS.find((o) => o.value === value)?.group || null;
}
