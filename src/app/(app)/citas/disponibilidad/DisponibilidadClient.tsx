"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  setSlotAvailability,
  blockSlotWithActivity,
  setDayAvailability,
  saveCoverageAndProfile,
} from "./actions";
import { HOUR_SLOTS } from "@/lib/schedule";
import { STANDARD_ECUADOR_COURSES, parseCoverageCourses } from "@/lib/coverage";
import type { UserRow, ScheduleSlotRow, AppointmentRow } from "@/lib/types";

const ACTIVITY_TYPES = [
  { value: "TALLER", label: "🏫 Taller / Charla en Aula", color: "purple" },
  { value: "REUNION", label: "👥 Reunión Institucional / Rectorado", color: "indigo" },
  { value: "VISITA_DOMICILIARIA", label: "🏠 Visita Domiciliaria", color: "amber" },
  { value: "ATENCION_CASO", label: "🚨 Atención de Caso Prioritario", color: "rose" },
  { value: "ADMINISTRATIVO", label: "📑 Gestión Administrativa / Informes", color: "blue" },
  { value: "OTRA_ACTIVIDAD", label: "📌 Otra Actividad", color: "slate" },
];

function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function formatLongDate(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString("es-EC", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}

export default function DisponibilidadClient({
  professional,
  professionals,
  canPickOther,
  date,
  slots,
  appointments,
}: {
  professional: UserRow;
  professionals: UserRow[];
  canPickOther: boolean;
  date: string;
  slots: ScheduleSlotRow[];
  appointments: (AppointmentRow & { student_name?: string | null })[];
}) {
  const [activeTab, setActiveTab] = useState<"HORARIOS" | "COBERTURA">("HORARIOS");
  const [isPending, startTransition] = useTransition();

  // Activity Block Modal State
  const [blockingHour, setBlockingHour] = useState<string | null>(null);
  const [activityType, setActivityType] = useState("TALLER");
  const [activityTitle, setActivityTitle] = useState("");

  // Coverage State
  const [jobTitle, setJobTitle] = useState(professional.job_title || "Analista DECE");
  const [selectedCourses, setSelectedCourses] = useState<string[]>(
    parseCoverageCourses(professional.coverage_courses)
  );

  const slotMap = new Map(slots.map((s) => [s.hour, s]));
  const appointmentByHour = new Map(appointments.map((a) => [a.start_time, a]));

  const handleToggleCourse = (course: string) => {
    setSelectedCourses((prev) =>
      prev.includes(course) ? prev.filter((c) => c !== course) : [...prev, course]
    );
  };

  const handleSelectLevel = (coursesInLevel: string[]) => {
    const allSelected = coursesInLevel.every((c) => selectedCourses.includes(c));
    if (allSelected) {
      setSelectedCourses((prev) => prev.filter((c) => !coursesInLevel.includes(c)));
    } else {
      setSelectedCourses((prev) => Array.from(new Set([...prev, ...coursesInLevel])));
    }
  };

  const handleSaveCoverage = () => {
    startTransition(async () => {
      await saveCoverageAndProfile(professional.id, selectedCourses, jobTitle);
      alert("✅ Cobertura de cursos y cargo guardados exitosamente.");
    });
  };

  const handleBlockSlot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!blockingHour || !activityTitle.trim()) return;
    startTransition(async () => {
      await blockSlotWithActivity(
        professional.id,
        date,
        blockingHour,
        activityType,
        activityTitle.trim()
      );
      setBlockingHour(null);
      setActivityTitle("");
    });
  };

  const handleEnableMorning = () => {
    const morningHours = ["07:00", "08:00", "09:00", "10:00", "11:00", "12:00", "13:00"];
    startTransition(async () => {
      for (const h of morningHours) {
        if (!appointmentByHour.has(h)) {
          await setSlotAvailability(professional.id, date, h, true, null, null);
        }
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* Selector de Profesional (Para Coordinador / Admin) */}
      {canPickOther && (
        <div className="card p-4 flex flex-wrap items-center justify-between gap-3 bg-slate-50 border-slate-200">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-700">Administrando agenda de:</span>
            <select
              value={professional.id}
              onChange={(e) => {
                window.location.href = `/citas/disponibilidad?profesional=${e.target.value}&fecha=${date}`;
              }}
              className="select text-sm py-1 font-semibold text-brand-700"
            >
              {professionals.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.id === professional.id ? "★" : ""}
                </option>
              ))}
            </select>
          </div>
          <div className="text-xs text-slate-500">
            Cargo: <span className="font-semibold text-slate-700">{professional.job_title || "Analista DECE"}</span>
          </div>
        </div>
      )}

      {/* Tabs Principales */}
      <div className="flex border-b border-slate-200 gap-4">
        <button
          onClick={() => setActiveTab("HORARIOS")}
          className={`pb-3 text-sm font-semibold transition border-b-2 flex items-center gap-2 ${
            activeTab === "HORARIOS"
              ? "border-brand-600 text-brand-700"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <span>🕒</span> Horarios del Día & Bloqueos de Actividad
        </button>
        <button
          onClick={() => setActiveTab("COBERTURA")}
          className={`pb-3 text-sm font-semibold transition border-b-2 flex items-center gap-2 ${
            activeTab === "COBERTURA"
              ? "border-brand-600 text-brand-700"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <span>🎓</span> Mi Cobertura de Cursos ({selectedCourses.length})
        </button>
      </div>

      {activeTab === "HORARIOS" && (
        <div className="space-y-4">
          {/* Navegación Diaria */}
          <div className="card p-4 flex flex-wrap items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-2">
              <Link
                href={`/citas/disponibilidad?profesional=${professional.id}&fecha=${addDays(date, -1)}`}
                className="btn-secondary text-xs"
              >
                ◀ Día anterior
              </Link>
              <input
                type="date"
                value={date}
                onChange={(e) => {
                  if (e.target.value) {
                    window.location.href = `/citas/disponibilidad?profesional=${professional.id}&fecha=${e.target.value}`;
                  }
                }}
                className="input text-xs py-1.5"
              />
              <Link
                href={`/citas/disponibilidad?profesional=${professional.id}&fecha=${addDays(date, 1)}`}
                className="btn-secondary text-xs"
              >
                Día siguiente ▶
              </Link>
              <Link
                href={`/citas/disponibilidad?profesional=${professional.id}&fecha=${new Date().toISOString().slice(0, 10)}`}
                className="btn-secondary text-xs font-semibold"
              >
                Hoy
              </Link>
            </div>
            <div className="text-sm font-bold text-slate-800 capitalize flex items-center gap-2">
              <span>📅</span> {formatLongDate(date)}
            </div>
          </div>

          {/* Barra de Acciones Rápidas */}
          <div className="flex flex-wrap items-center justify-between gap-2 bg-brand-50/60 p-3 rounded-xl border border-brand-100">
            <div className="text-xs font-medium text-brand-900 flex items-center gap-1.5">
              <span>⚡ Acciones rápidas para este día:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                disabled={isPending}
                onClick={handleEnableMorning}
                className="btn-secondary text-xs py-1 bg-white hover:bg-green-50 text-green-700 border-green-300"
              >
                🟢 Habilitar Mañana (07:00 a 13:00)
              </button>
              <button
                disabled={isPending}
                onClick={() => {
                  startTransition(async () => {
                    await setDayAvailability(professional.id, date, true);
                  });
                }}
                className="btn-secondary text-xs py-1 bg-white hover:bg-green-50 text-green-700 border-green-300"
              >
                ✅ Todo el día Disponible
              </button>
              <button
                disabled={isPending}
                onClick={() => {
                  startTransition(async () => {
                    await setDayAvailability(professional.id, date, false);
                  });
                }}
                className="btn-secondary text-xs py-1 bg-white hover:bg-slate-100 text-slate-600"
              >
                🚫 Todo No Disponible
              </button>
            </div>
          </div>

          {/* Grilla de Horarios y Bloques */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {HOUR_SLOTS.map((hour) => {
              const appt = appointmentByHour.get(hour);
              const slot = slotMap.get(hour);
              const isAvailable = slot?.available === 1;
              const hasActivity = !isAvailable && !!slot?.activity_title;

              // 1. Cita confirmada / tomada
              if (appt) {
                return (
                  <div
                    key={hour}
                    className="card p-3.5 bg-blue-50/80 border-blue-300 relative overflow-hidden shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-black text-blue-900">{hour}</span>
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-200 text-blue-800 px-2 py-0.5 rounded-full">
                        🔒 Cita Reservada
                      </span>
                    </div>
                    <div className="mt-2 text-xs font-semibold text-slate-800 truncate">
                      {appt.student_name ? `Est: ${appt.student_name}` : appt.title}
                    </div>
                    <div className="text-[11px] text-slate-500 truncate mt-0.5">
                      {appt.attendee_type} · {appt.title}
                    </div>
                    <div className="mt-2.5 pt-2 border-t border-blue-200 flex justify-between items-center text-xs">
                      <Link href={`/citas?desde=${date}`} className="text-blue-700 font-semibold hover:underline">
                        Ver en agenda →
                      </Link>
                    </div>
                  </div>
                );
              }

              // 2. Bloqueado por otra actividad institucional / taller
              if (hasActivity) {
                const actMeta = ACTIVITY_TYPES.find((a) => a.value === slot?.activity_type) || ACTIVITY_TYPES[5];
                return (
                  <div
                    key={hour}
                    className="card p-3.5 bg-amber-50/80 border-amber-300 relative overflow-hidden shadow-sm flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-black text-amber-950">{hour}</span>
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full">
                          🔴 Ocupado
                        </span>
                      </div>
                      <div className="mt-2 text-xs font-bold text-amber-900 line-clamp-2">
                        {slot?.activity_title}
                      </div>
                      <div className="text-[11px] text-amber-700 mt-1">
                        {actMeta.label}
                      </div>
                    </div>
                    <div className="mt-3 pt-2 border-t border-amber-200 flex items-center justify-between">
                      <button
                        disabled={isPending}
                        onClick={() => {
                          startTransition(async () => {
                            await setSlotAvailability(professional.id, date, hour, true, null, null);
                          });
                        }}
                        className="text-[11px] text-green-700 font-bold hover:underline"
                      >
                        Habilitar Cita
                      </button>
                      <button
                        disabled={isPending}
                        onClick={() => {
                          startTransition(async () => {
                            await setSlotAvailability(professional.id, date, hour, false, null, null);
                          });
                        }}
                        className="text-[11px] text-slate-500 hover:text-red-600"
                      >
                        Quitar
                      </button>
                    </div>
                  </div>
                );
              }

              // 3. Disponible para citas públicas
              if (isAvailable) {
                return (
                  <div
                    key={hour}
                    className="card p-3.5 bg-emerald-50/90 border-emerald-300 relative overflow-hidden shadow-sm flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-black text-emerald-950">{hour}</span>
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full">
                          🟢 Disponible
                        </span>
                      </div>
                      <div className="mt-2 text-xs font-medium text-emerald-800">
                        Habilitada para citas públicas en línea.
                      </div>
                    </div>
                    <div className="mt-3 pt-2 border-t border-emerald-200 flex items-center justify-between">
                      <button
                        disabled={isPending}
                        onClick={() => setBlockingHour(hour)}
                        className="text-[11px] text-amber-800 font-semibold hover:underline"
                      >
                        🔴 Bloquear Actividad
                      </button>
                      <button
                        disabled={isPending}
                        onClick={() => {
                          startTransition(async () => {
                            await setSlotAvailability(professional.id, date, hour, false);
                          });
                        }}
                        className="text-[11px] text-slate-500 hover:text-slate-800"
                      >
                        Deshabilitar
                      </button>
                    </div>
                  </div>
                );
              }

              // 4. No disponible (libre sin habilitar)
              return (
                <div
                  key={hour}
                  className="card p-3.5 bg-white border-slate-200 relative overflow-hidden flex flex-col justify-between hover:border-slate-300 transition"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-slate-700">{hour}</span>
                      <span className="text-[10px] text-slate-400 font-medium">No disponible</span>
                    </div>
                    <div className="mt-2 text-xs text-slate-400">
                      Espacio libre / inactivo
                    </div>
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                    <button
                      disabled={isPending}
                      onClick={() => {
                        startTransition(async () => {
                          await setSlotAvailability(professional.id, date, hour, true);
                        });
                      }}
                      className="text-[11px] text-emerald-700 font-bold hover:underline"
                    >
                      🟢 Habilitar Cita
                    </button>
                    <button
                      disabled={isPending}
                      onClick={() => setBlockingHour(hour)}
                      className="text-[11px] text-amber-700 font-semibold hover:underline"
                    >
                      🔴 Bloquear
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Pestaña: Mi Cobertura de Cursos */}
      {activeTab === "COBERTURA" && (
        <div className="card p-6 space-y-6">
          <div>
            <h2 className="text-base font-bold text-slate-800">
              Asignación de Cobertura de Cursos y Niveles
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Selecciona los cursos que están bajo tu responsabilidad. Cuando una persona solicite una cita y elija uno de estos cursos, el sistema le asignará tu atención automáticamente y le mostrará tus horarios disponibles.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label text-xs font-semibold">Tu Cargo / Título Profesional</label>
              <input
                type="text"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="Ej. Analista DECE / Psicólogo Clínico"
                className="input"
              />
            </div>
            <div className="flex items-end">
              <div className="p-3 bg-brand-50 rounded-lg text-xs text-brand-900 border border-brand-100 w-full">
                <strong>Cursos seleccionados:</strong> {selectedCourses.length} cursos bajo tu cobertura.
              </div>
            </div>
          </div>

          {/* Agrupaciones por Niveles Oficiales */}
          <div className="space-y-4 pt-2">
            {/* 1. Inicial y Preparatoria */}
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                  👶 Educación Inicial y Preparatoria
                </h3>
                <button
                  type="button"
                  onClick={() => handleSelectLevel(["Inicial I", "Inicial II", "1ro EGB (Preparatoria)"])}
                  className="text-xs text-brand-600 font-semibold hover:underline"
                >
                  Seleccionar nivel
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {["Inicial I", "Inicial II", "1ro EGB (Preparatoria)"].map((c) => (
                  <label
                    key={c}
                    className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition ${
                      selectedCourses.includes(c)
                        ? "bg-brand-50 border-brand-500 text-brand-900 font-bold"
                        : "bg-white border-slate-200 text-slate-700"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedCourses.includes(c)}
                      onChange={() => handleToggleCourse(c)}
                      className="rounded text-brand-600 focus:ring-brand-500"
                    />
                    <span>{c}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* 2. Básica Elemental */}
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                  📘 Educación General Básica Elemental
                </h3>
                <button
                  type="button"
                  onClick={() => handleSelectLevel(["2do EGB (Elemental)", "3ro EGB (Elemental)", "4to EGB (Elemental)"])}
                  className="text-xs text-brand-600 font-semibold hover:underline"
                >
                  Seleccionar nivel
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {["2do EGB (Elemental)", "3ro EGB (Elemental)", "4to EGB (Elemental)"].map((c) => (
                  <label
                    key={c}
                    className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition ${
                      selectedCourses.includes(c)
                        ? "bg-brand-50 border-brand-500 text-brand-900 font-bold"
                        : "bg-white border-slate-200 text-slate-700"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedCourses.includes(c)}
                      onChange={() => handleToggleCourse(c)}
                      className="rounded text-brand-600 focus:ring-brand-500"
                    />
                    <span>{c}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* 3. Básica Media */}
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                  📗 Educación General Básica Media
                </h3>
                <button
                  type="button"
                  onClick={() => handleSelectLevel(["5to EGB (Media)", "6to EGB (Media)", "7mo EGB (Media)"])}
                  className="text-xs text-brand-600 font-semibold hover:underline"
                >
                  Seleccionar nivel
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {["5to EGB (Media)", "6to EGB (Media)", "7mo EGB (Media)"].map((c) => (
                  <label
                    key={c}
                    className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition ${
                      selectedCourses.includes(c)
                        ? "bg-brand-50 border-brand-500 text-brand-900 font-bold"
                        : "bg-white border-slate-200 text-slate-700"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedCourses.includes(c)}
                      onChange={() => handleToggleCourse(c)}
                      className="rounded text-brand-600 focus:ring-brand-500"
                    />
                    <span>{c}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* 4. Básica Superior */}
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                  📙 Educación General Básica Superior
                </h3>
                <button
                  type="button"
                  onClick={() => handleSelectLevel(["8vo EGB (Superior)", "9no EGB (Superior)", "10mo EGB (Superior)"])}
                  className="text-xs text-brand-600 font-semibold hover:underline"
                >
                  Seleccionar nivel
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {["8vo EGB (Superior)", "9no EGB (Superior)", "10mo EGB (Superior)"].map((c) => (
                  <label
                    key={c}
                    className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition ${
                      selectedCourses.includes(c)
                        ? "bg-brand-50 border-brand-500 text-brand-900 font-bold"
                        : "bg-white border-slate-200 text-slate-700"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedCourses.includes(c)}
                      onChange={() => handleToggleCourse(c)}
                      className="rounded text-brand-600 focus:ring-brand-500"
                    />
                    <span>{c}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* 5. Bachillerato */}
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                  🎓 Bachillerato General Unificado y Técnico
                </h3>
                <button
                  type="button"
                  onClick={() =>
                    handleSelectLevel([
                      "1ro BGU (Bachillerato)",
                      "2do BGU (Bachillerato)",
                      "3ro BGU (Bachillerato)",
                      "1ro BT (Técnico)",
                      "2do BT (Técnico)",
                      "3ro BT (Técnico)",
                    ])
                  }
                  className="text-xs text-brand-600 font-semibold hover:underline"
                >
                  Seleccionar nivel
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  "1ro BGU (Bachillerato)",
                  "2do BGU (Bachillerato)",
                  "3ro BGU (Bachillerato)",
                  "1ro BT (Técnico)",
                  "2do BT (Técnico)",
                  "3ro BT (Técnico)",
                ].map((c) => (
                  <label
                    key={c}
                    className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition ${
                      selectedCourses.includes(c)
                        ? "bg-brand-50 border-brand-500 text-brand-900 font-bold"
                        : "bg-white border-slate-200 text-slate-700"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedCourses.includes(c)}
                      onChange={() => handleToggleCourse(c)}
                      className="rounded text-brand-600 focus:ring-brand-500"
                    />
                    <span>{c}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-200">
            <button
              disabled={isPending}
              onClick={handleSaveCoverage}
              className="btn-primary flex items-center gap-2"
            >
              <span>💾</span> {isPending ? "Guardando..." : "Guardar Cobertura de Cursos"}
            </button>
          </div>
        </div>
      )}

      {/* Modal / Diálogo para Bloquear Actividad */}
      {blockingHour && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-xl">🔴</span>
                <h3 className="text-base font-bold text-slate-800">
                  Bloquear horario de las {blockingHour}
                </h3>
              </div>
              <button
                onClick={() => setBlockingHour(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleBlockSlot} className="space-y-4">
              <div>
                <label className="label text-xs font-semibold">Tipo de Actividad</label>
                <select
                  value={activityType}
                  onChange={(e) => setActivityType(e.target.value)}
                  className="select text-sm"
                >
                  {ACTIVITY_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label text-xs font-semibold">
                  Título / Motivo de la Actividad *
                </label>
                <input
                  type="text"
                  required
                  value={activityTitle}
                  onChange={(e) => setActivityTitle(e.target.value)}
                  placeholder="Ej. Taller de Prevención de Violencia en 8vo A"
                  className="input text-sm"
                />
              </div>

              <div className="text-xs text-slate-500 bg-slate-50 p-2.5 rounded-lg">
                ℹ️ Esta hora quedará bloqueada en la agenda pública para que ningún usuario pueda solicitar cita en ese horario, y aparecerá reflejada en tu horario diario de actividades.
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setBlockingHour(null)}
                  className="btn-secondary text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending || !activityTitle.trim()}
                  className="btn-primary text-xs"
                >
                  {isPending ? "Guardando..." : "Guardar Bloqueo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
