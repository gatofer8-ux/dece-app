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
import { TAPAS_INSTRUMENTS, TAPAS_NIVELES, isTapasInstrument, resolveInstrumentAndNivel, type TapasInstrument, type TapasNivel } from "@/lib/tapas/niveles";
import { buildPlan, parsePlan } from "@/lib/tapas/plan";
import type { TapasSessionRow } from "@/lib/types";

export async function createTapasSession(formData: FormData) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  const year = await getSelectedSchoolYear(institutionId);

  const id = randomUUID();
  let instrument: TapasInstrument;
  let nivel: TapasNivel;
  let planJson: string | null = null;
  if (str(formData, "tipo") === "PROCESO") {
    const built = buildPlan(formData.getAll("instruments"), str(formData, "nivel"), str(formData, "modo"), str(formData, "minutos_hora"));
    if (!built.ok) throw new Error(built.error);
    nivel = built.nivel;
    instrument = built.plan.instruments[0];
    // Con una sola hoja marcada se guarda como aplicación simple.
    if (built.plan.instruments.length > 1) planJson = JSON.stringify(built.plan);
  } else {
    const resolved = resolveInstrumentAndNivel(str(formData, "instrument"), str(formData, "nivel"));
    if (!resolved.ok) throw new Error(resolved.error);
    instrument = resolved.instrument;
    nivel = resolved.nivel;
  }
  const title =
    str(formData, "title") ||
    (planJson ? `Proceso TaPas — ${TAPAS_NIVELES[nivel].label}` : `${TAPAS_INSTRUMENTS[instrument].label} — ${TAPAS_NIVELES[nivel].label}`);
  const course = str(formData, "course");
  const parallel = str(formData, "parallel");
  const jornada = str(formData, "jornada");
  const opensAt = str(formData, "opens_at");
  const closesAt = str(formData, "closes_at");
  const code = generateUniqueTapasCode();

  db.prepare(
    `INSERT INTO tapas_sessions (id, institution_id, created_by_id, school_year_id, title, course, parallel, jornada, access_code, status, opens_at, closes_at, instrument, nivel, plan_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ABIERTA', ?, ?, ?, ?, ?)`
  ).run(id, institutionId, session.user.id, year?.id ?? null, title, course, parallel, jornada, code, opensAt, closesAt, instrument, nivel, planJson);

  logAudit({ userId: session.user.id, action: "CREAR", entityType: "TapasSession", entityId: id, institutionId });
  revalidatePath("/tapas");
  redirect(`/tapas/${id}`);
}

/** Habilita o cierra una hoja de un proceso de varias hojas (modalidad «en varias horas de clase»). */
export async function setTapasHojaOpen(sessionId: string, instrument: string, open: boolean) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  const s = db.prepare("SELECT * FROM tapas_sessions WHERE id = ? AND institution_id = ?").get(sessionId, institutionId) as
    | TapasSessionRow
    | undefined;
  if (!s || !s.plan_json || !isTapasInstrument(instrument)) return;
  const plan = parsePlan(s);
  if (!plan.instruments.includes(instrument)) return;
  const nextOpen = open ? Array.from(new Set([...plan.open, instrument])) : plan.open.filter((i) => i !== instrument);
  // Si se abren todas, sigue siendo «varias sesiones»: el DECE decide cuándo cerrar o abrir.
  const next = { ...plan, modo: "VARIAS" as const, open: plan.instruments.filter((i) => nextOpen.includes(i)) };
  db.prepare("UPDATE tapas_sessions SET plan_json = ?, updated_at = datetime('now') WHERE id = ?").run(JSON.stringify(next), sessionId);
  logAudit({ userId: session.user.id, action: "EDITAR", entityType: "TapasSession", entityId: sessionId, institutionId });
  revalidatePath(`/tapas/${sessionId}`);
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
