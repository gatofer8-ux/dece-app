"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { updateAppointmentStatus, rescheduleAppointment, convertAppointmentToDailyAttentionAction } from "./actions";
import { useRouter } from "next/navigation";
import WhatsAppAppointmentReminderButton from "@/components/WhatsAppAppointmentReminderButton";
import { setSlotAvailability, blockSlotWithActivity } from "./disponibilidad/actions";
import { HOUR_SLOTS } from "@/lib/schedule";
import type { AppointmentRow, ScheduleSlotRow, UserRow } from "@/lib/types";

const ACTIVITY_META: Record<string, { label: string; icon: string; bg: string; text: string; border: string }> = {
  TALLER: { label: "Taller / Charla", icon: "🏫", bg: "bg-purple-50", text: "text-purple-900", border: "border-purple-300" },
  REUNION: { label: "Reunión Institucional", icon: "👥", bg: "bg-indigo-50", text: "text-indigo-900", border: "border-indigo-300" },
  VISITA_DOMICILIARIA: { label: "Visita Domiciliaria", icon: "🏠", bg: "bg-amber-50", text: "text-amber-900", border: "border-amber-300" },
  ATENCION_CASO: { label: "Atención Caso Urgente", icon: "🚨", bg: "bg-rose-50", text: "text-rose-900", border: "border-rose-300" },
  ADMINISTRATIVO: { label: "Gestión Administrativa", icon: "📑", bg: "bg-blue-50", text: "text-blue-900", border: "border-blue-300" },
  OTRA_ACTIVIDAD: { label: "Actividad Programada", icon: "📌", bg: "bg-slate-100", text: "text-slate-900", border: "border-slate-300" },
};

function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function formatLongDate(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString("es-EC", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}

export type DailyScheduleAppointment = AppointmentRow & {
  student_name: string | null;
  student_course?: string | null;
  representative_name?: string | null;
  phone_number?: string | null;
  requester_name?: string | null;
};

export default function DailyScheduleView({
  date,
  professional,
  professionals,
  canPickOther,
  appointments,
  slots,
  institutionName,
}: {
  date: string;
  professional: UserRow;
  professionals: UserRow[];
  canPickOther: boolean;
  appointments: DailyScheduleAppointment[];
  slots: ScheduleSlotRow[];
  institutionName?: string | null;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  // Modal para Cita Atendida -> Bitácora Diaria / Entrevista
  const [attendedModalAppt, setAttendedModalAppt] = useState<DailyScheduleAppointment | null>(null);
  const [attendedObservations, setAttendedObservations] = useState("");
  const [attendedSuccessInfo, setAttendedSuccessInfo] = useState<{ id: string } | null>(null);

  // Modal para Bloqueo de Actividad
  const [quickBlockHour, setQuickBlockHour] = useState<string | null>(null);
  const [activityType, setActivityType] = useState("TALLER");
  const [activityTitle, setActivityTitle] = useState("");

  // Modal para Reagendamiento de Cita
  const [reschedulingAppt, setReschedulingAppt] = useState<(AppointmentRow & { student_name: string | null }) | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleStartTime, setRescheduleStartTime] = useState("");
  const [rescheduleEndTime, setRescheduleEndTime] = useState("");
  const [rescheduleLocation, setRescheduleLocation] = useState("");
  const [rescheduleReason, setRescheduleReason] = useState("");

  const slotMap = new Map(slots.map((s) => [s.hour, s]));
  const appointmentByHour = new Map(appointments.map((a) => [a.start_time, a]));

  const totalAppts = appointments.length;
  const attendedAppts = appointments.filter((a) => a.status === "ATENDIDA").length;
  const pendingAppts = appointments.filter((a) => a.status === "PROGRAMADA").length;
  const blockedActivitiesCount = slots.filter((s) => s.available === 0 && s.activity_title).length;

  const handleUpdateStatus = (id: string, status: "PROGRAMADA" | "ATENDIDA" | "NO_ASISTIO" | "CANCELADA") => {
    startTransition(async () => {
      await updateAppointmentStatus(id, status);
    });
  };

  const handleOpenAttendedModal = (appt: DailyScheduleAppointment) => {
    setAttendedModalAppt(appt);
    setAttendedObservations("");
    setAttendedSuccessInfo(null);
  };

  const handleConvertToDailyAttention = () => {
    if (!attendedModalAppt) return;
    const targetAppt = attendedModalAppt;
    startTransition(async () => {
      const res = await convertAppointmentToDailyAttentionAction(targetAppt.id, attendedObservations.trim() || null);
      if (res.success) {
        setAttendedSuccessInfo({ id: res.dailyAttentionId });
      }
    });
  };

  const handleOpenInterview = () => {
    if (!attendedModalAppt) return;
    const targetAppt = attendedModalAppt;
    startTransition(async () => {
      await updateAppointmentStatus(targetAppt.id, "ATENDIDA");
      setAttendedModalAppt(null);
      if (targetAppt.case_file_id) {
        router.push(`/casos/${targetAppt.case_file_id}/entrevistas/nueva?cita=${targetAppt.id}`);
      } else {
        const studentParam = targetAppt.student_id ? `&estudiante=${targetAppt.student_id}` : "";
        const studentNameParam = targetAppt.student_name ? `&estudiante_nombre=${encodeURIComponent(targetAppt.student_name)}` : "";
        const reasonParam = targetAppt.title ? `&motivo=${encodeURIComponent(targetAppt.title)}` : "";
        router.push(`/casos/nuevo?fuente=Cita+DECE${studentParam}${studentNameParam}${reasonParam}`);
      }
    });
  };

  const handleJustMarkAttended = () => {
    if (!attendedModalAppt) return;
    const targetAppt = attendedModalAppt;
    startTransition(async () => {
      await updateAppointmentStatus(targetAppt.id, "ATENDIDA");
      setAttendedModalAppt(null);
    });
  };

  const handleQuickBlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickBlockHour || !activityTitle.trim()) return;
    startTransition(async () => {
      await blockSlotWithActivity(professional.id, date, quickBlockHour, activityType, activityTitle.trim());
      setQuickBlockHour(null);
      setActivityTitle("");
    });
  };

  const openRescheduleModal = (appt: AppointmentRow & { student_name: string | null }) => {
    setReschedulingAppt(appt);
    setRescheduleDate(appt.date);
    setRescheduleStartTime(appt.start_time);
    setRescheduleEndTime(appt.end_time || "");
    setRescheduleLocation(appt.location || "");
    setRescheduleReason("");
  };

  const handleRescheduleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reschedulingAppt || !rescheduleDate || !rescheduleStartTime) return;
    startTransition(async () => {
      await rescheduleAppointment(
        reschedulingAppt.id,
        rescheduleDate,
        rescheduleStartTime,
        rescheduleEndTime || null,
        rescheduleLocation || null,
        rescheduleReason || null
      );
      setReschedulingAppt(null);
    });
  };

  return (
    <div className="space-y-4">
      {/* Barra de Control de Fecha y Profesional */}
      <div className="card p-4 flex flex-wrap items-center justify-between gap-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/citas?desde=${addDays(date, -1)}&profesional=${professional.id}`} className="btn-secondary text-xs">
            ◀ Anterior
          </Link>
          <input
            type="date"
            value={date}
            onChange={(e) => {
              if (e.target.value) {
                window.location.href = `/citas?desde=${e.target.value}&profesional=${professional.id}`;
              }
            }}
            className="input text-xs py-1.5"
          />
          <Link href={`/citas?desde=${addDays(date, 1)}&profesional=${professional.id}`} className="btn-secondary text-xs">
            Siguiente ▶
          </Link>
          <Link
            href={`/citas?desde=${new Date().toISOString().slice(0, 10)}&profesional=${professional.id}`}
            className="btn-secondary text-xs font-bold"
          >
            Hoy
          </Link>
        </div>

        {canPickOther && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-600">Agenda de:</span>
            <select
              value={professional.id}
              onChange={(e) => {
                window.location.href = `/citas?desde=${date}&profesional=${e.target.value}`;
              }}
              className="select text-xs py-1 font-bold text-brand-700"
            >
              {professionals.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="text-sm font-bold text-slate-800 capitalize flex items-center gap-2">
          <span>📅</span> {formatLongDate(date)}
        </div>
      </div>

      {/* Resumen Estadístico del Día */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card p-3 bg-blue-50/70 border-blue-200">
          <div className="text-[11px] font-bold uppercase tracking-wider text-blue-800">Citas Programadas</div>
          <div className="text-2xl font-extrabold text-blue-950 mt-1">{pendingAppts}</div>
        </div>
        <div className="card p-3 bg-emerald-50/70 border-emerald-200">
          <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">Citas Atendidas</div>
          <div className="text-2xl font-extrabold text-emerald-950 mt-1">{attendedAppts}</div>
        </div>
        <div className="card p-3 bg-purple-50/70 border-purple-200">
          <div className="text-[11px] font-bold uppercase tracking-wider text-purple-800">Talleres / Actividades</div>
          <div className="text-2xl font-extrabold text-purple-950 mt-1">{blockedActivitiesCount}</div>
        </div>
        <div className="card p-3 bg-slate-50 border-slate-200">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Total Compromisos</div>
          <div className="text-2xl font-extrabold text-slate-800 mt-1">{totalAppts + blockedActivitiesCount}</div>
        </div>
      </div>

      {/* Horario del Día: Cronograma visual por Horas */}
      <div className="card p-0 overflow-hidden divide-y divide-slate-100 shadow-sm">
        <div className="bg-slate-100/70 px-4 py-2.5 flex items-center justify-between text-xs font-bold text-slate-700 uppercase tracking-wider">
          <span>Hora</span>
          <span>Actividad / Cita / Estado</span>
          <span>Acciones</span>
        </div>

        {HOUR_SLOTS.map((hour) => {
          const appt = appointmentByHour.get(hour);
          const slot = slotMap.get(hour);
          const isAvailable = slot?.available === 1;
          const hasActivity = !isAvailable && !!slot?.activity_title;
          const actMeta = hasActivity
            ? ACTIVITY_META[slot?.activity_type || "OTRA_ACTIVIDAD"] || ACTIVITY_META.OTRA_ACTIVIDAD
            : null;

          return (
            <div
              key={hour}
              className={`p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition ${
                appt
                  ? appt.status === "ATENDIDA"
                    ? "bg-emerald-50/40"
                    : appt.status === "CANCELADA"
                    ? "bg-slate-50/50 opacity-60"
                    : "bg-blue-50/60"
                  : hasActivity
                  ? `${actMeta?.bg || "bg-amber-50/60"}`
                  : isAvailable
                  ? "bg-emerald-50/20 hover:bg-emerald-50/40"
                  : "bg-white hover:bg-slate-50"
              }`}
            >
              {/* Columna Hora */}
              <div className="flex items-center gap-3 sm:w-28 shrink-0">
                <div className="font-extrabold text-sm text-slate-800 bg-white px-2.5 py-1 rounded-md border border-slate-200 shadow-xs">
                  {hour}
                </div>
              </div>

              {/* Columna Contenido Principal */}
              <div className="flex-1 min-w-0">
                {appt ? (
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-slate-900">{appt.title}</span>
                      <span
                        className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase ${
                          appt.status === "ATENDIDA"
                            ? "bg-emerald-100 text-emerald-800"
                            : appt.status === "NO_ASISTIO"
                            ? "bg-rose-100 text-rose-800"
                            : appt.status === "CANCELADA"
                            ? "bg-slate-200 text-slate-700"
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {appt.status}
                      </span>
                      <span className="text-xs text-slate-500 font-medium bg-white/80 px-1.5 py-0.5 rounded border border-slate-200">
                        {appt.attendee_type}
                      </span>
                    </div>

                    <div className="text-xs text-slate-600 mt-1 flex items-center gap-2 flex-wrap">
                      {appt.student_name && (
                        <span>
                          <strong>Estudiante:</strong> {appt.student_name}{" "}
                          {appt.student_course ? `(${appt.student_course})` : ""}
                        </span>
                      )}
                      {appt.location && (
                        <span className="text-slate-500">📍 {appt.location}</span>
                      )}
                    </div>
                    {appt.notes && (
                      <div className="text-[11px] text-slate-500 mt-0.5 italic line-clamp-1">
                        "{appt.notes}"
                      </div>
                    )}
                  </div>
                ) : hasActivity ? (
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-base">{actMeta?.icon}</span>
                      <span className="font-bold text-sm text-slate-900">{slot?.activity_title}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase bg-white/80 border ${actMeta?.border} ${actMeta?.text}`}>
                        {actMeta?.label}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      Horario reservado para actividad interna / acompañamiento
                    </div>
                  </div>
                ) : isAvailable ? (
                  <div className="flex items-center gap-2 text-emerald-700 font-semibold text-xs">
                    <span>🟢</span> Horario libre y disponible para citas públicas en línea
                  </div>
                ) : (
                  <div className="text-slate-400 text-xs italic">
                    ⚪ Espacio sin programar
                  </div>
                )}
              </div>

              {/* Columna Acciones */}
              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center flex-wrap">
                {/* Botón WhatsApp de Recordatorio Oficial */}
                {appt && (
                  <WhatsAppAppointmentReminderButton
                    recipientPhone={appt.phone_number}
                    recipientName={appt.representative_name || appt.requester_name}
                    studentName={appt.student_name}
                    studentCourse={appt.student_course}
                    professionalName={professional.name}
                    institutionName={institutionName}
                    date={appt.date}
                    startTime={appt.start_time}
                    endTime={appt.end_time}
                    location={appt.location}
                    title={appt.title}
                    compact={true}
                  />
                )}

                {appt && appt.status === "PROGRAMADA" && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      disabled={isPending}
                      onClick={() => handleOpenAttendedModal(appt)}
                      className="px-2.5 py-1 text-xs font-bold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition shadow-xs flex items-center gap-1"
                      title="Registrar cita como atendida (opciones de bitácora y entrevista)"
                    >
                      <span>✓</span> Atendida
                    </button>
                    <button
                      disabled={isPending}
                      onClick={() => openRescheduleModal(appt)}
                      className="px-2.5 py-1 text-xs font-bold bg-brand-50 text-brand-700 border border-brand-300 rounded-lg hover:bg-brand-100 transition"
                      title="Cambiar fecha u hora de la cita y notificar"
                    >
                      🔄 Reagendar
                    </button>
                    <button
                      disabled={isPending}
                      onClick={() => handleUpdateStatus(appt.id, "NO_ASISTIO")}
                      className="px-2 py-1 text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200 rounded-lg hover:bg-rose-100"
                      title="Marcar que no asistió"
                    >
                      No asistió
                    </button>
                    <button
                      disabled={isPending}
                      onClick={() => handleUpdateStatus(appt.id, "CANCELADA")}
                      className="px-2 py-1 text-xs font-medium text-slate-400 hover:text-slate-600"
                    >
                      Cancelar
                    </button>
                  </div>
                )}

                {appt && appt.status === "ATENDIDA" && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {appt.daily_attention_id ? (
                      <Link
                        href="/atencion-diaria"
                        className="text-xs font-bold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 px-2 py-1 rounded-lg flex items-center gap-1 border border-emerald-200"
                        title="Ver registro en Bitácora de Atención Diaria"
                      >
                        <span>✓</span> En Bitácora
                      </Link>
                    ) : (
                      <button
                        disabled={isPending}
                        onClick={() => handleOpenAttendedModal(appt)}
                        className="text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 px-2 py-1 rounded-lg flex items-center gap-1"
                        title="Registrar esta cita atendida en la Bitácora Diaria"
                      >
                        <span>📝</span> A Bitácora
                      </button>
                    )}

                    {appt.case_file_id ? (
                      <Link
                        href={`/casos/${appt.case_file_id}/entrevistas/nueva?cita=${appt.id}`}
                        className="text-xs text-brand-700 font-semibold bg-white border border-brand-200 px-2 py-1 rounded-lg hover:bg-brand-50"
                        title="Abrir Entrevista Inicial en el caso"
                      >
                        + Entrevista
                      </Link>
                    ) : (
                      <Link
                        href={`/casos/nuevo?fuente=Cita+DECE${appt.student_id ? `&estudiante=${appt.student_id}` : ""}${appt.student_name ? `&estudiante_nombre=${encodeURIComponent(appt.student_name)}` : ""}&motivo=${encodeURIComponent(appt.title)}`}
                        className="text-xs text-indigo-700 font-semibold bg-white border border-indigo-200 px-2 py-1 rounded-lg hover:bg-indigo-50"
                        title="Crear caso a partir de esta cita"
                      >
                        + Caso
                      </Link>
                    )}
                  </div>
                )}

                {appt && appt.case_file_id && (
                  <Link
                    href={`/casos/${appt.case_file_id}`}
                    className="text-xs text-brand-600 font-bold hover:underline bg-white px-2 py-1 rounded border border-brand-200"
                  >
                    Ver Caso →
                  </Link>
                )}

                {!appt && hasActivity && (
                  <button
                    disabled={isPending}
                    onClick={() => {
                      startTransition(async () => {
                        await setSlotAvailability(professional.id, date, hour, true, null, null);
                      });
                    }}
                    className="text-xs text-brand-700 font-semibold bg-white border border-slate-200 px-2.5 py-1 rounded-lg hover:bg-slate-50"
                  >
                    Liberar / Habilitar
                  </button>
                )}

                {!appt && !hasActivity && (
                  <div className="flex items-center gap-1.5">
                    <Link
                      href={`/citas/nueva?fecha=${date}&hora=${hour}`}
                      className="text-xs font-bold text-brand-700 bg-white border border-brand-200 px-2 py-1 rounded-lg hover:bg-brand-50"
                    >
                      + Cita
                    </Link>
                    <button
                      onClick={() => setQuickBlockHour(hour)}
                      className="text-xs font-medium text-amber-800 bg-white border border-amber-200 px-2 py-1 rounded-lg hover:bg-amber-50"
                    >
                      + Actividad
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal para Reagendar Cita */}
      {reschedulingAppt && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <span>🔄</span> Reagendar Cita DECE
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {reschedulingAppt.title} {reschedulingAppt.student_name ? `· Est: ${reschedulingAppt.student_name}` : ""}
                </p>
              </div>
              <button
                onClick={() => setReschedulingAppt(null)}
                className="text-slate-400 hover:text-slate-600 text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRescheduleSubmit} className="space-y-4">
              <div className="bg-amber-50/80 p-3 rounded-xl border border-amber-200 text-xs text-amber-900">
                <strong>Horario actual:</strong> {reschedulingAppt.date} a las {reschedulingAppt.start_time}
                {reschedulingAppt.requester_email && (
                  <div className="mt-1 font-semibold text-emerald-800">
                    ✉️ Se enviará una notificación automática por correo a: {reschedulingAppt.requester_email}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="label text-xs font-semibold">Nueva Fecha *</label>
                  <input
                    type="date"
                    required
                    min={new Date().toISOString().slice(0, 10)}
                    value={rescheduleDate}
                    onChange={(e) => setRescheduleDate(e.target.value)}
                    className="input text-sm"
                  />
                </div>
                <div>
                  <label className="label text-xs font-semibold">Nueva Hora de Inicio *</label>
                  <select
                    value={rescheduleStartTime}
                    onChange={(e) => setRescheduleStartTime(e.target.value)}
                    className="select text-sm font-semibold"
                    required
                  >
                    {HOUR_SLOTS.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="label text-xs">Hora de Fin (opcional)</label>
                  <input
                    type="time"
                    value={rescheduleEndTime}
                    onChange={(e) => setRescheduleEndTime(e.target.value)}
                    className="input text-sm"
                  />
                </div>
                <div>
                  <label className="label text-xs">Lugar / Modalidad</label>
                  <input
                    type="text"
                    value={rescheduleLocation}
                    onChange={(e) => setRescheduleLocation(e.target.value)}
                    placeholder="Ej. Oficina DECE / Sala de Reuniones"
                    className="input text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="label text-xs font-semibold">
                  Motivo o Justificación del Reagendamiento (opcional)
                </label>
                <textarea
                  rows={2}
                  value={rescheduleReason}
                  onChange={(e) => setRescheduleReason(e.target.value)}
                  placeholder="Ej. Coincidencia con taller institucional / Solicitud del representante"
                  className="textarea text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setReschedulingAppt(null)}
                  className="btn-secondary text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending || !rescheduleDate || !rescheduleStartTime}
                  className="btn-primary text-xs flex items-center gap-1.5"
                >
                  <span>✓</span> {isPending ? "Reagendando..." : "Confirmar Reagendamiento"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* Modal para Cita Atendida: Flujo 1-Clic Bitácora Diaria o Entrevista */}
      {attendedModalAppt && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <span className="text-emerald-600">✓</span> Cita Atendida: Registro y Seguimiento
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {attendedModalAppt.title} · {attendedModalAppt.date} a las {attendedModalAppt.start_time}
                </p>
              </div>
              <button
                onClick={() => { setAttendedModalAppt(null); setAttendedSuccessInfo(null); }}
                className="text-slate-400 hover:text-slate-600 text-lg"
              >
                ✕
              </button>
            </div>

            {attendedSuccessInfo ? (
              <div className="space-y-4 text-center py-4">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto text-2xl">
                  ✓
                </div>
                <h4 className="text-sm font-bold text-slate-900">¡Registrado exitosamente en la Bitácora!</h4>
                <p className="text-xs text-slate-600 max-w-sm mx-auto">
                  La cita ha sido marcada como Atendida y se creó la entrada en la Bitácora de Atención Diaria con los datos prellenados.
                </p>
                <div className="flex items-center justify-center gap-2 pt-2">
                  <Link
                    href="/atencion-diaria"
                    className="btn-primary text-xs flex items-center gap-1.5"
                  >
                    <span>📋</span> Ver en Bitácora Diaria →
                  </Link>
                  <button
                    type="button"
                    onClick={() => { setAttendedModalAppt(null); setAttendedSuccessInfo(null); }}
                    className="btn-secondary text-xs"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Resumen de la Cita */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Estudiante:</span>
                    <span className="font-bold text-slate-800">
                      {attendedModalAppt.student_name || "No registrado"} {attendedModalAppt.student_course ? `(${attendedModalAppt.student_course})` : ""}
                    </span>
                  </div>
                  {(attendedModalAppt.representative_name || attendedModalAppt.requester_name) && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Representante / Solicitante:</span>
                      <span className="font-semibold text-slate-700">
                        {attendedModalAppt.representative_name || attendedModalAppt.requester_name}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-slate-500">Tipo de Convocado:</span>
                    <span className="font-semibold text-slate-700">{attendedModalAppt.attendee_type}</span>
                  </div>
                </div>

                <div>
                  <label className="label text-xs font-semibold text-slate-700">
                    Observaciones o Acuerdos del Encuentro (opcional)
                  </label>
                  <textarea
                    rows={2}
                    value={attendedObservations}
                    onChange={(e) => setAttendedObservations(e.target.value)}
                    placeholder="Ej. Se brindó orientación socioemocional y se definieron compromisos familiares..."
                    className="textarea text-xs"
                  />
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-100">
                  {/* Opción 1: Bitácora 1-Clic */}
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={handleConvertToDailyAttention}
                    className="w-full text-left p-3 rounded-xl border border-emerald-300 bg-emerald-50/80 hover:bg-emerald-100/90 transition shadow-xs group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs sm:text-sm">
                        <span>📝</span>
                        <span>Registrar en Bitácora de Atención Diaria (1-Clic)</span>
                      </div>
                      <span className="text-emerald-700 text-xs font-bold group-hover:translate-x-0.5 transition">➔</span>
                    </div>
                    <p className="text-[11px] text-emerald-800 mt-1 pl-6">
                      Crea la entrada oficial en la Bitácora Diaria (/atencion-diaria) vinculando automáticamente fecha, duración, estudiante y motivo.
                    </p>
                  </button>

                  {/* Opción 2: Entrevista Inicial */}
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={handleOpenInterview}
                    className="w-full text-left p-3 rounded-xl border border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100/80 transition group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-indigo-900 font-bold text-xs sm:text-sm">
                        <span>📁</span>
                        <span>Abrir Entrevista Inicial del Caso</span>
                      </div>
                      <span className="text-indigo-700 text-xs font-bold group-hover:translate-x-0.5 transition">➔</span>
                    </div>
                    <p className="text-[11px] text-indigo-800 mt-1 pl-6">
                      {attendedModalAppt.case_file_id
                        ? "Abre el formulario de entrevista semiestructurada en el caso vinculado prellenando los datos."
                        : "Abre el formulario de nuevo caso y entrevista prellenando estudiante y motivo."}
                    </p>
                  </button>

                  {/* Opción 3: Solo Atendida */}
                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      onClick={() => setAttendedModalAppt(null)}
                      className="btn-secondary text-xs"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={handleJustMarkAttended}
                      className="text-xs text-slate-500 hover:text-slate-800 font-medium underline px-2 py-1"
                    >
                      Solo marcar como Atendida
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {/* Modal de Bloqueo Rápido */}
      {quickBlockHour && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <span>🔴</span> Programar Actividad a las {quickBlockHour}
              </h3>
              <button onClick={() => setQuickBlockHour(null)} className="text-slate-400 hover:text-slate-600 text-lg">
                ✕
              </button>
            </div>

            <form onSubmit={handleQuickBlock} className="space-y-4">
              <div>
                <label className="label text-xs font-semibold">Tipo de Actividad</label>
                <select
                  value={activityType}
                  onChange={(e) => setActivityType(e.target.value)}
                  className="select text-sm"
                >
                  {Object.entries(ACTIVITY_META).map(([val, meta]) => (
                    <option key={val} value={val}>
                      {meta.icon} {meta.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label text-xs font-semibold">Título / Detalle de la Actividad *</label>
                <input
                  type="text"
                  required
                  value={activityTitle}
                  onChange={(e) => setActivityTitle(e.target.value)}
                  placeholder="Ej. Taller de Prevención en 8vo A / Reunión Rectorado"
                  className="input text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setQuickBlockHour(null)}
                  className="btn-secondary text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending || !activityTitle.trim()}
                  className="btn-primary text-xs"
                >
                  {isPending ? "Guardando..." : "Guardar en mi Horario"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
