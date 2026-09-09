// Catálogo para el Informe de Reporte del Hecho de Violencia
// (ANEXO 1 del formato MINEDUC), transcrito de la plantilla institucional.

export const VIOLENCE_TYPE_OPTIONS = [
  { value: "FISICA", label: "Física" },
  { value: "PSICOLOGICA", label: "Psicológica" },
  { value: "SEXUAL", label: "Sexual" },
  { value: "NEGLIGENCIA", label: "Negligencia" },
];

export const VIOLENCE_MODALITY_OPTIONS = [
  { value: "INTRAFAMILIAR", label: "Intrafamiliar" },
  { value: "INSTITUCIONAL", label: "Institucional" },
  { value: "ACOSO_ESCOLAR", label: "Acoso escolar" },
  { value: "ESTUDIANTE_ADULTO", label: "Violencia estudiante-persona adulta" },
  { value: "OTRAS", label: "Otras" },
];

// Recordatorio legal fijo del formato oficial (transcrito verbatim).
export const DUTY_TO_REPORT_TEXT = "Recuerde el deber de denunciar según el artículo 422 del COIP.";

/**
 * Catálogo oficial de tipos de relación de la persona agresora con la víctima,
 * extraído del "Manual de Rutas y Protocolos de Actuación frente a Situaciones de
 * Violencia detectadas o cometidas en el Sistema Educativo" (Tercera Edición, MINEDUC).
 */
export const PERPETRATOR_RELATIONSHIP_CATEGORIES = [
  {
    category: "Ámbito Familiar (Intrafamiliar)",
    options: [
      "Madre",
      "Padre",
      "Padrastro",
      "Madrastra",
      "Hermano/a",
      "Tío/a",
      "Abuelo/a",
      "Primo/a",
      "Cónyuge / Pareja",
      "Expareja",
      "Cuñado/a",
      "Tutor/a legal o de hecho",
      "Otro familiar",
    ],
  },
  {
    category: "Ámbito Institucional (Educativo)",
    options: [
      "Compañero/a de aula",
      "Estudiante de otro curso o grado",
      "Docente",
      "Directivo/a o Autoridad institucional",
      "Personal administrativo",
      "Personal de servicio o limpieza",
      "Personal de guardianía o seguridad",
      "Personal de transporte escolar",
      "Exestudiante o Egresado/a",
      "Otro miembro de la comunidad educativa",
    ],
  },
  {
    category: "Ámbito Comunitario / Social / Digital",
    options: [
      "Pareja sentimental / Enamorado/a / Novio/a",
      "Expareja sentimental",
      "Amigo/a",
      "Vecino/a",
      "Conocido/a de la familia o entorno",
      "Persona desconocida",
      "Contacto a través de redes sociales o medios digitales",
      "Otra persona",
    ],
  },
];

export function parseJsonArray<T>(json: string): T[] {
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

