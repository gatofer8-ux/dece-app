import { db } from "@/lib/db";

/**
 * Utilidades de acceso a datos con ámbito de institución.
 *
 * El aislamiento multi-institución de este sistema se apoya en que CADA
 * consulta a una tabla con datos de institución incluya `institution_id = ?`.
 * Un olvido es una fuga entre instituciones. Estas funciones centralizan el
 * patrón para que verificar la pertenencia de un recurso sea una sola línea y
 * el nombre de tabla esté en una lista blanca (no interpolación libre).
 *
 * Uso típico en una server action:
 *
 *   const session = await requireRole(["ADMIN", "DECE"]);
 *   const institutionId = requireInstitutionId(session);
 *   requireOwned("case_files", caseId, institutionId, "Caso");
 */

/** Tablas con columna `institution_id` directa (db/schema.sql + migraciones). */
const INSTITUTION_SCOPED_TABLES = new Set<string>([
  "action_plans",
  "activities",
  "annual_management_reports",
  "appointment_requests",
  "appointments",
  "attachments",
  "audit_logs",
  "authority_advisory_acts",
  "bimonthly_reports",
  "case_advisory_logs",
  "case_alert_notifications",
  "case_call_logs",
  "case_care_followups",
  "case_care_plans",
  "case_closure_reports",
  "case_corresponsibility_acts",
  "case_files",
  "case_interviews",
  "case_observation_sheets",
  "case_risk_matrix_entries",
  "case_restitution_plans",
  "chat_channels",
  "course_board_reports",
  "daily_attentions",
  "dece_coordinator_delegations",
  "dece_distributivos",
  "institution_course_quotas",
  "intern_attendances",
  "interns",
  "professional_schedule_slots",
  "referrals",
  "report_generation_history",
  "report_templates",
  "restorative_circle_consents",
  "school_years",
  "situational_reports",
  "socialization_acts",
  "student_enrollments",
  "students",
  "teacher_alerts",
  "users",
  "violence_reports",
]);

export type ScopedTable = string;

function assertTable(table: string): void {
  if (!INSTITUTION_SCOPED_TABLES.has(table)) {
    throw new Error(
      `scopedDb: la tabla "${table}" no está en la lista blanca de tablas con institution_id.`
    );
  }
}

/**
 * Devuelve la fila `id` de `table` solo si pertenece a `institutionId`.
 * `undefined` si no existe o es de otra institución.
 */
export function findOwned<T = Record<string, unknown>>(
  table: ScopedTable,
  id: string,
  institutionId: string
): T | undefined {
  assertTable(table);
  return db
    .prepare(`SELECT * FROM ${table} WHERE id = ? AND institution_id = ?`)
    .get(id, institutionId) as T | undefined;
}

/**
 * Lanza si el recurso no existe o es de otra institución. Devuelve la fila.
 */
export function requireOwned<T = Record<string, unknown>>(
  table: ScopedTable,
  id: string,
  institutionId: string,
  label = "Registro"
): T {
  const row = findOwned<T>(table, id, institutionId);
  if (!row) {
    throw new Error(`${label} no encontrado en tu institución.`);
  }
  return row;
}

/** true si `id` en `table` pertenece a `institutionId`. */
export function isOwned(table: ScopedTable, id: string, institutionId: string): boolean {
  assertTable(table);
  return Boolean(
    db.prepare(`SELECT 1 FROM ${table} WHERE id = ? AND institution_id = ?`).get(id, institutionId)
  );
}

/** Atajos por dominio de uso frecuente. */
export const requireOwnedCase = (caseId: string, institutionId: string) =>
  requireOwned("case_files", caseId, institutionId, "Caso");

export const requireOwnedStudent = (studentId: string, institutionId: string) =>
  requireOwned("students", studentId, institutionId, "Estudiante");
