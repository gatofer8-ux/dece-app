"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { str, dateStr, getAllStr } from "@/lib/formData";

const TEXT_COLS = ["ciudad", "meeting_date", "tema", "hora_inicio", "hora_fin", "lugar", "desarrollo"] as const;

function collectParticipants(fd: FormData) {
  const nombres = getAllStr(fd, "p_nombre");
  const cargos = getAllStr(fd, "p_cargo");
  const out = nombres.map((n, i) => ({ nombre: n, cargo: cargos[i] || "" })).filter((p) => p.nombre || p.cargo);
  return JSON.stringify(out);
}
function collectCompromisos(fd: FormData) {
  const comps = getAllStr(fd, "c_compromiso");
  const resps = getAllStr(fd, "c_responsable");
  const fechas = getAllStr(fd, "c_fecha");
  const out = comps
    .map((c, i) => ({ compromiso: c, responsable: resps[i] || "", fecha: fechas[i] || "" }))
    .filter((x) => x.compromiso || x.responsable || x.fecha);
  return JSON.stringify(out);
}

function payload(fd: FormData) {
  const o: Record<string, string | null> = {};
  for (const c of TEXT_COLS) o[c] = c === "meeting_date" ? dateStr(fd, c) : str(fd, c);
  o.participants_json = collectParticipants(fd);
  o.compromisos_json = collectCompromisos(fd);
  return o;
}

export async function createEneisActaAction(formData: FormData) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  const id = randomUUID();
  const v = payload(formData);
  const cols = Object.keys(v);
  db.prepare(
    `INSERT INTO eneis_actas (id, institution_id, created_by_id, ${cols.join(", ")})
     VALUES (@id, @institution_id, @created_by_id, ${cols.map((c) => `@${c}`).join(", ")})`
  ).run({ id, institution_id: institutionId, created_by_id: session.user.id, ...v });
  logAudit({ userId: session.user.id, action: "CREAR", entityType: "EneisActa", entityId: id, institutionId });
  revalidatePath("/eneis/actas");
  redirect(`/eneis/actas/${id}/imprimir`);
}

export async function updateEneisActaAction(id: string, formData: FormData) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  const exists = db.prepare("SELECT id FROM eneis_actas WHERE id = ? AND institution_id = ?").get(id, institutionId);
  if (!exists) throw new Error("Acta no encontrada.");
  const v = payload(formData);
  const cols = Object.keys(v);
  db.prepare(
    `UPDATE eneis_actas SET ${cols.map((c) => `${c} = @${c}`).join(", ")}, updated_at = datetime('now') WHERE id = @id AND institution_id = @institution_id`
  ).run({ id, institution_id: institutionId, ...v });
  logAudit({ userId: session.user.id, action: "EDITAR", entityType: "EneisActa", entityId: id, institutionId });
  revalidatePath("/eneis/actas");
  redirect(`/eneis/actas/${id}/imprimir`);
}

export async function deleteEneisActaAction(id: string): Promise<void | { error: string }> {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  db.prepare("DELETE FROM eneis_actas WHERE id = ? AND institution_id = ?").run(id, institutionId);
  logAudit({ userId: session.user.id, action: "BORRAR", entityType: "EneisActa", entityId: id, institutionId });
  revalidatePath("/eneis/actas");
}
