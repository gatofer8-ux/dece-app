import { db } from "./db";
import type { Role, DeceDistributivoRow, DeceDistributivoAssignmentRow, UserCoverage, UserRow, InstitutionCourseQuotaRow } from "./types";
import { getSelectedSchoolYear } from "./schoolYear";

/**
 * Obtiene el distributivo activo de la institución (opcionalmente para un año lectivo específico).
 */
export async function getActiveDistributivo(
  institutionId: string,
  schoolYearId?: string
): Promise<{ distributivo: DeceDistributivoRow; assignments: DeceDistributivoAssignmentRow[] } | null> {
  let targetYearId = schoolYearId;
  if (!targetYearId) {
    const selectedYear = await getSelectedSchoolYear(institutionId);
    targetYearId = selectedYear?.id;
  }

  let distributivo: DeceDistributivoRow | undefined;

  if (targetYearId) {
    distributivo = db
      .prepare(
        `SELECT * FROM dece_distributivos 
         WHERE institution_id = ? AND school_year_id = ? AND is_active = 1 
         ORDER BY updated_at DESC LIMIT 1`
      )
      .get(institutionId, targetYearId) as DeceDistributivoRow | undefined;
  }

  // Si no se encuentra para el año lectivo específico, buscar cualquier distributivo activo de la institución
  if (!distributivo) {
    distributivo = db
      .prepare(
        `SELECT * FROM dece_distributivos 
         WHERE institution_id = ? AND is_active = 1 
         ORDER BY updated_at DESC LIMIT 1`
      )
      .get(institutionId) as DeceDistributivoRow | undefined;
  }

  if (!distributivo) return null;

  const assignments = db
    .prepare(
      `SELECT * FROM dece_distributivo_assignments 
       WHERE distributivo_id = ? 
       ORDER BY user_role_label LIKE '%Coord%' DESC, user_name ASC`
    )
    .all(distributivo.id) as DeceDistributivoAssignmentRow[];

  return { distributivo, assignments };
}

/**
 * Obtiene un distributivo por su ID junto con todas sus asignaciones.
 */
export function getDistributivoById(
  distributivoId: string,
  institutionId: string
): { distributivo: DeceDistributivoRow; assignments: DeceDistributivoAssignmentRow[] } | null {
  const distributivo = db
    .prepare("SELECT * FROM dece_distributivos WHERE id = ? AND institution_id = ?")
    .get(distributivoId, institutionId) as DeceDistributivoRow | undefined;

  if (!distributivo) return null;

  const assignments = db
    .prepare(
      `SELECT * FROM dece_distributivo_assignments 
       WHERE distributivo_id = ? 
       ORDER BY user_role_label LIKE '%Coord%' DESC, user_name ASC`
    )
    .all(distributivo.id) as DeceDistributivoAssignmentRow[];

  return { distributivo, assignments };
}

/**
 * Determina la cobertura asignada a un usuario dentro de la institución.
 * - Si es ADMIN / Coordinador o DISTRITO: isAllInstitutional = true (visión total de todo el colegio).
 * - Si es DECE (Analista): busca su asignación en el distributivo activo.
 */
export async function getUserCoverage(
  userId: string,
  institutionId: string,
  userRole: Role,
  schoolYearId?: string
): Promise<UserCoverage> {
  // El Coordinador DECE (ADMIN), autoridades distritales o cualquier usuario en modo DEMO tienen visión total de toda la institución
  if (institutionId === "demo-los-alamos" || userRole === "ADMIN" || userRole === "DISTRITO") {
    return {
      isAllInstitutional: true,
      courses: [],
      parallels: [],
      jornadas: [],
    };
  }

  // Para profesionales DECE (Analistas), buscar asignación en el distributivo activo
  const active = await getActiveDistributivo(institutionId, schoolYearId);
  if (!active) {
    // Si la institución aún no ha creado un distributivo, se permite acceso amplio para no bloquear el inicio
    return {
      isAllInstitutional: true,
      courses: [],
      parallels: [],
      jornadas: [],
    };
  }

  const assignment = active.assignments.find((a) => a.user_id === userId);
  if (!assignment) {
    // No tiene asignación específica aún en el distributivo activo
    return {
      isAllInstitutional: false,
      courses: [],
      parallels: [],
      jornadas: [],
    };
  }

  let courses: string[] = [];
  try {
    courses = JSON.parse(assignment.courses || "[]");
  } catch {
    courses = [];
  }

  let parallels: string[] = [];
  try {
    parallels = JSON.parse(assignment.parallels || "[]");
  } catch {
    parallels = [];
  }

  const jornadas = assignment.jornada ? [assignment.jornada] : [];

  return {
    isAllInstitutional: false,
    courses,
    parallels,
    jornadas,
    assignment,
  };
}

/**
 * Obtiene los cursos y paralelos registrados en la institución con conteos de estudiantes.
 */
import { getCourseGradeRank, compareCoursesDescending } from "./courseOrder";
export { getCourseGradeRank, compareCoursesDescending };

// Helpers puros del distributivo: viven en un módulo aparte sin dependencias de
// base de datos para poder importarse también desde componentes cliente. Se
// reexportan aquí para no romper los imports de código servidor ya existentes.
import {
  normalizeCourseKey,
  makeParallelKey,
  parseParallelKey,
  buildCoverageSqlFilter,
  type CourseParallelDetail,
  type CourseSummaryItem,
} from "./distributivoShared";
export {
  normalizeCourseKey,
  makeParallelKey,
  parseParallelKey,
  buildCoverageSqlFilter,
};
export type { CourseParallelDetail, CourseSummaryItem };

/**
 * Obtiene los numéricos configurados para la institución en un año lectivo ordenados de forma descendente.
 */
export function getInstitutionCourseQuotas(
  institutionId: string,
  schoolYearId?: string
): InstitutionCourseQuotaRow[] {
  let rows: InstitutionCourseQuotaRow[] = [];
  if (schoolYearId) {
    rows = db
      .prepare(
        `SELECT * FROM institution_course_quotas 
         WHERE institution_id = ? AND school_year_id = ? 
         ORDER BY course ASC, parallel ASC`
      )
      .all(institutionId, schoolYearId) as InstitutionCourseQuotaRow[];
  } else {
    rows = db
      .prepare(
        `SELECT * FROM institution_course_quotas 
         WHERE institution_id = ? 
         ORDER BY course ASC, parallel ASC`
      )
      .all(institutionId) as InstitutionCourseQuotaRow[];
  }

  return rows.sort((a, b) => compareCoursesDescending(a.course, b.course));
}

/**
 * Guarda o actualiza en bloque los numéricos por curso de la institución.
 */
export function saveInstitutionCourseQuotas(
  institutionId: string,
  schoolYearId: string,
  quotas: Array<{
    education_level: string;
    course: string;
    parallel: string;
    jornada: string;
    bachillerato_specialty?: string | null;
    student_count: number;
    tutor_name?: string | null;
  }>
) {
  const insertStmt = db.prepare(
    `INSERT INTO institution_course_quotas 
     (id, institution_id, school_year_id, education_level, course, parallel, jornada, bachillerato_specialty, student_count, tutor_name, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(institution_id, school_year_id, course, parallel, jornada) DO UPDATE SET
       education_level = excluded.education_level,
       bachillerato_specialty = excluded.bachillerato_specialty,
       student_count = excluded.student_count,
       tutor_name = excluded.tutor_name,
       updated_at = datetime('now')`
  );

  const deleteOthersStmt = db.prepare(
    `DELETE FROM institution_course_quotas 
     WHERE institution_id = ? AND school_year_id = ?`
  );

  const tx = db.transaction(() => {
    deleteOthersStmt.run(institutionId, schoolYearId);
    for (const q of quotas) {
      insertStmt.run(
        `quota_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        institutionId,
        schoolYearId,
        q.education_level,
        q.course,
        q.parallel.toUpperCase(),
        q.jornada || 'MATUTINA',
        q.bachillerato_specialty || null,
        Number(q.student_count) || 0,
        q.tutor_name || null
      );
    }
  });

  tx();
}

/**
 * Obtiene los cursos y paralelos registrados en la institución con conteos de estudiantes.
 * Integra inteligentemente los estudiantes registrados con los numéricos configurados.
 */
export function getInstitutionCoursesWithCounts(
  institutionId: string,
  schoolYearId?: string
): {
  detailedRows: Array<{
    course: string;
    parallel: string | null;
    jornada: string;
    education_level: string;
    student_count: number;
    tutor_name?: string | null;
  }>;
  courseSummaries: CourseSummaryItem[];
  totalStudents: number;
  isFromQuotas: boolean;
} {
  const studentRows = db
    .prepare(
      `SELECT 
         course, 
         parallel, 
         jornada, 
         education_level, 
         COUNT(id) as student_count
       FROM students 
       WHERE institution_id = ? AND active = 1
       GROUP BY course, parallel, jornada, education_level
       ORDER BY course ASC, parallel ASC`
    )
    .all(institutionId) as {
    course: string;
    parallel: string | null;
    jornada: string;
    education_level: string;
    student_count: number;
  }[];

  const quotaRows = getInstitutionCourseQuotas(institutionId, schoolYearId);

  // Si existen numéricos configurados en quotas, tienen prioridad o complementan
  let effectiveRows: Array<{
    course: string;
    parallel: string | null;
    jornada: string;
    education_level: string;
    student_count: number;
    tutor_name?: string | null;
  }> = [];

  if (quotaRows.length > 0) {
    effectiveRows = quotaRows.map((q) => ({
      course: q.course,
      parallel: q.parallel,
      jornada: q.jornada,
      education_level: q.education_level,
      student_count: q.student_count,
      tutor_name: q.tutor_name || null,
    }));
  } else {
    effectiveRows = studentRows.map((s) => ({
      ...s,
      tutor_name: null,
    }));
  }

  // Detectar si la institución cuenta con múltiples jornadas distintas
  const distinctJornadas = Array.from(new Set(effectiveRows.map((r) => r.jornada).filter(Boolean)));
  const hasMultipleJornadas = distinctJornadas.length > 1;

  // Agrupado por curso (diferenciando por jornada si el plantel tiene más de una)
  const courseSummaryMap = new Map<
    string,
    CourseSummaryItem
  >();

  for (const r of effectiveRows) {
    const jClean = r.jornada === 'MATUTINA' ? 'Matutina' : r.jornada === 'VESPERTINA' ? 'Vespertina' : r.jornada === 'NOCTURNA' ? 'Nocturna' : r.jornada;
    const courseKey = hasMultipleJornadas && r.jornada
      ? `${r.course} (${jClean})`
      : r.course;

    const existing = courseSummaryMap.get(courseKey) || {
      course: courseKey,
      totalStudents: 0,
      parallels: [],
      jornadas: [],
      parallelDetails: [],
    };
    existing.totalStudents += r.student_count;
    const pUpper = (r.parallel || "A").trim().toUpperCase();
    const jUpper = (r.jornada || "MATUTINA").trim().toUpperCase();

    if (r.parallel && !existing.parallels.includes(r.parallel)) {
      existing.parallels.push(r.parallel);
    }
    if (r.jornada && !existing.jornadas.includes(r.jornada)) {
      existing.jornadas.push(r.jornada);
    }

    const existingPd = existing.parallelDetails.find(
      (pd) => pd.parallel === pUpper && pd.jornada === jUpper
    );
    if (existingPd) {
      existingPd.student_count += r.student_count;
      if (!existingPd.tutor_name && r.tutor_name) {
        existingPd.tutor_name = r.tutor_name;
      }
    } else {
      existing.parallelDetails.push({
        parallel: pUpper,
        jornada: jUpper,
        student_count: r.student_count,
        tutor_name: r.tutor_name || null,
      });
    }

    existing.parallelDetails.sort((a, b) => a.parallel.localeCompare(b.parallel));
    courseSummaryMap.set(courseKey, existing);
  }

  const sortedSummaries = Array.from(courseSummaryMap.values()).sort((a, b) =>
    compareCoursesDescending(a.course, b.course)
  );

  return {
    detailedRows: effectiveRows.sort((a, b) => compareCoursesDescending(a.course, b.course)),
    courseSummaries: sortedSummaries,
    totalStudents: effectiveRows.reduce((acc, curr) => acc + curr.student_count, 0),
    isFromQuotas: quotaRows.length > 0,
  };
}

/**
 * Obtiene la lista de profesionales del equipo DECE (Coordinador y Analistas) de la institución.
 */
export function getInstitutionDeceTeam(institutionId: string): UserRow[] {
  return db
    .prepare(
      `SELECT * FROM users 
       WHERE institution_id = ? AND role IN ('ADMIN', 'DECE') AND active = 1 
       ORDER BY role = 'ADMIN' DESC, name ASC`
    )
    .all(institutionId) as UserRow[];
}
