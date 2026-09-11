// Catálogo oficial de Estándares de Calidad y Plantilla Base del Plan de Acción Anual DECE
import { ActionPlanItem, ActionPlanAnalyst, ActionPlanSignatory } from './types';
import { currentSchoolYearText } from './schoolYearText';

export interface QualityStandardInfo {
  code: string;
  dimension: string;
  component: string;
  name: string;
  description: string;
}

export const DECE_QUALITY_STANDARDS: QualityStandardInfo[] = [
  {
    "code": "E.D1.C1.DE1.d",
    "dimension": "GESTIÓN DOCUMENTAL",
    "component": "INFORMACIÓN Y COMUNICACIÓN",
    "name": "Documentos de Acompañamiento",
    "description": "Elaborar documentos sobre los procesos de acompañamiento y seguimiento psicosocial a la población estudiantil, correspondientes a los 4 ejes de acción del DECE."
  },
  {
    "code": "E.D1.C1.DE2.c",
    "dimension": "GESTIÓN DOCUMENTAL",
    "component": "INFORMACIÓN Y COMUNICACIÓN",
    "name": "Registro de Riesgo Psicosocial",
    "description": "Actualizar mensualmente el Registro de Casos de Riesgo Psicosocial de acuerdo con los casos presentados en la institución educativa."
  },
  {
    "code": "E.D1.C2.DE3.c",
    "dimension": "GESTIÓN",
    "component": "INFORMACIÓN Y COMUNICACIÓN",
    "name": "Reporte en Juntas de Curso",
    "description": "Reportar, de manera específica, en la Junta de Docentes de Grado o Curso, las acciones tomadas a fin de garantizar la accesibilidad y exigibilidad de los derechos de la población estudiantil."
  },
  {
    "code": "E.D1.C2.DE4.c",
    "dimension": "GESTIÓN",
    "component": "INFORMACIÓN Y COMUNICACIÓN",
    "name": "Socialización de Políticas y Planes",
    "description": "Generar dos espacios en el año lectivo para la socialización de políticas, lineamientos, planes, programas y estrategias inherentes a las funciones del Departamento de Consejería Estudiantil."
  },
  {
    "code": "E.D1.C3.DE5",
    "dimension": "GESTIÓN",
    "component": "GESTIÓN ORGANIZACIONAL",
    "name": "Ejecución del Plan de Acción",
    "description": "Ejecutar el Plan de Acción del Departamento de Consejería Estudiantil."
  },
  {
    "code": "E.D2.C1.DE6.c",
    "dimension": "ACOMPAÑAMIENTO Y SEGUIMIENTO PSICOSOCIAL",
    "component": "EJE DE ACCIÓN - CONSEJERÍA",
    "name": "Orientación Vocacional y Profesional (OVP)",
    "description": "Implementa procesos y herramientas de intereses profesionales y vocacionales a estudiantes de forma individual y grupal, en función de los lineamientos emitidos por la Autoridad Educativa Nacional."
  },
  {
    "code": "E.D2.C1.DE7.c",
    "dimension": "ACOMPAÑAMIENTO Y SEGUIMIENTO PSICOSOCIAL",
    "component": "EJE DE ACCIÓN - CONSEJERÍA",
    "name": "Promoción de Derechos Estudiantiles",
    "description": "Genera, dos actividades de sensibilización, diálogo o capacitación, enfocadas en el ejercicio y la promoción de derechos del estudiantado, en cada grado o curso bajo su responsabilidad, por año lectivo."
  },
  {
    "code": "E.D2.C2.DE8.c",
    "dimension": "ACOMPAÑAMIENTO Y SEGUIMIENTO PSICOSOCIAL",
    "component": "EJE DE ACCIÓN - PROMOCIÓN Y PREVENCIÓN",
    "name": "Asesoramiento Socioemocional a Tutores",
    "description": "Asesorar, dos veces durante el año lectivo, a docentes tutores de cada grado o curso bajo su responsabilidad, sobre la implementación de las recomendaciones para fortalecer el acompañamiento socioemocional en el aula."
  },
  {
    "code": "E.D2.C2.DE9.c",
    "dimension": "ACOMPAÑAMIENTO Y SEGUIMIENTO PSICOSOCIAL",
    "component": "EJE DE ACCIÓN - PROMOCIÓN Y PREVENCIÓN",
    "name": "Sensibilización en Prevención de Riesgos",
    "description": "Generar dos espacios de sensibilización y diálogo, relacionados con las temáticas del eje de promoción y prevención, contemplados en el Plan Estratégico del departamento, con estudiantes de cada grado o curso, con otros profesionales de la institución educativa y con familias, por año lectivo."
  },
  {
    "code": "E.D2.C3.DE10.c",
    "dimension": "ACOMPAÑAMIENTO Y SEGUIMIENTO PSICOSOCIAL",
    "component": "EJE DE ACCIÓN - INCLUSIÓN SOCIOEDUCATIVA",
    "name": "Inclusión y NEE",
    "description": "Implementar el Plan de atención y seguimiento psicosocial a estudiantes con necesidades educativas específicas asociadas y no asociadas a la discapacidad, derivados desde la UDAI o profesionales avalados."
  },
  {
    "code": "E.D3.C1.DE11.c",
    "dimension": "ACOMPAÑAMIENTO Y SEGUIMIENTO PSICOSOCIAL",
    "component": "EJE DE ACCIÓN - ATENCIÓN PSICOSOCIAL",
    "name": "Detección Psicosocial",
    "description": "Aplicar dos técnicas y/o herramientas para la detección de estudiantes que requieren atención psicosocial."
  },
  {
    "code": "E.D3.C1.DE12.c",
    "dimension": "ACOMPAÑAMIENTO Y SEGUIMIENTO PSICOSOCIAL",
    "component": "EJE DE ACCIÓN - ATENCIÓN PSICOSOCIAL",
    "name": "Intervención Psicosocial",
    "description": "Realizar la intervención de estudiantes que requieren atención psicosocial."
  },
  {
    "code": "E.D3.C1.DE13.c",
    "dimension": "ACOMPAÑAMIENTO Y SEGUIMIENTO PSICOSOCIAL",
    "component": "EJE DE ACCIÓN - ATENCIÓN PSICOSOCIAL",
    "name": "Restitución a Víctimas de Violencia",
    "description": "Implementar las acciones contempladas en el Plan de acompañamiento y restitución a víctimas de violencia."
  },
  {
    "code": "E.D4.C1.DE14.c",
    "dimension": "CONVIVENCIA",
    "component": "TRABAJO EN RED",
    "name": "Cultura de Paz y Redes Interinstitucionales",
    "description": "Asesorar a la autoridad institucional y a las instancias de solución alternativa de conflictos de las instituciones educativas en la generación de estrategias enmarcadas en una cultura de paz y no violencia."
  }
];

export const DEFAULT_ACTION_PLAN_ITEMS: ActionPlanItem[] = [
  {
    "id": "item_1",
    "dimension": "DIMENSIÓN: ACOMPAÑAMIENTO Y SEGUIMIENTO PSICOSOCIAL",
    "component": "COMPONENTE : EJE DE ACCIÓN - CONSEJERÍA",
    "action": "AEC 2. Asesoramiento a docentes, personal educativo y autoridades educativas en los procesos de Orientación Vocacional y Profesional garantizando que sea transversal y sistemático durante toda la vida escolar (desde el nivel inicial hasta el bachillerato).",
    "activities": "1. Capacitación al personal docente y autoridades sobre OVP  por subniveles sobre \"Herramientas Proyectos de Vida\"                                                     \n2. Planificar procesos de intereses profesionales y vocacionales para los estudiantes de décimo año EGB para la toma de decisión en la Elección del Bachillerato y Tercer año de Bachillerato entorno a la Oferta de Carreras Profesionales.\n3. Realizar actividades sobre intereses profesionales y vocacionales para los estudiantes de 10mo año EGB y 3ro de Bachilerato. (Eje de Autoconicimiento: Test para la Identificación de Intereses Profesionales y Vocacionales, Eje de información: Feria OVP, Eje de Toma de Decisión: Entrevista Individual).\n4. Realizar la retroalimentación de los resultados de las herramientas aplicadas a los estudiantes.",
    "target_population": "1. Docentes\n2. Estudiantes de 10mo y 3ro BGU jornada matutina y vespertina\n3. Estudiantes de: 10mo año EGB jornada matutina y vespertina.\n4. Estudiantes de: 10mo año EGB jornada matutina y vespertina.",
    "expected_goal_standard": "E.D2.C1.DE6.c.\nImplementa procesos y herramientas de intereses profesionales y vocacionales a estudiantes de forma\nindividual y grupal, en función de los\nlineamientos emitidos por la Autoridad Educativa Nacional.",
    "execution_term": "1. Octubre 2025\n2. Febrero 2025\n3. Marzo, Abril 2026\n4. Abril 2026",
    "supplies_inputs": "1. Registro de asistencia\nRegistro fotográfico\n2. Oficio adjuntando el cronograma de la planificación.\n3. Test para la Identificación de Intereses Profesionales y Vocacionales, Matriz de Toma de Decisión.\n4. Matriz de Toma de Decisión. (hoja de Cuestionario de Toma de Decisiones)",
    "responsible": "",
    "observations": "1. INFORME TÉCNICO DEL CUMPPLIMIENTO AL ESTÁNDAR."
  },
  {
    "id": "item_2",
    "dimension": "DIMENSIÓN: ACOMPAÑAMIENTO Y SEGUIMIENTO PSICOSOCIAL",
    "component": "COMPONENTE : EJE DE ACCIÓN - CONSEJERÍA",
    "action": "AEC 1. Ejecución de estrategias para que las y los estudiantes realicen un proceso de introspección y empoderamiento sobre sus derechos que les permita tomar decisiones con respecto a la construcción de sus proyectos de vida integrales, de manera consciente, corresponsable, libre y autónoma.",
    "activities": "• Facilitar las actividades de sensibilización, diálogo o capacitación sobre los derechos: \n\n1. ENEIS: COLEGIO: Implementación de la Metodología de Recorrido Participativo ESTACIÓN No. 3 EXIGIENDO MIS DERECHOS\nESCUELA: Campaña, Tema: Semáforo Corporal para la prevención de Violencia.\n2. ARCOIRIS DE LA PROTECCIÓN.",
    "target_population": "estudiantes desde Inicial hasta 3ro de Bachillerato",
    "expected_goal_standard": "E.D2.C1.DE7.c.\nGenera, dos actividades de sensibilización, diálogo o capacitación, enfocadas en el ejercicio y la promoción de derechos del estudiantado, en cada grado o curso bajo su responsabilidad, por año lectivo.",
    "execution_term": "1. Noviembre y Diciembre 2025\n2.Febrero y Marzo 2026",
    "supplies_inputs": "1. Oficio y cronograma ,Material de la Estacion_ Registro de Asistencia y fotográfico\n2. Oficio y cronograma ,Material Educomunicacional\nRegistro de Asistencia y fotográfico",
    "responsible": "",
    "observations": "1. INFORME TÉCNICO DEL CUMPPLIMIENTO AL ESTÁNDAR."
  },
  {
    "id": "item_3",
    "dimension": "DIMENSIÓN: ACOMPAÑAMIENTO Y SEGUIMIENTO PSICOSOCIAL",
    "component": "COMPONENTE : EJE DE ACCIÓN - CONSEJERÍA",
    "action": "Asincrónica\nDuración: 2 horas",
    "activities": "Elaboracion de documentos técnicos (informes, registros, material para talleres o capacitaciones, etc)",
    "target_population": "Elaborar documentos técnicos.",
    "expected_goal_standard": "Familias y Estudiantes",
    "execution_term": "PERIODO LECTIVO 2025 -2026",
    "supplies_inputs": "",
    "responsible": "",
    "observations": ""
  },
  {
    "id": "item_4",
    "dimension": "DIMENSIÓN: ACOMPAÑAMIENTO Y SEGUIMIENTO PSICOSOCIAL",
    "component": "COMPONENTE : EJE DE ACCIÓN - PROMOCIÓN Y PREVENCIÓN",
    "action": "AEPP1. Sensibilización a la comunidad educativa sobre la necesidad del acompañamiento socioemocional a la población estudiantil como factor fundamental en la prevención de riesgos psicosociales, fomentando la corresponsabilidad  del personal educativo y las familias en identificar y fortalecer factores protectores.",
    "activities": "1. Establecer espacios para la asesoría individual y/o grupal a docentes tutores sobre los procesos de acompañamiento socioemocional, detección de casos psicosociales.",
    "target_population": "Docentes Tutores",
    "expected_goal_standard": "E.D2.C2.DE8.c.\nAsesorar, dos veces durante el año lectivo, a docentes tutores de cada grado o curso bajo su responsabilidad, sobre la implementación de las recomendaciones para fortalecer el acompañamiento socioemocional en el aula.",
    "execution_term": "todo el año lectivo 2025-2026",
    "supplies_inputs": "1. Registro de asesoramiento  a docentes tutores sobre los procesos de acompañamiento socioemocional  y detección de casos psicosociales. (matriz por docente tutor)",
    "responsible": "",
    "observations": ""
  },
  {
    "id": "item_5",
    "dimension": "DIMENSIÓN: ACOMPAÑAMIENTO Y SEGUIMIENTO PSICOSOCIAL",
    "component": "COMPONENTE : EJE DE ACCIÓN - PROMOCIÓN Y PREVENCIÓN",
    "action": "AEPP2. Asesoramiento a autoridades de las instituciones educativas, para responder a las necesidades de cuidado y autocuidado de los profesionales de la educación.",
    "activities": "Reunión con autoridades para asesoría para brindar herramientas prácticas y generar un espacio de reflexión colectiva a las autoridades escolares sobre cómo promover el cuidado y autocuidado de los profesionales de la educación.",
    "target_population": "Autoridades educativas",
    "expected_goal_standard": "E.D2.C2.DE8.c.\nAsesorar, dos veces durante el año lectivo, a docentes tutores de cada grado o curso bajo su responsabilidad, sobre la implementación de las recomendaciones para fortalecer el acompañamiento socioemocional en el aula.",
    "execution_term": "Septiembre 2025\nDiciembre 2025",
    "supplies_inputs": "Acta de asesoramiento en necesidades de cuidado y autocuidado de los profesionales de la educación",
    "responsible": "",
    "observations": "HECHO"
  },
  {
    "id": "item_6",
    "dimension": "DIMENSIÓN: ACOMPAÑAMIENTO Y SEGUIMIENTO PSICOSOCIAL",
    "component": "COMPONENTE : EJE DE ACCIÓN - PROMOCIÓN Y PREVENCIÓN",
    "action": "AEPP3. Desarrollo de espacios de sensibilización, dialogo, capacitación y asesoramiento para la comunidad educativa, enfocados en prevenir riesgos psicosociales, prácticas discriminatorias y excluyentes a lo largo del proceso educativo, con enfoque de pertinencia territorial y desde la construcción de los escenarios para el ejercicio pleno de los derechos humanos.",
    "activities": "Facilitar talleres de prevención de riesgos psicosociales:\nTEMA:\n-Prevención de Suicidio (COLEGIO)\n-Prevencion de Embarazo\n-ENEIS (COLEGIO)\n\nTEMA:\n-Salud Mental, reconocer las emociones (ESCUELA)\n-ENEIS (ESCUELA)",
    "target_population": "Estudiantes\nDocentes\nFamilias",
    "expected_goal_standard": "E.D2.C2.DE9.c.\nGenerar dos espacios de sensibilización y diálogo, relacionados con las temáticas del eje de promoción y prevención, contemplados en el Plan Estratégico del departamento, con estudiantes de cada grado o curso, con otros profesionales de la institución educativa y con familias, por año lectivo.",
    "execution_term": "todo el año lectivo 2025-2026",
    "supplies_inputs": "Registro de asistencia de familias\nestudiantes\nRegistro de cumplimiento de actividades ENEIS.",
    "responsible": "",
    "observations": "INFORME TÉCNICO DEL CUMPPLIMIENTO AL ESTÁNDAR."
  },
  {
    "id": "item_7",
    "dimension": "DIMENSIÓN: ACOMPAÑAMIENTO Y SEGUIMIENTO PSICOSOCIAL",
    "component": "COMPONENTE : EJE DE ACCIÓN - PROMOCIÓN Y PREVENCIÓN",
    "action": "Asincrónica\nDuración: 2 horas",
    "activities": "Elaboracion de documentos técnicos (informes, registros, material para talleres o capacitaciones, etc)",
    "target_population": "Elaborar documentos técnicos.",
    "expected_goal_standard": "Familias y Estudiantes",
    "execution_term": "PERIODO LECTIVO 2025 -2026",
    "supplies_inputs": "",
    "responsible": "",
    "observations": ""
  },
  {
    "id": "item_8",
    "dimension": "DIMENSIÓN: ACOMPAÑAMIENTO Y SEGUIMIENTO PSICOSOCIAL",
    "component": "COMPONENTE : EJE DE ACCIÓN - INCLUSIÓN SOCIOEDUCATIVA",
    "action": "AEI 1. Acompañamiento en los espacios de orientación y sensibilización a la comunidad educativa, a fin de garantizar la implementación de los procesos de inclusión educativa sostenidos en el tiempo y atendiendo a las particularidades de la población estudiantil en situación de vulnerabilidad.",
    "activities": "1. Charla sobre \"Diversidad Institucional\"  a fin de garantizar la implementación de los procesos de inclusión educativa\n2. Productos Educomunicacionales que atienden a las particularidades de la población estudiantil en situación de vulnerabilidad.",
    "target_population": "Personal docente\nEstudiantes \nFamilias",
    "expected_goal_standard": "E.D2.C3.DE10.c.\nImplementar el Plan de atención y\nseguimiento psicosocial a estudiantes con necesidades educativas específicas asociadas y no asociadas a la discapacidad, derivados desde la Unidad Distrital de Apoyo a la Inclusión o profesionales avalados que emitan un informe\npsicopedagógico.",
    "execution_term": "todo el año lectivo 2025-2026",
    "supplies_inputs": "1. Registro de asistencia y fotográfico de DOCENTES (29 AL 31 DIC)\n2. Productos Educomunicacionales enviados a través de correo institucional a vicerrectorado (captura)",
    "responsible": "",
    "observations": "INFORME TÉCNICO"
  },
  {
    "id": "item_9",
    "dimension": "DIMENSIÓN: ACOMPAÑAMIENTO Y SEGUIMIENTO PSICOSOCIAL",
    "component": "COMPONENTE : EJE DE ACCIÓN - INCLUSIÓN SOCIOEDUCATIVA",
    "action": "AEI 2. Coordinación con la máxima autoridad institucional para la aplicación de medidas de acción afirmativa establecidos para los procesos de inclusión educativa.",
    "activities": "Reuniones de coordinación con la autoridad educativa y el equipo del DECE, orientadas al diseño, implementación y seguimiento de medidas de acción afirmativa en el marco de los procesos de inclusión educativa",
    "target_population": "Autoridad Educativa",
    "expected_goal_standard": "E.D2.C3.DE10.c.\nImplementar el Plan de atención y\nseguimiento psicosocial a estudiantes con necesidades educativas específicas asociadas y no asociadas a la discapacidad, derivados desde la Unidad Distrital de Apoyo a la Inclusión o profesionales avalados que emitan un informe\npsicopedagógico.",
    "execution_term": "todo el año lectivo 2025-2026",
    "supplies_inputs": "Acta de Reunión con rectorado (formato distrito) TEMA:  Coordinación con la máxima autoridad institucional para la aplicación de medidas de acción afirmativa (E.D2.C3.DE10.c.)",
    "responsible": "",
    "observations": "PENDIENTE EL ACTA"
  },
  {
    "id": "item_10",
    "dimension": "DIMENSIÓN: ACOMPAÑAMIENTO Y SEGUIMIENTO PSICOSOCIAL",
    "component": "COMPONENTE : EJE DE ACCIÓN - INCLUSIÓN SOCIOEDUCATIVA",
    "action": "AEI 3. Generación de alertas ante la autoridad educativa institucional o distrital cuando se identifiquen disposiciones, prácticas o cualquier otra situación que pueda afectar los procesos de inclusión en las instituciones educativas. (si el caso lo amerita)",
    "activities": "1. Recepción de fichas de notificación de alerta de estudiantes con necesidades educativas específicas, asociadas y no asociadas a la discapacidad que requiera atención psicosocial (de ser el caso)\n2. Generación de alerta a través de oficio a la máxima autoridad educativa institucional o distrital (si el caso lo amerita)",
    "target_population": "Autoridad Educativa",
    "expected_goal_standard": "E.D2.C3.DE10.c.\nImplementar el Plan de atención y\nseguimiento psicosocial a estudiantes con necesidades educativas específicas asociadas y no asociadas a la discapacidad, derivados desde la Unidad Distrital de Apoyo a la Inclusión o profesionales avalados que emitan un informe\npsicopedagógico.",
    "execution_term": "todo el año lectivo 2025-2026",
    "supplies_inputs": "Ficha de notificación de alerta y Oficio en caso de existir casos de NEE y Riesgo psc",
    "responsible": "",
    "observations": ""
  },
  {
    "id": "item_11",
    "dimension": "DIMENSIÓN: ACOMPAÑAMIENTO Y SEGUIMIENTO PSICOSOCIAL",
    "component": "COMPONENTE : EJE DE ACCIÓN - INCLUSIÓN SOCIOEDUCATIVA",
    "action": "AEI 4. Atención psicosocial prioritaria a estudiantes en situación de doble o múltiple vulnerabilidad.",
    "activities": "1. Elaboración del Plan de Atención y Seguimiento psicosocial.\n2. Implementación del Plan de Atención y Seguimiento psicosocial.\n3. Elaboración de la Ficha de Seguimiento a la atención psicosocial.\n4. Derivación interinstitucional (si el caso lo amerita).",
    "target_population": "Estudiantes",
    "expected_goal_standard": "E.D2.C3.DE10.c.\nImplementar el Plan de atención y\nseguimiento psicosocial a estudiantes con necesidades educativas específicas asociadas y no asociadas a la discapacidad, derivados desde la Unidad Distrital de Apoyo a la Inclusión o profesionales avalados que emitan un informe\npsicopedagógico.",
    "execution_term": "todo el año lectivo",
    "supplies_inputs": "Plan de atención psicosocial para estudiantes NEE + situación de vulnerabilidad (E.D2.C3.DE10.c.)\nFicha de Seguimiento\nFormato de Derivación",
    "responsible": "",
    "observations": ""
  },
  {
    "id": "item_12",
    "dimension": "DIMENSIÓN: ACOMPAÑAMIENTO Y SEGUIMIENTO PSICOSOCIAL",
    "component": "COMPONENTE : EJE DE ACCIÓN - INCLUSIÓN SOCIOEDUCATIVA",
    "action": "AEI 5. En articulación con la Unidad Distrital de Apoyo a la Inclusión, el Departamento de Consejería Estudiantil distrital deberá participar en el asesoramiento a estudiantes y sus familias para definir la oferta educativa que responda a las necesidades de estudiantes con necesidades educativas específicas asociadas y no asociadas a la discapacidad.\"",
    "activities": "Atención integral a representantes legales para brindar la información adecuada en relación con las ofertas educativas, ordinaria y extraordinaria, en conjunto con las profesionales de la UDAI y la DAI, que responda a las necesidades de estudiantes con necesidades educativas específicas, asociadas o no a la discapacidad.",
    "target_population": "Estudiantes y Familias",
    "expected_goal_standard": "E.D2.C3.DE10.c.\nImplementar el Plan de atención y\nseguimiento psicosocial a estudiantes con necesidades educativas específicas asociadas y no asociadas a la discapacidad, derivados desde la Unidad Distrital de Apoyo a la Inclusión o profesionales avalados que emitan un informe\npsicopedagógico.",
    "execution_term": "todo el año lectivo",
    "supplies_inputs": "ACTA DE ASESORAMIENTO A ESTUDIANTES Y FAMILIAS RESPECTO A LA OFERTA EDUCATIVA: ORDINARIA Y EXTRAORDINARIA",
    "responsible": "",
    "observations": ""
  },
  {
    "id": "item_13",
    "dimension": "DIMENSIÓN: ACOMPAÑAMIENTO Y SEGUIMIENTO PSICOSOCIAL",
    "component": "COMPONENTE : EJE DE ACCIÓN - INCLUSIÓN SOCIOEDUCATIVA",
    "action": "AEI 6. En articulación con el Departamento de Inclusión Educativa deberá brindar atención psicosocial a estudiantes con necesidades educativas específicas asociadas y no asociadas a la discapacidad.",
    "activities": "Receptar el informe psicopedagógico de la Unidad Distrital de Apoyo a la Inclusión u otras instituciones, con la respectiva derivación y recomendaciones para la atención psicosocial",
    "target_population": "Estudiantes",
    "expected_goal_standard": "E.D2.C3.DE10.c.\nImplementar el Plan de atención y\nseguimiento psicosocial a estudiantes con necesidades educativas específicas asociadas y no asociadas a la discapacidad, derivados desde la Unidad Distrital de Apoyo a la Inclusión o profesionales avalados que emitan un informe\npsicopedagógico.",
    "execution_term": "todo el año lectivo 2025-2026",
    "supplies_inputs": "Matriz de Registro de Recepción de Informe Psicopedagógico de la UDAI u otras instituciones",
    "responsible": "",
    "observations": ""
  },
  {
    "id": "item_14",
    "dimension": "DIMENSIÓN: ACOMPAÑAMIENTO Y SEGUIMIENTO PSICOSOCIAL",
    "component": "COMPONENTE : EJE DE ACCIÓN - INCLUSIÓN SOCIOEDUCATIVA",
    "action": "Asincrónica\nDuración: 2 horas",
    "activities": "Planificación de actividades realacionadas al nivel, pedagógica y psicosocial.",
    "target_population": "Desarrollar actividades relacionadas al nivel pedagógico y psicosocial.",
    "expected_goal_standard": "Estudiantes\nDocentes\nFamilias y Autoridades educativas",
    "execution_term": "PERIODO LECTIVO 2025 -2026",
    "supplies_inputs": "",
    "responsible": "",
    "observations": ""
  },
  {
    "id": "item_15",
    "dimension": "DIMENSIÓN: ACOMPAÑAMIENTO Y SEGUIMIENTO PSICOSOCIAL",
    "component": "COMPONENTE : EJE DE ACCIÓN - ATENCIÓN PSICOSOCIAL",
    "action": "AEAP 1. Detección por medio de la observación o escucha en los diferentes\nespacios educativos para verificar que las alertas reportadas o identificadas\ntienen relación con una situación de inestabilidad emocional,\nconflictos (individual, escolar, familiar, social, adaptativo), desastre natural,\nvulneración de derechos, o de riesgo psicosocial que pueda afectar el\ndesarrollo integral de las y los estudiantes.",
    "activities": "Mediante la observación y escucha activa en los diferentes espacios educativos intervenciones individuales , grupales , familiares , se identificaran posibles señales de alerta emocional o conflictos. Asi mismo vez ejecutadas las entrevistas socioemocionales, o durante el periodo escolar  se detectarán casos de riesgo psicosocial. Esta información permitirá orientar intervenciones oportunas que favorezcan el desarrollo integral de los estudiantes, para lo cual utilizaremos la ficha de Entrevista y Observación.",
    "target_population": "Estudiantes",
    "expected_goal_standard": "E.D3.C1.DE11.c.\nAplicar dos técnicas y/o\nherramientas para la\ndetección de estudiantes\nque requieren atención\npsicosocial.",
    "execution_term": "todo el año lectivo 2025-2026",
    "supplies_inputs": "ficha de observacion y entrevista",
    "responsible": "",
    "observations": "CREAR"
  },
  {
    "id": "item_16",
    "dimension": "DIMENSIÓN: ACOMPAÑAMIENTO Y SEGUIMIENTO PSICOSOCIAL",
    "component": "COMPONENTE : EJE DE ACCIÓN - ATENCIÓN PSICOSOCIAL",
    "action": "AEAP 2. Desarrollo de la valoración (diagnóstico situacional) que permita\nvisibilizar la historia de vida de cada estudiante que requiera atención\npsicosocial, identificando fortalezas y potencialidades, riesgos y factores\nprotectores, los vínculos afectivos, las diversas problemáticas específicas que pudiere presentar.",
    "activities": "1. Valoración (diagnóstico situacional) para visibilizar la historia de vida a través de la Entrevista Individual, Entrevista para Representantes y Entrevista para Docentes.\n 2.  Se implementará la técnica de Línea de Vida para fortalecer el diagnóstico situacional de los estudiantes que requieran atención psicosocial.",
    "target_population": "Estudiantes",
    "expected_goal_standard": "E.D3.C1.DE11.c.\nAplicar dos técnicas y/o\nherramientas para la\ndetección de estudiantes\nque requieren atención\npsicosocial.",
    "execution_term": "todo el año lectivo 2025-2026",
    "supplies_inputs": "1. Fichas de entrevistas\n2. Actividad Línea de Vida \nLAS DOS TÉCNICAS EN UNA SOLA HOJA",
    "responsible": "",
    "observations": "Del Modelo de Gestión usar las preguntas para cada actor: estudiantes, PPFF y docentes"
  },
  {
    "id": "item_17",
    "dimension": "DIMENSIÓN: ACOMPAÑAMIENTO Y SEGUIMIENTO PSICOSOCIAL",
    "component": "COMPONENTE : EJE DE ACCIÓN - ATENCIÓN PSICOSOCIAL",
    "action": "AEAP 3. Planteamiento y ejecución de estrategias para cada estudiante, y/o\ngrupo de estudiantes, dirigidas a la atención psicosocial de la población\nestudiantil en situación de inestabilidad emocional, conflictos (individual,\nescolar, familiar, social, adaptativo), desastre natural, vulneración de derechos, o de riesgo psicosocial que pueda afectar el desarrollo integral de la población estudiantil.",
    "activities": "Ejecusión del plan de atención psicosocial",
    "target_population": "Estudiantes\nFamilias",
    "expected_goal_standard": "E.D3.C1.DE12.c.\nRealizar la intervención de estudiantes que requieren atención psicosocial.",
    "execution_term": "todo el año lectivo 2025-2026",
    "supplies_inputs": "Ejecusión del plan de atención psicosocial  \nActa de Socialización del caso de estudiantes que requieren  atención psicosocial para la implementación de estrategias (E.D3.C1.DE12.c.)\nMatriz de Riesgos Psicosociales.",
    "responsible": "",
    "observations": "CASOS DE VULNERABILIDAD"
  },
  {
    "id": "item_18",
    "dimension": "DIMENSIÓN: ACOMPAÑAMIENTO Y SEGUIMIENTO PSICOSOCIAL",
    "component": "COMPONENTE : EJE DE ACCIÓN - ATENCIÓN PSICOSOCIAL",
    "action": "AEP 4. Identificación de instancias internas o externas que puedan atender las necesidades de la población estudiantil asociadas a ámbitos especializados\nde atención psicológica, psicopedagógica, de salud o ámbitos\ndisciplinarios, entre otros, a fin de promover, junto con la máxima autoridad de la institución educativa, un proceso de derivación de estudiantes,\noportuno, ágil y articulado.",
    "activities": "Generar un mapeo de instancias internas y externas que contribuyan a la atención de las necesidades de la población estudiantil.",
    "target_population": "Comunidad Educativa",
    "expected_goal_standard": "E.D3.C1.DE12.c.\nRealizar la intervención de estudiantes que requieren atención psicosocial.",
    "execution_term": "Wed Dec 31 2025 19:00:00 GMT-0500 (hora de Ecuador)",
    "supplies_inputs": "matriz datos de actores externos E.D3.C1.DE12.c.",
    "responsible": "",
    "observations": ""
  },
  {
    "id": "item_19",
    "dimension": "DIMENSIÓN: ACOMPAÑAMIENTO Y SEGUIMIENTO PSICOSOCIAL",
    "component": "COMPONENTE : EJE DE ACCIÓN - ATENCIÓN PSICOSOCIAL",
    "action": "AEAP 5. Seguimiento a través de la comunicación frecuente con profesionales,\ninstancias u organismos que han receptado el caso derivado, así\ncomo con la familia del estudiante, con la finalidad de evidenciar el avance\nde las estrategias planteadas tanto desde estas instancias como las planteadas\nen el plan de atención psicosocial.",
    "activities": "1. Registro de Ficha de Seguimiento de la Atención Psicosocial.\n2. Matriz de atención y seguimiento con profesionales e instancias externas.",
    "target_population": "Redes de apoyo externas: \nMSP\nJCPD\nDINAPEN\nFISCALÍA\nHOSPITAL MUNICIPAL \nSISTEMA DE PROTECCIÓN INTEGRAL DEL MINISTERIO DE GOBIERNO\nMIES",
    "expected_goal_standard": "E.D3.C1.DE12.c.\nRealizar la intervención de estudiantes que requieren atención psicosocial.",
    "execution_term": "todo el año lectivo",
    "supplies_inputs": "1. ficha de seguimiento individual\n2. Registro  de atención y seguimiento con profesionales e instancias externas. (E.D3.C1.DE12.c.)",
    "responsible": "",
    "observations": ""
  },
  {
    "id": "item_20",
    "dimension": "DIMENSIÓN: ACOMPAÑAMIENTO Y SEGUIMIENTO PSICOSOCIAL",
    "component": "COMPONENTE : EJE DE ACCIÓN - ATENCIÓN PSICOSOCIAL",
    "action": "AERP 6. Asesoramiento a la máxima autoridad institucional en la implementación\nde medidas para la reparación establecidas por autoridades administrativas o judiciales competentes al interior de la institución educativa, a la par del cumplimiento de las rutas y protocolos correspondientes.",
    "activities": "Asesorar a la máxima autoridad para la implementacion de medidas de reparación ante casos prioritarios.",
    "target_population": "Autoridad Educativa",
    "expected_goal_standard": "E.D3.C1.DE13.c. Implementar las acciones\ncontempladas en el Plan\nde acompañamiento y\nrestitución a víctimas de\nviolencia.",
    "execution_term": "todo el año lectivo 2025-2026",
    "supplies_inputs": "Acta de Asesoramiento  a la máxima autoridad para la implementacion de medidas de reparación ante casos prioritarios. E.D3.C1.DE13.c.",
    "responsible": "",
    "observations": "OJO: CUANDO VENGAN MEDIDAS DE JCPD SE DEBE HACER EL ACTA A LA AUTORIDAD CON LAS MEDIDAS DE PROTECCIÓN"
  },
  {
    "id": "item_21",
    "dimension": "DIMENSIÓN: ACOMPAÑAMIENTO Y SEGUIMIENTO PSICOSOCIAL",
    "component": "COMPONENTE : EJE DE ACCIÓN - ATENCIÓN PSICOSOCIAL",
    "action": "AERP 7. Desarrollo de espacios de sensibilización, asesoramiento y reflexión con miembros de la comunidad educativa, en relación con las acciones de reparación a implementar, para evitar que situaciones de violencia u otros riesgos psicosociales presentados en la institución educativa\nse repitan, así como evitar la generación de acciones de revictimización.",
    "activities": "Sensibilización y asesoramiento a miembros de la comunidad educativa, para evitar que situaciones de violencia u otros riesgos psicosociales presentados en la institución educativa\nse repitan, así como evitar la generación de acciones de revictimización.\nDOCENTES:  TALLER DE RUTAS DE RIESGOS PSICOSOCIALES Y VIOLENCIA \nPPFF: TALLER CON COMITÉ DE PPFF \nESTUDIANTES: TALLER DE RUTAS Y PROTOCOLOS",
    "target_population": "Comunidad Educativa",
    "expected_goal_standard": "E.D3.C1.DE13.c. Implementar las acciones\ncontempladas en el Plan\nde acompañamiento y\nrestitución a víctimas de\nviolencia.",
    "execution_term": "septiembre a diciembre 2025",
    "supplies_inputs": "DOCENTES: YA SE DIO EL TALLER DE RUTAS DE RIESGOS PSICOSOCIALES Y VIOLENCIA (OJO)\nPPFF: COMITÉ DE PPFF SERÁN SENSIBILIZADOS Y ELLOS A SU VEZ LO HARÁN EN SUS CURSOS.\nESTUDIANTES: TALLER DE RUTAS Y PROTOCOLOS REGISTROS DE ASISTENCIA.",
    "responsible": "",
    "observations": "INFORME TÉCNICO DEL TALLER A PPFF Y RUTAS DE VIOLENCIA A ESTUDIANTES, QUE YA SE HA DADO."
  },
  {
    "id": "item_22",
    "dimension": "DIMENSIÓN: ACOMPAÑAMIENTO Y SEGUIMIENTO PSICOSOCIAL",
    "component": "COMPONENTE : EJE DE ACCIÓN - ATENCIÓN PSICOSOCIAL",
    "action": "AERP 8. Asesoramiento a la máxima autoridad institucional en el cumplimiento de las disposiciones establecidas por unidades judiciales, juntas de protección de derechos o juntas distritales de resolución de conflictos u otras autoridades competentes, y, alertarla sobre situaciones que puedan\nconstituir un riesgo para el proceso de reparación de la víctima.",
    "activities": "Asesorar a la máxima autoridad el cumplimiento de las disposiciones establecidas por entidades competentes .",
    "target_population": "Autoridad Educativa",
    "expected_goal_standard": "E.D3.C1.DE13.c. Implementar las acciones\ncontempladas en el Plan\nde acompañamiento y\nrestitución a víctimas de\nviolencia.",
    "execution_term": "todo el año lectivo",
    "supplies_inputs": "Acta de Asesoramiento  a la máxima autoridad sobre el cumplimiento a las disposiciones establecidas por unidades judiciales, juntas de protección de derechos o juntas distritales de resolución de conflictos u otras autoridades competentes. E.D3.C1.DE13.c.",
    "responsible": "",
    "observations": "OJO: CUANDO VENGAN DISPOSICIONES DE OTRAS ENTIDADES SE DEBE HACER EL ACTA A LA AUTORIDAD"
  },
  {
    "id": "item_23",
    "dimension": "DIMENSIÓN: ACOMPAÑAMIENTO Y SEGUIMIENTO PSICOSOCIAL",
    "component": "COMPONENTE : EJE DE ACCIÓN - ATENCIÓN PSICOSOCIAL",
    "action": "Asincrónica\nDuración: 2 horas",
    "activities": "Planificación de actividades realacionadas a la atención psicosocial",
    "target_population": "Ejecutar para cada estudiante y/o grupo de estudiantes, dirigidas a la atención psicosocial.\nElaborar derivaciones a entidades internas o externas.",
    "expected_goal_standard": "Estudiantes\nDocentes\nFamilias y Autoridades educativas",
    "execution_term": "PERIODO LECTIVO 2025 -2026",
    "supplies_inputs": "",
    "responsible": "",
    "observations": ""
  },
  {
    "id": "item_24",
    "dimension": "DIMENSIÓN: GESTIÓN DOCUMENTAL",
    "component": "COMPONENTE : INFORMACIÓN Y COMUNICACIÓN",
    "action": "Dimensión Individual:                                                      *Eje consejería\n*Eje de Promoción y prevención\n*Eje de Atención Psicosocial                                                                                        *Eje Inclusión Socioeducativa",
    "activities": "1.Elaborar la ficha de datos informativos de los estudiantes asignados                                                             \n 2.Elaborar los documentos técnicos que respalden los procesos realizados en función de los ejes de\nacción de consejería; promoción y prevención; inclusión socioeducativa; atención psicosocial.\n3.Actualizar los expedientes de bienestar de estudiantes a su cargo, en función de los ejes de acción: consejería; promoción y prevención; inclusión socioeducativa; atención psicosocial.",
    "target_population": "Estudiantes",
    "expected_goal_standard": "E.D1.C1.DE1.d.\nElaborar documentos sobre los procesos\nde acompañamiento y seguimiento\npsicosocial a la población estudiantil,\ncorrespondientes a los 4 ejes de acción\ndel Departamento de Consejería Estudiantil.",
    "execution_term": "Todo el año lectivo 2025-2026",
    "supplies_inputs": "1.- FICHA ESTUDIANTIL \n2.- INFORMES TECNICOS\n3.- TODOS LOS EXPEDIENTES DE BIENESTAR ESTUDIANTIL (PG 124 DEL MODELO DE GESTION DECE)",
    "responsible": "",
    "observations": ""
  },
  {
    "id": "item_25",
    "dimension": "DIMENSIÓN: GESTIÓN DOCUMENTAL",
    "component": "COMPONENTE : INFORMACIÓN Y COMUNICACIÓN",
    "action": "Dimensión Individual:                                                              *Eje consejería\n*Eje de Promoción y prevención\n*Eje de Atención Psicosocial                                                                                        *Eje Inclusión Socioeducativa",
    "activities": "1.Anexar la ficha de reporte de hecho de violencia y/o notificación de alerta al expediente de bienestar\nestudiantil.\n2.Anexar al expediente de bienestar estudiantil una copia u original de la denuncia o notificación\npuesta en conocimiento de las autoridades competentes.\n3.Agregar la ficha de consentimiento informado, el plan de acompañamiento y restitución y la ficha\nde derivación en el expediente de bienestar estudiantil.\n4.Actualizar los datos en el Sistema de Registro de Casos de Riesgo Psicosocial con los datos requeridos: número de trámite en Fiscalía.",
    "target_population": "Estudiantes",
    "expected_goal_standard": "E.D1.C1.DE2.c.\nActualizar mensualmente el Registro de Casos\nde Riesgo Psicosocial de acuerdo con los\ncasos presentados en la  institución educativa.",
    "execution_term": "Todo el año lectivo 2025-2026",
    "supplies_inputs": "1.-Ficha de reporte de hecho de violencia o ficha de notificaión de alerta al expediente estudiantil\n2.- Oficio de la denuncia a entidades externas.\n3.-Consentimiento informado, plan de acompañamiento,ficha de derivacion. \n4.- Matriz de riesgos psicososiales (drive)",
    "responsible": "",
    "observations": ""
  },
  {
    "id": "item_26",
    "dimension": "DIMENSIÓN: GESTIÓN DOCUMENTAL",
    "component": "COMPONENTE : INFORMACIÓN Y COMUNICACIÓN",
    "action": "Asincrónica                                            Duración : 2 horas",
    "activities": "Elaborar documentos sobre los procesos de acompañamiento,  seguimiento, registro psicosocial a la población estudiantil.\n1. Expedientes estudiantiles     \n 2. Informes técnicos que respalden los procesos realizados en función de los ejes de acción de consejería; promoción y prevención; inclusión socioeducativa; atención psicosocial.                          \n3. Matriz de Riesgo Psicosocial",
    "target_population": "Actualización de documentos sobre los procesos de acompañamiento psicosocial",
    "expected_goal_standard": "Comunidad educativa",
    "execution_term": "Periodo lectivo                                              2025 -2026",
    "supplies_inputs": "",
    "responsible": "",
    "observations": ""
  },
  {
    "id": "item_27",
    "dimension": "DIMENSIÓN: GESTIÓN DOCUMENTAL",
    "component": "COMPONENTE : INFORMACIÓN Y COMUNICACIÓN",
    "action": "Asincrónica                                            Duración : 2 horas",
    "activities": "Elaborar documentos sobre los procesos de acompañamiento,  seguimiento, registro psicosocial a la población estudiantil.\n1. Expedientes estudiantiles     \n 2. Informes técnicos que respalden los procesos realizados en función de los ejes de acción de consejería; promoción y prevención; inclusión socioeducativa; atención psicosocial.                          \n3. Matriz de Riesgo Psicosocial",
    "target_population": "Actualización de documentos sobre los procesos de acompañamiento psicosocial",
    "expected_goal_standard": "Comunidad educativa",
    "execution_term": "Periodo lectivo                                              2025 -2026",
    "supplies_inputs": "",
    "responsible": "",
    "observations": ""
  },
  {
    "id": "item_28",
    "dimension": "DIMENSIÓN: GESTIÓN",
    "component": "COMPONENTE : INFORMACIÓN Y COMUNICACIÓN",
    "action": "Dimensión Escolar: \n*Eje consejería\n*Eje de Promoción y prevención\n*Eje de Atención Psicosocial                                                                                        *Eje Inclusión Socioeducativa",
    "activities": "1.Elaborar un la ficha de seguimiento de la atención psicosocial. realizadas con los estudiantes del grado o curso.\n2.Identificar las alertas para atención psicosocial de estudiantes, que los docentes dan a conocer en la Junta de Docentes de Grado o Curso, mediante un informe escrito, según la connotación del caso.\n3.Elaborar informe técnico para reportar las acciones realizadas de acompañamiento y seguimiento psicosocial y el asesoramiento a docentes sobre las necesidades que tienen los estudiantes en el ámbito del acompañamiento socioemocional y de notificación oportuna de casos de atención psicosocial.",
    "target_population": "Docentes",
    "expected_goal_standard": "E.D1.C2.DE3.c.\nReportar, de manera específica, en la Junta de Docentes de Grado o Curso, las acciones tomadas a fin de garantizar la accesibilidad y exigibilidad de los derechos de la población estudiantil.",
    "execution_term": "Todo el año lectivo 2025-2026",
    "supplies_inputs": "1. ficha de seguimiento de la atención psicosocial.\n2. ACTA DE IDENTIFICACIÓN DE ALERTAS\n3. Informe Técnico PARA LA JUNTA DE CURSO",
    "responsible": "",
    "observations": ""
  },
  {
    "id": "item_29",
    "dimension": "DIMENSIÓN: GESTIÓN",
    "component": "COMPONENTE : INFORMACIÓN Y COMUNICACIÓN",
    "action": "Dimensión Escolar: \n*Eje consejería\n*Eje de Promoción y prevención\n*Eje de Atención Psicosocial                                                                                        *Eje Inclusión Socioeducativa",
    "activities": "1.Planificar la socialización de políticas, lineamientos, planes, programas y estrategias.\n2. Socializar políticas, lineamientos, planes, programas y estrategias inherentes a las funciones del Departamento de Consejería Estudiantil, a través de varios espacios en coordinación con la Red Distrital de Departamentos de Consejería Estudiantil.",
    "target_population": "Docentes\nAutoridades",
    "expected_goal_standard": "E.D1.C2.DE4.c.\nGenerar dos espacios en el año lectivo para la socialización de políticas, lineamientos, planes, programas y estrategias inherentes a las funciones del Departamento de Consejería Estudiantil.",
    "execution_term": "Todo el año lectivo 2025-2026",
    "supplies_inputs": "1. Oficio con la planificación (cronograma) de capacitaciones a docentes.\n2. Socialización, charla, capacitación a docentes (Registro de asistencia)\n3. Informe técnico de la capacitación",
    "responsible": "",
    "observations": "INFORME TÉCNICO DEL CUMPLIMIENTO AL ESTÁNDAR"
  },
  {
    "id": "item_30",
    "dimension": "DIMENSIÓN: GESTIÓN",
    "component": "COMPONENTE : INFORMACIÓN Y COMUNICACIÓN",
    "action": "Asincrónica\nDuración: 2 horas",
    "activities": "Elaborar un informe técnico que consolide las acciones de acompañamiento y seguimiento psicosocial implementadas con los estudiantes, las alertas identificadas y reportadas por los docentes en las Juntas de Grado o Curso",
    "target_population": "Registrar y reportar las acciones de acompañamiento psicosocial, las alertas identificadas por docentes en Juntas de Grado y el asesoramiento brindado.\nOrientar a los docentes en la atención socioemocional y la notificación oportuna de casos.\nGarantizar un seguimiento integral y documentado a las situaciones psicosociales del estudiantado",
    "expected_goal_standard": "Docentes y  Autoridades educativas",
    "execution_term": "Todo el año lectivo 2025-2026",
    "supplies_inputs": "",
    "responsible": "",
    "observations": ""
  },
  {
    "id": "item_31",
    "dimension": "DIMENSIÓN: GESTIÓN",
    "component": "COMPONENTE : INFORMACIÓN Y COMUNICACIÓN",
    "action": "Asincrónica\nDuración: 2 horas",
    "activities": "1.Planificar  actividades y preparacion de material para la socializacion de lineamientos, planes, programas, y estrategias del DECE. \n2.Elaboracion de informe tecnico del estandar cumplido.",
    "target_population": "Ejecutar las actividades planificadas para la socializacion de las actividades DECE",
    "expected_goal_standard": "Docentes y  Autoridades educativas",
    "execution_term": "Todo el año lectivo 2025-2026",
    "supplies_inputs": "",
    "responsible": "",
    "observations": ""
  },
  {
    "id": "item_32",
    "dimension": "DIMENSIÓN: GESTIÓN",
    "component": "COMPONENTE : GESTIÓN ORGANIZACIONAL",
    "action": "Dimensión Comunitaria: \n*Eje consejería\n*Eje de Promoción y prevención\n*Eje de Atención Psicosocial                                                                                        *Eje Inclusión Socioeducativa",
    "activities": "1.Elaboración del plan de acción DECE                                               2.Ejecutar seguimiento y ajustes al plan de acción DECE",
    "target_population": "DECE",
    "expected_goal_standard": "E.D1.C3.DE5.\nEjecutar el Plan de Acción del Departamento de\nConsejería Estudiantil.",
    "execution_term": "octubre 2025\ndiciembre 2025, marzo, junio 2026",
    "supplies_inputs": "PLAN DE ACCIÓN",
    "responsible": "",
    "observations": "MONITOREAR EL CUMPLIMIENTO DE LAS ACTIVIDADES"
  },
  {
    "id": "item_33",
    "dimension": "DIMENSIÓN: CONVIVENCIA",
    "component": "COMPONENTE : TRABAJO EN RED",
    "action": "La articulación en la gestión del departamento de Consejería Estudianti:\n*Articulación entre departamentos\nde consejería estudiantil\n*Articulación con otros profesionales y organismos\nde la institución educativa\n*Articulación con agentes externos\na la institución educativa",
    "activities": "Asesorar a la máxima autoridad sobre la generación de estrategias enmarcadas en una cultura de paz y no violencia.",
    "target_population": "Autoridad Educativa \nProfesionales externos o internos.",
    "expected_goal_standard": "E.D4.C1.DE14.c.\nAsesorar a la autoridad institucional y a las instancias de solución alternativa de conflictos de las instituciones educativas en la generación de   estrategias enmarcadas en una cultura de paz y\nno violencia.",
    "execution_term": "Todo el año lectivo 2025-2026",
    "supplies_inputs": "ACTAS DE REUNIÓN.",
    "responsible": "",
    "observations": ""
  },
  {
    "id": "item_34",
    "dimension": "DIMENSIÓN: CONVIVENCIA",
    "component": "COMPONENTE : TRABAJO EN RED",
    "action": "Asincrónica\nDuración: 2 horas",
    "activities": "Vistas externas redes de apoyo interinstitucionales \nAcompañamiento extramural",
    "target_population": "Gestionar reuniones con las redes de apoyo interinstitucionales ,                      Realizar el seguimiento con las instituciones externas.",
    "expected_goal_standard": "UDAI, Dece distrital, MSP,  Junta Cantonal para la Protección de Derechos de Ambato, DINAPEN, Fiscalía.",
    "execution_term": "Todo el año lectivo 2025-2026",
    "supplies_inputs": "",
    "responsible": "",
    "observations": ""
  }
];

export function getDefaultActionPlanItems(
  institutionalDeceName?: string,
  coordinatorName?: string
): ActionPlanItem[] {
  const year = currentSchoolYearText();
  return DEFAULT_ACTION_PLAN_ITEMS.map((item, idx) => {
    return {
      ...item,
      // El año lectivo de la plantilla se actualiza al año en curso.
      execution_term: (item.execution_term || "").replace(/20\d{2}\s*-?\s*20\d{2}/g, year),
      id:
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : "plan_item_" + (idx + 1) + "_" + Date.now(),
      responsible: "", // No hay asignación automática; el usuario escoge si es TODOS o un profesional
    };
  });
}

export function parseActionPlanItems(raw: any): ActionPlanItem[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function parseActionPlanAnalysts(raw: any): ActionPlanAnalyst[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function parseActionPlanSignatories(raw: any): ActionPlanSignatory[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function calculatePlanStats(items: ActionPlanItem[]) {
  const dimensions = new Set<string>();
  const components = new Set<string>();
  let activitiesCount = 0;
  let itemsWithResponsible = 0;
  let itemsWithSupplies = 0;

  for (const item of items) {
    if (item.dimension) dimensions.add(item.dimension);
    if (item.component) components.add(item.component);
    if (item.activities?.trim()) {
      const lines = item.activities.split('\n').filter(l => l.trim().length > 0);
      activitiesCount += lines.length > 0 ? lines.length : 1;
    }
    if (item.responsible?.trim()) itemsWithResponsible++;
    if (item.supplies_inputs?.trim()) itemsWithSupplies++;
  }

  return {
    totalItems: items.length,
    dimensionsCount: dimensions.size,
    componentsCount: components.size,
    activitiesCount,
    itemsWithResponsible,
    itemsWithSupplies,
    completionPercent: items.length > 0 ? Math.round((itemsWithResponsible / items.length) * 100) : 0
  };
}
