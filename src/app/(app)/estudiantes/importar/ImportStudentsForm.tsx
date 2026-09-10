"use client";

import Link from "next/link";
import { useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useToastOnChange } from "@/components/Toast";
import { importStudents, type ImportActionState } from "./actions";

const initialState: ImportActionState = { error: null, result: null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary disabled:opacity-60">
      {pending ? "Importando..." : "Importar estudiantes"}
    </button>
  );
}

export default function ImportStudentsForm() {
  const [state, formAction] = useFormState(importStudents, initialState);
  useToastOnChange(state.error, "error");
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <div className="space-y-4">
      <section className="card p-5">
        <h2 className="text-sm font-semibold text-slate-700 mb-2">1. Descarga la plantilla</h2>
        <p className="text-sm text-slate-500 mb-3">
          Usa esta planilla como base: tiene las columnas correctas y una hoja de instrucciones. No cambies el orden ni
          agregues columnas nuevas.
        </p>
        <a href="/api/estudiantes/plantilla" className="btn-secondary inline-block">
          ⬇ Descargar plantilla (.xlsx)
        </a>
      </section>

      <section className="card p-5">
        <h2 className="text-sm font-semibold text-slate-700 mb-2">2. Sube la planilla completa</h2>
        <p className="text-sm text-slate-500 mb-3">
          Solo se crean estudiantes nuevos. Si una cédula ya existe en tu institución, esa fila se omite y se te avisa por
          qué. Los datos de familia, salud y necesidad educativa específica se completan después, editando la ficha de
          cada estudiante.
        </p>
        <form
          ref={formRef}
          action={async (fd: FormData) => {
            await formAction(fd);
          }}
          className="space-y-3"
        >
          {state.error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</div>
          )}
          <input
            type="file"
            name="file"
            required
            accept=".xlsx"
            className="input"
          />
          <SubmitButton />
        </form>
      </section>

      {state.result && (
        <section className="card p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">Resultado de la importación</h2>
          <p className="text-sm mb-3">
            <span className="font-semibold text-green-700">{state.result.created}</span> estudiante(s) creado(s) correctamente.
            {state.result.skipped.length > 0 && (
              <>
                {" "}
                <span className="font-semibold text-amber-700">{state.result.skipped.length}</span> fila(s) omitida(s).
              </>
            )}
          </p>

          {state.result.skipped.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 border-b border-slate-200">
                    <th className="py-1 pr-3">Fila</th>
                    <th className="py-1 pr-3">Nombre</th>
                    <th className="py-1">Motivo</th>
                  </tr>
                </thead>
                <tbody>
                  {state.result.skipped.map((s) => (
                    <tr key={s.row} className="border-b border-slate-100">
                      <td className="py-1 pr-3 text-slate-400">{s.row}</td>
                      <td className="py-1 pr-3">{s.name}</td>
                      <td className="py-1 text-slate-600">{s.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {state.result.created > 0 && (
            <div className="mt-4">
              <Link href="/estudiantes" className="btn-secondary inline-block">
                Ver lista de estudiantes
              </Link>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
