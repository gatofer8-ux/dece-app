/**
 * Catálogos y helpers del "INFORME DE ACOMPAÑAMIENTO A VÍCTIMAS FRENTE A
 * SITUACIONES DE VIOLENCIA DETECTADAS EN EL ÁMBITO EDUCATIVO".
 *
 * Los checklists de INDICADORES (sección 3.2.1 A) y de FACTORES DE RIESGO Y
 * PROTECCIÓN (sección 3.2.1 B) provienen del "Protocolos y rutas de actuación
 * frente a situaciones de violencia detectada o cometida en el sistema
 * educativo" (Ministerio de Educación del Ecuador, 3.ª edición).
 *
 * Puro, sin base de datos.
 */

// ---------- 3.2.1 A — INDICADORES ----------

export const INDICATOR_SIGNOS_FISICOS = [
  "Lesiones (hematomas, quemaduras, mordeduras, fracturas) en distintas fases de cicatrización o sin explicación coherente",
  "Marcas de objetos o de sujeción",
  "Dolores frecuentes sin causa aparente",
  "Dificultad para caminar o sentarse",
  "Ropa rasgada, manchada o inadecuada",
  "Infecciones, lesiones o sangrado en zona genital o anal",
  "Embarazo",
  "Enfermedades de transmisión sexual",
  "Pérdida o aumento brusco de peso; descuido en la higiene y el aseo",
  "Ninguno",
];

export const INDICATOR_SIGNOS_COMPORTAMIENTO = [
  "Cambios repentinos de conducta o del estado de ánimo",
  "Tristeza, llanto frecuente, apatía o aislamiento",
  "Ansiedad, miedo o sobresalto excesivo",
  "Conductas regresivas (chuparse el dedo, enuresis, encopresis)",
  "Mentiras, tartamudeo",
  "Sentimientos de culpa frente a acciones o inacciones",
  "Ideas o intentos de autolesión o suicidio",
  "Consumo de alcohol u otras drogas",
  "Fugas del hogar",
  "Conductas o conocimientos sexuales impropios para la edad",
  "Trastornos del sueño o de la alimentación",
  "Baja autoestima",
];

export const INDICATOR_CONDUCTAS_IE = [
  "Bajo rendimiento académico o cambios bruscos en las calificaciones",
  "Ausentismo o abandono escolar",
  "Llega temprano y se va tarde (evita el hogar)",
  "Dificultad para concentrarse",
  "Agresividad o aislamiento frente a pares y docentes",
  "Rehuir o negarse a hablar sobre su situación",
  "Conductas variables en clase",
  "Temor a una persona en particular",
  "Rechazo a actividades físicas o a desvestirse (educación física)",
  "Búsqueda excesiva de afecto o de atención",
];

// ---------- 3.2.1 B — FACTORES DE RIESGO Y PROTECCIÓN ----------

export const FACTOR_PERSONALES_RIESGO = [
  "Características demográficas (edad, educación, ingreso económico)",
  "Presentar necesidades especiales, asociadas o no a discapacidad",
  "Escasas habilidades de interacción social",
  "Experiencias de rechazo, humillación o exclusión",
  "Desconocimiento de lo que implica la violencia",
  "Haber sido víctima o testigo de violencia",
  "Baja autoestima o dependencia emocional",
  "Consumo de alcohol u otras drogas",
];
export const FACTOR_PERSONALES_PROTECCION = [
  "Estar dentro del sistema educativo hasta el final de los estudios obligatorios",
  "Contar con educación integral de la sexualidad enmarcada en el enfoque de derechos y de desarrollo de habilidades para la vida",
  "Habilidades sociales y de resolución pacífica de conflictos",
  "Autoestima y autoconocimiento",
  "Red de apoyo de pares y de adultos de confianza",
];

export const FACTOR_FAMILIARES_RIESGO = [
  "Desconocimiento de lo que implica la violencia",
  "Pautas de crianza violentas o negligentes",
  "Consumo problemático de alcohol u otras drogas en el hogar",
  "Antecedentes de violencia intrafamiliar",
  "Aislamiento social de la familia",
  "Situación socioeconómica precaria",
];
export const FACTOR_FAMILIARES_PROTECCION = [
  "Fomentar el diálogo familiar",
  "Ser conscientes sobre la importancia de la familia y la afectividad que se debe brindar a niños, niñas y adolescentes, siempre encaminada al respeto de los derechos",
  "Participación activa en actividades escolares; acompañar el proceso educativo de niñas, niños y adolescentes a lo largo de la vida",
  "Normas y límites claros y coherentes",
  "Vínculos afectivos seguros",
];

export const FACTOR_SITUACIONALES_RIESGO = [
  "Naturalización e invisibilización social de la violencia",
  "Tolerancia social o entorno comunitario violento",
  "Difusión de contenidos violentos o sexualizados",
  "Escaso acceso a servicios de protección",
];
export const FACTOR_SITUACIONALES_PROTECCION = [
  "Constituirse en un centro que brinda información clara y oportuna sobre temas de educación sexual y prevención de la violencia",
  "Facilitar el acceso a la educación, permanencia, progresión y culminación, evitando el abandono escolar de las presuntas víctimas",
  "Ser una comunidad educativa abierta al diálogo sobre temas de importancia social",
  "Promover un entorno libre de violencia",
  "Brindar información libre de estereotipos, sustentada en información científica",
  "Practicar la solidaridad, el respeto a la diferencia y la honradez en todas las relaciones sociales",
  "Coordinación con la red interinstitucional de protección (JCPD, JDRC, MSP, Fiscalía)",
];

// ---------- REFERENCIA EXTERNA ----------

export const EXT_REFERRAL_INSTANCES = [
  "Fiscalía",
  "Juzgados de Violencia contra la Mujer y la Familia",
  "Junta Distrital de Resolución de Conflictos (JDRC)",
  "Junta Cantonal de Protección de Derechos",
  "Centro de Salud",
  "Organización especializada en atención de casos de violencia",
];

export const PSYCHOSOCIAL_REFERRAL_OPTIONS = [
  "Centro de Protección de Derechos (MIES/INFA)",
  "Centros de Salud",
  "Hospitales",
  "Universidades (que cuenten con servicios de atención psicológica o legal)",
  "Consulta psicológica privada",
  "Fundaciones",
  "Otro",
];

// ---------- Estructuras JSON ----------

export interface IndicatorsData {
  signos_fisicos: string[];
  signos_fisicos_otros: string;
  signos_comportamiento: string[];
  signos_comportamiento_otros: string;
  conductas_ie: string[];
  conductas_ie_otros: string;
}

export interface RiskProtectionData {
  personales_riesgo: string[];
  personales_riesgo_otros: string;
  personales_proteccion: string[];
  personales_proteccion_otros: string;
  familiares_riesgo: string[];
  familiares_riesgo_otros: string;
  familiares_proteccion: string[];
  familiares_proteccion_otros: string;
  situacionales_riesgo: string[];
  situacionales_riesgo_otros: string;
  situacionales_proteccion: string[];
  situacionales_proteccion_otros: string;
}

export interface ExtReferralData {
  selected: string[];
}

export interface PsychosocialReferralData {
  /** opción marcada -> nombre indicado */
  entries: { option: string; name: string }[];
}

const EMPTY_INDICATORS: IndicatorsData = {
  signos_fisicos: [],
  signos_fisicos_otros: "",
  signos_comportamiento: [],
  signos_comportamiento_otros: "",
  conductas_ie: [],
  conductas_ie_otros: "",
};

const EMPTY_RISK: RiskProtectionData = {
  personales_riesgo: [],
  personales_riesgo_otros: "",
  personales_proteccion: [],
  personales_proteccion_otros: "",
  familiares_riesgo: [],
  familiares_riesgo_otros: "",
  familiares_proteccion: [],
  familiares_proteccion_otros: "",
  situacionales_riesgo: [],
  situacionales_riesgo_otros: "",
  situacionales_proteccion: [],
  situacionales_proteccion_otros: "",
};

function safeParse<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return { ...fallback, ...(JSON.parse(raw) as object) } as T;
  } catch {
    return fallback;
  }
}

export const parseIndicators = (raw: string | null | undefined) => safeParse<IndicatorsData>(raw, EMPTY_INDICATORS);
export const parseRiskProtection = (raw: string | null | undefined) => safeParse<RiskProtectionData>(raw, EMPTY_RISK);
export const parseExtReferral = (raw: string | null | undefined) =>
  safeParse<ExtReferralData>(raw, { selected: [] });
export const parsePsychosocialReferral = (raw: string | null | undefined) =>
  safeParse<PsychosocialReferralData>(raw, { entries: [] });

export const ACCOMPANIMENT_AI_LABELS = {
  family_situation:
    "Situación familiar del estudiante en el Informe Técnico de Acompañamiento a víctimas de violencia (mencionar al estudiante con sus datos de identificación, curso y si pertenece a Bachillerato con su especialidad; detallar con quién vive, configuración y dinámica familiar, factores protectores y de riesgo, redacción clínica y objetiva en 3ra persona, sin juicios de valor)",
  academic_performance:
    "Rendimiento académico del estudiante en el Informe Técnico de Acompañamiento a víctimas de violencia (mencionar al estudiante con su nivel educativo, si pertenece a Bachillerato y su especialidad; describir su desempeño escolar, dificultades o cambios observados en aula, si requirió adaptaciones o DAI, sin juicios de valor)",
  accompaniment_actions:
    "Acciones inmediatas de acompañamiento en el Informe Técnico de Acompañamiento a víctimas de violencia (resumen cronológico de acciones ejecutadas por el DECE indicando OBLIGATORIAMENTE LAS FECHAS de cada acción, entrevista a representantes, diálogo docente, seguimiento de aula, derivaciones y talleres; sin apartados de conclusiones del seguimiento institucional)",
} as const;
