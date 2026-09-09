"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { HOUR_SLOTS, isValidHourSlot } from "@/lib/schedule";

function requireCanManageSchedule(
  session: { user: { id: string; role: string; institution_id: string | null } },
  institutionId: string,
  professionalId: string
) {
  if (session.user.role !== "ADMIN" && professionalId !== session.user.id) {
    throw new Error("Solo puedes administrar tu propia disponibilidad.");
  }
  const professional = db
    .prepare("SELECT id FROM users WHERE id = ? AND institution_id = ? AND role IN ('DECE','ADMIN') AND active = 1")
    .get(professionalId, institutionId);
  if (!professional) throw new Error("Profesional no encontrado en tu institución.");
}

export async function setSlotAvailability(
  professionalId: string,
  date: string,
  hour: string,
  available: boolean,
  activityType?: string | null,
  activityTitle?: string | null
) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  requireCanManageSchedule(session, institutionId, professionalId);
  if (!isValidHourSlot(hour)) throw new Error("Hora inválida.");

  db.prepare(
    `INSERT INTO professional_schedule_slots (id, institution_id, professional_id, date, hour, available, activity_type, activity_title)
     VALUES (@id, @institution_id, @professional_id, @date, @hour, @available, @activity_type, @activity_title)
     ON CONFLICT(professional_id, date, hour) DO UPDATE SET 
       available = @available,
       activity_type = @activity_type,
       activity_title = @activity_title,
       updated_at = datetime('now')`
  ).run({
    id: randomUUID(),
    institution_id: institutionId,
    professional_id: professionalId,
    date,
    hour,
    available: available ? 1 : 0,
    activity_type: activityType || null,
    activity_title: activityTitle || null,
  });

  revalidatePath("/citas");
  revalidatePath("/citas/disponibilidad");
}

export async function blockSlotWithActivity(
  professionalId: string,
  date: string,
  hour: string,
  activityType: string,
  activityTitle: string
) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  requireCanManageSchedule(session, institutionId, professionalId);
  if (!isValidHourSlot(hour)) throw new Error("Hora inválida.");

  db.prepare(
    `INSERT INTO professional_schedule_slots (id, institution_id, professional_id, date, hour, available, activity_type, activity_title)
     VALUES (@id, @institution_id, @professional_id, @date, @hour, 0, @activity_type, @activity_title)
     ON CONFLICT(professional_id, date, hour) DO UPDATE SET 
       available = 0,
       activity_type = @activity_type,
       activity_title = @activity_title,
       updated_at = datetime('now')`
  ).run({
    id: randomUUID(),
    institution_id: institutionId,
    professional_id: professionalId,
    date,
    hour,
    activity_type: activityType || "OTRA_ACTIVIDAD",
    activity_title: activityTitle.trim(),
  });

  revalidatePath("/citas");
  revalidatePath("/citas/disponibilidad");
}

export async function setDayAvailability(professionalId: string, date: string, available: boolean) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  requireCanManageSchedule(session, institutionId, professionalId);

  const upsert = db.prepare(
    `INSERT INTO professional_schedule_slots (id, institution_id, professional_id, date, hour, available, activity_type, activity_title)
     VALUES (@id, @institution_id, @professional_id, @date, @hour, @available, NULL, NULL)
     ON CONFLICT(professional_id, date, hour) DO UPDATE SET 
       available = @available,
       activity_type = NULL,
       activity_title = NULL,
       updated_at = datetime('now')`
  );
  const runAll = db.transaction(() => {
    for (const hour of HOUR_SLOTS) {
      upsert.run({
        id: randomUUID(),
        institution_id: institutionId,
        professional_id: professionalId,
        date,
        hour,
        available: available ? 1 : 0,
      });
    }
  });
  runAll();

  logAudit({
    userId: session.user.id,
    action: "EDITAR",
    entityType: "ScheduleDay",
    entityId: `${professionalId}:${date}`,
    details: available ? "Día habilitado completo" : "Día deshabilitado completo",
    institutionId,
  });
  revalidatePath("/citas");
  revalidatePath("/citas/disponibilidad");
}

export async function saveCoverageAndProfile(
  professionalId: string,
  coverageCourses: string[],
  jobTitle: string
) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  requireCanManageSchedule(session, institutionId, professionalId);

  db.prepare(
    `UPDATE users SET 
       coverage_courses = ?,
       job_title = ?,
       updated_at = datetime('now')
     WHERE id = ? AND institution_id = ?`
  ).run(JSON.stringify(coverageCourses), jobTitle.trim() || null, professionalId, institutionId);

  logAudit({
    userId: session.user.id,
    action: "EDITAR",
    entityType: "UserCoverage",
    entityId: professionalId,
    details: `Actualizada cobertura de cursos: ${coverageCourses.join(", ")}`,
    institutionId,
  });

  revalidatePath("/citas");
  revalidatePath("/citas/disponibilidad");
  revalidatePath(`/solicitar-cita/${institutionId}`);
}
