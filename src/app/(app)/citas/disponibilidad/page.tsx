import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { PageHeader } from "@/components/ui";
import type { UserRow, ScheduleSlotRow, AppointmentRow } from "@/lib/types";
import DisponibilidadClient from "./DisponibilidadClient";

export default async function DisponibilidadPage({
  searchParams,
}: {
  searchParams: { fecha?: string; profesional?: string };
}) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);

  const professionals = db
    .prepare("SELECT * FROM users WHERE institution_id = ? AND role IN ('DECE','ADMIN') AND active = 1 ORDER BY name ASC")
    .all(institutionId) as UserRow[];

  // Cada profesional administra la suya; ADMIN puede elegir administrar la de otro.
  const canPickOther = session.user.role === "ADMIN" && professionals.length > 1;
  const professionalId =
    (canPickOther && searchParams.profesional && professionals.some((p) => p.id === searchParams.profesional)
      ? searchParams.profesional
      : null) || session.user.id;

  const currentProfessional = professionals.find((p) => p.id === professionalId) || professionals[0];
  if (!currentProfessional) notFound();

  const date = searchParams.fecha && /^\d{4}-\d{2}-\d{2}$/.test(searchParams.fecha)
    ? searchParams.fecha
    : new Date().toISOString().slice(0, 10);

  const slots = db
    .prepare("SELECT * FROM professional_schedule_slots WHERE professional_id = ? AND date = ?")
    .all(currentProfessional.id, date) as ScheduleSlotRow[];

  const appointments = db
    .prepare(
      `SELECT a.*, s.full_name as student_name 
       FROM appointments a
       LEFT JOIN students s ON s.id = a.student_id
       WHERE a.professional_id = ? AND a.date = ? AND a.status != 'CANCELADA'
       ORDER BY a.start_time ASC`
    )
    .all(currentProfessional.id, date) as (AppointmentRow & { student_name: string | null })[];

  return (
    <div>
      <PageHeader
        title="Gestión de Agenda y Disponibilidad DECE"
        description="Configura tu cobertura de cursos, habilita horarios para citas públicas y bloquea horas cuando tengas talleres o reuniones para que tu horario diario esté siempre actualizado."
        action={
          <div className="flex gap-2">
            <Link href="/citas" className="btn-secondary">
              ← Volver a Horario / Agenda Diaria
            </Link>
          </div>
        }
      />

      <DisponibilidadClient
        professional={currentProfessional}
        professionals={professionals}
        canPickOther={canPickOther}
        date={date}
        slots={slots}
        appointments={appointments}
      />
    </div>
  );
}
