"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useState } from "react";
import { updateAuthorityAdvisoryAct, type ActionState } from "@/app/(app)/casos/actions";
import VoiceDictationButton from "@/components/VoiceDictationButton";
import AIAssistButton from "@/components/AIAssistButton";
import type { AuthorityAdvisoryActRow } from "@/lib/types";
import { parseJsonArray, type ParticipantEntry } from "@/lib/authorityAdvisory";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary disabled:opacity-60">
      {pending ? "Guardando cambios..." : "Guardar cambios"}
    </button>
  );
}

export default function AuthorityAdvisoryEditForm({
  caseId,
  act,
}: {
  caseId: string;
  act: AuthorityAdvisoryActRow;
}) {
  const [state, formAction] = useFormState<ActionState, FormData>(
    updateAuthorityAdvisoryAct.bind(null, caseId, act.id),
    { error: null }
  );

  const initialParticipants = parseJsonArray<ParticipantEntry>(act.participants);
  const initialBackground = parseJsonArray<string>(act.background);
  const initialMeasures = parseJsonArray<string>(act.measures);
  const initialScope = parseJsonArray<string>(act.advisory_scope);

  const [participantCount, setParticipantCount] = useState(Math.max(initialParticipants.length, 1));
  const [backgroundCount, setBackgroundCount] = useState(Math.max(initialBackground.length, 1));
  const [measureCount, setMeasureCount] = useState(Math.max(initialMeasures.length, 1));
  const [scopeCount, setScopeCount] = useState(Math.max(initialScope.length, 1));

  return (
    <form action={formAction} className="card p-6 space-y-6 max-w-4xl">
      {state?.error && (
        <div className="p-3 bg-red-50 text-red-700 text-xs rounded-md border border-red-200">
          {state.error}
        </div>
      )}

      {/* Datos del encabezado / contexto */}
      <div>
        <h3 className="text-xs font-semibold text-slate-500 uppercase mb-3">Datos del asesoramiento</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="label text-xs">Fecha del acta</label>
            <input
              type="date"
              name="act_date"
              defaultValue={act.act_date}
              required
              className="input"
            />
          </div>
          <div>
            <label className="label text-xs">Hora</label>
            <input
              type="time"
              name="act_time"
              defaultValue={act.act_time || ""}
              placeholder="hh:mm"
              className="input"
            />
          </div>
          <div>
            <label className="label text-xs">Lugar / Espacio</label>
            <input
              name="act_place"
              defaultValue={act.act_place || ""}
              placeholder="Ej. Rectorado / Oficina DECE"
              className="input"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
          <div>
            <label className="label text-xs">Entidad que dispone las medidas (si aplica)</label>
            <input
              name="issuing_entity"
              defaultValue={act.issuing_entity || ""}
              placeholder="Ej. Junta Cantonal de Protección de Derechos / Fiscalía / Distrito"
              className="input"
            />
          </div>
          <div>
            <label className="label text-xs">Código de estándar DECE (opcional)</label>
            <input
              name="standard_code"
              defaultValue={act.standard_code || ""}
              placeholder="Ej. D3.C1.DO9.b"
              className="input"
            />
          </div>
        </div>
      </div>

      {/* Participantes */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold text-slate-500 uppercase">Personas que participan</h3>
          <button
            type="button"
            onClick={() => setParticipantCount((n) => n + 1)}
            className="text-xs text-brand-700 hover:underline"
          >
            + Agregar participante
          </button>
        </div>
        <div className="space-y-2">
          {Array.from({ length: participantCount }).map((_, i) => {
            const p = initialParticipants[i] || { nombre: "", cargo: "", funcion: "" };
            return (
              <div key={i} className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  name="participant_nombre"
                  defaultValue={p.nombre}
                  placeholder="Nombre y apellido"
                  className="input text-xs"
                />
                <input
                  name="participant_cargo"
                  defaultValue={p.cargo}
                  placeholder="Cargo / Rol institucional"
                  className="input text-xs"
                />
                <input
                  name="participant_funcion"
                  defaultValue={p.funcion}
                  placeholder="Función en el asesoramiento"
                  className="input text-xs"
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Antecedentes */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold text-slate-500 uppercase">Antecedentes</h3>
          <div className="flex items-center gap-2">
            <VoiceDictationButton targetId="edit-authority-advisory-background-0" />
            <AIAssistButton targetId="edit-authority-advisory-background-0" caseId={caseId} fieldLabel="Antecedente en el acta de asesoramiento a la autoridad institucional" />
            <button
              type="button"
              onClick={() => setBackgroundCount((n) => n + 1)}
              className="text-xs text-brand-700 hover:underline ml-2"
            >
              + Agregar antecedente
            </button>
          </div>
        </div>
        <div className="space-y-2">
          {Array.from({ length: backgroundCount }).map((_, i) => (
            <textarea
              key={i}
              id={i === 0 ? "edit-authority-advisory-background-0" : undefined}
              name="background_item"
              rows={2}
              defaultValue={initialBackground[i] || ""}
              placeholder="Ej. referencia a Oficio/Informe N°... con fecha..., y artículo legal aplicable"
              className="textarea"
            />
          ))}
        </div>
      </div>

      {/* Medidas de protección dispuestas */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold text-slate-500 uppercase">Medidas de protección dispuestas</h3>
          <div className="flex items-center gap-2">
            <VoiceDictationButton targetId="edit-authority-advisory-measure-0" />
            <AIAssistButton targetId="edit-authority-advisory-measure-0" caseId={caseId} fieldLabel="Medida de protección dispuesta a la autoridad institucional" />
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
              id={i === 0 ? "edit-authority-advisory-measure-0" : undefined}
              name="measure_item"
              rows={2}
              defaultValue={initialMeasures[i] || ""}
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
            <VoiceDictationButton targetId="edit-authority-advisory-scope-0" />
            <AIAssistButton targetId="edit-authority-advisory-scope-0" caseId={caseId} fieldLabel="Alcance del asesoramiento brindado a la autoridad institucional" />
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
              id={i === 0 ? "edit-authority-advisory-scope-0" : undefined}
              name="scope_item"
              rows={2}
              defaultValue={initialScope[i] || ""}
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
            <VoiceDictationButton targetId="edit-authority-advisory-conclusion" />
            <AIAssistButton targetId="edit-authority-advisory-conclusion" caseId={caseId} fieldLabel="Conclusión del acta de asesoramiento a la autoridad institucional" />
          </div>
        </div>
        <textarea
          id="edit-authority-advisory-conclusion"
          name="conclusion"
          rows={3}
          defaultValue={act.conclusion || ""}
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
            <input
              name="dece_professional_name"
              defaultValue={act.dece_professional_name || ""}
              placeholder="Nombre"
              className="input"
            />
          </div>
          <div className="border border-slate-200 rounded-lg p-3">
            <p className="text-xs font-medium mb-2">Máxima autoridad institucional</p>
            <input
              name="authority_name"
              defaultValue={act.authority_name || ""}
              placeholder="Nombre"
              className="input mb-2"
            />
            <input
              name="authority_role"
              defaultValue={act.authority_role || "Rector/a"}
              placeholder="Cargo"
              className="input"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <SubmitButton />
      </div>
    </form>
  );
}
