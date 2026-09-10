"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useToastOnChange } from "@/components/Toast";
import { createAppointmentRequest, type RequestActionState } from "./actions";
import { REQUESTER_ROLE_OPTIONS } from "@/lib/appointmentRequest";

const initialState: RequestActionState = { error: null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary disabled:opacity-60">
      {pending ? "Enviando..." : "Enviar solicitud"}
    </button>
  );
}

export default function RequestForm({
  institutionId,
  professionalId,
  date,
  availableHours,
}: {
  institutionId: string;
  professionalId: string;
  date: string;
  availableHours: string[];
}) {
  const boundAction = createAppointmentRequest.bind(null, institutionId);
  const [state, formAction] = useFormState(boundAction, initialState);
  useToastOnChange(state.error, "error");

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="professional_id" value={professionalId} />
      <input type="hidden" name="preferred_date" value={date} />

      {state.error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</div>
      )}

      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-2">
        {availableHours.map((h, i) => (
          <label
            key={h}
            className="flex items-center justify-center gap-1 rounded-lg border border-slate-200 px-2 py-2 text-sm cursor-pointer has-[:checked]:bg-brand-600 has-[:checked]:text-white has-[:checked]:border-brand-600"
          >
            <input type="radio" name="preferred_time" value={h} required defaultChecked={i === 0} className="sr-only" />
            {h}
          </label>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="label text-xs">Tu nombre completo *</label>
          <input name="requester_name" required className="input" />
        </div>
        <div>
          <label className="label text-xs">Eres... *</label>
          <select name="requester_role" required defaultValue="" className="select">
            <option value="" disabled>
              Selecciona...
            </option>
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
          <input type="email" name="requester_email" required placeholder="Aquí te avisaremos" className="input" />
        </div>
        <div>
          <label className="label text-xs">Tu teléfono</label>
          <input name="requester_phone" className="input" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="label text-xs">Nombre del/la estudiante (si aplica)</label>
          <input name="student_name" className="input" />
        </div>
        <div>
          <label className="label text-xs">Grado/curso del/la estudiante</label>
          <input name="student_course" className="input" />
        </div>
      </div>
      <div>
        <label className="label text-xs">Motivo de la cita *</label>
        <textarea name="reason" required rows={3} className="textarea" />
      </div>
      <p className="text-xs text-slate-400">
        Esta solicitud será revisada por el equipo DECE de la institución, quien confirmará la cita por correo. El
        horario que elegiste arriba queda reservado provisionalmente hasta que la revisen.
      </p>
      <div className="flex justify-end pt-2">
        <SubmitButton />
      </div>
    </form>
  );
}
