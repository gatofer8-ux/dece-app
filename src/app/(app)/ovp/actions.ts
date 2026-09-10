"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { str } from "@/lib/formData";
import { getSelectedSchoolYear } from "@/lib/schoolYear";
import { generateUniqueAccessCode } from "@/lib/ovp/ovpSessions";

export async function createOvpSession(formData: FormData) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  const year = await getSelectedSchoolYear(institutionId);

  const id = randomUUID();
  const title = str(formData, "title") || "Aplicación IPPJ";
  const course = str(formData, "course");
  const parallel = str(formData, "parallel");
  const jornada = str(formData, "jornada");
  const opensAt = str(formData, "opens_at");
  const closesAt = str(formData, "closes_at");
  const code = generateUniqueAccessCode();

  db.prepare(
    `INSERT INTO ovp_sessions (id, institution_id, created_by_id, school_year_id, title, instrument, course, parallel, jornada, access_code, status, opens_at, closes_at)
     VALUES (?, ?, ?, ?, ?, 'IPPJ', ?, ?, ?, ?, 'ABIERTA', ?, ?)`
  ).run(id, institutionId, session.user.id, year?.id ?? null, title, course, parallel, jornada, code, opensAt, closesAt);

  logAudit({ userId: session.user.id, action: "CREAR", entityType: "OvpSession", entityId: id, institutionId });
  revalidatePath("/ovp");
  redirect(`/ovp/${id}`);
}

export async function setOvpSessionStatus(id: string, status: "ABIERTA" | "CERRADA") {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  db.prepare(
    "UPDATE ovp_sessions SET status = ?, updated_at = datetime('now') WHERE id = ? AND institution_id = ?"
  ).run(status, id, institutionId);
  logAudit({ userId: session.user.id, action: "EDITAR", entityType: "OvpSession", entityId: id, institutionId });
  revalidatePath(`/ovp/${id}`);
  revalidatePath("/ovp");
}

export async function deleteOvpSession(id: string): Promise<void | { error: string }> {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  const finalizedCount = (
    db
      .prepare("SELECT COUNT(*) AS c FROM ovp_applications WHERE session_id = ? AND status = 'FINALIZADA'")
      .get(id) as { c: number }
  ).c;
  if (finalizedCount > 0) {
    return { error: "No se puede eliminar: la aplicación ya tiene cuestionarios finalizados. Ciérrala en su lugar." };
  }
  db.prepare("DELETE FROM ovp_applications WHERE session_id = ? AND institution_id = ?").run(id, institutionId);
  db.prepare("DELETE FROM ovp_sessions WHERE id = ? AND institution_id = ?").run(id, institutionId);
  logAudit({ userId: session.user.id, action: "BORRAR", entityType: "OvpSession", entityId: id, institutionId });
  revalidatePath("/ovp");
}

export async function deleteOvpApplication(sessionId: string, appId: string) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  db.prepare("DELETE FROM ovp_applications WHERE id = ? AND session_id = ? AND institution_id = ?").run(
    appId,
    sessionId,
    institutionId
  );
  logAudit({ userId: session.user.id, action: "BORRAR", entityType: "OvpApplication", entityId: appId, institutionId });
  revalidatePath(`/ovp/${sessionId}`);
}
