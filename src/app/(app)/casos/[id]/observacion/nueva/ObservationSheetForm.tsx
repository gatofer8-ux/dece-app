"use client";

import { useFormState, useFormStatus } from "react-dom";
import { createObservationSheet, type ActionState } from "../../../actions";
import {
  CONTEXT_LABELS,
  RISK_LEVEL_LABELS,
  RISK_LEVEL_DESCRIPTIONS,
  PROTECTIVE_FACTORS,
  INSTITUTIONAL_ACTIONS,
  INDICATOR_CATALOGS,
} from "@/lib/observationSheet";
import type { ObservationSubnivel, ObservationRiskLevel } from "@/lib/types";
import VoiceDictationButton from "@/components/VoiceDictationButton";
import AIAssistButton from "@/components/AIAssistButton";

const initialState: ActionState = { error: null };
const RISK_LEVELS: ObservationRiskLevel[] = ["BAJO", "MEDIO", "ALTO", "CRITICO"];

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary disabled:opacity-60">
      {pending ? "Guardando..." : "Guardar ficha"}
    </button>
  );
}

function IndicatorGroup({ title, name, options }: { title: string; name: string; options: string[] }) {
  return (
    <div>
      <h4 className="text-xs font-semibold text-slate-600 mb-2">{title}</h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
        {options.map((opt) => (
          <label key={opt} className="flex items-start gap-2">
            <input type="checkbox" name={name} value={opt} className="rounded mt-0.5" />
            <span>{opt}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

export default function ObservationSheetForm({ caseId, subnivel }: { caseId: string; subnivel: ObservationSubnivel }) {
  const createForThisCase = createObservationSheet.bind(null, caseId, subnivel);
  const [state, formAction] = useFormState(createForThisCase, initialState);
  const catalog = INDICATOR_CATALOGS[subnivel];

  return (
    <form action={formAction} className="card p-6 space-y-6 max-w-3xl">
      {state.error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{state.error}</div>
      )}

      <div>
        <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">Datos de la observación</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="label text-xs">Fecha</label>
            <input type="date" name="observation_date" defaultValue={new Date().toISOString().slice(0, 10)} className="input" />
          </div>
          <input name="jornada" placeholder="Jornada (matutina, vespertina...)" className="input" />
          <div>
            <label className="label text-xs">Contexto de observación *</label>
            <select name="context" required defaultValue="" className="select">
              <option value="" disabled>Seleccionar...</option>
              {Object.entries(CONTEXT_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
        </div>
        <input name="context_other" placeholder="Si el contexto es 'Otro', especifica aquí" className="input mt-3" />
      </div>

      <IndicatorGroup title="Indicadores de sintomatología ansiosa" name="anxious_indicators" options={catalog.ansiosa} />
      <IndicatorGroup title="Indicadores de sintomatología depresiva" name="depressive_indicators" options={catalog.depresiva} />
      <IndicatorGroup title={catalog.suicidaLabel} name="suicidal_indicators" options={catalog.suicida} />

      <div>
        <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">Valoración rápida del nivel de riesgo *</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {RISK_LEVELS.map((level) => (
            <label key={level} className="flex items-start gap-2 border border-slate-200 rounded-lg p-3 text-sm cursor-pointer has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50">
              <input type="radio" name="risk_level" value={level} required className="mt-0.5" />
              <span>
                <span className="font-medium block">{RISK_LEVEL_LABELS[level]}</span>
                {RISK_LEVEL_DESCRIPTIONS[level].map((d) => (
                  <span key={d} className="block text-xs text-slate-500">{d}</span>
                ))}
              </span>
            </label>
          ))}
        </div>
      </div>

      <IndicatorGroup title="Factores protectores observados" name="protective_factors" options={PROTECTIVE_FACTORS} />
      <IndicatorGroup title="Acciones institucionales definidas" name="institutional_actions" options={INSTITUTIONAL_ACTIONS} />

      <div>
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">Observaciones relevantes</h3>
          <div className="flex items-center gap-2">
            <VoiceDictationButton targetId="observation-notes" />
            <AIAssistButton targetId="observation-notes" caseId={caseId} fieldLabel="Observaciones relevantes de la ficha de observación" />
          </div>
        </div>
        <textarea id="observation-notes" name="observations" rows={3} placeholder="Observaciones adicionales..." className="textarea" />
      </div>

      <p className="text-xs text-slate-400 border-t border-slate-100 pt-3">
        Instrumento de observación psicosocial, no diagnóstica. El DECE no aplica pruebas psicológicas ni emite diagnósticos clínicos.
      </p>

      <div className="flex justify-end">
        <SubmitButton />
      </div>
    </form>
  );
}
