"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { useToastOnChange } from "@/components/Toast";
import { createInterviewScheduleAction, type ActionState } from "../actions";
import { addMinutes } from "@/lib/ovp/interviewScheduleTime";

const initialState: ActionState = { error: null };

interface RosterRow {
  course: string;
  parallel: string;
  n: number;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary disabled:opacity-50">
      {pending ? "Generando cronograma..." : "📅 Generar cronograma"}
    </button>
  );
}

export default function NewInterviewScheduleForm({
  roster,
  defaultCourse,
}: {
  roster: RosterRow[];
  defaultCourse: string;
}) {
  const [state, dispatch] = useFormState(createInterviewScheduleAction, initialState);
  useToastOnChange(state.error, "error");

  const courses = useMemo(() => Array.from(new Set(roster.map((r) => r.course))), [roster]);
  const [course, setCourse] = useState(defaultCourse || courses[0] || "");
  const parallelsForCourse = useMemo(
    () => roster.filter((r) => r.course === course),
    [roster, course]
  );
  const [selectedParallels, setSelectedParallels] = useState<string[]>(() =>
    roster.filter((r) => r.course === (defaultCourse || courses[0] || "")).map((r) => r.parallel)
  );
  const [startTime, setStartTime] = useState("07:00");
  const [slotMinutes, setSlotMinutes] = useState(10);
  const [studentsPerSlot, setStudentsPerSlot] = useState(3);

  function handleCourseChange(newCourse: string) {
    setCourse(newCourse);
    setSelectedParallels(roster.filter((r) => r.course === newCourse).map((r) => r.parallel));
  }

  function toggleParallel(p: string) {
    setSelectedParallels((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  }

  const totalStudents = parallelsForCourse
    .filter((r) => selectedParallels.includes(r.parallel))
    .reduce((a, r) => a + r.n, 0);
  const totalSlots = Math.ceil(totalStudents / Math.max(1, studentsPerSlot));
  const estimatedEnd = useMemo(() => {
    if (totalStudents === 0) return startTime;
    return addMinutes(startTime, Math.max(0, totalSlots - 1) * Math.max(1, slotMinutes));
  }, [startTime, totalSlots, slotMinutes, totalStudents]);

  if (courses.length === 0) {
    return (
      <div className="card p-6 text-sm text-slate-600">
        No hay estudiantes con curso y paralelo registrados todavía. Registra la matrícula en{" "}
        <Link href="/estudiantes" className="text-brand-700 underline">Estudiantes</Link> antes de generar un cronograma.
      </div>
    );
  }

  return (
    <form action={dispatch} className="card p-6 space-y-5 max-w-3xl">
      <div>
        <label className="label text-xs">Título / referencia</label>
        <input
          name="title"
          defaultValue="Cronograma de citas para la toma de decisión — 10mo EGB"
          className="input text-sm"
          required
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="label text-xs">Curso *</label>
          <select
            name="course"
            value={course}
            onChange={(e) => handleCourseChange(e.target.value)}
            className="select text-sm"
          >
            {courses.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label text-xs">Fecha de las entrevistas</label>
          <input type="date" name="interview_date" className="input text-sm" />
        </div>
      </div>

      <div>
        <label className="label text-xs">
          Paralelos a incluir * <span className="text-slate-400 font-normal">(se agendan seguidos, en este orden)</span>
        </label>
        <div className="flex flex-wrap gap-2 mt-1">
          {parallelsForCourse.map((r) => (
            <label
              key={r.parallel}
              className={`px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer transition ${
                selectedParallels.includes(r.parallel)
                  ? "bg-brand-50 border-brand-300 text-brand-700"
                  : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
              }`}
            >
              <input
                type="checkbox"
                name="parallels"
                value={r.parallel}
                checked={selectedParallels.includes(r.parallel)}
                onChange={() => toggleParallel(r.parallel)}
                className="sr-only"
              />
              Paralelo “{r.parallel}” · {r.n} estudiante{r.n === 1 ? "" : "s"}
            </label>
          ))}
          {parallelsForCourse.length === 0 && (
            <span className="text-xs text-slate-400">Este curso no tiene paralelos con estudiantes activos.</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="label text-xs">Hora de inicio</label>
          <input
            type="time"
            name="start_time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="input text-sm"
            required
          />
        </div>
        <div>
          <label className="label text-xs">Duración por turno (min)</label>
          <input
            type="number"
            name="slot_minutes"
            min={1}
            max={120}
            value={slotMinutes}
            onChange={(e) => setSlotMinutes(Math.max(1, Number(e.target.value) || 1))}
            className="input text-sm"
            required
          />
        </div>
        <div>
          <label className="label text-xs">Estudiantes por turno</label>
          <input
            type="number"
            name="students_per_slot"
            min={1}
            max={20}
            value={studentsPerSlot}
            onChange={(e) => setStudentsPerSlot(Math.max(1, Number(e.target.value) || 1))}
            className="input text-sm"
            required
          />
        </div>
      </div>

      <div>
        <label className="label text-xs">Lugar (opcional)</label>
        <input name="location" placeholder="Ej. Oficina DECE" className="input text-sm" />
      </div>

      <p className="text-[11px] text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
        Con lo seleccionado: <strong>{totalStudents}</strong> estudiante{totalStudents === 1 ? "" : "s"} en{" "}
        <strong>{totalSlots}</strong> turno{totalSlots === 1 ? "" : "s"}, de <strong>{startTime}</strong> a{" "}
        <strong>{estimatedEnd}</strong> aproximadamente. El horario de cada paralelo continúa donde termina el anterior.
      </p>

      {state.error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-lg text-xs font-medium">
          ⚠️ {state.error}
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Link href="/ovp/cronograma" className="btn-secondary text-sm">
          Cancelar
        </Link>
        <SubmitButton />
      </div>
    </form>
  );
}
