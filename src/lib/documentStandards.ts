/**
 * Codificación de documentos según los Estándares de Calidad DECE.
 *
 * Fuente única de verdad: qué estándar(es) evidencia cada tipo de documento.
 * Se usa en el membrete de las vistas de impresión (DocumentHeader) y en los
 * exportes a Word, y alimenta la auditoría de cobertura de estándares.
 *
 * Fuente oficial: "Estándares e Indicadores de Calidad Educativa – Profesionales
 * del Departamento de Consejería Estudiantil" (Mineduc, 2025), pp. 5-27.
 *
 * Estructura del código  E.D3.C1.DE12.c :
 *   E.    estándar
 *   D3    dimensión: D1 Gestión · D2 Acompañamiento y Seguimiento Psicosocial ·
 *         D3 Protección Integral · D4 Convivencia
 *   C1    componente dentro de la dimensión (D1: Gestión Documental, Información
 *         y Comunicación, Gestión Organizacional · D2: Consejería, Promoción y
 *         Prevención, Inclusión Socioeducativa · D3: Atención Psicosocial ·
 *         D4: Trabajo en Red)
 *   DE12  desempeño esperado: el estándar mismo, numerado 1-14 en todo el marco
 *   .c    nivel de logro: a No cumple · b En proceso · c Satisfactorio · d Destacado
 *
 * Convención (tomada de los registros físicos del departamento): se imprime el
 * código base del estándar (E.D3.C1.DE12.) seguido de su enunciado en tercera
 * persona, tal como aparece en la columna ESTÁNDAR del documento oficial. La
 * letra de nivel NO se imprime en el documento; sigue en DECE_QUALITY_STANDARDS
 * para el Plan de Acción.
 *
 * La asignación documento -> estándar sale de los "insumos / medios de
 * verificación" que ya declara la plantilla oficial del Plan de Acción
 * (actionPlan.ts), para que lo impreso y lo planificado digan lo mismo.
 */

/** Enunciado impreso de cada estándar (tercera persona), por código base. */
export const STANDARD_PRINT_TEXT: Record<string, string> = {
  "E.D1.C1.DE1": "Elabora documentos sobre los procesos de acompañamiento y seguimiento psicosocial a la población estudiantil, correspondientes a los ejes de acción del Departamento de Consejería Estudiantil.",
  "E.D1.C1.DE2": "Actualiza mensualmente el Registro de Casos de Riesgo Psicosocial de acuerdo con los casos presentados en la institución educativa.",
  "E.D1.C2.DE3": "Reporta, de manera específica, en la Junta de Docentes de Grado o Curso, las acciones tomadas a fin de garantizar la accesibilidad y exigibilidad de los derechos de la población estudiantil.",
  "E.D1.C2.DE4": "Genera dos espacios en el año lectivo para la socialización de políticas, lineamientos, planes, programas y estrategias inherentes a las funciones del Departamento de Consejería Estudiantil.",
  "E.D1.C3.DE5": "Ejecuta el Plan de Acción del Departamento de Consejería Estudiantil.",
  "E.D2.C1.DE6": "Implementa procesos y herramientas de intereses profesionales y vocacionales a estudiantes de forma individual y grupal, en función de los lineamientos emitidos por la Autoridad Educativa Nacional.",
  "E.D2.C1.DE7": "Genera actividades de sensibilización, diálogo o capacitación, enfocadas en el ejercicio y la promoción de derechos del estudiantado, en cada grado o curso bajo su responsabilidad, por año lectivo.",
  "E.D2.C2.DE8": "Asesora a docentes tutores de cada grado o curso bajo su responsabilidad, sobre la implementación de las recomendaciones para fortalecer el acompañamiento socioemocional en el aula.",
  "E.D2.C2.DE9": "Genera espacios de sensibilización y diálogo, relacionados con las temáticas del eje de promoción y prevención, contemplados en el Plan Estratégico del departamento, con estudiantes de cada grado o curso, con otros profesionales de la institución educativa y con familias, por año lectivo.",
  "E.D2.C3.DE10": "Implementa el Plan de atención y seguimiento psicosocial a estudiantes con necesidades educativas específicas asociadas y no asociadas a la discapacidad, derivados desde la Unidad Distrital de Apoyo a la Inclusión o profesionales avalados que emitan un informe psicopedagógico.",
  "E.D3.C1.DE11": "Aplica técnicas y/o herramientas para la detección de estudiantes que requieren atención psicosocial.",
  "E.D3.C1.DE12": "Realiza la intervención de estudiantes que requieren atención psicosocial.",
  "E.D3.C1.DE13": "Implementa las acciones contempladas en el Plan de acompañamiento y restitución a víctimas de violencia.",
  "E.D4.C1.DE14": "Asesora a la autoridad institucional y a las instancias de solución alternativa de conflictos de las instituciones educativas, en la generación de estrategias enmarcadas en una cultura de paz y no violencia.",
};

/**
 * Tipo de documento -> códigos base de estándar, el principal primero.
 * Varios códigos en un mismo documento es normal (p. ej. el Registro de
 * atención evidencia DE1 y DE12).
 */
export const DOCUMENT_STANDARDS = {
  // Gestión documental (D1)
  ficha_estudiantil: ["E.D1.C1.DE1"],
  expediente_caso: ["E.D1.C1.DE1"],
  checklist_expediente: ["E.D1.C1.DE1"],
  informe_situacional: ["E.D1.C1.DE1"],
  informe_cierre: ["E.D1.C1.DE1"],
  informe_acompanamiento: ["E.D3.C1.DE13"],
  registro_atencion_diaria: ["E.D1.C1.DE1", "E.D3.C1.DE12"],
  registro_atencion_docentes_autoridades: ["E.D1.C1.DE1", "E.D2.C2.DE8", "E.D4.C1.DE14"],
  alerta_notificacion: ["E.D1.C1.DE2"],
  hecho_violencia: ["E.D1.C1.DE2", "E.D3.C1.DE13"],
  informe_bimensual: ["E.D3.C1.DE13", "E.D1.C1.DE2"],
  acta_identificacion_alertas: ["E.D1.C2.DE3"],
  // El Word de la junta ya imprime este código en su propia celda "Estándar" (docxJuntasCurso.ts).
  junta_curso: ["E.D1.C2.DE3"],
  plan_accion: ["E.D1.C3.DE5"],
  plan_estrategico: ["E.D1.C3.DE5", "E.D2.C2.DE9"],
  informe_gestion: ["E.D1.C3.DE5"],
  // Acompañamiento psicosocial (D2)
  ovp: ["E.D2.C1.DE6"],
  eneis: ["E.D2.C2.DE9"],
  // Atención psicosocial (D3)
  ficha_observacion: ["E.D3.C1.DE11", "E.D3.C1.DE12"],
  entrevista_estudiante: ["E.D3.C1.DE11", "E.D3.C1.DE12"],
  entrevista_representante: ["E.D3.C1.DE11", "E.D3.C1.DE12"],
  plan_atencion: ["E.D3.C1.DE12"],
  ficha_seguimiento: ["E.D3.C1.DE12"],
  acta_socializacion: ["E.D3.C1.DE12"],
  acta_corresponsabilidad: ["E.D3.C1.DE12"],
  derivacion: ["E.D3.C1.DE12"],
  esquela_citacion: ["E.D3.C1.DE12"],
  plan_restitucion: ["E.D3.C1.DE13"],
  // Convivencia (D4)
  acta_reunion: ["E.D4.C1.DE14"],
  circulo_restaurativo: ["E.D4.C1.DE14", "E.D3.C1.DE12"],
} as const satisfies Record<string, readonly string[]>;

export type DocumentKind = keyof typeof DOCUMENT_STANDARDS;

export interface DocumentStandardLine {
  /** Código base impreso, p. ej. "E.D3.C1.DE12." (con el punto final, como en el registro físico). */
  code: string;
  text: string;
}

/**
 * El estándar que evidencia una actividad/taller depende de su eje, no del
 * tipo de documento (el informe de talleres es el mismo para los tres).
 */
export const ACTIVITY_AXIS_STANDARDS: Record<"PROMOCION" | "PREVENCION" | "CONVIVENCIA", readonly string[]> = {
  PROMOCION: ["E.D2.C1.DE7"],
  PREVENCION: ["E.D2.C2.DE9"],
  CONVIVENCIA: ["E.D4.C1.DE14"],
};

function toLines(codes: readonly string[]): DocumentStandardLine[] {
  return codes.map((base) => ({ code: `${base}.`, text: STANDARD_PRINT_TEXT[base] }));
}

/** El registro de atención diaria evidencia estándares distintos según a quién se atiende. */
export function attentionRegisterKind(attendeeType: "ESTUDIANTE" | "REPRESENTANTE" | "DOCENTE_AUTORIDAD"): DocumentKind {
  return attendeeType === "DOCENTE_AUTORIDAD" ? "registro_atencion_docentes_autoridades" : "registro_atencion_diaria";
}

export function getDocumentStandards(kind: DocumentKind): DocumentStandardLine[] {
  return toLines(DOCUMENT_STANDARDS[kind]);
}

export function getActivityStandards(axis: keyof typeof ACTIVITY_AXIS_STANDARDS): DocumentStandardLine[] {
  return toLines(ACTIVITY_AXIS_STANDARDS[axis]);
}

/** Líneas de texto plano "CÓDIGO. Enunciado" (para Word y exportes). */
export function getDocumentStandardTexts(kind: DocumentKind): string[] {
  return getDocumentStandards(kind).map((s) => `${s.code} ${s.text}`);
}

/**
 * Quita la letra de nivel de logro (".c", ".d"...) de los códigos de estándar
 * de un texto. En los documentos va solo el código base: el nivel lo determina
 * el auditor, no quien elabora el documento.
 */
export function stripStandardLevel(text: string): string {
  return text.replace(/(E\.D\d\.C\d\.DE\d+)\.[a-dA-D]\b/g, "$1");
}
