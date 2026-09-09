"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { updateAppointmentStatus, rescheduleAppointment } from "./actions";
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

export default function DailyScheduleView({
  date,
  professional,
  professionals,
  canPickOther,
  appointments,
  slots,
}: {
  date: string;
  professional: UserRow;
  professionals: UserRow[];
  canPickOther: boolean;
  appointments: (AppointmentRow & { student_name: string | null; student_course?: string | null })[];
  slots: ScheduleSlotRow[];
}) {
  const [isPending, startTransition] = useTransition();

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
                {appt && appt.status === "PROGRAMADA" && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      disabled={isPending}
                      onClick={() => handleUpdateStatus(appt.id, "ATENDIDA")}
                      className="px-2.5 py-1 text-xs font-bold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition shadow-xs"
                      title="Registrar cita como atendida"
                    >
                      ✓ Atendida
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
