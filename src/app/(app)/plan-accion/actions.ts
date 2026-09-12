"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { currentSchoolYearText } from "@/lib/schoolYearText";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { logAudit } from "@/lib/audit";

export interface ActionState {
  error: string | null;
}

function str(formData: FormData, key: string): string {
  const val = formData.get(key);
  return typeof val === "string" ? val.trim() : "";
}

function num(formData: FormData, key: string, fallback = 0): number {
  const val = formData.get(key);
  if (typeof val === "string") {
    const parsed = parseInt(val, 10);
    return isNaN(parsed) ? fallback : parsed;
  }
  return fallback;
}

export async function createActionPlan(prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireRole(["ADMIN", "DECE", "SUPERADMIN", "AUTORIDAD"]);
  const institutionId = requireInstitutionId(session);

  let schoolYearId = str(formData, "school_year_id");
  const schoolYearText = str(formData, "school_year_text") || currentSchoolYearText();
  const studentsCount = num(formData, "students_count", 0);
  const coordinatorName = str(formData, "coordinator_name") || session.user.name || "Coordinador DECE";
  const analystsData = str(formData, "analysts_data") || "[]";
  const availableResources = str(formData, "available_resources") || "";
  const itemsData = str(formData, "items_data") || "[]";
  const evaluationNotes = str(formData, "evaluation_notes") || "";
  const elaboratedBy = str(formData, "elaborated_by") || "[]";
  const reviewedBy = str(formData, "reviewed_by") || "";
  const approvedBy = str(formData, "approved_by") || "";
  const signaturesJson = str(formData, "signatures_json") || "[]";
  const signatureType = str(formData, "signature_type") || null;
  const physicalFileRef = str(formData, "physical_file_ref") || null;
  const physicalEvidenceUrl = str(formData, "physical_evidence_url") || null;

  if (!schoolYearId) {
    try {
      const { ensureDefaultSchoolYear } = await import("@/lib/schoolYear");
      const defaultSy = ensureDefaultSchoolYear(institutionId);
      schoolYearId = defaultSy?.id || "default-sy";
    } catch {
      schoolYearId = "default-sy";
    }
  }

  const existing = db
    .prepare("SELECT id FROM action_plans WHERE institution_id = ? AND school_year_id = ?")
    .get(institutionId, schoolYearId) as { id: string } | undefined;

  if (existing) {
    redirect(`/plan-accion/${existing.id}/editar`);
  }

  const id = randomUUID();

  try {
    db.prepare(
      `INSERT INTO action_plans (
        id, institution_id, school_year_id, school_year_text, students_count,
        coordinator_name, analysts_data, available_resources, items_data,
        evaluation_notes, elaborated_by, reviewed_by, approved_by,
        signatures_json, signature_type, physical_file_ref, physical_evidence_url,
        created_by, created_at, updated_at
      ) VALUES (
        @id, @institution_id, @school_year_id, @school_year_text, @students_count,
        @coordinator_name, @analysts_data, @available_resources, @items_data,
        @evaluation_notes, @elaborated_by, @reviewed_by, @approved_by,
        @signatures_json, @signature_type, @physical_file_ref, @physical_evidence_url,
        @created_by, datetime('now'), datetime('now')
      )`
    ).run({
      id,
      institution_id: institutionId,
      school_year_id: schoolYearId,
      school_year_text: schoolYearText,
      students_count: studentsCount,
      coordinator_name: coordinatorName,
      analysts_data: analystsData,
      available_resources: availableResources,
      items_data: itemsData,
      evaluation_notes: evaluationNotes,
      elaborated_by: elaboratedBy,
      reviewed_by: reviewedBy,
      approved_by: approvedBy,
      signatures_json: signaturesJson,
      signature_type: signatureType,
      physical_file_ref: physicalFileRef,
      physical_evidence_url: physicalEvidenceUrl,
      created_by: session.user.id,
    });

    logAudit({
      userId: session.user.id,
      action: "CREAR",
      entityType: "ActionPlan",
      entityId: id,
      details: `Plan de Acción DECE ${schoolYearText}`,
      institutionId,
    });
  } catch (err: any) {
    console.error("[createActionPlan error]", err);
    return { error: err?.message || "Ocurrió un error al guardar el plan de acción." };
  }

  revalidatePath("/plan-accion");
  redirect("/plan-accion");
}

export async function updateActionPlan(planId: string, prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireRole(["ADMIN", "DECE", "SUPERADMIN", "AUTORIDAD"]);
  const institutionId = requireInstitutionId(session);

  const schoolYearText = str(formData, "school_year_text") || "2025-2026";
  const studentsCount = num(formData, "students_count", 0);
  const coordinatorName = str(formData, "coordinator_name") || "Coordinador DECE";
  const analystsData = str(formData, "analysts_data") || "[]";
  const availableResources = str(formData, "available_resources") || "";
  const itemsData = str(formData, "items_data") || "[]";
  const evaluationNotes = str(formData, "evaluation_notes") || "";
  const elaboratedBy = str(formData, "elaborated_by") || "[]";
  const reviewedBy = str(formData, "reviewed_by") || "";
  const approvedBy = str(formData, "approved_by") || "";

  try {
    const isSuperAdmin = session.user.role === "SUPERADMIN";
    const updateSql = isSuperAdmin
      ? `UPDATE action_plans SET
          school_year_text = @school_year_text,
          students_count = @students_count,
          coordinator_name = @coordinator_name,
          analysts_data = @analysts_data,
          available_resources = @available_resources,
          items_data = @items_data,
          evaluation_notes = @evaluation_notes,
          elaborated_by = @elaborated_by,
          reviewed_by = @reviewed_by,
          approved_by = @approved_by,
          updated_at = datetime('now')
        WHERE id = @id`
      : `UPDATE action_plans SET
          school_year_text = @school_year_text,
          students_count = @students_count,
          coordinator_name = @coordinator_name,
          analysts_data = @analysts_data,
          available_resources = @available_resources,
          items_data = @items_data,
          evaluation_notes = @evaluation_notes,
          elaborated_by = @elaborated_by,
          reviewed_by = @reviewed_by,
          approved_by = @approved_by,
          updated_at = datetime('now')
        WHERE id = @id AND institution_id = @institution_id`;

    db.prepare(updateSql).run({
      id: planId,
      institution_id: institutionId,
      school_year_text: schoolYearText,
      students_count: studentsCount,
      coordinator_name: coordinatorName,
      analysts_data: analystsData,
      available_resources: availableResources,
      items_data: itemsData,
      evaluation_notes: evaluationNotes,
      elaborated_by: elaboratedBy,
      reviewed_by: reviewedBy,
      approved_by: approvedBy,
    });

    logAudit({
      userId: session.user.id,
      action: "EDITAR",
      entityType: "ActionPlan",
      entityId: planId,
      details: `Plan de Acción DECE ${schoolYearText}`,
      institutionId,
    });
  } catch (err: any) {
    console.error("[updateActionPlan error]", err);
    return { error: err?.message || "Ocurrió un error al actualizar el plan de acción." };
  }

  revalidatePath("/plan-accion");
  redirect("/plan-accion");
}

export async function deleteActionPlan(planId: string) {
  const session = await requireRole(["ADMIN", "DECE", "SUPERADMIN", "AUTORIDAD"]);
  const institutionId = requireInstitutionId(session);

  if (session.user.role === "SUPERADMIN") {
    db.prepare("DELETE FROM action_plans WHERE id = ?").run(planId);
  } else {
    db.prepare("DELETE FROM action_plans WHERE id = ? AND institution_id = ?").run(planId, institutionId);
  }

  logAudit({
    userId: session.user.id,
    action: "ELIMINAR",
    entityType: "ActionPlan",
    entityId: planId,
    details: `Plan de Acción eliminado`,
    institutionId,
  });

  revalidatePath("/plan-accion");
}
