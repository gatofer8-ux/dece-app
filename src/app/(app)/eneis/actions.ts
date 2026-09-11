"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { str, dateStr } from "@/lib/formData";
import {
  createEneisSession,
  setEneisSessionStatus,
  deleteEneisSession,
  deleteEneisFicha,
} from "@/lib/eneis/eneisSessions";

export async function createEneisSessionAction(formData: FormData) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);

  const title = str(formData, "title") || "Fichas ENEIS";
  const opensAt = dateStr(formData, "opens_at");
  const closesAt = dateStr(formData, "closes_at");

  const id = createEneisSession({ institutionId, title, opensAt, closesAt, createdBy: session.user.id });

  logAudit({ userId: session.user.id, action: "CREAR", entityType: "EneisSession", entityId: id, institutionId });
  revalidatePath("/eneis");
  redirect(`/eneis/${id}`);
}

export async function setEneisSessionStatusAction(id: string, status: "ABIERTA" | "CERRADA") {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  setEneisSessionStatus(id, institutionId, status);
  logAudit({ userId: session.user.id, action: "EDITAR", entityType: "EneisSession", entityId: id, institutionId });
  revalidatePath(`/eneis/${id}`);
  revalidatePath("/eneis");
}

export async function deleteEneisSessionAction(id: string): Promise<void | { error: string }> {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  deleteEneisSession(id, institutionId);
  logAudit({ userId: session.user.id, action: "BORRAR", entityType: "EneisSession", entityId: id, institutionId });
  revalidatePath("/eneis");
}

export async function deleteEneisFichaAction(sessionId: string, fichaId: string): Promise<void | { error: string }> {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  deleteEneisFicha(fichaId, sessionId, institutionId);
  logAudit({ userId: session.user.id, action: "BORRAR", entityType: "EneisFicha", entityId: fichaId, institutionId });
  revalidatePath(`/eneis/${sessionId}`);
}
