"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { str } from "@/lib/formData";
import { getSelectedSchoolYear } from "@/lib/schoolYear";
import { generateUniqueTapasCode } from "@/lib/tapas/tapasSessions";
import { suggestTapasGroupName, suggestTapasAreas } from "@/lib/ai";
import { ARCHETYPE_MAP } from "@/lib/tapas/archetypes";

export async function createTapasSession(formData: FormData) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  const year = await getSelectedSchoolYear(institutionId);

  const id = randomUUID();
  const title = str(formData, "title") || "Juego de arquetipos TaPas";
  const course = str(formData, "course");
  const parallel = str(formData, "parallel");
  const jornada = str(formData, "jornada");
  const opensAt = str(formData, "opens_at");
  const closesAt = str(formData, "closes_at");
  const code = generateUniqueTapasCode();

  db.prepare(
    `INSERT INTO tapas_sessions (id, institution_id, created_by_id, school_year_id, title, course, parallel, jornada, access_code, status, opens_at, closes_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ABIERTA', ?, ?)`
  ).run(id, institutionId, session.user.id, year?.id ?? null, title, course, parallel, jornada, code, opensAt, closesAt);

  logAudit({ userId: session.user.id, action: "CREAR", entityType: "TapasSession", entityId: id, institutionId });
  revalidatePath("/tapas");
  redirect(`/tapas/${id}`);
}

export async function setTapasSessionStatus(id: string, status: "ABIERTA" | "CERRADA") {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  db.prepare(
    "UPDATE tapas_sessions SET status = ?, updated_at = datetime('now') WHERE id = ? AND institution_id = ?"
  ).run(status, id, institutionId);
  logAudit({ userId: session.user.id, action: "EDITAR", entityType: "TapasSession", entityId: id, institutionId });
  revalidatePath(`/tapas/${id}`);
  revalidatePath("/tapas");
}

export async function deleteTapasSession(id: string): Promise<void | { error: string }> {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  const finalizedCount = (
    db
      .prepare("SELECT COUNT(*) AS c FROM tapas_applications WHERE session_id = ? AND status = 'FINALIZADA'")
      .get(id) as { c: number }
  ).c;
  if (finalizedCount > 0) {
    return { error: "No se puede eliminar: ya tiene juegos finalizados. Ciérrala en su lugar." };
  }
  db.prepare("DELETE FROM tapas_applications WHERE session_id = ? AND institution_id = ?").run(id, institutionId);
  db.prepare("DELETE FROM tapas_sessions WHERE id = ? AND institution_id = ?").run(id, institutionId);
  logAudit({ userId: session.user.id, action: "BORRAR", entityType: "TapasSession", entityId: id, institutionId });
  revalidatePath("/tapas");
}

export async function deleteTapasApplication(sessionId: string, appId: string) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  db.prepare("DELETE FROM tapas_applications WHERE id = ? AND session_id = ? AND institution_id = ?").run(
    appId,
    sessionId,
    institutionId
  );
  logAudit({ userId: session.user.id, action: "BORRAR", entityType: "TapasApplication", entityId: appId, institutionId });
  revalidatePath(`/tapas/${sessionId}`);
}

/** Sugerencia de áreas de estudio para el perfil de un/a estudiante (uso del DECE). */
export async function draftTapasAreas(
  groups: { name: string; archetypes: string[] }[]
): Promise<{ text?: string; error?: string }> {
  await requireRole(["ADMIN", "DECE", "AUTORIDAD"]);
  const named = groups
    .filter((g) => g.archetypes.length > 0)
    .map((g) => ({
      name: g.name,
      archetypes: g.archetypes.map((k) => ARCHETYPE_MAP[k]?.name || k),
    }));
  return suggestTapasAreas(named);
}

export { suggestTapasGroupName };
