"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { saveInternAction } from "@/app/pasantes/actions";
import type { InternRow, InternType, InternStatus } from "@/lib/types";

interface Props {
  intern?: InternRow;
  deceUsers: { id: string; name: string; role: string }[];
}

export default function InternForm({ intern, deceUsers }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [tutorUserId, setTutorUserId] = useState(intern?.tutor_user_id || "");
  const [tutorName, setTutorName] = useState(intern?.tutor_name || "");

  const handleTutorChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    setTutorUserId(selectedId);
    const found = deceUsers.find((u) => u.id === selectedId);
    setTutorName(found ? found.name : "");
  };

  const [scheduleType, setScheduleType] = useState(intern?.schedule_type || "MATUTINA");
  const [scheduleDetails, setScheduleDetails] = useState(
    intern?.schedule_details ||
      (intern?.schedule_type === "VESPERTINA"
        ? "Lunes a Viernes de 13:00 a 19:00"
        : intern?.schedule_type === "COMPLETA"
        ? "Lunes a Viernes de 07:30 a 16:00"
        : "Lunes a Viernes de 07:30 a 12:30")
  );
  const [expectedEntry, setExpectedEntry] = useState(intern?.expected_entry_time || "07:30");
  const [expectedExit, setExpectedExit] = useState(intern?.expected_exit_time || "12:30");

  const handlePresetChange = (type: string) => {
    setScheduleType(type);
    if (type === "MATUTINA") {
      setScheduleDetails("Lunes a Viernes de 07:00 a 13:00");
      setExpectedEntry("07:00");
      setExpectedExit("13:00");
    } else if (type === "VESPERTINA") {
      setScheduleDetails("Lunes a Viernes de 13:00 a 19:00");
      setExpectedEntry("13:00");
      setExpectedExit("19:00");
    } else if (type === "MEDIA_MATUTINA") {
      setScheduleDetails("Lunes a Viernes de 07:30 a 12:30");
      setExpectedEntry("07:30");
      setExpectedExit("12:30");
    } else if (type === "MEDIA_VESPERTINA") {
      setScheduleDetails("Lunes a Viernes de 13:00 a 17:30");
      setExpectedEntry("13:00");
      setExpectedExit("17:30");
    } else if (type === "COMPLETA") {
      setScheduleDetails("Lunes a Viernes de 07:30 a 16:00");
      setExpectedEntry("07:30");
      setExpectedExit("16:00");
    } else if (type === "PERSONALIZADO") {
      if (!scheduleDetails) {
        setScheduleDetails("Lunes a Jueves de 08:00 a 13:00");
      }
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const res = await saveInternAction(formData);
      if (res.success) {
        router.push(res.id ? `/pasantes/${res.id}` : "/pasantes");
        router.refresh();
      } else {
        setErrorMessage(res.error || "Ocurrió un error al guardar.");
      }
    });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/pasantes"
              className="text-xs text-slate-500 hover:text-slate-800 font-semibold"
            >
              ← Volver al listado
            </Link>
          </div>
          <h1 className="text-xl font-extrabold text-slate-900 mt-1">
            {intern ? `Editar: ${intern.full_name}` : "Registrar Nuevo Pasante o Voluntario"}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Ingresa los datos para generar automáticamente su credencial con código QR.
          </p>
        </div>
      </div>

      {errorMessage && (
        <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-700 flex items-center gap-2">
          <span>⚠️</span>
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
        {intern && <input type="hidden" name="id" value={intern.id} />}
        <input type="hidden" name="tutor_name" value={tutorName} />

        {/* DATOS PERSONALES */}
        <div>
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-200 pb-2 mb-4">
            1. Datos Personales
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nombres y Apellidos Completos *
              </label>
              <input
                type="text"
                name="full_name"
                required
                defaultValue={intern?.full_name || ""}
                placeholder="Ej. María Belén Morales Silva"
                className="w-full text-xs p-2.5 border border-slate-300 rounded-lg text-slate-900 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Cédula de Identidad / Pasaporte *
              </label>
              <input
                type="text"
                name="document_id"
                required
                defaultValue={intern?.document_id || ""}
                placeholder="Ej. 1723456789"
                className="w-full text-xs p-2.5 border border-slate-300 rounded-lg text-slate-900 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tipo de Registro *
              </label>
              <select
                name="type"
                required
                defaultValue={intern?.type || "PASANTE"}
                className="w-full text-xs p-2.5 border border-slate-300 rounded-lg text-slate-900 font-semibold"
              >
                <option value="PASANTE">Pasante (Prácticas Preprofesionales / Vinculación)</option>
                <option value="VOLUNTARIO">Voluntario / Colaborador Social</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Teléfono Celular
              </label>
              <input
                type="tel"
                name="phone"
                defaultValue={intern?.phone || ""}
                placeholder="Ej. 0987654321"
                className="w-full text-xs p-2.5 border border-slate-300 rounded-lg text-slate-900 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Correo Electrónico
              </label>
              <input
                type="email"
                name="email"
                defaultValue={intern?.email || ""}
                placeholder="ejemplo@correo.com"
                className="w-full text-xs p-2.5 border border-slate-300 rounded-lg text-slate-900"
              />
            </div>
          </div>
        </div>

        {/* DATOS ACADÉMICOS Y PROCEDENCIA */}
        <div>
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-200 pb-2 mb-4">
            2. Procedencia Académica e Institucional
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Universidad / Instituto / Organización de Origen *
              </label>
              <input
                type="text"
                name="university_or_origin"
                required
                defaultValue={intern?.university_or_origin || ""}
                placeholder="Ej. Universidad Central del Ecuador (UCE) / PUCE / UTPL"
                className="w-full text-xs p-2.5 border border-slate-300 rounded-lg text-slate-900 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Carrera / Especialidad
              </label>
              <input
                type="text"
                name="career_or_specialty"
                defaultValue={intern?.career_or_specialty || ""}
                placeholder="Ej. Psicología Clínica / Psicología Educativa / Trabajo Social"
                className="w-full text-xs p-2.5 border border-slate-300 rounded-lg text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tutor DECE Institucional Asignado
              </label>
              <select
                name="tutor_user_id"
                value={tutorUserId}
                onChange={handleTutorChange}
                className="w-full text-xs p-2.5 border border-slate-300 rounded-lg text-slate-900"
              >
                <option value="">-- Sin tutor asignado --</option>
                {deceUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.role})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* DETALLES DE LA PASANTÍA Y HORAS */}
        <div>
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-200 pb-2 mb-4">
            3. Jornada, Fechas y Horas Requeridas
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Horas Totales Requeridas *
              </label>
              <input
                type="number"
                name="required_hours"
                required
                min={1}
                defaultValue={intern?.required_hours || 160}
                className="w-full text-xs p-2.5 border border-slate-300 rounded-lg text-slate-900 font-bold"
              />
              <span className="text-[10px] text-slate-400">
                Horas exigidas por la Universidad
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Fecha de Inicio *
              </label>
              <input
                type="date"
                name="start_date"
                required
                defaultValue={intern?.start_date || new Date().toISOString().split("T")[0]}
                className="w-full text-xs p-2.5 border border-slate-300 rounded-lg text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Fecha Estimada de Culminación
              </label>
              <input
                type="date"
                name="end_date"
                defaultValue={intern?.end_date || ""}
                className="w-full text-xs p-2.5 border border-slate-300 rounded-lg text-slate-900"
              />
            </div>

            {/* HORARIO Y JORNADA PERSONALIZADA */}
            <div className="sm:col-span-3 bg-indigo-50/40 p-4 rounded-xl border border-indigo-100 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <span>⏰</span> Horario y Días de Asistencia (Configuración Manual)
                  </label>
                  <p className="text-[11px] text-slate-500">
                    Define el horario específico acordado para este pasante/voluntario según su disponibilidad universitaria.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Plantilla / Tipo de Jornada
                  </label>
                  <select
                    name="schedule_type"
                    value={scheduleType}
                    onChange={(e) => handlePresetChange(e.target.value)}
                    className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 font-medium"
                  >
                    <option value="MEDIA_MATUTINA">Media Jornada Matutina (07:30 a 12:30)</option>
                    <option value="MATUTINA">Jornada Matutina (07:00 a 13:00)</option>
                    <option value="MEDIA_VESPERTINA">Media Jornada Vespertina (13:00 a 17:30)</option>
                    <option value="VESPERTINA">Jornada Vespertina (13:00 a 19:00)</option>
                    <option value="COMPLETA">Tiempo Completo / Mixta (07:30 a 16:00)</option>
                    <option value="PERSONALIZADO">✏️ Personalizado / Días específicos</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Horario Detallado (Editable manualmente)
                  </label>
                  <input
                    type="text"
                    name="schedule_details"
                    value={scheduleDetails}
                    onChange={(e) => setScheduleDetails(e.target.value)}
                    placeholder="Ej. Lunes a Viernes de 07:30 a 12:30, o Martes y Jueves de 13:00 a 18:00..."
                    className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Hora habitual de entrada
                  </label>
                  <input
                    type="time"
                    name="expected_entry_time"
                    value={expectedEntry}
                    onChange={(e) => setExpectedEntry(e.target.value)}
                    className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Hora habitual de salida
                  </label>
                  <input
                    type="time"
                    name="expected_exit_time"
                    value={expectedExit}
                    onChange={(e) => setExpectedExit(e.target.value)}
                    className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono font-bold"
                  />
                </div>

                <div className="flex items-center">
                  <div className="text-[11px] text-slate-600 bg-white p-2.5 rounded-lg border border-slate-200 w-full leading-tight">
                    💡 <strong>Flexibilidad:</strong> Puedes escribir el horario exacto. Este figurará en la ficha del pasante y en su certificación oficial.
                  </div>
                </div>
              </div>
            </div>

            {intern && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Estado del Pasante
                </label>
                <select
                  name="status"
                  defaultValue={intern.status}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-lg text-slate-900 font-bold"
                >
                  <option value="ACTIVO">ACTIVO (Asistiendo)</option>
                  <option value="CULMINADO">CULMINADO (Completó horas)</option>
                  <option value="INACTIVO">INACTIVO / RETIRADO</option>
                </select>
              </div>
            )}

            <div className="sm:col-span-3">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Observaciones o Funciones asignadas
              </label>
              <textarea
                name="notes"
                rows={2}
                defaultValue={intern?.notes || ""}
                placeholder="Ej. Asignado a apoyo en programas de prevención psicosocial y archivo de fichas acumulativas..."
                className="w-full text-xs p-2.5 border border-slate-300 rounded-lg text-slate-900"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
          <Link
            href="/pasantes"
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={isPending}
            className="px-6 py-2.5 bg-brand-700 hover:bg-brand-800 active:scale-[0.98] text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-2"
          >
            {isPending ? "Guardando..." : intern ? "Actualizar Pasante" : "Registrar y Generar QR"}
          </button>
        </div>
      </form>
    </div>
  );
}
