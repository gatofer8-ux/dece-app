// Catálogo y plantilla base del PLAN ESTRATÉGICO BIANUAL del Departamento de
// Consejería Estudiantil (DECE).
//
// Módulo PURO y seguro para el cliente: no importa `better-sqlite3`, `crypto`
// como módulo de Node ni `next/headers`, porque lo consume tanto el formulario
// ("use client") como las rutas de exportación y los generadores de Word.
//
// El plan bianual es el documento marco del que se DESPRENDE cada Plan de
// Acción Anual (POA): su objetivo general, sus objetivos específicos y las
// metas de cada eje alimentan la generación asistida del POA.
import {
  PREVENTION_AXIS_THEMES,
  type PreventionAxisTheme,
} from './actionPlan';
import type {
  StrategicBianualAxisItem,
  ActionPlanAnalyst,
  ActionPlanSignatory,
} from './types';

/**
 * Los 4 ejes de acción del DECE. Coinciden deliberadamente con los 4
 * componentes de la DIMENSIÓN: ACOMPAÑAMIENTO Y SEGUIMIENTO PSICOSOCIAL del
 * POA anual, para que ambos documentos se complementen fila por fila.
 */
export const STRATEGIC_BIANUAL_AXES: string[] = [
  'EJE DE ACCIÓN: CONSEJERÍA',
  'EJE DE ACCIÓN: PROMOCIÓN Y PREVENCIÓN',
  'EJE DE ACCIÓN: INCLUSIÓN SOCIOEDUCATIVA',
  'EJE DE ACCIÓN: ATENCIÓN PSICOSOCIAL',
];

/** Redacción oficial del objetivo general del Plan Estratégico DECE. */
export const DEFAULT_GENERAL_OBJECTIVE =
  'Acompañar el proceso educativo mediante la promoción de derechos, la prevención de problemáticas sociales, el fomento de la convivencia armónica, la inclusión socioeducativa, de la comunidad educativa, con la finalidad de aportar en la construcción de los proyectos de vida de la población estudiantil.';

export const DEFAULT_SPECIFIC_OBJECTIVES: string[] = [
  'Identificar riesgos psicosociales en la población estudiantil.',
  'Activar rutas y protocolos de actuación frente a situaciones de riesgos psicosociales con la finalidad de garantizar la protección de derechos que permite el sistema educativo.',
  'Trabajar en temáticas preventivas en la comunidad educativa con la finalidad de evitar que aumenten los índices de riesgos psicosociales dentro de la institución.',
  'Promover la elaboración del proyecto de vida en los y las estudiantes para que los mismos se fijen metas y objetivos a cumplir en su vida personal y estudiantil.',
];

/** Marcadores de año reemplazados por el periodo bianual real de la institución. */
export const YEAR_1_TOKEN = '[AÑO1]';
export const YEAR_2_TOKEN = '[AÑO2]';

/**
 * Matriz semilla del plan bianual. Cubre explícitamente las 8 temáticas del
 * eje de estrategias de prevención (PREVENTION_AXIS_THEMES) y cita el código
 * del Estándar de Calidad DECE que corresponde a cada indicador.
 */
export const DEFAULT_BIANUAL_AXIS_ITEMS: StrategicBianualAxisItem[] = [
  // ───────────────────────── EJE 1: CONSEJERÍA ─────────────────────────
  {
    id: 'bianual_item_1',
    axis: 'EJE DE ACCIÓN: CONSEJERÍA',
    goal: 'Lograr que el 100% de estudiantes de décimo año de EGB y tercero de bachillerato construyan su proyecto de vida y tomen una decisión vocacional informada durante el periodo bianual.',
    actions:
      '1. Planificar e implementar los procesos de Orientación Vocacional y Profesional (OVP) por subniveles, de forma transversal desde el nivel inicial hasta el bachillerato.\n2. Aplicar herramientas de intereses profesionales y vocacionales de manera individual y grupal.\n3. Desarrollar la retroalimentación de resultados con estudiantes y sus representantes legales.\n4. Capacitar a docentes tutores en herramientas de proyecto de vida para sostener el proceso en el aula.',
    responsible: 'Equipo DECE (Coordinación y Analistas) en articulación con docentes tutores y Vicerrectorado.',
    evaluation_indicator:
      'E.D2.C1.DE6.c. Número de estudiantes de 10mo EGB y 3ro BGU con herramientas de intereses profesionales y vocacionales aplicadas y retroalimentadas, sobre el total de matriculados en esos niveles (meta: 100% en cada año lectivo del bianio).',
    execution_term: `Octubre a junio de cada año lectivo del periodo: ${YEAR_1_TOKEN} y ${YEAR_2_TOKEN}.`,
  },
  {
    id: 'bianual_item_2',
    axis: 'EJE DE ACCIÓN: CONSEJERÍA',
    goal: 'Fortalecer en la población estudiantil el conocimiento y ejercicio de sus derechos, mediante al menos dos actividades de sensibilización por grado o curso en cada año lectivo del bianio.',
    actions:
      '1. Ejecutar estrategias de introspección y empoderamiento sobre derechos de niñas, niños y adolescentes en cada grado o curso.\n2. Desarrollar campañas institucionales de promoción de derechos (minutos cívicos, carteleras y productos educomunicacionales).\n3. Socializar con estudiantes y familias las rutas de exigibilidad y restitución de derechos.',
    responsible: 'Equipo DECE, docentes tutores y Consejo Estudiantil.',
    evaluation_indicator:
      'E.D2.C1.DE7.c. Dos actividades de sensibilización, diálogo o capacitación sobre derechos ejecutadas por grado o curso, por año lectivo, con registro de asistencia e informe técnico de cumplimiento.',
    execution_term: `Dos jornadas por año lectivo: primer y segundo quimestre de ${YEAR_1_TOKEN} y de ${YEAR_2_TOKEN}.`,
  },
  {
    id: 'bianual_item_3',
    axis: 'EJE DE ACCIÓN: CONSEJERÍA',
    goal: 'Mantener actualizada al 100% la gestión documental técnica del departamento correspondiente a los cuatro ejes de acción durante todo el periodo bianual.',
    actions:
      '1. Elaborar los documentos técnicos (informes, registros y material de talleres) que respalden los procesos de acompañamiento y seguimiento psicosocial.\n2. Actualizar los expedientes de bienestar estudiantil de la población asignada a cada profesional.\n3. Consolidar y respaldar periódicamente la matriz institucional de riesgos psicosociales.',
    responsible: 'Coordinación DECE y cada profesional según la población estudiantil asignada.',
    evaluation_indicator:
      'E.D1.C1.DE1.d. Porcentaje de expedientes y documentos técnicos de los 4 ejes de acción elaborados y actualizados respecto de lo planificado (meta: 100% al cierre de cada año lectivo del bianio).',
    execution_term: `Permanente durante todo el periodo bianual ${YEAR_1_TOKEN} - ${YEAR_2_TOKEN}, con cortes de verificación trimestrales.`,
  },

  // ──────────────── EJE 2: PROMOCIÓN Y PREVENCIÓN (8 temáticas) ────────────────
  {
    id: 'bianual_item_4',
    axis: 'EJE DE ACCIÓN: PROMOCIÓN Y PREVENCIÓN',
    goal: 'Reducir los casos de violencia física, psicológica y sexual detectados en la institución, logrando que el 100% de la comunidad educativa conozca las rutas y protocolos de actuación al término del bianio.',
    actions:
      '1. Desarrollar talleres de prevención de violencias (física, psicológica y sexual) con estudiantes, por subniveles, con enfoque de derechos y autoprotección.\n2. Socializar las rutas y protocolos de actuación frente a hechos de violencia con docentes, familias y estudiantes.\n3. Implementar la metodología de recorrido participativo y campañas de autocuidado del cuerpo ("Semáforo corporal") en los niveles iniciales.',
    responsible: 'Equipo DECE con apoyo de docentes tutores y la máxima autoridad institucional.',
    evaluation_indicator:
      'E.D2.C2.DE9.c. Dos espacios de sensibilización sobre prevención de violencias por grado o curso y por año lectivo, con registros de asistencia firmados e informes técnicos; reducción porcentual de casos reincidentes respecto de la línea base del primer año.',
    execution_term: `Primer quimestre de ${YEAR_1_TOKEN} (línea base y talleres) y refuerzo en el primer quimestre de ${YEAR_2_TOKEN}.`,
  },
  {
    id: 'bianual_item_5',
    axis: 'EJE DE ACCIÓN: PROMOCIÓN Y PREVENCIÓN',
    goal: 'Disminuir los casos de acoso escolar (bullying) y ciberacoso reportados, fortaleciendo la convivencia digital responsable en el 100% de los cursos de básica media, superior y bachillerato durante el bianio.',
    actions:
      '1. Facilitar talleres de prevención del acoso escolar y ciberacoso, empatía digital y uso seguro de redes sociales.\n2. Conformar y acompañar brigadas estudiantiles de buen trato y convivencia digital.\n3. Asesorar a docentes y familias en la identificación temprana y el manejo institucional de casos de acoso y ciberacoso.',
    responsible: 'Equipo DECE, docentes tutores, Comisión de Convivencia Armónica y brigadas estudiantiles.',
    evaluation_indicator:
      'E.D2.C2.DE9.c. Número de cursos de básica media, superior y bachillerato con talleres de prevención de acoso escolar y ciberacoso ejecutados por año lectivo (meta: 100%), con informe técnico de cumplimiento del estándar.',
    execution_term: `Noviembre a diciembre de ${YEAR_1_TOKEN} y de ${YEAR_2_TOKEN}, con seguimiento permanente de casos.`,
  },
  {
    id: 'bianual_item_6',
    axis: 'EJE DE ACCIÓN: PROMOCIÓN Y PREVENCIÓN',
    goal: 'Prevenir el uso y consumo de alcohol, tabaco y otras sustancias estupefacientes en la población estudiantil de básica superior y bachillerato durante los dos años lectivos del plan.',
    actions:
      '1. Ejecutar talleres de prevención integral del uso y consumo de drogas ("Mitos, realidades y toma responsable de decisiones") articulados al proyecto de vida.\n2. Desarrollar jornadas de sensibilización con familias sobre factores protectores y detección temprana del consumo.\n3. Articular con el Ministerio de Salud Pública y la red interinstitucional local las acciones de prevención y derivación.',
    responsible: 'Equipo DECE en articulación con el MSP, Policía Comunitaria/DINAPEN y docentes tutores.',
    evaluation_indicator:
      'E.D2.C2.DE9.c. Dos espacios de sensibilización sobre prevención del uso y consumo de drogas por año lectivo, dirigidos a estudiantes, docentes y familias, con registro de asistencia e informe técnico.',
    execution_term: `Primer quimestre de ${YEAR_1_TOKEN} y de ${YEAR_2_TOKEN}, con campañas de refuerzo en el mes de junio de cada año.`,
  },
  {
    id: 'bianual_item_7',
    axis: 'EJE DE ACCIÓN: PROMOCIÓN Y PREVENCIÓN',
    goal: 'Promover la salud mental de la comunidad educativa y prevenir el suicidio y las conductas autolíticas, garantizando la identificación y atención oportuna del 100% de los casos detectados en el bianio.',
    actions:
      '1. Desarrollar charlas-taller de promoción de la salud mental, manejo emocional y redes de apoyo entre pares.\n2. Aplicar herramientas de tamizaje de factores de riesgo suicida y conductas autolesivas en los niveles priorizados.\n3. Capacitar a docentes y familias en primeros auxilios psicológicos y en la ruta institucional frente a ideación o intento autolítico.\n4. Activar la derivación oportuna a la red externa de salud mental en los casos que lo requieran.',
    responsible: 'Equipo DECE (profesional de psicología clínica/educativa) con el MSP y la máxima autoridad.',
    evaluation_indicator:
      'E.D2.C2.DE9.c. y E.D3.C1.DE11.c. Porcentaje de estudiantes con factores de riesgo identificados que reciben acompañamiento psicosocial y/o derivación externa documentada (meta: 100% en cada año lectivo del bianio).',
    execution_term: `Segundo quimestre de ${YEAR_1_TOKEN} y de ${YEAR_2_TOKEN}; atención de casos de forma permanente.`,
  },
  {
    id: 'bianual_item_8',
    axis: 'EJE DE ACCIÓN: PROMOCIÓN Y PREVENCIÓN',
    goal: 'Implementar la Estrategia Nacional de Educación Integral en Sexualidad (ENEIS) y reducir los casos de embarazo adolescente en la institución al término del periodo bianual.',
    actions:
      '1. Ejecutar las actividades de la ENEIS por subnivel, conforme al cronograma institucional y a los lineamientos ministeriales.\n2. Facilitar talleres sobre derechos sexuales y reproductivos, afectividad y postergación del inicio sexual temprano.\n3. Desarrollar jornadas con familias sobre acompañamiento afectivo-sexual y comunicación asertiva.\n4. Acompañar y garantizar la permanencia escolar de estudiantes en estado de gestación o maternidad/paternidad temprana.',
    responsible: 'Equipo DECE, comisión ENEIS institucional y docentes tutores.',
    evaluation_indicator:
      'E.D2.C2.DE9.c. Porcentaje de actividades ENEIS ejecutadas respecto de las planificadas por año lectivo (meta: 100%) y número de casos de embarazo adolescente con plan de permanencia escolar activo.',
    execution_term: `Todo el año lectivo ${YEAR_1_TOKEN} y todo el año lectivo ${YEAR_2_TOKEN}, según cronograma ENEIS.`,
  },
  {
    id: 'bianual_item_9',
    axis: 'EJE DE ACCIÓN: PROMOCIÓN Y PREVENCIÓN',
    goal: 'Consolidar una cultura de paz institucional mediante la aplicación de prácticas y círculos restaurativos en el 100% de los conflictos de convivencia susceptibles de solución alternativa durante el bianio.',
    actions:
      '1. Implementar círculos restaurativos y prácticas restaurativas para la resolución pacífica de conflictos entre estudiantes.\n2. Capacitar a docentes y autoridades en metodología restaurativa y acuerdos de convivencia.\n3. Asesorar a la máxima autoridad y a las instancias de solución alternativa de conflictos en estrategias de cultura de paz y no violencia.',
    responsible: 'Equipo DECE, Comisión de Convivencia Armónica y máxima autoridad institucional.',
    evaluation_indicator:
      'E.D4.C1.DE14.c. Número de círculos y prácticas restaurativas aplicados con acta de acuerdos firmada, sobre el total de conflictos derivados al departamento en cada año lectivo del bianio.',
    execution_term: `Permanente durante el periodo ${YEAR_1_TOKEN} - ${YEAR_2_TOKEN}, con capacitación docente al inicio de cada año lectivo.`,
  },
  {
    id: 'bianual_item_10',
    axis: 'EJE DE ACCIÓN: PROMOCIÓN Y PREVENCIÓN',
    goal: 'Fortalecer el vínculo familiar y la corresponsabilidad de las familias en la protección de derechos, mediante la Escuela para Familias sostenida en los dos años lectivos del plan.',
    actions:
      '1. Ejecutar la Escuela para Familias con temáticas de crianza positiva, comunicación asertiva y establecimiento de límites.\n2. Desarrollar talleres sobre factores protectores familiares frente a los riesgos psicosociales priorizados.\n3. Suscribir actas de corresponsabilidad con las familias de estudiantes en seguimiento psicosocial.',
    responsible: 'Equipo DECE con el Comité Central de Padres, Madres y Representantes Legales.',
    evaluation_indicator:
      'E.D2.C2.DE9.c. Al menos dos espacios de sensibilización y diálogo con familias por año lectivo, con registro de asistencia firmado e informe técnico de cumplimiento del estándar.',
    execution_term: `Una jornada por quimestre en ${YEAR_1_TOKEN} y en ${YEAR_2_TOKEN} (cuatro jornadas en el bianio).`,
  },
  {
    id: 'bianual_item_11',
    axis: 'EJE DE ACCIÓN: PROMOCIÓN Y PREVENCIÓN',
    goal: 'Implementar un sistema institucional de alertas tempranas por ausentismo que permita prevenir la deserción escolar y reducir el abandono al cierre del periodo bianual.',
    actions:
      '1. Establecer el registro y seguimiento mensual de alertas tempranas por ausentismo reiterado, en coordinación con Secretaría e Inspección General.\n2. Asesorar a docentes tutores en la notificación oportuna de alertas y en el acompañamiento socioemocional en el aula.\n3. Realizar visitas, llamadas y entrevistas familiares de acompañamiento a estudiantes en riesgo de abandono.\n4. Elaborar e implementar planes de permanencia escolar para los casos identificados.',
    responsible: 'Equipo DECE, Inspección General, Secretaría y docentes tutores.',
    evaluation_indicator:
      'E.D2.C2.DE8.c. Porcentaje de estudiantes con alerta de ausentismo que cuentan con acompañamiento y plan de permanencia documentado (meta: 100%) y reducción de la tasa de abandono respecto del primer año del bianio.',
    execution_term: `Seguimiento mensual durante todo el periodo ${YEAR_1_TOKEN} - ${YEAR_2_TOKEN}, con informe consolidado al cierre de cada año lectivo.`,
  },

  // ────────────── EJE 3: INCLUSIÓN SOCIOEDUCATIVA ──────────────
  {
    id: 'bianual_item_12',
    axis: 'EJE DE ACCIÓN: INCLUSIÓN SOCIOEDUCATIVA',
    goal: 'Garantizar que el 100% de estudiantes con necesidades educativas específicas, asociadas y no asociadas a la discapacidad, cuente con plan de atención y seguimiento psicosocial durante el bianio.',
    actions:
      '1. Receptar los informes psicopedagógicos de la UDAI u otras instancias avaladas y registrar las derivaciones.\n2. Elaborar e implementar el plan de atención y seguimiento psicosocial de cada estudiante con NEE.\n3. Acompañar a docentes en la aplicación de las recomendaciones psicosociales en el aula.',
    responsible: 'Equipo DECE en articulación con la UDAI, el Departamento de Inclusión y docentes tutores.',
    evaluation_indicator:
      'E.D2.C3.DE10.c. Porcentaje de estudiantes con NEE derivados que cuentan con plan de atención y seguimiento psicosocial implementado y verificado (meta: 100% en cada año lectivo del bianio).',
    execution_term: `Todo el año lectivo ${YEAR_1_TOKEN} y todo el año lectivo ${YEAR_2_TOKEN}.`,
  },
  {
    id: 'bianual_item_13',
    axis: 'EJE DE ACCIÓN: INCLUSIÓN SOCIOEDUCATIVA',
    goal: 'Consolidar una cultura institucional inclusiva y libre de prácticas discriminatorias, sensibilizando a toda la comunidad educativa en los dos años del plan.',
    actions:
      '1. Desarrollar espacios de orientación y sensibilización sobre diversidad, inclusión educativa y no discriminación.\n2. Difundir productos educomunicacionales dirigidos a la población estudiantil en situación de vulnerabilidad.\n3. Coordinar con la máxima autoridad la aplicación de medidas de acción afirmativa.',
    responsible: 'Equipo DECE, máxima autoridad institucional y Junta Académica.',
    evaluation_indicator:
      'E.D2.C3.DE10.c. Número de espacios de sensibilización sobre inclusión educativa ejecutados con registro de asistencia, y actas de coordinación de medidas de acción afirmativa suscritas por año lectivo.',
    execution_term: `Primer quimestre de ${YEAR_1_TOKEN} y de ${YEAR_2_TOKEN}, con productos educomunicacionales permanentes.`,
  },
  {
    id: 'bianual_item_14',
    axis: 'EJE DE ACCIÓN: INCLUSIÓN SOCIOEDUCATIVA',
    goal: 'Brindar atención psicosocial prioritaria al 100% de estudiantes en situación de doble o múltiple vulnerabilidad identificados durante el periodo bianual.',
    actions:
      '1. Identificar y registrar a estudiantes en situación de doble o múltiple vulnerabilidad.\n2. Generar alertas ante la autoridad institucional o distrital cuando existan situaciones que afecten los procesos de inclusión.\n3. Asesorar a estudiantes y familias sobre la oferta educativa ordinaria y extraordinaria, en articulación con la UDAI.',
    responsible: 'Equipo DECE, UDAI y máxima autoridad institucional.',
    evaluation_indicator:
      'E.D2.C3.DE10.c. Porcentaje de estudiantes en doble o múltiple vulnerabilidad con atención psicosocial prioritaria y ficha de seguimiento activa (meta: 100%).',
    execution_term: `Permanente durante el periodo ${YEAR_1_TOKEN} - ${YEAR_2_TOKEN}.`,
  },

  // ────────────── EJE 4: ATENCIÓN PSICOSOCIAL ──────────────
  {
    id: 'bianual_item_15',
    axis: 'EJE DE ACCIÓN: ATENCIÓN PSICOSOCIAL',
    goal: 'Detectar oportunamente a los estudiantes que requieren atención psicosocial, aplicando al menos dos técnicas o herramientas de detección en cada año lectivo del bianio.',
    actions:
      '1. Aplicar la ficha de observación y la entrevista socioemocional en los diferentes espacios educativos.\n2. Identificar alertas reportadas por docentes en las Juntas de Docentes de Grado o Curso.\n3. Desarrollar la valoración o diagnóstico situacional (historia de vida, línea de vida, factores de riesgo y protectores).',
    responsible: 'Equipo DECE con los docentes tutores de cada grado o curso.',
    evaluation_indicator:
      'E.D3.C1.DE11.c. Dos técnicas y/o herramientas de detección aplicadas por año lectivo, con registros en el expediente de bienestar estudiantil.',
    execution_term: `Todo el año lectivo ${YEAR_1_TOKEN} y todo el año lectivo ${YEAR_2_TOKEN}.`,
  },
  {
    id: 'bianual_item_16',
    axis: 'EJE DE ACCIÓN: ATENCIÓN PSICOSOCIAL',
    goal: 'Intervenir en el 100% de los casos de riesgo psicosocial detectados, mediante planes de atención psicosocial con seguimiento documentado durante el periodo bianual.',
    actions:
      '1. Elaborar y ejecutar el plan de atención psicosocial individual y/o grupal de cada caso.\n2. Socializar con docentes las estrategias de acompañamiento mediante acta de socialización del caso.\n3. Mantener el seguimiento periódico con la familia y con las instancias externas que receptaron la derivación.\n4. Actualizar mensualmente la matriz institucional de riesgos psicosociales.',
    responsible: 'Equipo DECE (profesional asignado al caso) y Coordinación DECE.',
    evaluation_indicator:
      'E.D3.C1.DE12.c. y E.D1.C1.DE2.c. Porcentaje de casos de riesgo psicosocial con plan de atención ejecutado y ficha de seguimiento actualizada (meta: 100%), con registro mensual en la matriz de riesgos.',
    execution_term: `Permanente durante el periodo ${YEAR_1_TOKEN} - ${YEAR_2_TOKEN}, con actualización mensual de la matriz.`,
  },
  {
    id: 'bianual_item_17',
    axis: 'EJE DE ACCIÓN: ATENCIÓN PSICOSOCIAL',
    goal: 'Garantizar la restitución de derechos y la no revictimización del 100% de estudiantes víctimas de violencia atendidos durante el bianio.',
    actions:
      '1. Implementar el plan de acompañamiento y restitución a víctimas de violencia.\n2. Asesorar a la máxima autoridad en la implementación de las medidas de protección y reparación dispuestas por las autoridades competentes.\n3. Desarrollar espacios de sensibilización con la comunidad educativa para evitar la repetición de hechos y la revictimización.',
    responsible: 'Equipo DECE, máxima autoridad institucional y red externa de protección (JCPD, Fiscalía, DINAPEN, MSP).',
    evaluation_indicator:
      'E.D3.C1.DE13.c. Porcentaje de casos de violencia con plan de acompañamiento y restitución implementado y acta de asesoramiento a la autoridad suscrita (meta: 100%).',
    execution_term: `Permanente durante el periodo ${YEAR_1_TOKEN} - ${YEAR_2_TOKEN}, según la connotación de cada caso.`,
  },
  {
    id: 'bianual_item_18',
    axis: 'EJE DE ACCIÓN: ATENCIÓN PSICOSOCIAL',
    goal: 'Consolidar la red interinstitucional de protección y derivación, con al menos dos reuniones de articulación por año lectivo durante el periodo bianual.',
    actions:
      '1. Actualizar el mapeo de instancias internas y externas de atención psicológica, psicopedagógica, de salud y de protección de derechos.\n2. Gestionar reuniones de coordinación con la red interinstitucional local.\n3. Realizar el seguimiento de los casos derivados a instancias externas hasta su cierre técnico.',
    responsible: 'Coordinación DECE y profesionales asignados a la articulación externa.',
    evaluation_indicator:
      'E.D3.C1.DE12.c. Matriz de actores externos actualizada y al menos dos actas de reunión de articulación interinstitucional por año lectivo del bianio.',
    execution_term: `Diciembre y mayo de ${YEAR_1_TOKEN} y de ${YEAR_2_TOKEN}.`,
  },
];

/**
 * Palabras clave por temática de prevención, para reconocer qué temáticas del
 * Acuerdo 044-A cubre una fila de la matriz (insignias en el formulario y
 * verificación de cobertura completa).
 */
const THEME_KEYWORDS: Record<string, RegExp> = {
  VIOLENCIAS: /violencia|maltrato|abuso sexual|autoprotecci[óo]n|semáforo corporal|semaforo corporal/i,
  ACOSO_CIBERACOSO: /acoso|bullying|ciberacoso|ciberbullying|redes sociales|convivencia digital/i,
  DROGAS: /drogas|alcohol|tabaco|estupefacientes|consumo de sustancias|psicotr[óo]picas/i,
  SUICIDIO_SALUD_MENTAL: /suicid|autol[íi]tic|autolesi|salud mental|primeros auxilios psicol/i,
  ENEIS_EMBARAZO: /eneis|sexualidad|embarazo|derechos sexuales|reproductiv/i,
  CONVIVENCIA_RESTAURATIVA: /restaurativ|convivencia (pac[íi]fica|armónica|armonica)|cultura de paz|resoluci[óo]n pac[íi]fica/i,
  VINCULO_FAMILIAR: /familias|familiar|crianza|escuela para familias|corresponsabilidad|representantes legales/i,
  ALERTAS_AUSENTISMO: /ausentismo|deserci[óo]n|abandono|permanencia escolar|alertas tempranas|asistencia/i,
};

/**
 * Fila semilla del eje de PROMOCIÓN Y PREVENCIÓN que corresponde a cada
 * temática del Acuerdo 044-A. Permite garantizar de forma determinística que
 * ninguna de las 8 temáticas quede sin fila en la matriz generada.
 */
export const PREVENTION_THEME_SEED_ITEM_IDS: Record<string, string> = {
  VIOLENCIAS: 'bianual_item_4',
  ACOSO_CIBERACOSO: 'bianual_item_5',
  DROGAS: 'bianual_item_6',
  SUICIDIO_SALUD_MENTAL: 'bianual_item_7',
  ENEIS_EMBARAZO: 'bianual_item_8',
  CONVIVENCIA_RESTAURATIVA: 'bianual_item_9',
  VINCULO_FAMILIAR: 'bianual_item_10',
  ALERTAS_AUSENTISMO: 'bianual_item_11',
};

/** Fila semilla lista para insertar de la temática de prevención indicada. */
export function getPreventionSeedRowForTheme(
  themeCode: string,
  startYear?: string | number,
  endYear?: string | number
): StrategicBianualAxisItem | null {
  const seedId = PREVENTION_THEME_SEED_ITEM_IDS[themeCode];
  if (!seedId) return null;
  const seed = DEFAULT_BIANUAL_AXIS_ITEMS.find((i) => i.id === seedId);
  if (!seed) return null;

  const y1 = String(startYear ?? '').trim();
  const y2 = String(endYear ?? '').trim();
  const fill = (text: string) => {
    let out = text;
    if (y1) out = out.split(YEAR_1_TOKEN).join(y1);
    if (y2) out = out.split(YEAR_2_TOKEN).join(y2);
    return out;
  };

  return {
    ...seed,
    id: newId(DEFAULT_BIANUAL_AXIS_ITEMS.indexOf(seed)),
    goal: fill(seed.goal),
    execution_term: fill(seed.execution_term),
  };
}

/** Temáticas de prevención (044-A) que reconoce el texto de una fila. */
export function detectPreventionThemes(
  ...texts: (string | null | undefined)[]
): PreventionAxisTheme[] {
  const haystack = texts.filter(Boolean).join(' \n ');
  if (!haystack.trim()) return [];
  return PREVENTION_AXIS_THEMES.filter((theme) => {
    const re = THEME_KEYWORDS[theme.code];
    return re ? re.test(haystack) : false;
  });
}

function newId(idx: number): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'bianual_item_' + (idx + 1) + '_' + Date.now();
}

/**
 * Matriz semilla con los años reales del periodo bianual e identificadores
 * únicos, tal como `getDefaultActionPlanItems()` hace para el POA anual.
 */
export function getDefaultBianualAxisItems(
  startYear?: string | number,
  endYear?: string | number
): StrategicBianualAxisItem[] {
  const y1 = String(startYear ?? '').trim();
  const y2 = String(endYear ?? '').trim();

  const fill = (text: string) => {
    let out = text;
    if (y1) out = out.split(YEAR_1_TOKEN).join(y1);
    if (y2) out = out.split(YEAR_2_TOKEN).join(y2);
    return out;
  };

  return DEFAULT_BIANUAL_AXIS_ITEMS.map((item, idx) => ({
    ...item,
    id: newId(idx),
    execution_term: fill(item.execution_term),
    goal: fill(item.goal),
  }));
}

export function parseBianualAxisItems(raw: any): StrategicBianualAxisItem[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function parseBianualSpecificObjectives(raw: any): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map((o) => String(o));
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map((o) => String(o)) : [];
  } catch {
    // Compatibilidad: objetivos guardados como texto con saltos de línea.
    const text = String(raw).trim();
    if (!text) return [];
    return text
      .split('\n')
      .map((l) => l.replace(/^\s*\d+[.)-]?\s*/, '').trim())
      .filter(Boolean);
  }
}

export function parseBianualAnalysts(raw: any): ActionPlanAnalyst[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function parseBianualSignatories(raw: any): ActionPlanSignatory[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Texto del periodo bianual, p. ej. "2026-2028". */
export function buildPeriodText(
  startYear: string | number,
  endYear: string | number
): string {
  return `${String(startYear).trim()}-${String(endYear).trim()}`;
}

/** Estadísticas en vivo de la matriz, análogas a `calculatePlanStats` del POA. */
export function calculateBianualPlanStats(items: StrategicBianualAxisItem[]) {
  const axes = new Set<string>();
  let actionsCount = 0;
  let itemsWithResponsible = 0;
  let itemsWithIndicator = 0;
  let itemsWithGoal = 0;
  const coveredThemes = new Set<string>();

  for (const item of items) {
    if (item.axis) axes.add(item.axis);
    if (item.actions?.trim()) {
      const lines = item.actions.split('\n').filter((l) => l.trim().length > 0);
      actionsCount += lines.length > 0 ? lines.length : 1;
    }
    if (item.responsible?.trim()) itemsWithResponsible++;
    if (item.evaluation_indicator?.trim()) itemsWithIndicator++;
    if (item.goal?.trim()) itemsWithGoal++;

    for (const theme of detectPreventionThemes(
      item.goal,
      item.actions,
      item.evaluation_indicator
    )) {
      coveredThemes.add(theme.code);
    }
  }

  return {
    totalItems: items.length,
    axesCount: axes.size,
    actionsCount,
    itemsWithResponsible,
    itemsWithIndicator,
    itemsWithGoal,
    preventionThemesCovered: coveredThemes.size,
    preventionThemesTotal: PREVENTION_AXIS_THEMES.length,
    coveredThemeCodes: Array.from(coveredThemes),
    completionPercent:
      items.length > 0 ? Math.round((itemsWithResponsible / items.length) * 100) : 0,
  };
}

/**
 * Contexto del plan bianual vigente que se inyecta en el prompt de generación
 * autónoma del POA anual, para que el plan de acción se desprenda realmente de
 * la planificación estratégica. Módulo puro: la consulta a la base la hace la
 * server action que lo invoca.
 */
export function buildBianualContextForActionPlan(plan: {
  period_text: string;
  general_objective: string;
  specific_objectives: string;
  axis_items_data: string;
}): string {
  const objectives = parseBianualSpecificObjectives(plan.specific_objectives);
  const items = parseBianualAxisItems(plan.axis_items_data);

  const lines: string[] = [];
  lines.push(`- Periodo bianual vigente: ${plan.period_text || 'no especificado'}`);
  if (plan.general_objective?.trim()) {
    lines.push(`- Objetivo general del plan estratégico: ${plan.general_objective.trim()}`);
  }
  if (objectives.length > 0) {
    lines.push('- Objetivos específicos del plan estratégico:');
    objectives.forEach((o, i) => lines.push(`   ${i + 1}. ${o}`));
  }

  const byAxis = new Map<string, string[]>();
  for (const item of items) {
    if (!item.goal?.trim()) continue;
    const axis = item.axis || 'EJE DE ACCIÓN';
    if (!byAxis.has(axis)) byAxis.set(axis, []);
    byAxis.get(axis)!.push(item.goal.trim());
  }

  if (byAxis.size > 0) {
    lines.push('- Metas bianuales por eje de acción (el POA debe operativizarlas por año lectivo):');
    for (const [axis, goals] of byAxis) {
      lines.push(`   ${axis}:`);
      goals.forEach((g) => lines.push(`     • ${g}`));
    }
  }

  return lines.join('\n');
}
