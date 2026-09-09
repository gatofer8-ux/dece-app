// Catálogo y textos fijos para el Acta de Socialización de Estudiantes en
// Situación de Vulnerabilidad, transcrito de la plantilla institucional.

// Base legal citada en el formato oficial (transcrita verbatim).
export const NORMATIVE_TEXT = `REGLAMENTO GENERAL DE LA LEY ORGÁNICA DE EDUCACIÓN INTERCULTURAL
CAPÍTULO II PROTECCIÓN Y MONITOREO DE CASOS Artículo 331.- Actores. – Son responsables de la protección de derechos de niñas, niños y adolescentes, con especial énfasis de aquellos en situación de vulnerabilidad, todos los miembros de la comunidad educativa.

LEY ORGÁNICA DE EDUCACIÓN INTERCULTURAL
LOEI-Art: 11-Obligaciones de las y los docentes, literal s: respetar y proteger la integridad física, psicológica, emocional y sexual de las y los estudiantes y demás miembros de la comunidad educativa, y denunciar de conformidad con los protocolos establecidos y demás normativas aplicables.`;

export const CONFIDENTIALITY_TEXT = `En atención al Interés Superior de niñas, niños y adolescentes, consagrado en el artículo 44 de la Constitución de la República del Ecuador, los datos de carácter personal de los estudiantes que consten en los registros de información a cargo de las instituciones educativas y/o de la Autoridad Educativa Nacional, deben ser manejados como confidenciales y respetando la intimidad e integridad física y emocional de niñas, niños y adolescentes, salvo que el titular de esa información o su representante legal, en caso de menores de edad, autorice expresamente su difusión para fines estadísticos y de protección de los propios menores.

*La información registrada en este documento es confidencial (Código Orgánico de la Niñez y la Adolescencia)`;

// Acuerdos base (genéricos, reutilizables) tal como aparecen en la plantilla
// institucional. Se cargan por defecto en el formulario y se pueden editar
// o quitar; el usuario puede además agregar acuerdos adicionales propios del caso.
export const DEFAULT_AGREEMENTS = [
  "Mantenerse en comunicación frecuente con la familia del adolescente para informar sobre el avance académico, emocional y comportamental y las medidas de adaptación implementadas al adolescente.",
  "Evitar la discriminación o la emisión de juicios de valor inadecuados con respecto a su condición de vulnerabilidad, más bien incitar o motivar a la superación.",
  "El equipo docente debe fomentar la comunicación con el DECE, a fin de asegurar un trabajo en equipo en búsqueda de un mayor bienestar del estudiante.",
  "Notificar al Departamento de Consejería Estudiantil y representante legal en caso de identificar dificultades a nivel comportamental, emocional o académico, de manera oportuna en garantía de su integridad física y emocional favoreciendo su permanencia, continuidad y culminación de su proceso educativo.",
  'En caso de que los estudiantes requieran refuerzo pedagógico, aplicarlo según la normativa legal vigente: ACUERDO Nro. MINEDUC-MINEDUC-2024-00031-A "NORMATIVA PARA REGULAR LOS PROCESOS DE EVALUACIÓN EDUCATIVA Y LOS PROCESOS ORGANIZACIONALES DE LAS INSTITUCIONES EDUCATIVAS DE TODOS LOS SOSTENIMIENTOS DEL SISTEMA NACIONAL DE EDUCACIÓN"',
];

export const CURRICULAR_ADAPTATION_TEXT =
  'En el Art. 160 de RLOEI sobre Necesidades educativas específicas no asociadas a la discapacidad se consideran como necesidades educativas específicas no asociadas a la discapacidad las siguientes: "…2. Situaciones de vulnerabilidad…", por lo cual se recomienda aplicar adaptaciones curriculares Grado';

export interface TeacherSignatureEntry {
  asignatura: string;
  docente: string;
}

export function parseJsonArray<T>(json: string): T[] {
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
