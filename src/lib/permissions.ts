import type { Role } from "./types";

/**
 * Matriz de permisos del sistema, alineada al Modelo de Gestión DECE.
 *
 * - DISTRITO: rol a nivel de distrito educativo; ve reportes agregados de TODAS
 *   las instituciones del distrito y administra el alta de instituciones y de
 *   usuarios, pero NUNCA ve el relato/descripción confidencial de un caso
 *   individual ni gestiona estudiantes/casos directamente (aislamiento por
 *   institución — el mismo principio de confidencialidad que AUTORIDAD, pero
 *   a escala de distrito).
 * - ADMIN: administra usuarios de su institución y tiene acceso completo dentro
 *   de ella (equivalente a coordinación DECE).
 * - DECE: acceso completo a casos, fichas, derivaciones, citas y reportes de
 *   su institución.
 * - AUTORIDAD: ve dashboards y reportes agregados de su institución; NO ve el
 *   relato/descripción confidencial de los casos individuales (protección de
 *   datos de menores).
 * - DOCENTE: reporta alertas sobre estudiantes y gestiona su propia agenda con
 *   el DECE; no tiene acceso a fichas ni a la descripción de los casos.
 */

export function canViewCaseDetail(role: Role): boolean {
  return role === "SUPERADMIN" || role === "ADMIN" || role === "DECE";
}

export function canEditCase(role: Role): boolean {
  return role === "SUPERADMIN" || role === "ADMIN" || role === "DECE";
}

/** Solo SUPERADMIN puede crear, editar o eliminar usuarios en el sistema. */
export function canManageUsers(role: Role): boolean {
  return role === "SUPERADMIN";
}

export function canManageStudents(role: Role): boolean {
  return role === "SUPERADMIN" || role === "ADMIN" || role === "DECE";
}

export function canViewAggregateReports(role: Role): boolean {
  return true;
}

export function canCreateAlert(role: Role): boolean {
  return role === "DOCENTE" || role === "ADMIN" || role === "DECE" || role === "SUPERADMIN";
}

export function canManageAgenda(role: Role): boolean {
  return role === "SUPERADMIN" || role === "ADMIN" || role === "DECE";
}

export function canViewAuditLog(role: Role): boolean {
  return role === "SUPERADMIN" || role === "ADMIN" || role === "DISTRITO";
}

/** Solo el rol SUPERADMIN puede crear o eliminar instituciones educativas. */
export function canManageInstitutions(role: Role): boolean {
  return role === "SUPERADMIN";
}

/**
 * Roles que operan a escala de una sola institución (todo lo que consultan/crean
 * debe filtrarse por su institution_id). DISTRITO y SUPERADMIN son excepciones globales.
 */
export function isInstitutionScoped(role: Role): boolean {
  return role !== "SUPERADMIN" && role !== "DISTRITO";
}

export function roleHomePath(role: Role): string {
  switch (role) {
    case "SUPERADMIN":
      return "/superadmin";
    case "DISTRITO":
      return "/instituciones";
    case "DOCENTE":
      return "/alertas";
    case "AUTORIDAD":
      return "/reportes";
    default:
      return "/dashboard";
  }
}

