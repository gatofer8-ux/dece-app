"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
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

/** Campos comunes de creación y actualización del plan bianual. */
function readFields(formData: FormData) {
  const startYear = str(formData, "period_start_year") || String(new Date().getFullYear());
  const endYear =
    str(formData, "period_end_year") || String(parseInt(startYear, 10) + 2);

  return {
    period_start_year: startYear,
    period_end_year: endYear,
    period_text: str(formData, "period_text") || `${startYear}-${endYear}`,
    district_code: str(formData, "district_code"),
    district_name: str(formData, "district_name"),
    coordinator_name: str(formData, "coordinator_name"),
    analysts_data: str(formData, "analysts_data") || "[]",
    students_count: num(formData, "students_count", 0),
    professionals_count: num(formData, "professionals_count", 0),
    available_resources: str(formData, "available_resources"),
    socioeconomic_condition: str(formData, "socioeconomic_condition"),
    general_objective: str(formData, "general_objective"),
    specific_objectives: str(formData, "specific_objectives") || "[]",
    axis_items_data: str(formData, "axis_items_data") || "[]",
    elaborated_by: str(formData, "elaborated_by") || "[]",
    reviewed_by: str(formData, "reviewed_by"),
    approved_by: str(formData, "approved_by"),
  };
}

export async function createStrategicBianualPlan(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await requireRole(["ADMIN", "DECE", "SUPERADMIN", "AUTORIDAD"]);
  const institutionId = requireInstitutionId(session);

  const fields = readFields(formData);
  if (!fields.coordinator_name) {
    fields.coordinator_name = session.user.name || "Coordinador DECE";
  }

  const id = randomUUID();

  try {
    db.prepare(
      `INSERT INTO strategic_plans_bianual (
        id, institution_id, period_start_year, period_end_year, period_text,
        district_code, district_name, coordinator_name, analysts_data,
        students_count, professionals_count, available_resources, socioeconomic_condition,
        general_objective, specific_objectives, axis_items_data,
        elaborated_by, reviewed_by, approved_by,
        created_by, created_at, updated_at
      ) VALUES (
        @id, @institution_id, @period_start_year, @period_end_year, @period_text,
        @district_code, @district_name, @coordinator_name, @analysts_data,
        @students_count, @professionals_count, @available_resources, @socioeconomic_condition,
        @general_objective, @specific_objectives, @axis_items_data,
        @elaborated_by, @reviewed_by, @approved_by,
        @created_by, datetime('now'), datetime('now')
      )`
    ).run({
      id,
      institution_id: institutionId,
      ...fields,
      created_by: session.user.id,
    });

    logAudit({
      userId: session.user.id,
      action: "CREAR",
      entityType: "StrategicBianualPlan",
      entityId: id,
      details: `Plan Estratégico Bianual DECE ${fields.period_text}`,
      institutionId,
    });
  } catch (err: any) {
    console.error("[createStrategicBianualPlan error]", err);
    return {
      error: err?.message || "Ocurrió un error al guardar el plan estratégico bianual.",
    };
  }

  revalidatePath("/plan-estrategico-bianual");
  redirect("/plan-estrategico-bianual");
}

export async function updateStrategicBianualPlan(
  planId: string,
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await requireRole(["ADMIN", "DECE", "SUPERADMIN", "AUTORIDAD"]);
  const institutionId = requireInstitutionId(session);

  const fields = readFields(formData);
  if (!fields.coordinator_name) {
    fields.coordinator_name = "Coordinador DECE";
  }

  try {
    const isSuperAdmin = session.user.role === "SUPERADMIN";
    const setClause = `SET
          period_start_year = @period_start_year,
          period_end_year = @period_end_year,
          period_text = @period_text,
          district_code = @district_code,
          district_name = @district_name,
          coordinator_name = @coordinator_name,
          analysts_data = @analysts_data,
          students_count = @students_count,
          professionals_count = @professionals_count,
          available_resources = @available_resources,
          socioeconomic_condition = @socioeconomic_condition,
          general_objective = @general_objective,
          specific_objectives = @specific_objectives,
          axis_items_data = @axis_items_data,
          elaborated_by = @elaborated_by,
          reviewed_by = @reviewed_by,
          approved_by = @approved_by,
          updated_at = datetime('now')`;

    const updateSql = isSuperAdmin
      ? `UPDATE strategic_plans_bianual ${setClause} WHERE id = @id`
      : `UPDATE strategic_plans_bianual ${setClause} WHERE id = @id AND institution_id = @institution_id`;

    db.prepare(updateSql).run({
      id: planId,
      institution_id: institutionId,
      ...fields,
    });

    logAudit({
      userId: session.user.id,
      action: "EDITAR",
      entityType: "StrategicBianualPlan",
      entityId: planId,
      details: `Plan Estratégico Bianual DECE ${fields.period_text}`,
      institutionId,
    });
  } catch (err: any) {
    console.error("[updateStrategicBianualPlan error]", err);
    return {
      error: err?.message || "Ocurrió un error al actualizar el plan estratégico bianual.",
    };
  }

  revalidatePath("/plan-estrategico-bianual");
  redirect("/plan-estrategico-bianual");
}

export async function deleteStrategicBianualPlan(planId: string) {
  const session = await requireRole(["ADMIN", "DECE", "SUPERADMIN", "AUTORIDAD"]);
  const institutionId = requireInstitutionId(session);

  if (session.user.role === "SUPERADMIN") {
    db.prepare("DELETE FROM strategic_plans_bianual WHERE id = ?").run(planId);
  } else {
    db.prepare(
      "DELETE FROM strategic_plans_bianual WHERE id = ? AND institution_id = ?"
    ).run(planId, institutionId);
  }

  logAudit({
    userId: session.user.id,
    action: "ELIMINAR",
    entityType: "StrategicBianualPlan",
    entityId: planId,
    details: "Plan Estratégico Bianual eliminado",
    institutionId,
  });

  revalidatePath("/plan-estrategico-bianual");
}
