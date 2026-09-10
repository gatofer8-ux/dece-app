"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { str, getAllStr } from "@/lib/formData";
import { AI_FIELD_LABELS } from "@/lib/meetingMinutes";
import { draftText, isAiConfigured } from "@/lib/ai";
import type { MeetingMinutesRow } from "@/lib/types";

const TEXT_COLS = [
  "meeting_code", "meeting_date", "next_meeting_date",
  "responsible_name", "responsible_email", "responsible_phone_ext", "responsible_role",
  "meeting_topic", "start_time", "end_time", "location", "thematic_background", "additional_comments",
] as const;

function collectAttendees(fd: FormData) {
  const nombres = getAllStr(fd, "att_nombre");
  const correos = getAllStr(fd, "att_correo");
  const cargos = getAllStr(fd, "att_cargo");
  const out = nombres
    .map((n, i) => ({ nombre: n, correo: correos[i] || "", cargo: cargos[i] || "" }))
    .filter((a) => a.nombre || a.correo || a.cargo);
  return JSON.stringify(out);
}
function collectAgenda(fd: FormData) {
  const temas = getAllStr(fd, "ag_tema");
  const comps = getAllStr(fd, "ag_compromiso");
  const resps = getAllStr(fd, "ag_responsable");
  const plazos = getAllStr(fd, "ag_fecha_plazo");
  const out = temas
    .map((t, i) => ({ tema: t, compromiso: comps[i] || "", responsable: resps[i] || "", fecha_plazo: plazos[i] || "" }))
    .filter((x) => x.tema || x.compromiso || x.responsable || x.fecha_plazo);
  return JSON.stringify(out);
}
function collectSignatories(fd: FormData) {
  const out = getAllStr(fd, "sig_nombre").filter(Boolean).map((n) => ({ nombre: n }));
  return JSON.stringify(out);
}

function payload(fd: FormData) {
  const o: Record<string, string | null> = {};
  for (const c of TEXT_COLS) o[c] = str(fd, c);
  o.attendees_json = collectAttendees(fd);
  o.agenda_json = collectAgenda(fd);
  o.signatories_json = collectSignatories(fd);
  return o;
}

export async function createMeetingMinutes(formData: FormData) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  const id = randomUUID();
  const v = payload(formData);
  const cols = Object.keys(v);
  db.prepare(
    `INSERT INTO meeting_minutes (id, institution_id, created_by_id, ${cols.join(", ")})
     VALUES (@id, @institution_id, @created_by_id, ${cols.map((c) => `@${c}`).join(", ")})`
  ).run({ id, institution_id: institutionId, created_by_id: session.user.id, ...v });
  logAudit({ userId: session.user.id, action: "CREAR", entityType: "MeetingMinutes", entityId: id, institutionId });
  revalidatePath("/actas-reunion");
  redirect(`/actas-reunion/${id}/imprimir`);
}

export async function updateMeetingMinutes(id: string, formData: FormData) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  const exists = db.prepare("SELECT id FROM meeting_minutes WHERE id = ? AND institution_id = ?").get(id, institutionId);
  if (!exists) throw new Error("Acta no encontrada.");
  const v = payload(formData);
  const cols = Object.keys(v);
  db.prepare(
    `UPDATE meeting_minutes SET ${cols.map((c) => `${c} = @${c}`).join(", ")}, updated_at = datetime('now') WHERE id = @id AND institution_id = @institution_id`
  ).run({ id, institution_id: institutionId, ...v });
  logAudit({ userId: session.user.id, action: "EDITAR", entityType: "MeetingMinutes", entityId: id, institutionId });
  revalidatePath("/actas-reunion");
  redirect(`/actas-reunion/${id}/imprimir`);
}

export async function deleteMeetingMinutes(id: string) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  db.prepare("DELETE FROM meeting_minutes WHERE id = ? AND institution_id = ?").run(id, institutionId);
  logAudit({ userId: session.user.id, action: "BORRAR", entityType: "MeetingMinutes", entityId: id, institutionId });
  revalidatePath("/actas-reunion");
  redirect("/actas-reunion");
}

export async function draftMeetingField(
  fieldKey: keyof typeof AI_FIELD_LABELS,
  currentText: string,
  ctx: { topic?: string }
): Promise<{ text?: string; error?: string }> {
  await requireRole(["ADMIN", "DECE"]);
  if (!isAiConfigured()) return { error: "La ayuda de IA todavía no está configurada." };
  const label = AI_FIELD_LABELS[fieldKey];
  if (!label) return { error: "Campo no válido." };
  const context = ctx.topic ? `Tema de la reunión: ${ctx.topic}` : "";
  const result = await draftText({ fieldLabel: label, context, currentText: currentText || "" });
  if ("error" in result) return { error: result.error };
  return { text: result.text };
}

export type { MeetingMinutesRow };
