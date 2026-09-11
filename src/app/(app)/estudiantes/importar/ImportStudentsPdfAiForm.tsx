"use client";

import { useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useToastOnChange } from "@/components/Toast";
import { importStudentsFromPdfAi, type ImportActionState } from "./actions";
import ImportResultCard from "./ImportResultCard";

const initialState: ImportActionState = { error: null, result: null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary disabled:opacity-60">
      {pending ? "Leyendo con IA..." : "Crear estudiantes con IA"}
    </button>
  );
}

export default function ImportStudentsPdfAiForm() {
  const [state, formAction] = useFormState(importStudentsFromPdfAi, initialState);
  useToastOnChange(state.error, "error");
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <div className="space-y-4">
      <section className="card p-5">
        <h2 className="text-sm font-semibold text-slate-700 mb-2">Sube uno o varios PDF (o un .zip)</h2>
        <p className="text-sm text-slate-500 mb-3">
          Sirve para listas oficiales de estudiantes en PDF (por ejemplo, las que emite el sistema de matrícula), sin
          necesidad de pasarlas a Excel a mano. La IA lee el encabezado (curso, paralelo, jornada) y la tabla de
          estudiantes de cada documento. Puedes seleccionar <strong>varios PDF a la vez</strong> (Ctrl/Cmd + clic en el
          selector de archivos) o subirlos juntos dentro de un <strong>.zip</strong> — hasta <strong>15 archivos por
          operación</strong>; si tienes más, súbelos en varias tandas para que la IA alcance a procesarlos todos.
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
            multiple
            accept=".pdf,.zip,application/pdf,application/zip"
            className="input"
          />
          <p className="text-xs text-slate-400">Igual que en Excel, solo se crean estudiantes nuevos: las cédulas ya registradas se omiten y se listan abajo con el motivo.</p>
          <SubmitButton />
        </form>
      </section>

      {state.result && <ImportResultCard result={state.result} />}
    </div>
  );
}
