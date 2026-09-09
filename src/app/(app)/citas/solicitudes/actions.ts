"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { sendEmail, emailShell } from "@/lib/email";
import { sendPushToUser } from "@/lib/push";
import type { AppointmentRequestRow } from "@/lib/types";

function str(fd: FormData, key: string): string | null {
  const v = fd.get(key);
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length ? t : null;
}

function requireOwnedRequest(requestId: string, institutionId: string): AppointmentRequestRow {
  const row = db
    .prepare("SELECT * FROM appointment_requests WHERE id = ? AND institution_id = ?")
    .get(requestId, institutionId) as AppointmentRequestRow | undefined;
  if (!row) throw new Error("Solicitud no encontrada en tu institución.");
  return row;
}

export async function confirmAppointmentRequest(requestId: string, formData: FormData) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  const request = requireOwnedRequest(requestId, institutionId);
  if (request.status !== "PENDIENTE") throw new Error("Esta solicitud ya fue revisada.");

  const date = str(formData, "date");
  const startTime = str(formData, "start_time");
  if (!date || !startTime) throw new Error("Fecha y hora son obligatorias para confirmar.");

  const appointmentId = randomUUID();
  db.prepare(
    `INSERT INTO appointments
      (id, institution_id, professional_id, title, date, start_time, end_time, attendee_type, location, notes, requester_email, status)
     VALUES (@id, @institution_id, @professional_id, @title, @date, @start_time, @end_time, @attendee_type, @location, @notes, @requester_email, 'PROGRAMADA')`
  ).run({
    id: appointmentId,
    institution_id: institutionId,
    professional_id: str(formData, "professional_id") || session.user.id,
    title: `Cita — ${request.requester_name}`,
    date,
    start_time: startTime,
    end_time: str(formData, "end_time"),
    attendee_type: request.requester_role === "DOCENTE" ? "DOCENTE" : request.student_name ? "ESTUDIANTE" : "REPRESENTANTE",
    location: str(formData, "location"),
    notes: `Solicitud pública. Motivo: ${request.reason}${request.student_name ? ` · Estudiante: ${request.student_name}` : ""}`,
    requester_email: request.requester_email,
  });

  db.prepare(
    `UPDATE appointment_requests SET status='CONFIRMADA', appointment_id=?, reviewed_by_id=?, reviewed_at=datetime('now') WHERE id=?`
  ).run(appointmentId, session.user.id, requestId);

  // Notificar al solicitante por correo
  sendEmail({
    to: request.requester_email,
    subject: "Tu cita con el DECE fue confirmada",
    html: emailShell(
      "Tu cita fue confirmada",
      `<p>Hola ${request.requester_name},</p>
       <p>Tu solicitud de cita fue confirmada para el <strong>${date}</strong> a las <strong>${startTime}</strong>.</p>
       ${str(formData, "location") ? `<p><strong>Lugar:</strong> ${str(formData, "location")}</p>` : ""}
       <p>Te esperamos puntualmente en el DECE.</p>`
    ),
  }).catch((err) => console.error("[citas/solicitudes] Error al avisar por correo (confirmar):", err));

  // Notificar al profesional a cargo (Push + Correo)
  const targetProfId = str(formData, "professional_id") || session.user.id;
  const prof = db.prepare("SELECT email, name FROM users WHERE id = ?").get(targetProfId) as { email: string; name: string } | undefined;
  if (prof) {
    sendPushToUser(targetProfId, {
      title: "Cita Confirmada",
      body: `Cita con ${request.requester_name} confirmada para el ${date} a las ${startTime}`,
      url: `/citas?desde=${date}`,
    }).catch(() => {});

    if (targetProfId !== session.user.id) {
      sendEmail({
        to: prof.email,
        subject: "Cita confirmada en tu agenda DECE",
        html: emailShell(
          "Cita Confirmada en tu Agenda",
          `<p>Hola ${prof.name},</p>
           <p>Se ha confirmado una cita en tu agenda con <strong>${request.requester_name}</strong> (${request.requester_role}).</p>
           <p><strong>Fecha:</strong> ${date} a las ${startTime}</p>
           <p><strong>Motivo:</strong> ${request.reason}</p>
           <p>Revisa los detalles en tu Horario del Día.</p>`
        ),
      }).catch(() => {});
    }
  }

  logAudit({ userId: session.user.id, action: "EDITAR", entityType: "AppointmentRequest", entityId: requestId, details: "Confirmada", institutionId });
  revalidatePath("/citas/solicitudes");
  revalidatePath("/citas");
}

export async function rejectAppointmentRequest(requestId: string, formData: FormData) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  const request = requireOwnedRequest(requestId, institutionId);
  if (request.status !== "PENDIENTE") throw new Error("Esta solicitud ya fue revisada.");

  const reason = str(formData, "reject_reason");

  db.prepare(
    `UPDATE appointment_requests SET status='RECHAZADA', reject_reason=?, reviewed_by_id=?, reviewed_at=datetime('now') WHERE id=?`
  ).run(reason, session.user.id, requestId);

  // Mismo motivo que en confirmAppointmentRequest: no bloquear el botón
  // "Rechazar" esperando una conexión SMTP que puede colgarse.
  sendEmail({
    to: request.requester_email,
    subject: "Sobre tu solicitud de cita con el DECE",
    html: emailShell(
      "No pudimos confirmar tu solicitud",
      `<p>Hola ${request.requester_name},</p>
       <p>Lamentablemente no pudimos confirmar tu solicitud de cita en esta ocasión.</p>
       ${reason ? `<p><strong>Motivo:</strong> ${reason}</p>` : ""}
       <p>Puedes enviar una nueva solicitud con otra fecha, o comunicarte directamente con la institución.</p>`
    ),
  }).catch((err) => console.error("[citas/solicitudes] Error al avisar por correo (rechazar):", err));

  logAudit({ userId: session.user.id, action: "EDITAR", entityType: "AppointmentRequest", entityId: requestId, details: "Rechazada", institutionId });
  revalidatePath("/citas/solicitudes");
}
