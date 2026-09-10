"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useToastOnChange } from "@/components/Toast";
import { createOfficialReferral, updateOfficialReferral, type ActionState } from "../../../../derivaciones/actions";
import { DESTINATION_OPTIONS, DESTINATION_GROUP_LABELS } from "@/lib/referral";
import type { ReferralRow } from "@/lib/types";
import VoiceDictationButton from "@/components/VoiceDictationButton";
import AIAssistButton from "@/components/AIAssistButton";

const initialState: ActionState = { error: null };
const GROUPS: Array<keyof typeof DESTINATION_GROUP_LABELS> = ["INTERNA_IE", "INTERNA_MINEDUC", "EXTERNA"];

function SubmitButton({ isEditing }: { isEditing: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary disabled:opacity-60">
      {pending ? "Guardando..." : isEditing ? "Guardar cambios" : "Guardar ficha de derivación"}
    </button>
  );
}

export default function ReferralForm({
  caseId,
  defaultElaboratedBy,
  defaultAge,
  defaultDistrictOfficeLabel,
  initialData,
}: {
  caseId: string;
  defaultElaboratedBy: string;
  defaultAge?: string;
  defaultDistrictOfficeLabel?: string;
  initialData?: ReferralRow;
}) {
  const isEditing = !!initialData;
  const formHandler = isEditing
    ? updateOfficialReferral.bind(null, initialData.id, caseId)
    : createOfficialReferral.bind(null, caseId);

  const [state, formAction] = useFormState(formHandler, initialState);
  useToastOnChange(state.error, "error");

  const defaultDate = initialData?.referral_date
    ? initialData.referral_date.slice(0, 10)
    : new Date().toISOString().slice(0, 10);

  return (
    <form action={formAction} className="card p-6 space-y-6 max-w-3xl">
      {state.error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{state.error}</div>
      )}

      <div>
        <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">Datos de la derivación</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="label text-xs">Fecha de derivación</label>
            <input type="date" name="referral_date" defaultValue={defaultDate} className="input" />
          </div>
          <div>
            <label className="label text-xs">Ámbito de la derivación</label>
            <select name="scope" defaultValue={initialData?.scope || "EXTERNA"} className="select">
              <option value="INTERNA">Interna</option>
              <option value="EXTERNA">Externa</option>
            </select>
          </div>
        </div>
        <input
          name="district_office_label"
          defaultValue={initialData?.district_office_label || defaultDistrictOfficeLabel || ""}
          placeholder="Dirección Distrital de Educación (ej. DIRECCIÓN DISTRITAL DE EDUCACIÓN 18D02 AMBATO 2)"
          className="input mt-3"
        />
      </div>

      <div>
        <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">
          Datos personales del/la estudiante que se deriva <span className="text-slate-400 normal-case">(complementarios a su ficha)</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="label text-xs">Edad</label>
            <input name="student_age" defaultValue={initialData?.student_age || defaultAge || ""} placeholder="Edad" className="input" />
          </div>
          <div>
            <label className="label text-xs">Discapacidad</label>
            <input name="student_disability" defaultValue={initialData?.student_disability || ""} placeholder="Discapacidad (o 'Ninguna')" className="input" />
          </div>
          <div>
            <label className="label text-xs">Nacionalidad</label>
            <input name="student_nationality" defaultValue={initialData?.student_nationality || ""} placeholder="Nacionalidad" className="input" />
          </div>
          <div>
            <label className="label text-xs">N° documento de identidad del representante</label>
            <input name="representative_document_id" defaultValue={initialData?.representative_document_id || ""} placeholder="N° documento de identidad del representante" className="input" />
          </div>
        </div>
      </div>

      <div>
        <label className="label text-xs">Destino específico *</label>
        <select name="destination_detail" required defaultValue={initialData?.destination_detail || ""} className="select">
          <option value="" disabled>Seleccionar...</option>
          {GROUPS.map((g) => (
            <optgroup key={g} label={DESTINATION_GROUP_LABELS[g]}>
              {DESTINATION_OPTIONS.filter((o) => o.group === g).map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </optgroup>
          ))}
        </select>
        <input
          name="institution"
          required
          defaultValue={initialData?.institution || ""}
          placeholder="Nombre de la entidad/institución específica (ej. Centro de Salud Santa Rosa)"
          className="input mt-2"
        />
      </div>

      <div>
        <div className="flex items-center justify-between">
          <label className="label text-xs">Motivo breve de la derivación *</label>
          <div className="flex items-center gap-2">
            <VoiceDictationButton targetId="referral-reason" />
            <AIAssistButton targetId="referral-reason" caseId={caseId} fieldLabel="Motivo breve de la derivación" />
          </div>
        </div>
        <textarea
          id="referral-reason"
          name="reason"
          required
          defaultValue={initialData?.reason || ""}
          rows={2}
          className="textarea"
          placeholder="Ej: Derivación a Centro de Salud para evaluación y atención psicológica especializada."
        />
      </div>

      <div>
        <div className="flex items-center justify-between">
          <label className="label text-xs">Historia de la situación actual</label>
          <div className="flex items-center gap-2">
            <VoiceDictationButton targetId="referral-background" />
            <AIAssistButton targetId="referral-background" caseId={caseId} fieldLabel="Historia de la situación actual en la ficha de derivación" />
          </div>
        </div>
        <p className="text-xs text-slate-400 mb-1">Síntesis de la situación del/la estudiante, el entorno educativo y familiar desde el ámbito de la atención psicosocial (resumen clínico conciso de 4 a 6 oraciones, en 3ra persona).</p>
        <textarea
          id="referral-background"
          name="current_situation_history"
          defaultValue={initialData?.current_situation_history || initialData?.background_summary || ""}
          placeholder="Resumen clínico y psicosocial conciso (4 a 6 oraciones en tercera persona) describiendo el motivo de seguimiento, conducta o sintomatología observada, dinámica familiar y factores identificados."
          rows={4}
          className="textarea"
        />
      </div>

      <div>
        <div className="flex items-center justify-between">
          <label className="label text-xs">Acciones desarrolladas</label>
          <div className="flex items-center gap-2">
            <VoiceDictationButton targetId="referral-actions" />
            <AIAssistButton targetId="referral-actions" caseId={caseId} fieldLabel="Acciones desarrolladas en el ámbito de la atención psicosocial (ficha de derivación)" />
          </div>
        </div>
        <p className="text-xs text-slate-400 mb-1">En el ámbito de la atención psicosocial (lista breve con guiones, máx. 8-10 palabras por línea).</p>
        <textarea
          id="referral-actions"
          name="actions_taken"
          defaultValue={initialData?.actions_taken || ""}
          placeholder="- Diálogo con la madre de familia&#10;- Acta de consentimiento informado&#10;- Intervención con el estudiante&#10;- Agendamiento de cita"
          rows={3}
          className="textarea"
        />
      </div>

      <div>
        <label className="label text-xs">Tipo de atención que se requiere</label>
        <input
          name="care_type_required"
          defaultValue={initialData?.care_type_required || ""}
          placeholder="Tipo de atención requerida de la entidad interna/externa"
          className="input"
        />
      </div>

      <div>
        <div className="flex items-center justify-between">
          <label className="label text-xs">Observaciones</label>
          <div className="flex items-center gap-2">
            <VoiceDictationButton targetId="referral-observations" />
            <AIAssistButton targetId="referral-observations" caseId={caseId} fieldLabel="Observaciones de la ficha de derivación" />
          </div>
        </div>
        <textarea
          id="referral-observations"
          name="observations"
          defaultValue={initialData?.observations || ""}
          rows={2}
          className="textarea"
        />
      </div>

      <div>
        <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">Firmas del documento</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="label text-xs">Ficha elaborada por (Coordinador/a DECE)</label>
            <input
              name="elaborated_by_name"
              defaultValue={initialData?.elaborated_by_name || defaultElaboratedBy}
              className="input"
            />
          </div>
          <div>
            <label className="label text-xs">Recibido por (Representante legal)</label>
            <input
              name="received_by"
              defaultValue={initialData?.received_by || ""}
              className="input"
            />
          </div>
          <div>
            <label className="label text-xs">Autoridad institucional (Rector/a)</label>
            <input
              name="authority_name"
              defaultValue={initialData?.authority_name || ""}
              className="input"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <SubmitButton isEditing={isEditing} />
      </div>
    </form>
  );
}
