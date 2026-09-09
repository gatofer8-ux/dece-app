import { db } from "@/lib/db";
import { sendEmail, emailShell } from "@/lib/email";
import { sendPushToUser } from "@/lib/push";
import type { AppointmentRow } from "@/lib/types";

/**
 * Recorre las citas programadas y envía recordatorios (correo al
 * profesional y a quien la solicitó, más notificación push al profesional)
 * en dos momentos: ~24 horas antes y ~1 hora antes. Pensado para correr
 * cada 15 minutos (ver instrumentation.ts) — la ventana de tolerancia de
 * ±15 minutos evita que una cita se salte el recordatorio si el barrido
 * anterior no alcanzó a verla.
 */
export async function runReminderSweep(): Promise<{ sent24h: number; sent1h: number }> {
  const now = new Date();
  let sent24h = 0;
  let sent1h = 0;

  const upcoming = db
    .prepare(
      `SELECT a.*, u.name as professional_name, u.email as professional_email, s.full_name as student_name
       FROM appointments a
       JOIN users u ON u.id = a.professional_id
       LEFT JOIN students s ON s.id = a.student_id
       WHERE a.status = 'PROGRAMADA' AND (a.reminder_24h_sent = 0 OR a.reminder_1h_sent = 0)
         AND date(a.date) >= date('now', '-1 day')`
    )
    .all() as (AppointmentRow & { professional_name: string; professional_email: string; student_name: string | null })[];

  for (const appt of upcoming) {
    const when = new Date(`${appt.date}T${appt.start_time}:00`);
    if (isNaN(when.getTime())) continue;
    const hoursUntil = (when.getTime() - now.getTime()) / (1000 * 60 * 60);

    const whenLabel = `${appt.date} a las ${appt.start_time}`;

    if (!appt.reminder_24h_sent && hoursUntil <= 24.25 && hoursUntil >= 23.75) {
      await sendReminder(appt, whenLabel, "mañana");
      db.prepare("UPDATE appointments SET reminder_24h_sent = 1 WHERE id = ?").run(appt.id);
      sent24h++;
    } else if (!appt.reminder_1h_sent && hoursUntil <= 1.25 && hoursUntil >= 0.75) {
      await sendReminder(appt, whenLabel, "en 1 hora");
      db.prepare("UPDATE appointments SET reminder_1h_sent = 1 WHERE id = ?").run(appt.id);
      sent1h++;
    }
  }

  return { sent24h, sent1h };
}

async function sendReminder(
  appt: AppointmentRow & { professional_name: string; professional_email: string },
  whenLabel: string,
  relative: string
) {
  await sendPushToUser(appt.professional_id, {
    title: `Recordatorio: cita ${relative}`,
    body: `${appt.title} — ${whenLabel}`,
    url: "/citas",
  });
  if (appt.professional_email) {
    await sendEmail({
      to: appt.professional_email,
      subject: `Recordatorio: tienes una cita ${relative}`,
      html: emailShell(
        `Cita ${relative}`,
        `<p>Tienes una cita programada: <strong>${appt.title}</strong>.</p>
         <p><strong>Cuándo:</strong> ${whenLabel}</p>
         ${appt.location ? `<p><strong>Lugar:</strong> ${appt.location}</p>` : ""}`
      ),
    });
  }
  if (appt.requester_email) {
    await sendEmail({
      to: appt.requester_email,
      subject: `Recordatorio: tu cita con el DECE es ${relative}`,
      html: emailShell(
        `Tu cita es ${relative}`,
        `<p>Te recordamos tu cita con el Departamento de Consejería Estudiantil.</p>
         <p><strong>Cuándo:</strong> ${whenLabel}</p>
         ${appt.location ? `<p><strong>Lugar:</strong> ${appt.location}</p>` : ""}`
      ),
    });
  }
}
