"use client";

import { useState, useEffect, useTransition } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { createAppointmentRequest, getAvailableSlotsForProfessional, type RequestActionState } from "./actions";
import { REQUESTER_ROLE_OPTIONS } from "@/lib/appointmentRequest";
import { findProfessionalForCourse, parseCoverageCourses } from "@/lib/coverage";
import type { InstitutionRow, UserRow } from "@/lib/types";

const initialState: RequestActionState = { error: null };

function SubmitButton({ hasSelectedHour }: { hasSelectedHour: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || !hasSelectedHour}
      className="btn-primary w-full py-3 text-sm font-bold shadow-lg disabled:opacity-50 transition"
    >
      {pending ? "Enviando solicitud..." : "✓ Confirmar y Enviar Solicitud de Cita"}
    </button>
  );
}

export default function PublicBookingClient({
  institution,
  professionals,
  courses,
  initialDate,
}: {
  institution: InstitutionRow;
  professionals: (UserRow & { coverage_courses?: string | null; job_title?: string | null })[];
  courses: string[];
  initialDate: string;
}) {
  const boundAction = createAppointmentRequest.bind(null, institution.id);
  const [state, formAction] = useFormState(boundAction, initialState);
  const [isPending, startTransition] = useTransition();

  const defaultProf = professionals.length > 0 ? professionals[0] : null;
  const [studentCourse, setStudentCourse] = useState("");
  const [selectedProfId, setSelectedProfId] = useState<string>(defaultProf?.id || "");
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [availableHours, setAvailableHours] = useState<string[]>([]);
  const [selectedHour, setSelectedHour] = useState<string>("");
  const [showManualProfPicker, setShowManualProfPicker] = useState(false);

  // Cargar disponibilidad inicial en montaje
  useEffect(() => {
    if (selectedProfId && selectedDate) {
      startTransition(async () => {
        const hours = await getAvailableSlotsForProfessional(institution.id, selectedProfId, selectedDate);
        setAvailableHours(hours);
        if (hours.length > 0) {
          setSelectedHour(hours[0]);
        } else {
          setSelectedHour("");
        }
      });
    }
  }, [institution.id, selectedProfId, selectedDate]);

  // Auto-detectar profesional cuando se escribe/selecciona un curso
  const handleCourseChange = (newCourse: string) => {
    setStudentCourse(newCourse);
    if (newCourse.trim()) {
      const matchedProf = findProfessionalForCourse(professionals, newCourse);
      if (matchedProf && matchedProf.id !== selectedProfId) {
        setSelectedProfId(matchedProf.id);
      }
    }
  };

  const currentProf = professionals.find((p) => p.id === selectedProfId) || defaultProf;
  const profCoverages = currentProf ? parseCoverageCourses(currentProf.coverage_courses) : [];

  if (!currentProf) {
    return (
      <div className="p-6 text-center text-slate-500">
        No hay profesionales DECE registrados en esta institución. Por favor, comunícate directamente con la institución para agendar tu cita.
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="professional_id" value={selectedProfId} />
      <input type="hidden" name="preferred_date" value={selectedDate} />

      {state.error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-700 font-medium">
          ⚠️ {state.error}
        </div>
      )}

      {/* 1. Selección del Curso del Estudiante */}
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
            1. ¿En qué grado o curso se encuentra el/la estudiante? *
          </label>
        </div>
        
        <div>
          <input
            list="courses-list"
            value={studentCourse}
            onChange={(e) => handleCourseChange(e.target.value)}
            placeholder="Escribe o selecciona el curso (ej. 8vo EGB, 1ro BGU, 2do EGB...)"
            required
            className="input text-sm font-semibold"
            name="student_course"
          />
          <datalist id="courses-list">
            {courses.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>

        {/* Tarjeta de Profesional Asignado por Cobertura */}
        {currentProf && (
          <div className="bg-white p-3.5 rounded-lg border border-brand-200 shadow-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-brand-100 text-brand-700 font-bold flex items-center justify-center text-sm shrink-0">
                👨‍🏫
              </div>
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-brand-700">
                  Profesional DECE a cargo de la cobertura:
                </div>
                <div className="text-sm font-bold text-slate-900">
                  {currentProf.name}
                </div>
                <div className="text-xs text-slate-500">
                  {currentProf.job_title || "Analista DECE"}
                  {profCoverages.length > 0 && ` · Cursos: ${profCoverages.slice(0, 4).join(", ")}${profCoverages.length > 4 ? "..." : ""}`}
                </div>
              </div>
            </div>
            {professionals.length > 1 && (
              <button
                type="button"
                onClick={() => setShowManualProfPicker(!showManualProfPicker)}
                className="text-xs text-brand-600 font-semibold hover:underline shrink-0"
              >
                {showManualProfPicker ? "Ocultar" : "Cambiar"}
              </button>
            )}
          </div>
        )}

        {/* Selector Manual si se requiere */}
        {showManualProfPicker && professionals.length > 1 && (
          <div className="pt-2 border-t border-slate-200">
            <label className="label text-xs">Elegir otro profesional DECE manualmente:</label>
            <select
              value={selectedProfId}
              onChange={(e) => setSelectedProfId(e.target.value)}
              className="select text-sm"
            >
              {professionals.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.job_title || "Analista DECE"})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* 2. Selección de Fecha y Horarios Disponibles */}
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
        <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block">
          2. Fecha y Horarios Disponibles para la Cita *
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="label text-xs">Día preferido</label>
            <input
              type="date"
              value={selectedDate}
              min={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setSelectedDate(e.target.value)}
              required
              className="input text-sm font-semibold"
            />
          </div>
          <div className="flex flex-col justify-end">
            <div className="text-xs text-slate-500 pb-2 font-medium">
              {isPending ? "Consultando disponibilidad..." : `🟢 ${availableHours.length} horarios disponibles`}
            </div>
          </div>
        </div>

        {/* Grilla de Horarios Habilitados */}
        <div>
          <label className="label text-xs mb-1.5 font-semibold">Selecciona una hora disponible:</label>
          {isPending ? (
            <div className="text-xs text-slate-400 py-4 text-center">Cargando horarios disponibles...</div>
          ) : availableHours.length === 0 ? (
            <div className="text-xs text-amber-800 bg-amber-50 p-3 rounded-lg border border-amber-200">
              No hay horarios disponibles para esta fecha (puede ser fin de semana o el profesional tiene talleres/citas ya programadas). Por favor prueba seleccionando otro día.
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {availableHours.map((h) => (
                <label
                  key={h}
                  className={`flex items-center justify-center gap-1 rounded-xl border p-2.5 text-xs font-bold cursor-pointer transition ${
                    selectedHour === h
                      ? "bg-brand-600 text-white border-brand-600 shadow-md"
                      : "bg-white text-slate-700 border-slate-200 hover:border-brand-400 hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="preferred_time"
                    value={h}
                    required
                    checked={selectedHour === h}
                    onChange={() => setSelectedHour(h)}
                    className="sr-only"
                  />
                  <span>🕒 {h}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 3. Datos del Solicitante y Motivo */}
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
        <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block">
          3. Datos de Contacto y Motivo de la Cita
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="label text-xs">Tu nombre completo *</label>
            <input name="requester_name" required placeholder="Nombres y Apellidos" className="input text-sm" />
          </div>
          <div>
            <label className="label text-xs">Eres... *</label>
            <select name="requester_role" required defaultValue="REPRESENTANTE" className="select text-sm font-medium">
              {REQUESTER_ROLE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="label text-xs">Tu correo electrónico *</label>
            <input
              type="email"
              name="requester_email"
              required
              placeholder="correo@ejemplo.com"
              className="input text-sm"
            />
          </div>
          <div>
            <label className="label text-xs">Tu teléfono / WhatsApp</label>
            <input name="requester_phone" placeholder="0991234567" className="input text-sm" />
          </div>
        </div>

        <div>
          <label className="label text-xs">Nombre completo del/la estudiante</label>
          <input name="student_name" placeholder="Si la cita es sobre un estudiante" className="input text-sm" />
        </div>

        <div>
          <label className="label text-xs">Motivo o detalle de la solicitud *</label>
          <textarea
            name="reason"
            required
            rows={3}
            placeholder="Describe brevemente el motivo para agendar la cita..."
            className="textarea text-sm"
          />
        </div>
      </div>

      <p className="text-xs text-slate-400 text-center">
        🔒 Tu solicitud será enviada de forma segura al equipo DECE de {institution.name}, quienes confirmarán la cita por correo electrónico.
      </p>

      <SubmitButton hasSelectedHour={!!selectedHour} />
    </form>
  );
}
