import { DeceFieldDefinition } from "./types";

export const DECE_FIELDS_CATALOG: DeceFieldDefinition[] = [
  // --- ESTUDIANTE ---
  {
    key: "student.full_name",
    label: "Nombres y Apellidos del Estudiante",
    category: "ESTUDIANTE",
    description: "Nombre completo de la presunta víctima o estudiante",
    example: "PEREZ ZAMBRANO CARLOS ANDRES",
    synonyms: ["nombre", "nombres", "estudiante", "apellidos y nombres", "nombres y apellidos", "alumno", "alumna", "nombre del estudiante", "victima", "presunta victima"]
  },
  {
    key: "student.document_id",
    label: "Cédula / Identificación del Estudiante",
    category: "ESTUDIANTE",
    description: "Número de cédula, pasaporte o documento de identidad",
    example: "0912345678",
    synonyms: ["cedula", "ci", "identificacion", "documento", "dni", "no. cedula", "num identificacion", "cedula estudiante"]
  },
  {
    key: "student.course_full",
    label: "Curso Completo con Especialidad",
    category: "ESTUDIANTE",
    description: "Nivel, año, especialidad y paralelo",
    example: "3ro de Bachillerato General Unificado 'A' (Ciencias)",
    synonyms: ["curso completo", "grado/curso", "curso y paralelo", "nivel educativo completo"]
  },
  {
    key: "student.course",
    label: "Grado / Curso",
    category: "ESTUDIANTE",
    description: "Año o grado escolar",
    example: "3ro BGU",
    synonyms: ["curso", "grado", "año", "nivel"]
  },
  {
    key: "student.parallel",
    label: "Paralelo",
    category: "ESTUDIANTE",
    description: "Letra del paralelo",
    example: "A",
    synonyms: ["paralelo", "seccion", "letra"]
  },
  {
    key: "student.specialty",
    label: "Especialidad / Bachillerato",
    category: "ESTUDIANTE",
    description: "Ciencias, Técnico, etc.",
    example: "Ciencias",
    synonyms: ["especialidad", "figura profesional", "mencion"]
  },
  {
    key: "student.education_level",
    label: "Nivel Educativo",
    category: "ESTUDIANTE",
    description: "Inicial, Básica Elemental, Básica Media, Básica Superior o Bachillerato",
    example: "Bachillerato",
    synonyms: ["subnivel", "nivel", "subnivel educativo"]
  },
  {
    key: "student.jornada",
    label: "Jornada",
    category: "ESTUDIANTE",
    description: "Matutina, Vespertina o Nocturna",
    example: "Matutina",
    synonyms: ["jornada", "seccion", "horario", "turno"]
  },
  {
    key: "student.birth_date",
    label: "Fecha de Nacimiento",
    category: "ESTUDIANTE",
    description: "Fecha de nacimiento del estudiante (AAAA-MM-DD)",
    example: "2008-05-14",
    synonyms: ["fecha nacimiento", "f. nacimiento", "nacimiento", "fecha de nac"]
  },
  {
    key: "student.age",
    label: "Edad",
    category: "ESTUDIANTE",
    description: "Edad en años cumplidos",
    example: "16",
    synonyms: ["edad", "años cumplidos", "edad estudiante"]
  },
  {
    key: "student.gender",
    label: "Género / Sexo",
    category: "ESTUDIANTE",
    description: "MASCULINO, FEMENINO o M / F",
    example: "MASCULINO",
    synonyms: ["genero", "sexo", "m/f"]
  },
  {
    key: "student.address",
    label: "Dirección Domiciliaria",
    category: "ESTUDIANTE",
    description: "Domicilio del estudiante",
    example: "Av. Las Palmeras y Calle 5ta",
    synonyms: ["direccion", "domicilio", "residencia", "ubicacion"]
  },
  {
    key: "student.representative",
    label: "Representante Legal",
    category: "ESTUDIANTE",
    description: "Nombre del padre, madre o apoderado",
    example: "MARIA ELENA PEREZ",
    synonyms: ["representante", "representante legal", "padre", "madre", "tutor", "apoderado", "nombre representante"]
  },
  {
    key: "student.rep_phone",
    label: "Teléfono del Representante",
    category: "ESTUDIANTE",
    description: "Número de contacto telefónico o celular",
    example: "0991234567",
    synonyms: ["telefono", "celular", "telefono representante", "contacto", "telf"]
  },
  {
    key: "student.rep_relationship",
    label: "Parentesco del Representante",
    category: "ESTUDIANTE",
    description: "Madre, Padre, Abuelo/a, Tío/a, Tutor Legal",
    example: "Madre",
    synonyms: ["parentesco", "relacion familiar", "vinculo"]
  },

  // --- CASO ---
  {
    key: "case_file.code",
    label: "Código del Caso",
    category: "CASO",
    description: "Código unívoco del expediente",
    example: "CASO-2026-0042",
    synonyms: ["codigo", "codigo caso", "expediente", "no. caso", "num caso", "id caso"]
  },
  {
    key: "case_file.status",
    label: "Estado del Caso",
    category: "CASO",
    description: "ABIERTO, EN SEGUIMIENTO, DERIVADO, CERRADO",
    example: "ABIERTO",
    synonyms: ["estado", "status", "situacion caso", "estado del caso"]
  },
  {
    key: "case_file.priority",
    label: "Prioridad",
    category: "CASO",
    description: "URGENTE, ALTA, MEDIA, BAJA",
    example: "ALTA",
    synonyms: ["prioridad", "urgencia", "nivel prioridad"]
  },
  {
    key: "case_file.risk_type",
    label: "Tipología de Riesgo / Problemática (Texto)",
    category: "CASO",
    description: "Nombre legible de la problemática detectada",
    example: "Violencia intrafamiliar",
    synonyms: ["tipologia", "tipo de riesgo", "problematica", "motivo", "tipo caso", "tipo vulneracion", "riesgo"]
  },
  {
    key: "case_file.action_axis",
    label: "Eje de Acción",
    category: "CASO",
    description: "Detección, Intervención, Derivación, Seguimiento",
    example: "Intervención",
    synonyms: ["eje", "eje de accion", "fase", "etapa"]
  },
  {
    key: "case_file.detection_date",
    label: "Fecha de Detección",
    category: "CASO",
    description: "Fecha en que se detectó o abrió el caso (AAAA-MM-DD)",
    example: "2026-02-15",
    synonyms: ["fecha deteccion", "f. deteccion", "fecha apertura", "fecha ingreso", "fecha reporte", "fecha"]
  },
  {
    key: "case_file.detection_source",
    label: "Fuente de Detección",
    category: "CASO",
    description: "Docente, Autoridad, Estudiante, Familiar, Externo, DECE",
    example: "Docente",
    synonyms: ["fuente", "fuente deteccion", "remitido por", "derivado por", "reportado por"]
  },
  {
    key: "case_file.description",
    label: "Descripción / Motivo del Caso",
    category: "CASO",
    description: "Narrativa breve o resumen de la situación",
    example: "Estudiante presenta señales de vulnerabilidad en su entorno familiar.",
    synonyms: ["descripcion", "resumen", "motivo caso", "detalle", "hechos"]
  },
  {
    key: "case_file.professional_name",
    label: "Profesional Asignado",
    category: "CASO",
    description: "Nombre del profesional DECE a cargo del caso",
    example: "LIC. ANA MORALES",
    synonyms: ["profesional", "responsable", "analista dece", "psicologo", "atendido por"]
  },

  // --- VIOLENCIA ---
  {
    key: "violence.violence_type",
    label: "Tipo de Violencia",
    category: "VIOLENCIA",
    description: "Física, Psicológica, Sexual, Negligencia u Omisión",
    example: "Física",
    synonyms: ["tipo violencia", "violencia tipo", "manifestacion violencia"]
  },
  {
    key: "violence.space_type",
    label: "Ámbito / Espacio del Hecho",
    category: "VIOLENCIA",
    description: "Educativo, Familiar, Comunitario, Digital",
    example: "Familiar",
    synonyms: ["espacio", "ambito", "lugar del hecho", "donde ocurrio"]
  },
  {
    key: "violence.aggressor_relationship",
    label: "Relación con el Presunto Agresor",
    category: "VIOLENCIA",
    description: "Padre, Madre, Padrastro, Compañero/a, Docente, Desconocido",
    example: "Padre",
    synonyms: ["agresor relacion", "parentesco agresor", "vinculo agresor", "relacion presunto agresor"]
  },
  {
    key: "violence.aggressor_name",
    label: "Nombre del Presunto Agresor",
    category: "VIOLENCIA",
    description: "Nombre o referencia de la presunta persona agresora",
    example: "S/N",
    synonyms: ["nombre agresor", "presunto agresor", "agresor"]
  },
  {
    key: "violence.summary",
    label: "Resumen del Hecho de Violencia",
    category: "VIOLENCIA",
    description: "Relato objetivo de los hechos",
    example: "Se toma conocimiento de situación conflictiva en el hogar...",
    synonyms: ["resumen violencia", "relato de hechos", "hecho violencia", "detalle violencia"]
  },
  {
    key: "violence.immediate_actions",
    label: "Acciones Inmediatas de Protección",
    category: "VIOLENCIA",
    description: "Medidas urgentes ejecutadas por la institución",
    example: "Acompañamiento en enfermería y comunicación a autoridades",
    synonyms: ["acciones inmediatas", "medidas urgentes", "proteccion inmediata"]
  },
  {
    key: "violence.district_notified",
    label: "Notificado al Distrito (SÍ / NO)",
    category: "VIOLENCIA",
    description: "Indica si se puso en conocimiento de la autoridad distrital",
    example: "SÍ",
    synonyms: ["distrito notificado", "notificacion distrito", "reportado distrito", "oficio distrito"]
  },

  // --- OBSERVACIÓN Y ATENCIÓN ---
  {
    key: "observation.risk_level",
    label: "Nivel de Riesgo en Observación",
    category: "OBSERVACION",
    description: "BAJO, MEDIO, ALTO, CRÍTICO",
    example: "MEDIO",
    synonyms: ["nivel riesgo", "riesgo observacion", "alerta conductual"]
  },
  {
    key: "care_plan.diagnosis",
    label: "Diagnóstico del Plan de Atención",
    category: "ATENCION",
    description: "Diagnóstico situacional del estudiante",
    example: "Estudiante requiere fortalecimiento de habilidades de afrontamiento y soporte familiar.",
    synonyms: ["diagnostico", "diagnostico situacional", "plan atencion"]
  },
  {
    key: "socialization.strategies",
    label: "Estrategias del Acta de Socialización",
    category: "ATENCION",
    description: "Estrategias de aula sugeridas al personal docente",
    example: "Contención empática, flexibilidad en plazos y confidencialidad.",
    synonyms: ["estrategias", "estrategias docentes", "acompañamiento psicosocial"]
  },

  // --- DERIVACIÓN ---
  {
    key: "referral.destination",
    label: "Entidad de Derivación Externa",
    category: "DERIVACION",
    description: "MSP / Centro de Salud, Fiscalía, JCPDNA, UDAI, etc.",
    example: "Centro de Salud Tipo C",
    synonyms: ["derivado a", "institucion destino", "entidad derivacion", "derivacion"]
  },
  {
    key: "referral.status",
    label: "Estado de la Derivación",
    category: "DERIVACION",
    description: "ENVIADA, ACEPTADA, EN_ATENCION, FINALIZADA",
    example: "EN_ATENCION",
    synonyms: ["estado derivacion", "seguimiento derivacion"]
  },

  // --- INSTITUCIONAL Y FECHAS ---
  {
    key: "institution.name",
    label: "Nombre de la Institución Educativa",
    category: "INSTITUCIONAL",
    description: "Nombre oficial del plantel",
    example: "UNIDAD EDUCATIVA FISCAL GUAYAQUIL",
    synonyms: ["institucion", "colegio", "escuela", "unidad educativa", "plantel"]
  },
  {
    key: "institution.amie",
    label: "Código AMIE de la Institución",
    category: "INSTITUCIONAL",
    description: "Código oficial asignado por el MINEDUC",
    example: "09H00123",
    synonyms: ["amie", "codigo amie", "cod amie"]
  },
  {
    key: "system.current_date",
    label: "Fecha de Emisión del Reporte",
    category: "FECHAS",
    description: "Fecha actual en que se genera el reporte",
    example: new Date().toISOString().slice(0, 10),
    synonyms: ["fecha emision", "fecha reporte", "fecha actual", "fecha hoy"]
  },
  {
    key: "system.row_number",
    label: "Número Consecutivo (1, 2, 3...)",
    category: "FECHAS",
    description: "Índice o número de orden del registro",
    example: "1",
    synonyms: ["no.", "num", "n°", "item", "orden", "nro"]
  }
];

export function normalizeHeader(text: string): string {
  return (text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Encuentra la mejor sugerencia de campo DECE para un encabezado de columna detectado.
 */
export function matchDeceField(columnHeader: string): DeceFieldDefinition | null {
  const norm = normalizeHeader(columnHeader);
  if (!norm) return null;

  // 1. Coincidencia exacta con un sinónimo
  for (const field of DECE_FIELDS_CATALOG) {
    for (const syn of field.synonyms) {
      if (normalizeHeader(syn) === norm) {
        return field;
      }
    }
  }

  // 2. Coincidencia parcial (subcadena completa)
  for (const field of DECE_FIELDS_CATALOG) {
    for (const syn of field.synonyms) {
      const normSyn = normalizeHeader(syn);
      if (normSyn.length >= 4 && (norm.includes(normSyn) || normSyn.includes(norm))) {
        return field;
      }
    }
  }

  return null;
}
