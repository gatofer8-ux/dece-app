"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { str, dateStr } from "@/lib/formData";
import {
  createSurveySession,
  setSurveySessionStatus,
  deleteSurveySession,
} from "@/lib/eneis/eneisSurveySessions";
import type { EneisSurveyInstrument } from "@/lib/eneis/eneisSurveyInstrument";

export async function createEneisSurveySessionAction(formData: FormData) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);

  const instrumentRaw = str(formData, "instrument");
  const instrument: EneisSurveyInstrument = instrumentRaw === "DOCENTES" ? "DOCENTES" : "ESTUDIANTES";
  const title = str(formData, "title") || (instrument === "DOCENTES" ? "Encuesta a Docentes — ENEIS" : "Encuesta a Estudiantes — ENEIS");
  const opensAt = dateStr(formData, "opens_at");
  const closesAt = dateStr(formData, "closes_at");

  const id = createSurveySession({ institutionId, title, instrument, opensAt, closesAt, createdBy: session.user.id });

  logAudit({ userId: session.user.id, action: "CREAR", entityType: "EneisSurveySession", entityId: id, institutionId });
  revalidatePath("/eneis/encuestas");
  redirect(`/eneis/encuestas/${id}`);
}

export async function setEneisSurveySessionStatusAction(id: string, status: "ABIERTA" | "CERRADA") {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  setSurveySessionStatus(id, institutionId, status);
  logAudit({ userId: session.user.id, action: "EDITAR", entityType: "EneisSurveySession", entityId: id, institutionId });
  revalidatePath(`/eneis/encuestas/${id}`);
  revalidatePath("/eneis/encuestas");
}

export async function deleteEneisSurveySessionAction(id: string): Promise<void | { error: string }> {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  deleteSurveySession(id, institutionId);
  logAudit({ userId: session.user.id, action: "BORRAR", entityType: "EneisSurveySession", entityId: id, institutionId });
  revalidatePath("/eneis/encuestas");
}
