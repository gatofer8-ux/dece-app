import { db } from "./db";
import type {
  CourseBoardReportRow,
  CourseBoardReportCaseItem,
  Trimester,
  Role,
  UserCoverage,
  StudentRow,
  CaseFileRow,
} from "./types";
import { RISK_TYPE_LABELS } from "./types";
import { getSelectedSchoolYear } from "./schoolYear";

export const DEFAULT_ANTECEDENTES = (trimesterLabel: string, schoolYearText: string) =>
  `En Concordancia al ACUERDO Nro. MINEDUC-MINEDUC-2024-00066-A sobre la JUNTA DE DOCENTES DE GRADO O CURSO Art. 15.- Junta de Docentes de Grado o Curso.- Es el organismo institucional encargado de analizar, dentro y fuera de las horas pedagógicas, el desempeño educativo estudiantil; propondrá estrategias educativas a ser aplicadas a los/as estudiantes, ya sea de forma individual o colectiva, para alcanzar los objetivos de aprendizaje de los grados o cursos correspondientes a los niveles y subniveles educativos. Este organismo estará presidido por el/la docente tutor/a del grado o curso, que será el/la docente designado/a por la máxima autoridad de la institución educativa al inicio de cada año lectivo, a fin de acompañar al grupo de estudiantes y cumplir con las funciones establecidas en la normativa vigente. Art. 16.- Conformación de la Junta de Docentes de Grado o Curso.- Estará conformada por: 1. Docente tutor/a del grado o curso correspondiente, que asumirá las funciones de presidente/a; 2. Totalidad de docentes de un mismo grado o curso; y, 3. Un/a (1) representante del Departamento de Consejería Estudiantil de la institución educativa, en caso de existir. El/la secretario/a, será elegido/a de entre los miembros de la Junta de Docentes de Grado o Curso.\n\nSe levanta el presente informe de atención y seguimiento psicosocial del ${trimesterLabel} año lectivo ${schoolYearText}.`;

export const DEFAULT_OBJETIVO =
  "Informar sobre las acciones de atención, acompañamiento y seguimiento psicosocial a estudiantes en situación de vulnerabilidad o riesgo psicosocial abordados dentro del Departamento de Consejería Estudiantil.";

export const DEFAULT_GENERAL_ACTIONS =
  "Activación de rutas y protocolos. Abordaje a estudiantes y articulación con docentes y autoridades para la garantía de derechos y permanencia educativa.";

export const DEFAULT_CONCLUSIONES = (trimesterLabel: string) =>
  `- Los estudiantes según las problemáticas detectadas han recibido el respectivo seguimiento, o asesoramiento según el requerimiento.\n- Los docentes miembros de la Junta de Curso tienen conocimiento de los casos de vulnerabilidad y de atención psicosocial gestionados por el Departamento de Consejería Estudiantil, durante el ${trimesterLabel.toLowerCase()}.`;

export const DEFAULT_RECOMENDACIONES =
  `- Se recomienda a los docentes remitir al DECE los casos mediante fichas de notificación con la finalidad de evidenciar los procesos.\n- Se recomienda que los docentes tutores mantengan comunicación constante, pertinente y eficiente con los representantes legales según lo determina el Reglamento LOEI.\n- Comunicar al Profesional DECE los casos de posible vulneración de derechos para activar las rutas y protocolos adecuados para precautelar el interés superior del niño.\n- Agendar las citas con padres de familia con previa anticipación a la Profesional DECE para mantener una buena planificación de atención.`;

/**
 * Obtiene las iniciales de una persona (ej: Marlon Jácome -> MJ)
 */
export function getInitials(name: string): string {
  if (!name) return "DECE";
  return name
    .replace(/^(psc|lic|ing|mg|msc|dr|dra)\.?\s+/i, "")
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .join("")
    .toUpperCase()
    .slice(0, 4);
}

/**
 * Obtiene las siglas de la institución (ej: UNIDAD EDUCATIVA SAN ROQUE -> UESR)
 */
export function getInstitutionInitials(institutionName: string): string {
  if (!institutionName) return "COL";
  const cleaned = institutionName
    .replace(/[^\w\s]/gi, "")
    .replace(/\b(de|la|el|los|las|y|en|del)\b/gi, "")
    .trim();
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 4).toUpperCase();
  return words.map((w) => w[0]).join("").toUpperCase().slice(0, 6);
}

/**
 * Normaliza el nombre del curso y paralelo para el código del informe (ej: "Primero BGU", "A", "MATUTINA" -> "1BGU A MAT")
 */
export function normalizeCourseCode(course: string, parallel: string, jornada: string): string {
  let c = course
    .replace(/primero|1ro|1°|1.°/gi, "1")
    .replace(/segundo|2do|2°|2.°/gi, "2")
    .replace(/tercero|3ro|3°|3.°/gi, "3")
    .replace(/cuarto|4to|4°|4.°/gi, "4")
    .replace(/quinto|5to|5°|5.°/gi, "5")
    .replace(/sexto|6to|6°|6.°/gi, "6")
    .replace(/séptimo|septimo|7mo|7°|7.°/gi, "7")
    .replace(/octavo|8vo|8°|8.°/gi, "8")
    .replace(/noveno|9no|9°|9.°/gi, "9")
    .replace(/décimo|decimo|10mo|10°|10.°/gi, "10")
    .replace(/bachillerato general unificado/gi, "BGU")
    .replace(/bachillerato técnico|bachillerato tecnico/gi, "BT")
    .replace(/\s+/g, " ")
    .trim();

  let j = "MAT";
  const jLower = (jornada || "").toLowerCase();
  if (jLower.includes("vesp")) j = "VESP";
  else if (jLower.includes("noct")) j = "NOCT";

  return `${c} ${parallel.toUpperCase()} ${j}`.trim();
}

/**
 * Genera el correlativo oficial del informe:
 * INF-001-JC-1T-UESR-2025-2026-MJ_1BGU A MAT
 */
export function generateCourseBoardReportCode(opts: {
  institutionId: string;
  institutionName?: string;
  schoolYearText: string;
  trimester: Trimester;
  userName: string;
  course: string;
  parallel: string;
  jornada: string;
}): string {
  const countRow = db
    .prepare(
      `SELECT COUNT(*) as count FROM course_board_reports WHERE institution_id = ?`
    )
    .get(opts.institutionId) as { count: number };

  const seq = String((countRow?.count || 0) + 1).padStart(3, "0");
  const instCode = opts.institutionName ? getInstitutionInitials(opts.institutionName) : "DECE";
  const userInitials = getInitials(opts.userName);
  const cleanYear = opts.schoolYearText.replace(/\s+/g, "").replace(/\//g, "-");
  const normCourse = normalizeCourseCode(opts.course, opts.parallel, opts.jornada);

  return `INF-${seq}-JC-${opts.trimester}-${instCode}-${cleanYear}-${userInitials}_${normCourse}`;
}

/**
 * Lista los informes técnicos de juntas de curso
 */
export function getCourseBoardReports(opts: {
  institutionId: string;
  userId?: string;
  isCoordinatorOrAdmin?: boolean;
  schoolYearId?: string;
  trimester?: Trimester;
}): CourseBoardReportRow[] {
  let query = `SELECT * FROM course_board_reports WHERE institution_id = ?`;
  const params: any[] = [opts.institutionId];

  if (!opts.isCoordinatorOrAdmin && opts.userId) {
    query += ` AND user_id = ?`;
    params.push(opts.userId);
  }

  if (opts.schoolYearId) {
    query += ` AND school_year_id = ?`;
    params.push(opts.schoolYearId);
  }

  if (opts.trimester) {
    query += ` AND trimester = ?`;
    params.push(opts.trimester);
  }

  query += ` ORDER BY report_date DESC, created_at DESC`;

  return db.prepare(query).all(...params) as CourseBoardReportRow[];
}

/**
 * Obtiene un informe específico por ID
 */
export function getCourseBoardReportById(
  id: string,
  institutionId: string
): CourseBoardReportRow | null {
  const row = db
    .prepare(`SELECT * FROM course_board_reports WHERE id = ? AND institution_id = ?`)
    .get(id, institutionId) as CourseBoardReportRow | undefined;
  return row || null;
}

/**
 * Consulta casos existentes en el sistema para el curso y paralelo seleccionado,
 * recopilando problemáticas y bitácora de intervenciones para sugerir la tabla del informe.
 */
export function getCasesForCourse(
  institutionId: string,
  course: string,
  parallel?: string,
  jornada?: string
): CourseBoardReportCaseItem[] {
  let query = `
    SELECT 
      c.id as case_id,
      c.code as case_code,
      c.risk_type,
      c.risk_type_other,
      c.description as case_description,
      c.status as case_status,
      s.id as student_id,
      s.full_name,
      s.document_id,
      s.course,
      s.parallel,
      COALESCE(s.jornada, 'MATUTINA') as jornada,
      (
        SELECT GROUP_CONCAT('• ' || type || ': ' || description, '\n')
        FROM case_actions
        WHERE case_file_id = c.id
      ) as actions_summary
    FROM case_files c
    JOIN students s ON c.student_id = s.id
    WHERE c.institution_id = ?
      AND s.active = 1
      AND LOWER(TRIM(s.course)) = LOWER(TRIM(?))
  `;
  const params: any[] = [institutionId, course];

  if (parallel && parallel.trim()) {
    query += ` AND (s.parallel IS NULL OR LOWER(TRIM(s.parallel)) = LOWER(TRIM(?)))`;
    params.push(parallel.trim());
  }

  if (jornada && jornada.trim()) {
    query += ` AND (s.jornada IS NULL OR UPPER(TRIM(s.jornada)) = UPPER(TRIM(?)))`;
    params.push(jornada.trim());
  }

  query += ` ORDER BY s.full_name ASC`;

  const rows = db.prepare(query).all(...params) as {
    case_id: string;
    case_code: string;
    risk_type: string;
    risk_type_other: string | null;
    case_description: string;
    case_status: string;
    student_id: string;
    full_name: string;
    document_id: string | null;
    course: string;
    parallel: string | null;
    jornada: string;
    actions_summary: string | null;
  }[];

  return rows.map((r) => {
    const studentName = (r.full_name || "ESTUDIANTE").trim().toUpperCase();
    const rawLabel = RISK_TYPE_LABELS[r.risk_type as keyof typeof RISK_TYPE_LABELS] || r.risk_type;
    const problematic = r.risk_type === "OTRO" && r.risk_type_other ? r.risk_type_other : rawLabel;

    let actionsTaken = r.actions_summary || "";
    if (!actionsTaken.trim()) {
      actionsTaken =
        "• Detección y registro en DECE\n• Entrevista con estudiante\n• Entrevista con representante legal\n• Socialización con docente tutor y equipo docente";
    }

    let academic = "• Aplicar ajustes razonables y flexibilización según necesidad.\n• Evaluaciones adaptadas y refuerzo pedagógico continuo.";
    let coordination = "• Coordinación constante entre docentes y DECE.\n• Manejo confidencial de la información y prevención de estigmatización.";
    let climate = "• Seguimiento socioemocional continuo.\n• Promover ambiente protector, empático y libre de discriminación.";
    let protocols = "• Notificación inmediata ante cualquier alerta o vulneración.";

    const pLower = problematic.toLowerCase();
    if (pLower.includes("embarazo")) {
      coordination = "• Coordinación con DECE y Vicerrectorado; confidencialidad estricta; evitar cualquier estigma.";
      academic = "• Adaptaciones curriculares y calendario flexible de entrega de actividades.\n• Alternativas de evaluación formativa y justificación de permisos médicos.";
      climate = "• Acompañamiento socioemocional con DECE; promover respeto entre pares y prevenir comentarios discriminatorios.";
      protocols = "• Activación y seguimiento de rutas y protocolos MINEDUC de embarazo y maternidad adolescente.";
    } else if (pLower.includes("aprendizaje") || pLower.includes("rezago")) {
      academic = "• Aplicar ajustes razonables (DUA) en todas las áreas de aprendizaje.\n• Ritmo de trabajo flexible y apoyo pedagógico focalizado.\n• Evaluaciones diferenciadas y seguimiento continuo del avance.";
      coordination = "• Reuniones periódicas entre docentes de área, tutor y DECE / UDAI.";
    } else if (pLower.includes("violencia") || pLower.includes("acoso") || pLower.includes("bullying")) {
      protocols = "• Activación de rutas y protocolos de violencia escolar MINEDUC.\n• Registro de novedades y medidas de protección institucionales.";
      climate = "• Monitoreo preventivo del clima de aula en recesos y horas de clase.\n• Fortalecimiento de la convivencia armónica y resolución pacífica de conflictos.";
      coordination = "• Notificación inmediata a DECE y autoridades ante cualquier incidente.";
    } else if (pLower.includes("deserción") || pLower.includes("trabajo")) {
      coordination = "• Mantener comunicación telefónica y presencial continua con el representante legal.";
      academic = "• Flexibilización de tiempos de entrega para evitar la desvinculación escolar.";
      protocols = "• Coordinación interinstitucional (Distrito de Educación / JCPDNA) para garantía de permanencia.";
    }

    return {
      id: r.case_id,
      student_name: studentName,
      cedula: r.document_id || "S/N",
      student_id: r.student_id,
      case_id: r.case_id,
      case_code: r.case_code,
      problematic,
      actions_taken: actionsTaken,
      recommendations: {
        coordination,
        academic,
        climate,
        protocols,
      },
    };
  });
}
