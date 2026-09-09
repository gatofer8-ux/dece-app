"use server";

import { randomUUID } from "crypto";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { sendEmail, emailShell } from "@/lib/email";
import { sendPushToInstitutionStaff } from "@/lib/push";
import { requesterRoleLabel } from "@/lib/appointmentRequest";
import { HOUR_SLOTS, isValidHourSlot } from "@/lib/schedule";
import type { InstitutionRow, UserRow } from "@/lib/types";

export type RequestActionState = { error: string | null };

export async function getAvailableSlotsForProfessional(
  institutionId: string,
  professionalId: string,
  date: string
): Promise<string[]> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !professionalId) return [];

  // 1. Obtener slots configurados explícitamente en la base de datos
  const storedSlots = db
    .prepare(
      `SELECT hour, available, activity_title 
       FROM professional_schedule_slots 
       WHERE professional_id = ? AND date = ?`
    )
    .all(professionalId, date) as { hour: string; available: number; activity_title: string | null }[];

  // 2. Obtener citas ya ocupadas/confirmadas para ese profesional en esa fecha
  const appointments = db
    .prepare(
      `SELECT start_time 
       FROM appointments 
       WHERE professional_id = ? AND date = ? AND status != 'CANCELADA'`
    )
    .all(professionalId, date) as { start_time: string }[];
  const takenHours = new Set(appointments.map((a) => a.start_time));

  // Si el profesional configuró slots explícitamente para este día:
  const explicitlyEnabled = storedSlots.some((s) => s.available === 1 && !s.activity_title);
  const explicitlyDisabled = new Set(
    storedSlots
      .filter((s) => s.available === 0 || s.activity_title)
      .map((s) => s.hour)
  );

  if (explicitlyEnabled) {
    const enabledHours = new Set(
      storedSlots
        .filter((s) => s.available === 1 && !s.activity_title)
        .map((s) => s.hour)
    );
    return HOUR_SLOTS.filter((h) => enabledHours.has(h) && !takenHours.has(h) && !explicitlyDisabled.has(h));
  }

  // Si aún no ha configurado slots explícitos para ese día, verificar si es entre semana:
  const d = new Date(`${date}T12:00:00`);
  const dayOfWeek = d.getDay(); // 0 = Domingo, 6 = Sábado
  if (dayOfWeek >= 1 && dayOfWeek <= 5) {
    // Horario escolar estándar por defecto: 07:00 a 17:00
    const defaultSchoolHours = ["07:00", "08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"];
    return defaultSchoolHours.filter((h) => !takenHours.has(h) && !explicitlyDisabled.has(h));
  }

  return [];
}

function str(fd: FormData, key: string): string | null {
  const v = fd.get(key);
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length ? t : null;
}

export async function createAppointmentRequest(
  institutionId: string,
  _prevState: RequestActionState,
  formData: FormData
): Promise<RequestActionState> {
  const institution = db.prepare("SELECT * FROM institutions WHERE id = ? AND active = 1").get(institutionId) as
    | InstitutionRow
    | undefined;
  if (!institution) return { error: "Institución no encontrada." };

  const name = str(formData, "requester_name");
  const role = str(formData, "requester_role");
  const email = str(formData, "requester_email");
  const reason = str(formData, "reason");
  if (!name || !role || !email || !reason) {
    return { error: "Nombre, rol, correo y motivo son obligatorios." };
  }

  const professionalId = str(formData, "professional_id");
  const date = str(formData, "preferred_date");
  const time = str(formData, "preferred_time");
  if (!professionalId || !date || !time) {
    return { error: "Selecciona con quién y a qué hora quieres la cita." };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { error: "Fecha inválida." };
  }
  if (!isValidHourSlot(time)) {
    return { error: "Hora inválida." };
  }
  const professional = db
    .prepare("SELECT * FROM users WHERE id = ? AND institution_id = ? AND role IN ('DECE','ADMIN') AND active = 1")
    .get(professionalId, institutionId) as UserRow | undefined;
  if (!professional) {
    return { error: "El profesional seleccionado ya no está disponible. Vuelve a elegir." };
  }

  // Comprobar que no esté bloqueado ni ocupado
  const slot = db
    .prepare("SELECT available, activity_title FROM professional_schedule_slots WHERE professional_id = ? AND date = ? AND hour = ?")
    .get(professionalId, date, time) as { available: number; activity_title: string | null } | undefined;
  if (slot) {
    if (slot.available !== 1 || slot.activity_title) {
      return { error: "Ese horario ya no está disponible. Por favor elige otra hora." };
    }
  } else {
    const d = new Date(`${date}T12:00:00`);
    if (d.getDay() === 0 || d.getDay() === 6) {
      return { error: "No hay atención de citas los fines de semana." };
    }
  }

  const taken = db
    .prepare("SELECT id FROM appointments WHERE professional_id = ? AND date = ? AND start_time = ? AND status != 'CANCELADA'")
    .get(professionalId, date, time);
  if (taken) {
    return { error: "Ese horario ya fue reservado por otra persona. Por favor elige otra hora." };
  }

  const id = randomUUID();
  db.prepare(
    `INSERT INTO appointment_requests
      (id, institution_id, requester_name, requester_role, requester_email, requester_phone,
       student_name, student_course, reason, preferred_date, preferred_time, professional_id)
     VALUES (@id, @institution_id, @requester_name, @requester_role, @requester_email, @requester_phone,
       @student_name, @student_course, @reason, @preferred_date, @preferred_time, @professional_id)`
  ).run({
    id,
    institution_id: institutionId,
    requester_name: name,
    requester_role: role,
    requester_email: email,
    requester_phone: str(formData, "requester_phone"),
    student_name: str(formData, "student_name"),
    student_course: str(formData, "student_course"),
    reason,
    preferred_date: date,
    preferred_time: time,
    professional_id: professionalId,
  });

  notifyStaffOfNewRequest(institutionId, name, role, reason, date, time, professional.name).catch((err) =>
    console.error("[solicitar-cita] Error al avisar al equipo DECE:", err)
  );

  redirect(`/solicitar-cita/${institutionId}?enviado=1`);
}

async function notifyStaffOfNewRequest(
  institutionId: string,
  name: string,
  role: string,
  reason: string,
  preferredDate: string,
  preferredTime: string,
  professionalName: string
) {
  const staff = db
    .prepare("SELECT * FROM users WHERE institution_id = ? AND role IN ('DECE','ADMIN') AND active = 1")
    .all(institutionId) as UserRow[];
  const html = emailShell(
    "Nueva solicitud de cita",
    `<p><strong>${name}</strong> (${requesterRoleLabel(role)}) solicitó una cita con <strong>${professionalName}</strong>.</p>
     <p><strong>Motivo:</strong> ${reason}</p>
     <p><strong>Fecha y hora pedida:</strong> ${preferredDate} ${preferredTime}</p>
     <p>Revísala y confírmala desde el sistema, en Citas y agenda → Solicitudes.</p>`
  );
  for (const u of staff) {
    await sendEmail({ to: u.email, subject: "Nueva solicitud de cita — DECE", html });
  }
  await sendPushToInstitutionStaff(institutionId, ["DECE", "ADMIN"], {
    title: "Nueva solicitud de cita",
    body: `${name}: ${reason}`,
    url: "/citas/solicitudes",
  });
}
