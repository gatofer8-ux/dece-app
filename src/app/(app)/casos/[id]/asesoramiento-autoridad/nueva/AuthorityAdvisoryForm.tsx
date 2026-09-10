"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useToastOnChange } from "@/components/Toast";
import { createAuthorityAdvisoryAct, type ActionState } from "../../../actions";
import VoiceDictationButton from "@/components/VoiceDictationButton";
import AIAssistButton from "@/components/AIAssistButton";

const initialState: ActionState = { error: null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary disabled:opacity-60">
      {pending ? "Guardando..." : "Guardar acta"}
    </button>
  );
}

export default function AuthorityAdvisoryForm({
  caseId,
  defaultProfessionalName,
}: {
  caseId: string;
  defaultProfessionalName: string;
}) {
  const createForThisCase = createAuthorityAdvisoryAct.bind(null, caseId);
  const [state, formAction] = useFormState(createForThisCase, initialState);
  useToastOnChange(state.error, "error");

  const [participantCount, setParticipantCount] = useState(2);
  const [backgroundCount, setBackgroundCount] = useState(2);
  const [measureCount, setMeasureCount] = useState(2);
  const [scopeCount, setScopeCount] = useState(3);

  return (
    <form action={formAction} className="card p-6 space-y-8 max-w-4xl">
      {state.error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{state.error}</div>
      )}

      {/* Datos generales */}
      <div>
        <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">Datos generales</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="label text-xs">Fecha del acta</label>
            <input type="date" name="act_date" defaultValue={new Date().toISOString().slice(0, 10)} className="input" />
          </div>
          <div>
            <label className="label text-xs">Hora</label>
            <input type="time" name="act_time" className="input" />
          </div>
          <input name="act_place" placeholder="Lugar" className="input" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
          <input
            name="issuing_entity"
            placeholder="Entidad emisora de la disposición, ej. Junta Cantonal de Protección de Derechos de ..."
            className="input"
          />
          <input
            name="standard_code"
            placeholder="Estándar de Calidad DECE, ej. E.D3.C1.DE13.c"
            className="input"
          />
        </div>
      </div>

      {/* Participantes */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold text-slate-500 uppercase">Participantes</h3>
          <button
            type="button"
            onClick={() => setParticipantCount((n) => n + 1)}
            className="text-xs text-brand-700 hover:underline"
          >
            + Agregar participante
          </button>
        </div>
        <div className="space-y-2">
          {Array.from({ length: participantCount }).map((_, i) => (
            <div key={i} className="grid grid-cols-1 sm:grid-cols-3 gap-2 border border-slate-200 rounded-lg p-3">
              <input name="participant_nombre" placeholder="Nombres y apellidos" className="input" />
              <input name="participant_cargo" placeholder="Cargo" className="input" />
              <input name="participant_funcion" placeholder="Función en el asesoramiento" className="input" />
            </div>
          ))}
        </div>
      </div>

      {/* Antecedentes */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold text-slate-500 uppercase">Antecedentes</h3>
          <button
            type="button"
            onClick={() => setBackgroundCount((n) => n + 1)}
            className="text-xs text-brand-700 hover:underline"
          >
            + Agregar antecedente
          </button>
        </div>
        <div className="space-y-2">
          {Array.from({ length: backgroundCount }).map((_, i) => (
            <div key={i}>
              {i === 0 && (
                <div className="flex justify-end gap-2 mb-1">
                  <VoiceDictationButton targetId="authority-advisory-background-0" />
                  <AIAssistButton targetId="authority-advisory-background-0" caseId={caseId} fieldLabel="Antecedente en el acta de asesoramiento a la autoridad institucional" />
                </div>
              )}
              <textarea
                id={i === 0 ? "authority-advisory-background-0" : undefined}
                name="background_item"
                rows={2}
                placeholder="Ej. referencia a Oficio/Informe N°... con fecha..., y artículo legal aplicable (Art. 109 LOEI, Art. 11 Código de la Niñez, Art. 44 Constitución, según corresponda)"
                className="textarea"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Medidas de protección dispuestas */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold text-slate-500 uppercase">Medidas de protección dispuestas</h3>
          <div className="flex items-center gap-2">
            <VoiceDictationButton targetId="authority-advisory-measure-0" />
            <AIAssistButton targetId="authority-advisory-measure-0" caseId={caseId} fieldLabel="Medida de protección dispuesta a la autoridad institucional" />
            <button
              type="button"
              onClick={() => setMeasureCount((n) => n + 1)}
              className="text-xs text-brand-700 hover:underline ml-2"
            >
              + Agregar medida
            </button>
          </div>
        </div>
        <p className="text-xs text-slate-400 mb-2">
          Se numerarán automáticamente como PRIMERO, SEGUNDO, TERCERO... al imprimir el documento.
        </p>
        <div className="space-y-2">
          {Array.from({ length: measureCount }).map((_, i) => (
            <textarea
              key={i}
              id={i === 0 ? "authority-advisory-measure-0" : undefined}
              name="measure_item"
              rows={2}
              placeholder="Disposición legal y medida cautelar adoptada para salvaguardar al estudiante..."
              className="textarea"
            />
          ))}
        </div>
      </div>

      {/* Alcance del asesoramiento brindado */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold text-slate-500 uppercase">Alcance del asesoramiento brindado</h3>
          <div className="flex items-center gap-2">
            <VoiceDictationButton targetId="authority-advisory-scope-0" />
            <AIAssistButton targetId="authority-advisory-scope-0" caseId={caseId} fieldLabel="Alcance del asesoramiento brindado a la autoridad institucional" />
            <button
              type="button"
              onClick={() => setScopeCount((n) => n + 1)}
              className="text-xs text-brand-700 hover:underline ml-2"
            >
              + Agregar acción de asesoramiento
            </button>
          </div>
        </div>
        <div className="space-y-2">
          {Array.from({ length: scopeCount }).map((_, i) => (
            <textarea
              key={i}
              id={i === 0 ? "authority-advisory-scope-0" : undefined}
              name="scope_item"
              rows={2}
              placeholder="Ej. explicación de la base legal, recomendación de recursos, instrucción de confidencialidad, canal de seguimiento acordado, compromiso de la autoridad..."
              className="textarea"
            />
          ))}
        </div>
      </div>

      {/* Conclusión */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="label text-xs">Conclusión</label>
          <div className="flex items-center gap-2">
            <VoiceDictationButton targetId="authority-advisory-conclusion" />
            <AIAssistButton targetId="authority-advisory-conclusion" caseId={caseId} fieldLabel="Conclusión del acta de asesoramiento a la autoridad institucional" />
          </div>
        </div>
        <textarea
          id="authority-advisory-conclusion"
          name="conclusion"
          rows={3}
          placeholder="Síntesis final de acuerdos y ratificación de compromisos con la autoridad..."
          className="textarea"
        />
      </div>

      {/* Firmas */}
      <div>
        <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">Firmas</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="border border-slate-200 rounded-lg p-3">
            <p className="text-xs font-medium mb-2">Profesional DECE</p>
            <input name="dece_professional_name" defaultValue={defaultProfessionalName} placeholder="Nombre" className="input" />
          </div>
          <div className="border border-slate-200 rounded-lg p-3">
            <p className="text-xs font-medium mb-2">Máxima autoridad institucional</p>
            <input name="authority_name" placeholder="Nombre" className="input mb-2" />
            <input name="authority_role" defaultValue="Rector/a" placeholder="Cargo" className="input" />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <SubmitButton />
      </div>
    </form>
  );
}
