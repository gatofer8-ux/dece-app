/**
 * Catálogo de los materiales oficiales de referencia del ENEIS (libros y guías
 * que los docentes usan para planificar su ficha de aplicación). Es puro (sin
 * acceso a archivos) para poder importarse también desde el formulario
 * público del lado del cliente.
 */
export interface EneisMaterial {
  id: string;
  label: string;
  short: string;
}

export const ENEIS_MATERIALES: EneisMaterial[] = [
  { id: "oportunidades_1", short: "Oportunidades Curriculares I", label: "Oportunidades Curriculares I — Inicial, Preparatoria, Elemental y Media" },
  { id: "oportunidades_2", short: "Oportunidades Curriculares II", label: "Oportunidades Curriculares II — Básica Superior y Bachillerato (UNFPA)" },
  { id: "guia_embarazo", short: "Guía de Embarazo Adolescente", label: "Guía Metodológica para la Prevención del Embarazo Adolescente" },
  { id: "rurankapak", short: "RURANKAPAK", label: "RURANKAPAK" },
  { id: "guia_diversidades", short: "Guía de Diversidades", label: "Guía de Diversidades" },
  { id: "recorrido_prevencion", short: "Recorrido de la Prevención", label: "Recorrido Participativo de la Prevención" },
];

export function getMaterialLabel(id: string | null | undefined): string {
  return ENEIS_MATERIALES.find((m) => m.id === id)?.label || "";
}
