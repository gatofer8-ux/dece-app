"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { requireOwned, requireOwnedCase } from "@/lib/scopedDb";
import { logAudit } from "@/lib/audit";
import { sendEmail, emailShell } from "@/lib/email";
import { sendPushToUser } from "@/lib/push";
import type { AppointmentRow, UserRow, StudentRow } from "@/lib/types";
import type { AttendeeType } from "@/lib/dailyAttention";

function str(fd: FormData, key: string): string | null {
  const v = fd.get(key);
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length ? t : null;
}

export async function createAppointment(formData: FormData) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  const id = randomUUID();
  const caseId = str(formData, "case_file_id");
  const professionalId = str(formData, "professional_id") || session.user.id;
  const requesterEmail = str(formData, "requester_email");
  const title = str(formData, "title") || "Cita DECE";
  const date = str(formData, "date") || new Date().toISOString().slice(0, 10);
  const startTime = str(formData, "start_time") || "08:00";
  const endTime = str(formData, "end_time");
  const attendeeType = str(formData, "attendee_type") || "ESTUDIANTE";
  const location = str(formData, "location");
  const notes = str(formData, "notes");

  if (caseId) {
    requireOwnedCase(caseId, institutionId);
  }

  db.prepare(
    `INSERT INTO appointments
      (id, institution_id, student_id, case_file_id, professional_id, title, date, start_time, end_time, attendee_type, location, notes, requester_email, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PROGRAMADA')`
  ).run(
    id,
    institutionId,
    str(formData, "student_id"),
    caseId,
    professionalId,
    title,
    date,
    startTime,
    endTime,
    attendeeType,
    location,
    notes,
    requesterEmail
  );

  if (caseId) {
    const appointmentNotesExcerpt = (notes || "").slice(0, 140).trim();
    db.prepare(
      `INSERT INTO case_actions (id, case_file_id, author_id, type, description, observations) VALUES (?, ?, ?, 'Cita agendada', ?, ?)`
    ).run(
      randomUUID(),
      caseId,
      session.user.id,
      `Cita programada: ${title} para el ${date} a las ${startTime}.`,
      appointmentNotesExcerpt ? `${appointmentNotesExcerpt}${(notes || "").length > 140 ? "..." : ""}` : null
    );
  }

  // Notificar al solicitante si dejó correo
  if (requesterEmail) {
    sendEmail({
      to: requesterEmail,
      subject: "Cita programada con el DECE",
      html: emailShell(
        "Cita Programada con el DECE",
        `<p>Estimado/a,</p>
         <p>Se ha programado una cita: <strong>${title}</strong></p>
         <p><strong>Fecha:</strong> ${date}</p>
         <p><strong>Hora:</strong> ${startTime}${endTime ? ` - ${endTime}` : ""}</p>
         ${location ? `<p><strong>Lugar:</strong> ${location}</p>` : ""}
         <p>Favor asistir puntualmente.</p>`
      ),
    }).catch((err) => console.error("[citas] Error al notificar al solicitante:", err));
  }

  // Notificar al profesional asignado si fue creada por otro
  if (professionalId !== session.user.id) {
    const prof = db.prepare("SELECT email, name FROM users WHERE id = ?").get(professionalId) as UserRow | undefined;
    if (prof) {
      sendPushToUser(professionalId, {
        title: "Nueva cita asignada",
        body: `${title} el ${date} a las ${startTime}`,
        url: "/citas",
      }).catch(() => {});

      sendEmail({
        to: prof.email,
        subject: "Nueva cita asignada en tu agenda DECE",
        html: emailShell(
          "Nueva Cita en tu Agenda",
          `<p>Hola ${prof.name},</p>
           <p>Se ha registrado una nueva cita en tu agenda:</p>
           <p><strong>Título:</strong> ${title}</p>
           <p><strong>Fecha:</strong> ${date} a las ${startTime}</p>
           ${notes ? `<p><strong>Notas:</strong> ${notes}</p>` : ""}
           <p>Revisa tu agenda en el sistema DECE.</p>`
        ),
      }).catch(() => {});
    }
  }

  logAudit({ userId: session.user.id, action: "CREAR", entityType: "Appointment", entityId: id, institutionId });
  revalidatePath("/citas");
  if (caseId) revalidatePath(`/casos/${caseId}`);
  redirect("/citas");
}

export async function updateAppointmentStatus(id: string, status: string) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  const appt = requireOwned<AppointmentRow>("appointments", id, institutionId, "Cita");

  db.prepare(`UPDATE appointments SET status=?, updated_at=datetime('now') WHERE id=? AND institution_id=?`).run(status, id, institutionId);

  logAudit({ userId: session.user.id, action: "EDITAR", entityType: "Appointment", entityId: id, details: status, institutionId });
  revalidatePath("/citas");
  revalidatePath("/citas/disponibilidad");
  if (appt?.case_file_id) revalidatePath(`/casos/${appt.case_file_id}`);
}

export async function rescheduleAppointment(
  appointmentId: string,
  newDate: string,
  newStartTime: string,
  newEndTime?: string | null,
  newLocation?: string | null,
  reason?: string | null
) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);

  const appt = requireOwned<AppointmentRow & { student_name?: string | null }>(
    "appointments",
    appointmentId,
    institutionId,
    "Cita"
  );

  if (!/^\d{4}-\d{2}-\d{2}$/.test(newDate)) throw new Error("Fecha inválida.");
  if (!newStartTime) throw new Error("Hora de inicio obligatoria.");

  const oldDate = appt.date;
  const oldTime = appt.start_time;
  const rescheduleNote = `\n[Reagendada el ${new Date().toLocaleDateString("es-EC")} por ${session.user.name}: De ${oldDate} ${oldTime} a ${newDate} ${newStartTime}. Motivo: ${reason || "Sin especificar"}]`;
  const updatedNotes = (appt.notes || "") + rescheduleNote;

  db.prepare(
    `UPDATE appointments SET 
       date = ?,
       start_time = ?,
       end_time = ?,
       location = COALESCE(?, location),
       notes = ?,
       status = 'PROGRAMADA',
       updated_at = datetime('now')
     WHERE id = ? AND institution_id = ?`
  ).run(newDate, newStartTime, newEndTime || null, newLocation || null, updatedNotes, appointmentId, institutionId);

  // Si tiene caso vinculado, registrar en la bitácora del caso
  if (appt.case_file_id) {
    db.prepare(
      `INSERT INTO case_actions (id, case_file_id, author_id, type, description, observations) VALUES (?, ?, ?, 'Cita reagendada', ?, ?)`
    ).run(
      randomUUID(),
      appt.case_file_id,
      session.user.id,
      `Cita reagendada de ${oldDate} ${oldTime} al ${newDate} ${newStartTime}.`,
      `Motivo: ${reason || "Ajuste de agenda"}`
    );
  }

  // Notificar por correo al solicitante / representante si hay correo registrado
  if (appt.requester_email) {
    sendEmail({
      to: appt.requester_email,
      subject: "Cita reagendada con el DECE",
      html: emailShell(
        "Aviso de Cita Reagendada",
        `<p>Estimado/a usuario/a,</p>
         <p>Le informamos que su cita <strong>${appt.title}</strong> ha sido reagendada.</p>
         <div style="background-color: #f8fafc; padding: 12px; border-left: 4px solid #3b82f6; margin: 15px 0;">
           <p style="margin: 0;"><strong>Nueva Fecha:</strong> ${newDate}</p>
           <p style="margin: 4px 0 0 0;"><strong>Nueva Hora:</strong> ${newStartTime}${newEndTime ? ` - ${newEndTime}` : ""}</p>
           ${newLocation ? `<p style="margin: 4px 0 0 0;"><strong>Lugar:</strong> ${newLocation}</p>` : ""}
         </div>
         ${reason ? `<p><strong>Motivo del cambio:</strong> ${reason}</p>` : ""}
         <p>Favor tomar nota de este nuevo horario. En caso de no poder asistir, comuníquese con el DECE.</p>`
      ),
    }).catch((err) => console.error("[citas] Error al notificar reagendamiento por correo:", err));
  }

  // Notificar al profesional a cargo (Push + Correo)
  const prof = db.prepare("SELECT email, name FROM users WHERE id = ?").get(appt.professional_id) as UserRow | undefined;
  if (prof) {
    sendPushToUser(appt.professional_id, {
      title: "Cita Reagendada",
      body: `${appt.title} reagendada para el ${newDate} a las ${newStartTime}`,
      url: `/citas?desde=${newDate}`,
    }).catch(() => {});

    sendEmail({
      to: prof.email,
      subject: "Aviso: Cita reagendada en tu agenda DECE",
      html: emailShell(
        "Cita Reagendada en tu Agenda",
        `<p>Hola ${prof.name},</p>
         <p>La cita <strong>${appt.title}</strong> ha sido reagendada exitosamente.</p>
         <p><strong>Fecha anterior:</strong> ${oldDate} ${oldTime}</p>
         <p><strong>Nueva fecha:</strong> ${newDate} ${newStartTime}</p>
         ${reason ? `<p><strong>Motivo:</strong> ${reason}</p>` : ""}
         <p>El horario ya se encuentra actualizado en tu Horario del Día.</p>`
      ),
    }).catch(() => {});
  }

  logAudit({
    userId: session.user.id,
    action: "EDITAR",
    entityType: "Appointment",
    entityId: appointmentId,
    details: `Reagendada de ${oldDate} ${oldTime} a ${newDate} ${newStartTime}. Motivo: ${reason || "—"}`,
    institutionId,
  });

  revalidatePath("/citas");
  revalidatePath("/citas/disponibilidad");
  if (appt.case_file_id) revalidatePath(`/casos/${appt.case_file_id}`);
}

export async function convertAppointmentToDailyAttentionAction(
  appointmentId: string,
  extraObservations?: string | null
): Promise<{ success: boolean; dailyAttentionId: string; error?: string }> {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);

  const appt = requireOwned<AppointmentRow>("appointments", appointmentId, institutionId, "Cita");

  // Si ya tiene una atencion diaria vinculada, retornar esa
  if (appt.daily_attention_id) {
    const existing = db
      .prepare("SELECT id FROM daily_attentions WHERE id = ? AND institution_id = ?")
      .get(appt.daily_attention_id, institutionId) as { id: string } | undefined;
    if (existing) {
      return { success: true, dailyAttentionId: existing.id };
    }
  }

  // Obtener datos del estudiante si está vinculado
  let studentName: string | null = null;
  let studentGrade: string | null = null;
  let repName: string | null = null;

  if (appt.student_id) {
    const student = db
      .prepare("SELECT * FROM students WHERE id = ? AND institution_id = ?")
      .get(appt.student_id, institutionId) as StudentRow | undefined;
    if (student) {
      studentName = student.full_name;
      studentGrade = student.course ? `${student.course}${student.parallel ? ` "${student.parallel}"` : ""}` : null;
      repName = student.representative || student.mother_name || student.father_name || null;
    }
  }

  // Si no tiene estudiante pero vino de solicitud pública
  const req = db
    .prepare("SELECT requester_name, student_name, student_course FROM appointment_requests WHERE appointment_id = ? AND institution_id = ?")
    .get(appointmentId, institutionId) as { requester_name: string; student_name: string | null; student_course: string | null } | undefined;

  if (req) {
    if (!studentName && req.student_name) studentName = req.student_name;
    if (!studentGrade && req.student_course) studentGrade = req.student_course;
    if (!repName && req.requester_name) repName = req.requester_name;
  }

  // Mapear attendee_type a AttendeeType ("ESTUDIANTE" | "REPRESENTANTE" | "DOCENTE_AUTORIDAD")
  let attendeeType: AttendeeType = "ESTUDIANTE";
  if (appt.attendee_type === "REPRESENTANTE") {
    attendeeType = "REPRESENTANTE";
  } else if (appt.attendee_type === "DOCENTE" || appt.attendee_type === "DOCENTE_AUTORIDAD") {
    attendeeType = "DOCENTE_AUTORIDAD";
  } else {
    attendeeType = "ESTUDIANTE";
  }

  const attendeeName = attendeeType === "REPRESENTANTE"
    ? (repName || studentName || "Representante de familia")
    : (studentName || repName || "Estudiante");

  // Calcular duración si start_time y end_time existen
  let duration = "40 min";
  if (appt.start_time && appt.end_time) {
    const [sh, sm] = appt.start_time.split(":").map(Number);
    const [eh, em] = appt.end_time.split(":").map(Number);
    if (!isNaN(sh) && !isNaN(sm) && !isNaN(eh) && !isNaN(em)) {
      const diffMinutes = (eh * 60 + em) - (sh * 60 + sm);
      if (diffMinutes > 0) {
        duration = `${diffMinutes} min`;
      }
    }
  }

  const dailyAttentionId = randomUUID();
  const obsParts = [
    `Cita presencial atendida desde Agenda DECE (Horario: ${appt.start_time}${appt.end_time ? ` - ${appt.end_time}` : ""}).`,
    appt.notes ? `Notas previas: ${appt.notes}.` : "",
    extraObservations ? `Observaciones: ${extraObservations}.` : "",
  ].filter(Boolean);
  const observations = obsParts.join(" ");

  const defaultAxis = attendeeType === "DOCENTE_AUTORIDAD" ? ["DETECCION"] : ["INTERVENCION_INDIVIDUAL"];

  db.prepare(`
    INSERT INTO daily_attentions (
      id, institution_id, professional_id, case_file_id, attendee_type,
      attention_date, duration, student_name, student_grade,
      representative_name, attendee_name, reason, action_axis,
      modality_signed, observations
    ) VALUES (
      @id, @institution_id, @professional_id, @case_file_id, @attendee_type,
      @attention_date, @duration, @student_name, @student_grade,
      @representative_name, @attendee_name, @reason, @action_axis,
      1, @observations
    )
  `).run({
    id: dailyAttentionId,
    institution_id: institutionId,
    professional_id: appt.professional_id || session.user.id,
    case_file_id: appt.case_file_id || null,
    attendee_type: attendeeType,
    attention_date: appt.date,
    duration,
    student_name: studentName,
    student_grade: studentGrade,
    representative_name: repName,
    attendee_name: attendeeName,
    reason: appt.title || "Atención presencial programada",
    action_axis: JSON.stringify(defaultAxis),
    observations: observations || null,
  });

  // Marcar la cita como ATENDIDA y asociar daily_attention_id
  db.prepare(`
    UPDATE appointments 
    SET status = 'ATENDIDA',
        daily_attention_id = ?,
        updated_at = datetime('now')
    WHERE id = ? AND institution_id = ?
  `).run(dailyAttentionId, appointmentId, institutionId);

  // Si tiene caso vinculado, registrar accion en el caso
  if (appt.case_file_id) {
    db.prepare(`
      INSERT INTO case_actions (id, case_file_id, author_id, type, description, observations)
      VALUES (?, ?, ?, 'Cita realizada', ?, ?)
    `).run(
      randomUUID(),
      appt.case_file_id,
      session.user.id,
      `Cita atendida: ${appt.title}. Registrada en Bitácora de Atención Diaria.`,
      observations
    );
  }

  logAudit({
    userId: session.user.id,
    action: "EDITAR",
    entityType: "Appointment",
    entityId: appointmentId,
    details: `Marcada como ATENDIDA y vinculada a Bitácora de Atención Diaria (${dailyAttentionId})`,
    institutionId,
  });

  revalidatePath("/citas");
  revalidatePath("/citas/disponibilidad");
  revalidatePath("/atencion-diaria");
  if (appt.case_file_id) revalidatePath(`/casos/${appt.case_file_id}`);

  return { success: true, dailyAttentionId };
}

