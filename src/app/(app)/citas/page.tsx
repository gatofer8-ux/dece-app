import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { PageHeader, Badge, EmptyState, formatDate } from "@/components/ui";
import { APPOINTMENT_STATUS_LABELS, type AppointmentRow, type UserRow, type ScheduleSlotRow } from "@/lib/types";
import { getLocalNetworkIp } from "@/lib/network";
import { updateAppointmentStatus } from "./actions";
import PublicRequestLink from "./PublicRequestLink";
import DailyScheduleView from "./DailyScheduleView";

const STATUS_COLOR: Record<string, string> = {
  PROGRAMADA: "blue",
  ATENDIDA: "green",
  NO_ASISTIO: "red",
  CANCELADA: "slate",
};

export default async function CitasPage({
  searchParams,
}: {
  searchParams: { desde?: string; estado?: string; profesional?: string; vista?: string };
}) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);

  const professionals = db
    .prepare("SELECT * FROM users WHERE institution_id = ? AND role IN ('DECE','ADMIN') AND active = 1 ORDER BY name ASC")
    .all(institutionId) as UserRow[];

  const canPickOther = session.user.role === "ADMIN" && professionals.length > 1;
  const professionalId =
    (canPickOther && searchParams.profesional && professionals.some((p) => p.id === searchParams.profesional)
      ? searchParams.profesional
      : null) || session.user.id;

  const currentProfessional = professionals.find((p) => p.id === professionalId) || professionals[0];
  if (!currentProfessional) notFound();

  const activeDate = searchParams.desde && /^\d{4}-\d{2}-\d{2}$/.test(searchParams.desde)
    ? searchParams.desde
    : new Date().toISOString().slice(0, 10);

  const isListView = searchParams.vista === "lista";

  // Citas para la vista diaria
  const dailyAppointments = db
    .prepare(
      `SELECT a.*, s.full_name as student_name, s.course as student_course 
       FROM appointments a
       LEFT JOIN students s ON s.id = a.student_id
       WHERE a.institution_id = ? AND a.professional_id = ? AND a.date = ?
       ORDER BY a.start_time ASC`
    )
    .all(institutionId, currentProfessional.id, activeDate) as (AppointmentRow & {
      student_name: string | null;
      student_course?: string | null;
    })[];

  // Slots / bloqueos para la vista diaria
  const dailySlots = db
    .prepare(
      `SELECT * FROM professional_schedule_slots 
       WHERE professional_id = ? AND date = ?`
    )
    .all(currentProfessional.id, activeDate) as ScheduleSlotRow[];

  // Citas para la vista listado
  let where = "WHERE a.institution_id = ? AND a.date >= ?";
  const params: any[] = [institutionId, activeDate];
  if (searchParams.estado) {
    where += " AND a.status = ?";
    params.push(searchParams.estado);
  }
  if (searchParams.profesional) {
    where += " AND a.professional_id = ?";
    params.push(searchParams.profesional);
  }

  const listAppointments = db
    .prepare(
      `SELECT a.*, s.full_name as student_name, u.name as professional_name 
       FROM appointments a
       LEFT JOIN students s ON s.id = a.student_id
       LEFT JOIN users u ON u.id = a.professional_id
       ${where} ORDER BY a.date ASC, a.start_time ASC LIMIT 200`
    )
    .all(...params) as (AppointmentRow & { student_name: string | null; professional_name?: string | null })[];

  const pendingCount = (
    db.prepare("SELECT COUNT(*) n FROM appointment_requests WHERE institution_id = ? AND status = 'PENDIENTE'").get(institutionId) as { n: number }
  ).n;

  return (
    <div>
      <PageHeader
        title="Agenda y Horario Diario DECE"
        description="Horario del día con citas agendadas, actividades internas y gestión de disponibilidad de atención."
        action={
          <div className="flex flex-wrap gap-2">
            <Link href="/citas/disponibilidad" className="btn-secondary flex items-center gap-1.5">
              <span>⚙️</span> Mi Cobertura y Horarios
            </Link>
            <Link href="/citas/solicitudes" className="btn-secondary relative flex items-center gap-1.5">
              <span>📥</span> Solicitudes
              {pendingCount > 0 && (
                <span className="bg-red-600 text-white text-[10px] font-bold rounded-full h-5 w-5 flex items-center justify-center">
                  {pendingCount}
                </span>
              )}
            </Link>
            <Link href={`/citas/nueva?fecha=${activeDate}`} className="btn-primary flex items-center gap-1.5">
              <span>+</span> Nueva Cita
            </Link>
          </div>
        }
      />

      <PublicRequestLink institutionId={institutionId} serverIp={getLocalNetworkIp()} />

      {/* Selector de Pestaña: Horario del Día vs Listado */}
      <div className="flex border-b border-slate-200 mb-4 gap-4">
        <Link
          href={`/citas?desde=${activeDate}&profesional=${currentProfessional.id}`}
          className={`pb-3 text-sm font-bold transition border-b-2 flex items-center gap-2 ${
            !isListView
              ? "border-brand-600 text-brand-700"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <span>📅</span> Horario del Día (Agenda Diaria)
        </Link>
        <Link
          href={`/citas?desde=${activeDate}&profesional=${currentProfessional.id}&vista=lista`}
          className={`pb-3 text-sm font-bold transition border-b-2 flex items-center gap-2 ${
            isListView
              ? "border-brand-600 text-brand-700"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <span>📋</span> Listado General de Citas ({listAppointments.length})
        </Link>
      </div>

      {!isListView ? (
        <DailyScheduleView
          date={activeDate}
          professional={currentProfessional}
          professionals={professionals}
          canPickOther={canPickOther}
          appointments={dailyAppointments}
          slots={dailySlots}
        />
      ) : (
        <div className="space-y-4">
          <form className="card p-4 flex flex-wrap items-end gap-3" method="get">
            <input type="hidden" name="vista" value="lista" />
            <div>
              <label className="label text-xs">Desde</label>
              <input type="date" name="desde" defaultValue={activeDate} className="input text-xs" />
            </div>
            <div>
              <label className="label text-xs">Estado</label>
              <select name="estado" defaultValue={searchParams.estado || ""} className="select text-xs">
                <option value="">Todos los estados</option>
                {Object.entries(APPOINTMENT_STATUS_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            {canPickOther && (
              <div>
                <label className="label text-xs">Profesional</label>
                <select name="profesional" defaultValue={searchParams.profesional || ""} className="select text-xs">
                  <option value="">Todos los profesionales</option>
                  {professionals.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            )}
            <button type="submit" className="btn-secondary text-xs">Filtrar</button>
          </form>

          {listAppointments.length === 0 ? (
            <EmptyState title="No se encontraron citas programadas con estos filtros" />
          ) : (
            <div className="card overflow-x-auto p-0">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase border-b border-slate-100">
                  <tr>
                    <th className="text-left px-4 py-3">Fecha</th>
                    <th className="text-left px-4 py-3">Hora</th>
                    <th className="text-left px-4 py-3">Título / Motivo</th>
                    <th className="text-left px-4 py-3">Estudiante</th>
                    <th className="text-left px-4 py-3">Profesional</th>
                    <th className="text-left px-4 py-3">Estado</th>
                    <th className="text-left px-4 py-3">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {listAppointments.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium">{formatDate(a.date)}</td>
                      <td className="px-4 py-3 font-semibold">{a.start_time}{a.end_time ? ` - ${a.end_time}` : ""}</td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-800">{a.title}</div>
                        {a.case_file_id && (
                          <Link href={`/casos/${a.case_file_id}`} className="text-xs text-brand-600 font-bold hover:underline">
                            Ver caso vinculado →
                          </Link>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{a.student_name || "—"}</td>
                      <td className="px-4 py-3 text-slate-600 text-xs">{a.professional_name || "—"}</td>
                      <td className="px-4 py-3">
                        <Badge color={STATUS_COLOR[a.status]}>{APPOINTMENT_STATUS_LABELS[a.status]}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        {a.status === "PROGRAMADA" && (
                          <div className="flex gap-2">
                            <form action={async () => { "use server"; await updateAppointmentStatus(a.id, "ATENDIDA"); }}>
                              <button className="text-xs font-bold text-emerald-700 hover:underline">Atendida</button>
                            </form>
                            <form action={async () => { "use server"; await updateAppointmentStatus(a.id, "NO_ASISTIO"); }}>
                              <button className="text-xs text-rose-700 hover:underline">No asistió</button>
                            </form>
                            <form action={async () => { "use server"; await updateAppointmentStatus(a.id, "CANCELADA"); }}>
                              <button className="text-xs text-slate-400 hover:text-slate-600">Cancelar</button>
                            </form>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
