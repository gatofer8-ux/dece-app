"use server";

import { saveInstitutionCourseQuotas, getInstitutionCourseQuotas, getInstitutionCoursesWithCounts } from "@/lib/distributivo";
import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { getSchoolYearById } from "@/lib/schoolYear";

export interface ActionState {
  error?: string;
  success?: boolean;
}

function str(fd: FormData, key: string): string | null {
  const v = fd.get(key);
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length ? t : null;
}

export async function saveDistributivo(
  distributivoId: string | null,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await requireRole(["ADMIN"]);
  const institutionId = requireInstitutionId(session);

  const schoolYearId = str(formData, "school_year_id");
  if (!schoolYearId) {
    return { error: "Debes seleccionar un año lectivo para el distributivo." };
  }

  const schoolYear = getSchoolYearById(schoolYearId, institutionId);
  const schoolYearText = schoolYear?.name || str(formData, "school_year_text") || "2025-2026";

  const title = str(formData, "title") || "Distributivo Institucional de Cobertura DECE";
  const coordinatorName = str(formData, "coordinator_name") || session.user.name || "Coordinador/a DECE";
  const coordinatorId = str(formData, "coordinator_id") || session.user.id;
  const elaboratedByName = str(formData, "elaborated_by_name") || coordinatorName;
  const elaboratedByRole = str(formData, "elaborated_by_role") || "Coordinador/a DECE";
  const approvedByName = str(formData, "approved_by_name") || "";
  const approvedByRole = str(formData, "approved_by_role") || "Rector/a Institucional";
  const generalObservations = str(formData, "general_observations") || "";

  const assignmentsRaw = str(formData, "assignments_json");
  if (!assignmentsRaw) {
    return { error: "No se enviaron asignaciones de cobertura para los profesionales." };
  }

  let assignments: any[] = [];
  try {
    assignments = JSON.parse(assignmentsRaw);
  } catch (e: any) {
    return { error: "Error en el formato de asignaciones: " + (e?.message || e) };
  }

  if (!Array.isArray(assignments) || assignments.length === 0) {
    return { error: "Debes asignar cobertura al menos a un profesional del equipo DECE." };
  }

  const id = distributivoId || randomUUID();
  const isEditing = !!distributivoId;

  try {
    const saveTransaction = db.transaction(() => {
      // Si estamos creando uno nuevo o activando, marcar los anteriores del mismo año lectivo como no activos
      db.prepare(
        "UPDATE dece_distributivos SET is_active = 0 WHERE institution_id = ? AND school_year_id = ?"
      ).run(institutionId, schoolYearId);

      if (isEditing) {
        db.prepare(
          `UPDATE dece_distributivos SET
            school_year_id = ?,
            school_year_text = ?,
            title = ?,
            coordinator_id = ?,
            coordinator_name = ?,
            is_active = 1,
            elaborated_by_name = ?,
            elaborated_by_role = ?,
            approved_by_name = ?,
            approved_by_role = ?,
            general_observations = ?,
            updated_at = datetime('now')
          WHERE id = ? AND institution_id = ?`
        ).run(
          schoolYearId,
          schoolYearText,
          title,
          coordinatorId,
          coordinatorName,
          elaboratedByName,
          elaboratedByRole,
          approvedByName,
          approvedByRole,
          generalObservations,
          id,
          institutionId
        );

        // Limpiar asignaciones previas
        db.prepare("DELETE FROM dece_distributivo_assignments WHERE distributivo_id = ?").run(id);
      } else {
        db.prepare(
          `INSERT INTO dece_distributivos (
            id, institution_id, school_year_id, school_year_text,
            title, coordinator_id, coordinator_name, is_active,
            elaborated_by_name, elaborated_by_role, approved_by_name, approved_by_role,
            general_observations, created_by, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
        ).run(
          id,
          institutionId,
          schoolYearId,
          schoolYearText,
          title,
          coordinatorId,
          coordinatorName,
          elaboratedByName,
          elaboratedByRole,
          approvedByName,
          approvedByRole,
          generalObservations,
          session.user.id
        );
      }

      // Insertar cada asignación
      const insertAssignStmt = db.prepare(
        `INSERT INTO dece_distributivo_assignments (
          id, distributivo_id, user_id, user_name, user_role_label,
          jornada, subniveles, courses, parallels,
          estimated_students_count, specific_responsibilities,
          has_enlazada, enlazada_name, enlazada_dias, lunch_schedule, color,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
      );

      // Obtener conteos reales de estudiantes por curso de la institución
      const coursesInfo = getInstitutionCoursesWithCounts(institutionId, schoolYearId);
      const courseMap = new Map(coursesInfo.courseSummaries.map((c) => [c.course, c]));

      for (const a of assignments) {
        const uId = a.user_id || a.userId;
        if (!uId) {
          console.warn("[saveDistributivo] Assignment missing user_id:", a);
          continue;
        }

        const uName = a.user_name || a.userName || "Profesional DECE";
        const uRole = a.user_role_label || a.userRoleLabel || "Analista DECE";
        const uJornada = a.jornada || "MATUTINA";
        const rawCourses: string[] = Array.isArray(a.courses) ? a.courses : [];
        const uSubniveles = JSON.stringify(a.subniveles || []);
        const uCourses = JSON.stringify(rawCourses);
        const uParallels = JSON.stringify(a.parallels || []);

        // Recalcular estudiantes reales a partir de los cursos asignados
        let recalculatedCount = 0;
        for (const cName of rawCourses) {
          const shiftMatch = cName.match(/\((Matutina|Vespertina|Nocturna)\)$/i);
          const cleanName = cName.replace(/\s*\((Matutina|Vespertina|Nocturna)\)$/i, "").trim().toLowerCase();
          const targetShift = (shiftMatch ? shiftMatch[1] : (uJornada !== "TODAS" && uJornada !== "COMPLETA" ? uJornada : "")).toUpperCase().trim();

          if (targetShift) {
            const matchingRows = coursesInfo.detailedRows.filter(
              (r) => r.course.trim().toLowerCase() === cleanName && (r.jornada || "").toUpperCase().trim() === targetShift
            );
            if (matchingRows.length > 0) {
              recalculatedCount += matchingRows.reduce((sum, r) => sum + (r.student_count || 0), 0);
              continue;
            }
          }

          const summary = courseMap.get(cName);
          if (summary) {
            recalculatedCount += summary.totalStudents;
          } else {
            const matched = coursesInfo.courseSummaries.find(
              (s) => s.course.trim().toLowerCase() === cleanName
            );
            if (matched) {
              recalculatedCount += matched.totalStudents;
            }
          }
        }

        const uCount = recalculatedCount > 0
          ? recalculatedCount
          : Number(a.estimated_students_count ?? a.estimatedStudentsCount ?? 0);

        const uResp = a.specific_responsibilities || a.specificResponsibilities || null;
        const hasEnlazada = a.has_enlazada ? 1 : a.hasEnlazada ? 1 : 0;
        const enlazadaName = a.enlazada_name || a.enlazadaName || null;
        const enlazadaDias = a.enlazada_dias || a.enlazadaDias || null;
        const lunchSchedule = a.lunch_schedule || a.lunchSchedule || null;
        const color = a.color || null;

        insertAssignStmt.run(
          randomUUID(),
          id,
          uId,
          uName,
          uRole,
          uJornada,
          uSubniveles,
          uCourses,
          uParallels,
          uCount,
          uResp,
          hasEnlazada,
          enlazadaName,
          enlazadaDias,
          lunchSchedule,
          color
        );
      }
    });

    saveTransaction();

    logAudit({
      userId: session.user.id,
      institutionId,
      action: isEditing ? "UPDATE" : "CREATE",
      entityType: "dece_distributivos",
      entityId: id,
      details: `Distributivo DECE ${isEditing ? "actualizado" : "creado"} para el año lectivo ${schoolYearText}`,
    });

    revalidatePath("/distributivo");
    revalidatePath("/distributivo/imprimir");
    revalidatePath("/estudiantes");
    revalidatePath("/casos");
    revalidatePath("/dashboard");

    return { success: true };
  } catch (err: any) {
    console.error("[saveDistributivo error]", err);
    return { error: err?.message || "Ocurrió un error al guardar el distributivo." };
  }
}

export async function deleteDistributivo(distributivoId: string) {
  const session = await requireRole(["ADMIN"]);
  const institutionId = requireInstitutionId(session);

  try {
    const deleteTx = db.transaction(() => {
      // 1. Eliminar asignaciones asociadas
      db.prepare("DELETE FROM dece_distributivo_assignments WHERE distributivo_id = ?").run(
        distributivoId
      );

      // 2. Eliminar el registro del distributivo
      db.prepare("DELETE FROM dece_distributivos WHERE id = ? AND institution_id = ?").run(
        distributivoId,
        institutionId
      );

      // 3. Si eliminamos el distributivo activo, activar el más reciente que quede
      const remaining = db
        .prepare(
          `SELECT id FROM dece_distributivos 
           WHERE institution_id = ? 
           ORDER BY updated_at DESC LIMIT 1`
        )
        .get(institutionId) as { id: string } | undefined;

      if (remaining) {
        db.prepare("UPDATE dece_distributivos SET is_active = 1 WHERE id = ?").run(remaining.id);
      }
    });

    deleteTx();

    logAudit({
      userId: session.user.id,
      institutionId,
      action: "DELETE",
      entityType: "dece_distributivos",
      entityId: distributivoId,
      details: `Distributivo DECE eliminado: ${distributivoId}`,
    });

    revalidatePath("/distributivo");
    revalidatePath("/distributivo/imprimir");
    revalidatePath("/estudiantes");
    revalidatePath("/casos");
    revalidatePath("/dashboard");

    return { success: true };
  } catch (err: any) {
    console.error("[deleteDistributivo error]", err);
    return { error: err?.message || "Error al eliminar el distributivo." };
  }
}


export async function saveCourseQuotasAction(
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
): Promise<{ success: boolean; error?: string; updatedCourses?: any; totalStudents?: number }> {
  try {
    const session = await requireRole(["ADMIN"]);
    const institutionId = requireInstitutionId(session);
    if (!schoolYearId) return { success: false, error: "Año lectivo requerido" };
    saveInstitutionCourseQuotas(institutionId, schoolYearId, quotas);
    const refreshed = getInstitutionCoursesWithCounts(institutionId, schoolYearId);
    revalidatePath("/distributivo");
    return {
      success: true,
      updatedCourses: refreshed.courseSummaries,
      totalStudents: refreshed.totalStudents,
    };
  } catch (err: any) {
    console.error("[saveCourseQuotasAction error]", err);
    return { success: false, error: err?.message || "Error al guardar numéricos" };
  }
}

export async function loadCourseQuotasAction(schoolYearId?: string) {
  try {
    const session = await requireRole(["ADMIN"]);
    const institutionId = requireInstitutionId(session);
    const quotas = getInstitutionCourseQuotas(institutionId, schoolYearId);
    return { success: true, quotas };
  } catch (err: any) {
    return { success: false, error: err?.message || "Error al cargar numéricos", quotas: [] };
  }
}

export async function clearCourseQuotasAction(schoolYearId?: string): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await requireRole(["ADMIN"]);
    const institutionId = requireInstitutionId(session);
    if (schoolYearId) {
      db.prepare(
        "DELETE FROM institution_course_quotas WHERE institution_id = ? AND school_year_id = ?"
      ).run(institutionId, schoolYearId);
    } else {
      db.prepare(
        "DELETE FROM institution_course_quotas WHERE institution_id = ?"
      ).run(institutionId);
    }
    revalidatePath("/distributivo");
    revalidatePath("/distributivo/imprimir");
    return { success: true };
  } catch (err: any) {
    console.error("[clearCourseQuotasAction error]", err);
    return { success: false, error: err?.message || "Error al limpiar cuotas" };
  }
}
