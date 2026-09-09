"use server";

import { requireRole } from "@/lib/session";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import type { SchoolYearRegime } from "@/lib/types";

export async function createSchoolYearAction(formData: FormData) {
  const session = await requireRole(["ADMIN"]);
  const institutionId = session.user.institution_id;
  if (!institutionId) throw new Error("No perteneces a una institución.");

  const name = String(formData.get("name") || "").trim();
  const regime = String(formData.get("regime") || "SIERRA_AMAZONIA") as SchoolYearRegime;
  const start_date = String(formData.get("start_date") || "").trim();
  const end_date = String(formData.get("end_date") || "").trim();
  const is_active = formData.get("is_active") === "on" ? 1 : 0;

  if (!name || !start_date || !end_date) {
    throw new Error("El nombre, fecha de inicio y fecha de fin son obligatorios.");
  }

  const id = randomUUID();

  if (is_active === 1) {
    // Desactivar el anterior activo
    db.prepare("UPDATE school_years SET is_active = 0 WHERE institution_id = ?").run(institutionId);
  }

  db.prepare(
    `INSERT INTO school_years (id, institution_id, name, regime, start_date, end_date, is_active, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
  ).run(id, institutionId, name, regime, start_date, end_date, is_active);

  logAudit({
    institutionId,
    userId: session.user.id,
    action: "CREAR",
    entityType: "SCHOOL_YEAR",
    entityId: id,
    details: `Creó el año lectivo: ${name} (${regime})`,
  });

  revalidatePath("/anios-lectivos");
  revalidatePath("/dashboard");
}

export async function setActiveSchoolYearAction(yearId: string) {
  const session = await requireRole(["ADMIN"]);
  const institutionId = session.user.institution_id;
  if (!institutionId) throw new Error("No perteneces a una institución.");

  db.prepare("UPDATE school_years SET is_active = 0 WHERE institution_id = ?").run(institutionId);
  db.prepare("UPDATE school_years SET is_active = 1 WHERE id = ? AND institution_id = ?").run(
    yearId,
    institutionId
  );

  logAudit({
    institutionId,
    userId: session.user.id,
    action: "EDITAR",
    entityType: "SCHOOL_YEAR",
    entityId: yearId,
    details: `Marcó el año lectivo como activo por defecto`,
  });

  revalidatePath("/anios-lectivos");
  revalidatePath("/dashboard");
}
