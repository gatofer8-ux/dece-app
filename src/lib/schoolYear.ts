import { db } from "./db";
import { randomUUID } from "crypto";
import type { SchoolYearRow, StudentEnrollmentRow, SchoolYearRegime, StudentEnrollmentStatus } from "./types";
import { cookies } from "next/headers";

export const ACTIVE_YEAR_COOKIE = "dece_active_school_year";

/**
 * Obtiene la lista completa de años lectivos registrados para una institución.
 */
export function listSchoolYears(institutionId: string): SchoolYearRow[] {
  return db
    .prepare(
      `SELECT * FROM school_years 
       WHERE institution_id = ? 
       ORDER BY start_date DESC, created_at DESC`
    )
    .all(institutionId) as SchoolYearRow[];
}

/**
 * Obtiene un año lectivo por su ID.
 */
export function getSchoolYearById(id: string, institutionId?: string): SchoolYearRow | null {
  if (institutionId) {
    return (
      (db
        .prepare("SELECT * FROM school_years WHERE id = ? AND institution_id = ?")
        .get(id, institutionId) as SchoolYearRow | undefined) || null
    );
  }
  return (
    (db.prepare("SELECT * FROM school_years WHERE id = ?").get(id) as SchoolYearRow | undefined) || null
  );
}

/**
 * Asegura que exista al menos un año lectivo activo para la institución.
 * Si no existe ninguno, crea automáticamente el año lectivo vigente.
 */
export function ensureDefaultSchoolYear(institutionId: string): SchoolYearRow | null {
  if (!institutionId) return null;
  const instExists = db.prepare("SELECT id FROM institutions WHERE id = ?").get(institutionId);
  if (!instExists) return null;

  const existing = db
    .prepare("SELECT * FROM school_years WHERE institution_id = ? AND is_active = 1 LIMIT 1")
    .get(institutionId) as SchoolYearRow | undefined;

  if (existing) return existing;

  const anyYear = db
    .prepare("SELECT * FROM school_years WHERE institution_id = ? ORDER BY start_date DESC LIMIT 1")
    .get(institutionId) as SchoolYearRow | undefined;

  if (anyYear) {
    db.prepare("UPDATE school_years SET is_active = 1 WHERE id = ?").run(anyYear.id);
    return { ...anyYear, is_active: 1 };
  }

  // Determinar año corriente
  const currentYear = new Date().getFullYear();
  const nextYear = currentYear + 1;
  const newYearId = randomUUID();

  const newYear: SchoolYearRow = {
    id: newYearId,
    institution_id: institutionId,
    name: `${currentYear}-${nextYear} (Sierra-Amazonía)`,
    regime: "SIERRA_AMAZONIA",
    start_date: `${currentYear}-09-01`,
    end_date: `${nextYear}-06-30`,
    is_active: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  db.prepare(
    `INSERT INTO school_years (id, institution_id, name, regime, start_date, end_date, is_active, created_at, updated_at)
     VALUES (@id, @institution_id, @name, @regime, @start_date, @end_date, @is_active, @created_at, @updated_at)`
  ).run(newYear);

  return newYear;
}

/**
 * Obtiene el año lectivo seleccionado en la sesión/cookie o el año lectivo activo por defecto.
 */
export async function getSelectedSchoolYear(institutionId: string): Promise<SchoolYearRow | null> {
  const cookieStore = cookies();
  const preferredId = cookieStore.get(ACTIVE_YEAR_COOKIE)?.value;

  if (preferredId && preferredId !== "ALL") {
    const preferred = getSchoolYearById(preferredId, institutionId);
    if (preferred) return preferred;
  }

  if (preferredId === "ALL") {
    return null; // Modo histórico (todos los años)
  }

  return ensureDefaultSchoolYear(institutionId);
}

/**
 * Registra o actualiza la matrícula de un estudiante en un año lectivo determinado.
 */
export function upsertStudentEnrollment(data: {
  studentId: string;
  schoolYearId: string;
  institutionId: string;
  course: string;
  parallel?: string | null;
  jornada?: string | null;
  educationLevel?: string | null;
  specialty?: string | null;
  status?: StudentEnrollmentStatus;
}): StudentEnrollmentRow {
  const id = randomUUID();
  const status = data.status || "MATRICULADO";

  db.prepare(
    `INSERT INTO student_enrollments (
       id, student_id, school_year_id, institution_id, course, parallel, jornada, education_level, specialty, status, updated_at
     ) VALUES (
       ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now')
     )
     ON CONFLICT(student_id, school_year_id) DO UPDATE SET
       course = excluded.course,
       parallel = excluded.parallel,
       jornada = excluded.jornada,
       education_level = excluded.education_level,
       specialty = excluded.specialty,
       status = excluded.status,
       updated_at = datetime('now')`
  ).run(
    id,
    data.studentId,
    data.schoolYearId,
    data.institutionId,
    data.course,
    data.parallel || null,
    data.jornada || null,
    data.educationLevel || null,
    data.specialty || null,
    status
  );

  return db
    .prepare("SELECT * FROM student_enrollments WHERE student_id = ? AND school_year_id = ?")
    .get(data.studentId, data.schoolYearId) as StudentEnrollmentRow;
}

/**
 * Obtiene el historial de matrículas de un estudiante ordenado por año lectivo.
 */
export function getStudentEnrollmentHistory(
  studentId: string
): (StudentEnrollmentRow & { school_year_name: string; start_date: string; end_date: string })[] {
  return db
    .prepare(
      `SELECT e.*, y.name as school_year_name, y.start_date, y.end_date
       FROM student_enrollments e
       INNER JOIN school_years y ON y.id = e.school_year_id
       WHERE e.student_id = ?
       ORDER BY y.start_date DESC`
    )
    .all(studentId) as (StudentEnrollmentRow & { school_year_name: string; start_date: string; end_date: string })[];
}
