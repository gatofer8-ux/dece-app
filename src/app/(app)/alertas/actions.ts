"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { logAudit } from "@/lib/audit";

function str(fd: FormData, key: string): string | null {
  const v = fd.get(key);
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length ? t : null;
}

export async function createAlert(formData: FormData) {
  const session = await requireRole(["ADMIN", "DECE", "DOCENTE"]);
  const institutionId = requireInstitutionId(session);
  const id = randomUUID();

  db.prepare(
    `INSERT INTO teacher_alerts (id, institution_id, student_id, reported_by_id, description, status)
     VALUES (?, ?, ?, ?, ?, 'PENDIENTE')`
  ).run(id, institutionId, str(formData, "student_id"), session.user.id, str(formData, "description") || "");

  logAudit({ userId: session.user.id, action: "CREAR", entityType: "TeacherAlert", entityId: id, institutionId });
  revalidatePath("/alertas");
  redirect("/alertas");
}

export async function updateAlertStatus(id: string, status: string) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  db.prepare(`UPDATE teacher_alerts SET status=?, updated_at=datetime('now') WHERE id=? AND institution_id=?`).run(status, id, institutionId);
  logAudit({ userId: session.user.id, action: "EDITAR", entityType: "TeacherAlert", entityId: id, details: status, institutionId });
  revalidatePath("/alertas");
}
