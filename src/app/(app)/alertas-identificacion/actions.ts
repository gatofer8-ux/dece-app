"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { str, dateStr, getAllStr } from "@/lib/formData";
import { generateUniqueAccessCode } from "@/lib/alertIdentificationSessions";

function collectAttendees(fd: FormData) {
  const nombres = getAllStr(fd, "att_nombre");
  const telefonos = getAllStr(fd, "att_telefono");
  const out = nombres.map((n, i) => ({ nombre: n, telefono: telefonos[i] || "" })).filter((a) => a.nombre || a.telefono);
  return JSON.stringify(out);
}

export async function createAlertSessionAction(formData: FormData) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  const id = randomUUID();
  const code = generateUniqueAccessCode();

  db.prepare(
    `INSERT INTO alert_identification_sessions
       (id, institution_id, created_by_id, curso, fecha, lugar, responsible_name, responsible_email, responsible_phone_ext, responsible_role, observaciones, access_code)
     VALUES (@id, @institution_id, @created_by_id, @curso, @fecha, @lugar, @responsible_name, @responsible_email, @responsible_phone_ext, @responsible_role, @observaciones, @access_code)`
  ).run({
    id,
    institution_id: institutionId,
    created_by_id: session.user.id,
    curso: str(formData, "curso"),
    fecha: dateStr(formData, "fecha"),
    lugar: str(formData, "lugar"),
    responsible_name: str(formData, "responsible_name"),
    responsible_email: str(formData, "responsible_email"),
    responsible_phone_ext: str(formData, "responsible_phone_ext"),
    responsible_role: str(formData, "responsible_role"),
    observaciones: str(formData, "observaciones"),
    access_code: code,
  });

  logAudit({ userId: session.user.id, action: "CREAR", entityType: "AlertIdentificationSession", entityId: id, institutionId });
  revalidatePath("/alertas-identificacion");
  redirect(`/alertas-identificacion/${id}`);
}

export async function updateAlertSessionAction(id: string, formData: FormData) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  const exists = db.prepare("SELECT id FROM alert_identification_sessions WHERE id = ? AND institution_id = ?").get(id, institutionId);
  if (!exists) throw new Error("Acta no encontrada.");

  db.prepare(
    `UPDATE alert_identification_sessions SET
       curso = @curso, fecha = @fecha, lugar = @lugar,
       responsible_name = @responsible_name, responsible_email = @responsible_email,
       responsible_phone_ext = @responsible_phone_ext, responsible_role = @responsible_role,
       observaciones = @observaciones, attendees_json = @attendees_json,
       updated_at = datetime('now')
     WHERE id = @id AND institution_id = @institution_id`
  ).run({
    id,
    institution_id: institutionId,
    curso: str(formData, "curso"),
    fecha: dateStr(formData, "fecha"),
    lugar: str(formData, "lugar"),
    responsible_name: str(formData, "responsible_name"),
    responsible_email: str(formData, "responsible_email"),
    responsible_phone_ext: str(formData, "responsible_phone_ext"),
    responsible_role: str(formData, "responsible_role"),
    observaciones: str(formData, "observaciones"),
    attendees_json: collectAttendees(formData),
  });

  logAudit({ userId: session.user.id, action: "EDITAR", entityType: "AlertIdentificationSession", entityId: id, institutionId });
  revalidatePath(`/alertas-identificacion/${id}`);
  revalidatePath("/alertas-identificacion");
  redirect(`/alertas-identificacion/${id}`);
}

export async function setAlertSessionStatusAction(id: string, status: "ABIERTA" | "CERRADA") {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  db.prepare(
    "UPDATE alert_identification_sessions SET status = ?, updated_at = datetime('now') WHERE id = ? AND institution_id = ?"
  ).run(status, id, institutionId);
  logAudit({ userId: session.user.id, action: "EDITAR", entityType: "AlertIdentificationSession", entityId: id, institutionId });
  revalidatePath(`/alertas-identificacion/${id}`);
  revalidatePath("/alertas-identificacion");
}

export async function deleteAlertSessionAction(id: string): Promise<void | { error: string }> {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  db.prepare("DELETE FROM alert_identification_entries WHERE session_id = ? AND institution_id = ?").run(id, institutionId);
  db.prepare("DELETE FROM alert_identification_sessions WHERE id = ? AND institution_id = ?").run(id, institutionId);
  logAudit({ userId: session.user.id, action: "BORRAR", entityType: "AlertIdentificationSession", entityId: id, institutionId });
  revalidatePath("/alertas-identificacion");
}

export async function deleteAlertEntryAction(id: string, sessionId: string): Promise<void | { error: string }> {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  db.prepare("DELETE FROM alert_identification_entries WHERE id = ? AND institution_id = ?").run(id, institutionId);
  logAudit({ userId: session.user.id, action: "BORRAR", entityType: "AlertIdentificationEntry", entityId: id, institutionId });
  revalidatePath(`/alertas-identificacion/${sessionId}`);
}
