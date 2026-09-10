"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useToastOnChange } from "@/components/Toast";
import Link from "next/link";
import { updateCarePlan, type ActionState } from "../../../../actions";
import { INTERVENTION_TYPE_OPTIONS, parseCarePlanActions, parseStringList } from "@/lib/carePlan";
import type { CaseCarePlanRow } from "@/lib/types";
import VoiceDictationButton from "@/components/VoiceDictationButton";
import AIAssistButton from "@/components/AIAssistButton";

const initialState: ActionState = { error: null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary disabled:opacity-60">
      {pending ? "Guardando cambios..." : "Guardar cambios"}
    </button>
  );
}

export default function CarePlanEditForm({
  caseId,
  studentName,
  plan,
  defaultProfessionalName,
}: {
  caseId: string;
  studentName: string;
  plan: CaseCarePlanRow;
  defaultProfessionalName?: string;
}) {
  const updateForThisPlan = updateCarePlan.bind(null, caseId, plan.id);
  const [state, formAction] = useFormState(updateForThisPlan, initialState);
  useToastOnChange(state.error, "error");

  const initialActions = parseCarePlanActions(plan.actions);
  const selectedInterventionTypes = parseStringList(plan.intervention_types);

  const [actions, setActions] = useState(
    initialActions.length > 0
      ? initialActions
      : [{ accion: "", profesional: "", tiempo: "", observaciones: "" }]
  );

  const addActionRow = () => {
    setActions([...actions, { accion: "", profesional: "", tiempo: "", observaciones: "" }]);
  };

  const removeActionRow = (index: number) => {
    setActions(actions.filter((_, i) => i !== index));
  };

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
            <input type="date" name="plan_date" defaultValue={plan.plan_date} className="input" />
          </div>
          <div>
            <label className="label text-xs">Jornada</label>
            <select name="jornada" defaultValue={plan.jornada || ""} className="select">
              <option value="" disabled>Jornada...</option>
              <option value="MATUTINA">Matutina</option>
              <option value="VESPERTINA">Vespertina</option>
              <option value="NOCTURNA">Nocturna</option>
            </select>
          </div>
        </div>
        <input name="tutor_name" defaultValue={plan.tutor_name || ""} placeholder="Nombre del/la docente tutor/a" className="input mt-3" />
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
        <textarea
          id="care-plan-diagnosis"
          name="diagnosis_summary"
          required
          rows={4}
          defaultValue={plan.diagnosis_summary || ""}
          className="textarea"
        />
      </div>

      <div>
        <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">Tipo o tipos de intervención psicosocial a realizar</h3>
        <div className="flex flex-wrap gap-4 text-sm">
          {INTERVENTION_TYPE_OPTIONS.map((o) => (
            <label key={o.value} className="flex items-center gap-2">
              <input
                type="checkbox"
                name="intervention_types"
                value={o.value}
                defaultChecked={selectedInterventionTypes.includes(o.value)}
                className="rounded"
              />
              {o.label}
            </label>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold text-slate-500 uppercase">Acciones para implementar</h3>
          <button type="button" onClick={addActionRow} className="text-xs text-brand-700 hover:underline">
            + Agregar acción
          </button>
        </div>
        <div className="space-y-3">
          {actions.map((act, i) => (
            <div key={i} className="grid grid-cols-1 sm:grid-cols-4 gap-2 border border-slate-200 rounded-lg p-3 relative">
              {actions.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeActionRow(i)}
                  className="absolute -top-2 -right-2 bg-red-100 text-red-600 rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-200"
                  title="Eliminar acción"
                >
                  ✕
                </button>
              )}
              <input name="accion" defaultValue={act.accion} placeholder="Acción a implementar" className="input sm:col-span-2" />
              <input name="accion_profesional" defaultValue={act.profesional || defaultProfessionalName || ""} placeholder="Profesional que ejecutará" className="input" />
              <input name="accion_tiempo" defaultValue={act.tiempo} placeholder="Tiempo (días/semanas/meses)" className="input" />
              <input name="accion_observaciones" defaultValue={act.observaciones} placeholder="Observaciones" className="input sm:col-span-4" />
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-3">
        <Link href={`/casos/${caseId}/atencion/${plan.id}/imprimir`} className="btn-secondary">
          Cancelar
        </Link>
        <SubmitButton />
      </div>
    </form>
  );
}
