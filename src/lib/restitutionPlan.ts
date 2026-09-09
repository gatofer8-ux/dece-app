// Catálogo y textos fijos para el Plan de Acompañamiento y Restitución de
// Derechos (casos de violencia), transcrito de la plantilla institucional
// oficial "PLAN DE ACOMPAÑAMIENTO Y RESTITUCIÓN" del DECE / MINEDUC.

export const VIOLENCE_TYPE_OPTIONS = [
  { value: "FISICA", label: "Física" },
  { value: "PSICOLOGICA", label: "Psicológica" },
  { value: "SEXUAL", label: "Sexual" },
  { value: "NEGLIGENCIA", label: "Negligencia" },
  { value: "VIRTUAL", label: "Virtual" },
];

export const VIOLENCE_MODALITY_OPTIONS = [
  { value: "INSTITUCIONAL", label: "Institucional" },
  { value: "INTRAFAMILIAR", label: "Intrafamiliar" },
  { value: "ENTRE_PARES", label: "Entre pares" },
  { value: "OTROS", label: "Otros" },
];

// Texto legal fijo — aspecto normativo (transcrito verbatim de la plantilla oficial).
export const NORMATIVE_TEXT = `La Constitución de la República del Ecuador, en sus artículos 35; 38, numeral 4; 46; 66, numeral 3, literal b); 81; y 347, numeral 6, establece que el Estado adoptará medidas de protección y atención contra todo tipo de violencia, maltrato, explotación sexual o de cualquier otra índole o negligencia que provoque tales situaciones, así como la ejecución de medidas necesarias para prevenir, eliminar y sancionar toda forma de violencia, en especial la ejercida contra las mujeres, niñas, niños y adolescentes. En sí, prevé como responsabilidad del Estado la erradicación de todas las formas de violencia en el sistema educativo y la de velar por la integridad física, psicológica y sexual de niños, niñas y adolescentes.

Se debe considerar que dentro de los principios básicos generales de la actividad educativa previstos en la Ley Orgánica de Educación Intercultural, se encuentra garantizar el derecho de las personas a una educación libre de todo tipo de violencia, teniendo como obligación velar por la integridad física, psicológica y sexual de los integrantes de las instituciones educativas, así como la protección y el apoyo a estudiantes en casos de violencia, maltrato, explotación sexual y de cualquier otro tipo de abuso, y el deber de denunciar ante las autoridades e instituciones competentes cualquier vulneración a sus derechos fundamentales.

El Código de la Niñez y la Adolescencia busca disponer la protección integral que el Estado, la sociedad y la familia deben garantizar a niños, niñas y adolescentes que viven en Ecuador, con el fin de lograr su desarrollo integral, el disfrute y goce pleno de sus derechos, en un marco de libertad, dignidad y equidad.

En su artículo 8 establece: "Es deber del Estado, la sociedad y la familia, dentro de sus respectivos ámbitos, adoptar las medidas políticas, administrativas, económicas, legislativas, sociales y jurídicas que sean necesarias para la plena vigencia, ejercicio efectivo, garantía, protección y exigibilidad de la totalidad de los derechos de niños, niñas y adolescentes". El Estado y la sociedad formularán y aplicarán políticas públicas sociales y económicas; así mismo, destinarán recursos económicos suficientes, en forma estable, permanente y oportuna.`;

export const OBJECTIVE_GENERAL_TEXT =
  "Proporcionar apoyo a los miembros de la comunidad educativa a través de los ejes de promoción, prevención, intervención, derivación y seguimiento para casos detectados dentro y fuera de la Institución.";

export const OBJECTIVES_SPECIFIC_TEXT = [
  "Brindar el seguimiento a los estudiantes vulnerados de manera oportuna e integral y la derivación externa a Instituciones externas y especializadas en apoyo psicológico a víctimas de violencia y sus familias.",
  "Fomentar la participación activa a la comunidad educativa mediante talleres de información, círculos de aprendizaje y sensibilización para la prevención de violencia-violencia sexual.",
  "Garantizar la permanencia en el sistema educativo de los y las estudiantes vulnerados, aplicando estrategias que favorezcan el desarrollo integral en aspectos académicos, personales y familiares.",
];

export const LEGAL_INSTANCE_CATEGORIES = [
  { value: "DISTRITO_EDUCATIVO", label: "Distrito Educativo (JDRC)" },
  { value: "FISCALIA", label: "Fiscalía" },
  { value: "JUNTA_CANTONAL", label: "Junta Cantonal de Protección de Derechos" },
  { value: "DINAPEN", label: "DINAPEN" },
  { value: "OTRAS_INSTANCIAS", label: "Otras Instancias Judiciales" },
];

export interface LegalInstanceEntry {
  instancia: string; // value de LEGAL_INSTANCE_CATEGORIES
  fecha_denuncia: string;
  numero_denuncia: string;
  medidas: string;
  estado: string;
  total?: number | string;
}

// Categorías fijas de acciones de acompañamiento y restitución.
export const ACCOMPANIMENT_ACTION_CATEGORIES = [
  { value: "LEGAL", label: "Acompañamiento legal" },
  { value: "PSICOLOGICO_VICTIMA", label: "Acompañamiento psicológico a la(s) víctima(s)" },
  { value: "PSICOLOGICO_FAMILIA", label: "Apoyo psicológico a familiares de la(s) víctima(s)" },
  { value: "PSICOLOGICO_COMUNIDAD", label: "Apoyo psicológico a la comunidad educativa" },
  { value: "MEDICO_VICTIMA", label: "Acompañamiento médico a la(s) víctima(s)" },
  { value: "MEDICO_FAMILIA", label: "Acompañamiento médico a familiares" },
  { value: "PEDAGOGICO_VICTIMA", label: "Acompañamiento pedagógico a la(s) víctima(s)" },
  { value: "PREVENTIVAS_COMUNIDAD", label: "Acciones preventivas a favor de la comunidad educativa" },
];

export interface AccompanimentActionEntry {
  categoria: string; // value de ACCOMPANIMENT_ACTION_CATEGORIES
  ejecutor: string;
  num_personas: string;
  fecha_inicio: string;
  fecha_fin: string;
}

export interface VictimEntry {
  iniciales: string;
  cedula: string;
  edad: string;
  genero: string;
  nivel_instruccion: string;
}

export interface PerpetratorEntry {
  nombre: string;
  edad: string;
  sexo?: string;
  cargo_funcion: string;
}

// Catálogo del Manual de Rutas y Protocolos ante situaciones de violencia (3ra edición)
export const RISK_FACTORS_CATALOG = {
  individual: [
    "Características demográficas (edad, educación, ingreso económico)",
    "Desconocimiento de lo que implica la violencia",
    "Aspectos relacionados con el género (p. ej. en Ecuador, ser mujer es un factor de riesgo)",
    "Baja autoestima",
    "Consumo problemático de alcohol y otras sustancias",
    "Antecedentes de haber sufrido o presenciado violencia",
    "Aislamiento social o escasas redes de apoyo",
    "Discapacidad o necesidades educativas específicas",
    "Dependencia emocional y afectiva",
    "Embarazo temprano o maternidad/paternidad en la adolescencia",
  ],
  familiar: [
    "Dificultades económicas y precariedad laboral",
    "Dinámicas familiares disfuncionales o conflictivas",
    "Pautas de crianza negligentes, permisivas o autoritarias",
    "Falta de comunicación asertiva intrafamiliar",
    "Ausencia o distanciamiento de progenitores / referentes de cuidado",
    "Antecedentes de violencia intrafamiliar y relaciones machistas",
    "Hacinamiento o condiciones habitacionales de vulnerabilidad",
  ],
  escolar: [
    "Desigualdades sociales y de género en el entorno escolar",
    "Tolerancia o normalización de la violencia entre pares o personal educativo",
    "Relaciones asimétricas de poder no reguladas en la institución",
    "Falta de aplicación efectiva de rutas y protocolos de actuación",
    "Espacios escolares con supervisión insuficiente o desprotegidos",
    "Desconocimiento de la normativa de protección de derechos por parte de la comunidad educativa",
  ],
  comunitario: [
    "Entorno comunitario con altos índices de delincuencia, violencia o microtráfico",
    "Normalización sociocultural del machismo y estereotipos de género",
    "Escaso acceso a servicios públicos de salud, recreación y protección",
    "Debilidad en las redes comunitarias de apoyo y protección a la niñez",
  ],
};

export const PERPETRATOR_RELATION_OPTIONS = [
  "Docente",
  "Autoridad de la IE",
  "Estudiante / Compañero(a)",
  "Personal de limpieza / servicio",
  "Personal administrativo",
  "Familiar (padre, madre, padrastro, etc.)",
  "Pareja / Ex pareja",
  "Conocido / Vecino del sector",
  "Persona externa sin vínculo institucional",
];

export const PERPETRATOR_ROLE_OPTIONS = [
  "Docente",
  "Docente Tutor/a",
  "Autoridad Institucional (Rector/a, Vicerrector/a, Inspector/a)",
  "Personal Administrativo",
  "Personal de Apoyo / Limpieza",
  "Estudiante",
  "Padre, Madre o Representante Legal",
  "Persona externa",
];

export const DEFAULT_ACCOMPANIMENT_ACTIONS: AccompanimentActionEntry[] = [
  {
    categoria: "LEGAL",
    ejecutor: "* Unidad de Asesoría Jurídica del Distrito educativo 18D02 * Fiscalía de Tungurahua * Junta Cantonal de Protección de Derechos Ambato",
    num_personas: "1",
    fecha_inicio: "",
    fecha_fin: "Hasta finalizar el proceso",
  },
  {
    categoria: "PSICOLOGICO_VICTIMA",
    ejecutor: "Servicio de Protección Integral del Ministerio del Gobierno / DECE",
    num_personas: "1",
    fecha_inicio: "",
    fecha_fin: "Hasta finalizar proceso",
  },
  {
    categoria: "PSICOLOGICO_FAMILIA",
    ejecutor: "No aplica",
    num_personas: "No aplica",
    fecha_inicio: "No aplica",
    fecha_fin: "No aplica",
  },
  {
    categoria: "PSICOLOGICO_COMUNIDAD",
    ejecutor: "DECE",
    num_personas: "Estudiantes del paralelo",
    fecha_inicio: "",
    fecha_fin: "Finalización del año lectivo",
  },
  {
    categoria: "MEDICO_VICTIMA",
    ejecutor: "No aplica",
    num_personas: "No aplica",
    fecha_inicio: "No aplica",
    fecha_fin: "No aplica",
  },
  {
    categoria: "MEDICO_FAMILIA",
    ejecutor: "No aplica",
    num_personas: "No aplica",
    fecha_inicio: "No aplica",
    fecha_fin: "No aplica",
  },
  {
    categoria: "PEDAGOGICO_VICTIMA",
    ejecutor: "DECE, Rectora y Docentes",
    num_personas: "1",
    fecha_inicio: "",
    fecha_fin: "Finalización del año lectivo",
  },
  {
    categoria: "PREVENTIVAS_COMUNIDAD",
    ejecutor: "DECE / Autoridades / Docentes / Estudiantes / Padres de Familia",
    num_personas: "Comunidad Educativa",
    fecha_inicio: "",
    fecha_fin: "Finalización del año lectivo",
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

export function legalInstanceLabel(value: string): string {
  return LEGAL_INSTANCE_CATEGORIES.find((c) => c.value === value)?.label || value;
}

export function accompanimentActionLabel(value: string): string {
  return ACCOMPANIMENT_ACTION_CATEGORIES.find((c) => c.value === value)?.label || value;
}
