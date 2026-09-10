"use client";

import { useState } from "react";
import { startOvpApplication } from "./actions";

type Roster = { id: string; full_name: string }[];

export default function RStartForm({
  code,
  roster,
  courseFixed,
  parallelFixed,
}: {
  code: string;
  roster: Roster;
  courseFixed: string | null;
  parallelFixed: string | null;
}) {
  const [manual, setManual] = useState(roster.length === 0);
  const action = startOvpApplication.bind(null, code);

  return (
    <form action={action} className="space-y-4">
      {roster.length > 0 && !manual && (
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Elige tu nombre</label>
          <select name="student_id" required className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base">
            <option value="">— Selecciona —</option>
            {roster.map((r) => (
              <option key={r.id} value={r.id}>
                {r.full_name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setManual(true)}
            className="mt-2 text-sm text-blue-700 underline"
          >
            No está mi nombre en la lista
          </button>
        </div>
      )}

      {manual && (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nombre y apellidos completos</label>
            <input
              name="student_name"
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base uppercase"
              placeholder="EJ. MARÍA JOSÉ PÉREZ LÓPEZ"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Curso</label>
              <input
                name="course"
                defaultValue={courseFixed || ""}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base"
                placeholder="Ej. 2º BGU"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Paralelo</label>
              <input
                name="parallel"
                defaultValue={parallelFixed || ""}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base uppercase"
                placeholder="Ej. A"
              />
            </div>
          </div>
          {roster.length > 0 && (
            <button type="button" onClick={() => setManual(false)} className="text-sm text-blue-700 underline">
              Volver a la lista
            </button>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Género</label>
          <select name="gender" required className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base">
            <option value="">—</option>
            <option value="FEMENINO">Femenino</option>
            <option value="MASCULINO">Masculino</option>
            <option value="OTRO">Otro / prefiero no decir</option>
          </select>
          <p className="text-[11px] text-slate-400 mt-1">Se usa solo para calcular tu resultado con la tabla correcta.</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Edad</label>
          <input
            name="age"
            type="number"
            min={10}
            max={25}
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base"
          />
        </div>
      </div>

      <button
        type="submit"
        className="w-full rounded-lg bg-blue-700 text-white font-semibold py-3 text-base hover:bg-blue-800"
      >
        Empezar
      </button>
    </form>
  );
}
