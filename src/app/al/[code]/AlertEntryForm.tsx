"use client";

import { useFormState, useFormStatus } from "react-dom";
import VoiceDictationButton from "@/components/VoiceDictationButton";
import { submitAlertEntryAction, type AlertEntryActionState } from "./actions";
import { RISK_TYPE_LABELS } from "@/lib/types";

const initialState: AlertEntryActionState = { error: null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary w-full disabled:opacity-50">
      {pending ? "Guardando…" : "Registrar estudiante en alerta"}
    </button>
  );
}

export default function AlertEntryForm({ code }: { code: string }) {
  const [state, formAction] = useFormState(submitAlertEntryAction.bind(null, code), initialState);

  return (
    <form action={formAction} className="space-y-4">
      {state.error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-lg text-xs font-medium">⚠️ {state.error}</div>
      )}
      <div>
        <label className="label text-xs">Nombre del estudiante</label>
        <input name="student_name" required className="input text-sm" placeholder="Nombres y apellidos" />
      </div>
      <div>
        <label className="label text-xs">Riesgo psicosocial identificado</label>
        <select name="risk_type" required className="select text-sm" defaultValue="">
          <option value="" disabled>
            Selecciona…
          </option>
          {Object.entries(RISK_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <div className="flex items-center justify-between">
          <label className="label text-xs">Breve descripción del caso (opcional)</label>
          <VoiceDictationButton targetId="f-description" compact />
        </div>
        <textarea
          id="f-description"
          name="description"
          rows={3}
          className="textarea text-sm"
          placeholder="Resumen breve de lo observado, para dejar constancia en la junta."
        />
      </div>
      <div>
        <label className="label text-xs">Tu nombre (docente que alerta)</label>
        <input name="teacher_name" required className="input text-sm" placeholder="Nombres y apellidos" />
      </div>
      <SubmitButton />
    </form>
  );
}
