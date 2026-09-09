"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { createCarePlan, type ActionState } from "../../../actions";
import { INTERVENTION_TYPE_OPTIONS } from "@/lib/carePlan";
import VoiceDictationButton from "@/components/VoiceDictationButton";
import AIAssistButton from "@/components/AIAssistButton";

const initialState: ActionState = { error: null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary disabled:opacity-60">
      {pending ? "Guardando..." : "Guardar plan de atención"}
    </button>
  );
}

export default function CarePlanForm({ caseId, studentName }: { caseId: string; studentName: string }) {
  const createForThisCase = createCarePlan.bind(null, caseId);
  const [state, formAction] = useFormState(createForThisCase, initialState);
  const [rowCount, setRowCount] = useState(3);

  return (
    <form action={formAction} className="card p-6 space-y-6 max-w-3xl">
      {state.error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{state.error}</div>
      )}

      <div>
        <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">Datos informativos generales</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input value={studentName} disabled className="input bg-slate-50" />
          <div>
            <label className="label text-xs">Fecha de elaboración</label>
            <input type="date" name="plan_date" defaultValue={new Date().toISOString().slice(0, 10)} className="input" />
          </div>
          <select name="jornada" defaultValue="" className="select">
            <option value="" disabled>Jornada...</option>
            <option value="MATUTINA">Matutina</option>
            <option value="VESPERTINA">Vespertina</option>
            <option value="NOCTURNA">Nocturna</option>
          </select>
        </div>
        <input name="tutor_name" placeholder="Nombre del/la docente tutor/a" className="input mt-3" />
      </div>

      <div>
        <div className="flex items-center justify-between">
          <label className="label text-xs">Resumen del diagnóstico situacional *</label>
          <div className="flex items-center gap-2">
            <VoiceDictationButton targetId="care-plan-diagnosis" />
            <AIAssistButton targetId="care-plan-diagnosis" caseId={caseId} fieldLabel="Resumen del diagnóstico situacional del plan de atención" />
          </div>
        </div>
        <p className="text-xs text-slate-400 mb-1">
          Sintetizar la información que motiva la atención psicosocial (ficha de notificación de alerta, ficha de
          observación, entrevista...).
        </p>
        <textarea id="care-plan-diagnosis" name="diagnosis_summary" required rows={3} className="textarea" />
      </div>

      <div>
        <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">Tipo o tipos de intervención psicosocial a realizar</h3>
        <div className="flex flex-wrap gap-4 text-sm">
          {INTERVENTION_TYPE_OPTIONS.map((o) => (
            <label key={o.value} className="flex items-center gap-2">
              <input type="checkbox" name="intervention_types" value={o.value} className="rounded" />
              {o.label}
            </label>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold text-slate-500 uppercase">Acciones para implementar</h3>
          <button type="button" onClick={() => setRowCount((n) => n + 1)} className="text-xs text-brand-700 hover:underline">
            + Agregar acción
          </button>
        </div>
        <div className="space-y-3">
          {Array.from({ length: rowCount }).map((_, i) => (
            <div key={i} className="grid grid-cols-1 sm:grid-cols-4 gap-2 border border-slate-200 rounded-lg p-3">
              <input name="accion" placeholder="Acción a implementar" className="input sm:col-span-2" />
              <input name="accion_profesional" placeholder="Profesional que ejecutará" className="input" />
              <input name="accion_tiempo" placeholder="Tiempo (días/semanas/meses)" className="input" />
              <input name="accion_observaciones" placeholder="Observaciones" className="input sm:col-span-4" />
            </div>
          ))}
        </div>
      </div>

      <p className="text-xs text-slate-400 border-t border-slate-100 pt-3">
        La información registrada en este documento es confidencial y de uso exclusivo del Departamento de Consejería
        Estudiantil.
      </p>

      <div className="flex justify-end">
        <SubmitButton />
      </div>
    </form>
  );
}
