"use client";

import { useFormState, useFormStatus } from "react-dom";
import { createOfficialReferral, type ActionState } from "../../../../derivaciones/actions";
import { DESTINATION_OPTIONS, DESTINATION_GROUP_LABELS } from "@/lib/referral";
import VoiceDictationButton from "@/components/VoiceDictationButton";
import AIAssistButton from "@/components/AIAssistButton";

const initialState: ActionState = { error: null };
const GROUPS: Array<keyof typeof DESTINATION_GROUP_LABELS> = ["INTERNA_IE", "INTERNA_MINEDUC", "EXTERNA"];

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary disabled:opacity-60">
      {pending ? "Guardando..." : "Guardar ficha de derivación"}
    </button>
  );
}

export default function ReferralForm({
  caseId,
  defaultElaboratedBy,
  defaultAge,
  defaultDistrictOfficeLabel,
}: {
  caseId: string;
  defaultElaboratedBy: string;
  defaultAge?: string;
  defaultDistrictOfficeLabel?: string;
}) {
  const createForThisCase = createOfficialReferral.bind(null, caseId);
  const [state, formAction] = useFormState(createForThisCase, initialState);

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
            <input type="date" name="referral_date" defaultValue={new Date().toISOString().slice(0, 10)} className="input" />
          </div>
          <select name="scope" defaultValue="EXTERNA" className="select">
            <option value="INTERNA">Interna</option>
            <option value="EXTERNA">Externa</option>
          </select>
        </div>
        <input
          name="district_office_label"
          defaultValue={defaultDistrictOfficeLabel || ""}
          placeholder="Dirección Distrital de Educación (ej. DIRECCIÓN DISTRITAL DE EDUCACIÓN 18D02 AMBATO 2)"
          className="input mt-3"
        />
      </div>

      <div>
        <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">
          Datos personales del/la estudiante que se deriva <span className="text-slate-400 normal-case">(complementarios a su ficha)</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input name="student_age" defaultValue={defaultAge || ""} placeholder="Edad" className="input" />
          <input name="student_disability" placeholder="Discapacidad (o 'Ninguna')" className="input" />
          <input name="student_nationality" placeholder="Nacionalidad" className="input" />
          <input name="representative_document_id" placeholder="N° documento de identidad del representante" className="input" />
        </div>
      </div>

      <div>
        <label className="label text-xs">Destino específico *</label>
        <select name="destination_detail" required defaultValue="" className="select">
          <option value="" disabled>Seleccionar...</option>
          {GROUPS.map((g) => (
            <optgroup key={g} label={DESTINATION_GROUP_LABELS[g]}>
              {DESTINATION_OPTIONS.filter((o) => o.group === g).map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </optgroup>
          ))}
        </select>
        <input name="institution" required placeholder="Nombre de la entidad/institución específica (ej. Centro de Salud Santa Rosa)" className="input mt-2" />
      </div>

      <div>
        <div className="flex items-center justify-between">
          <label className="label text-xs">Motivo de la derivación *</label>
          <div className="flex items-center gap-2">
            <VoiceDictationButton targetId="referral-reason" />
            <AIAssistButton targetId="referral-reason" caseId={caseId} fieldLabel="Motivo de la derivación" />
          </div>
        </div>
        <textarea id="referral-reason" name="reason" required rows={2} className="textarea" />
      </div>

      <div>
        <div className="flex items-center justify-between">
          <label className="label text-xs">Historia de la situación actual</label>
          <div className="flex items-center gap-2">
            <VoiceDictationButton targetId="referral-background" />
            <AIAssistButton targetId="referral-background" caseId={caseId} fieldLabel="Historia de la situación actual en la ficha de derivación" />
          </div>
        </div>
        <p className="text-xs text-slate-400 mb-1">Síntesis de la situación del/la estudiante, el entorno educativo y familiar desde el ámbito de la atención psicosocial.</p>
        <textarea id="referral-background" name="background_summary" rows={3} className="textarea" />
      </div>

      <div>
        <div className="flex items-center justify-between">
          <label className="label text-xs">Acciones desarrolladas</label>
          <div className="flex items-center gap-2">
            <VoiceDictationButton targetId="referral-actions" />
            <AIAssistButton targetId="referral-actions" caseId={caseId} fieldLabel="Acciones desarrolladas en el ámbito de la atención psicosocial (ficha de derivación)" />
          </div>
        </div>
        <p className="text-xs text-slate-400 mb-1">En el ámbito de la atención psicosocial.</p>
        <textarea id="referral-actions" name="actions_taken" rows={2} className="textarea" />
      </div>

      <div>
        <label className="label text-xs">Tipo de atención que se requiere</label>
        <input name="care_type_required" placeholder="Tipo de atención requerida de la entidad interna/externa" className="input" />
      </div>

      <div>
        <div className="flex items-center justify-between">
          <label className="label text-xs">Observaciones</label>
          <div className="flex items-center gap-2">
            <VoiceDictationButton targetId="referral-observations" />
            <AIAssistButton targetId="referral-observations" caseId={caseId} fieldLabel="Observaciones de la ficha de derivación" />
          </div>
        </div>
        <textarea id="referral-observations" name="observations" rows={2} className="textarea" />
      </div>

      <div className="flex flex-wrap items-center gap-4 border-t border-slate-100 pt-4">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="informed_consent" className="rounded" />
          Consentimiento informado firmado
        </label>
        <input name="consent_signed_by" placeholder="Firmado por..." className="input max-w-xs" />
      </div>

      <div>
        <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">Firmas del documento</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="label text-xs">Ficha elaborada por (Coordinador/a DECE)</label>
            <input name="elaborated_by_name" defaultValue={defaultElaboratedBy} className="input" />
          </div>
          <div>
            <label className="label text-xs">Recibido por (Representante legal)</label>
            <input name="received_by" className="input" />
          </div>
          <div>
            <label className="label text-xs">Autoridad institucional (Rector/a)</label>
            <input name="authority_name" className="input" />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <SubmitButton />
      </div>
    </form>
  );
}
