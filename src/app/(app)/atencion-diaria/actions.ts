"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import type { AttendeeType } from "@/lib/dailyAttention";

function str(fd: FormData, key: string): string | null {
  const v = fd.get(key);
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length ? t : null;
}

const ATTENDEE_TYPES: AttendeeType[] = ["ESTUDIANTE", "REPRESENTANTE", "DOCENTE_AUTORIDAD"];

/** Registra una atención diaria (estudiante, representante, o docente/autoridad). */
export async function createDailyAttention(formData: FormData) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);

  const attendeeType = str(formData, "attendee_type");
  if (!attendeeType || !ATTENDEE_TYPES.includes(attendeeType as AttendeeType)) {
    throw new Error("Tipo de atención inválido.");
  }
  const reason = str(formData, "reason");
  if (!reason) throw new Error("El motivo de la atención es obligatorio.");

  const id = randomUUID();
  const actionAxis = JSON.stringify(formData.getAll("action_axis").filter((v): v is string => typeof v === "string"));

  db.prepare(
    `INSERT INTO daily_attentions
      (id, institution_id, professional_id, attendee_type, attention_date, duration,
       student_name, student_grade, jornada, representative_name, attendee_name, reason,
       action_axis, modality_tech, modality_signed, modality_phone, has_detection_sheet, observations)
     VALUES (@id, @institution_id, @professional_id, @attendee_type, @attention_date, @duration,
       @student_name, @student_grade, @jornada, @representative_name, @attendee_name, @reason,
       @action_axis, @modality_tech, @modality_signed, @modality_phone, @has_detection_sheet, @observations)`
  ).run({
    id,
    institution_id: institutionId,
    professional_id: session.user.id,
    attendee_type: attendeeType,
    attention_date: str(formData, "attention_date") || new Date().toISOString().slice(0, 10),
    duration: str(formData, "duration"),
    student_name: str(formData, "student_name"),
    student_grade: str(formData, "student_grade"),
    jornada: str(formData, "jornada"),
    representative_name: str(formData, "representative_name"),
    attendee_name: str(formData, "attendee_name"),
    reason,
    action_axis: actionAxis,
    modality_tech: str(formData, "modality_tech"),
    modality_signed: formData.get("modality_signed") ? 1 : 0,
    modality_phone: str(formData, "modality_phone"),
    has_detection_sheet: str(formData, "has_detection_sheet"),
    observations: str(formData, "observations"),
  });

  logAudit({ userId: session.user.id, action: "CREAR", entityType: "DailyAttention", entityId: id, institutionId });
  revalidatePath("/atencion-diaria");
}

/** Borra un registro de atención diaria duplicado o registrado por error (ronda 19). */
export async function deleteDailyAttention(id: string) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  db.prepare("DELETE FROM daily_attentions WHERE id = ? AND institution_id = ?").run(id, institutionId);
  logAudit({ userId: session.user.id, action: "BORRAR", entityType: "DailyAttention", entityId: id, institutionId });
  revalidatePath("/atencion-diaria");
}
