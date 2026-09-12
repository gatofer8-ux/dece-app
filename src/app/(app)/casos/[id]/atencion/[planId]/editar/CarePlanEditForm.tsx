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
import DualSignatureModal, { type DualSignatureData } from "@/components/DualSignatureModal";

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

  // Estados de firmas duales y respaldo físico
  const initialSignatures: DualSignatureData[] = (() => {
    try {
      return plan.signatures_json ? JSON.parse(plan.signatures_json) : [];
    } catch {
      return [];
    }
  })();

  const [deceSig, setDeceSig] = useState<DualSignatureData | null>(
    initialSignatures.find((s) => s.signer_id === "dece" || s.role?.toLowerCase().includes("dece")) || null
  );
  const [isSignModalOpen, setIsSignModalOpen] = useState(false);
  const [physicalFileRef, setPhysicalFileRef] = useState(plan.physical_file_ref || "");
  const [physicalEvidenceUrl, setPhysicalEvidenceUrl] = useState(plan.physical_evidence_url || "");
  const [physicalEvidenceName, setPhysicalEvidenceName] = useState("");

  const handleEvidenceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhysicalEvidenceName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setPhysicalEvidenceUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const currentSignatures = deceSig ? [{ ...deceSig, signer_id: "dece" }] : [];
  const signatureType = deceSig ? deceSig.tipo : (plan.signature_type || "digital");

  const addActionRow = () => {
    setActions([...actions, { accion: "", profesional: "", tiempo: "", observaciones: "" }]);
  };

  const removeActionRow = (index: number) => {
    setActions(actions.filter((_, i) => i !== index));
  };

  return (
    <form action={formAction} className="card p-6 space-y-6 max-w-3xl">
      {/* Hidden inputs para firmas y respaldo físico */}
      <input type="hidden" name="signatures_json" value={JSON.stringify(currentSignatures)} />
      <input type="hidden" name="signature_type" value={signatureType} />
      <input type="hidden" name="physical_file_ref" value={physicalFileRef} />
      <input type="hidden" name="physical_evidence_url" value={physicalEvidenceUrl} />

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

      {/* Firma de Responsabilidad Profesional DECE */}
      <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-slate-50/50">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-700 uppercase flex items-center gap-1.5">
            <span>✍️</span> Firma de Responsabilidad del Profesional DECE
          </h3>
          {deceSig?.tipo === "digital" ? (
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-300 px-1.5 py-0.5 rounded">🖋️ Digital</span>
              <button type="button" onClick={() => setIsSignModalOpen(true)} className="text-[10px] text-brand-700 hover:underline">Cambiar</button>
              <button type="button" onClick={() => setDeceSig(null)} className="text-[10px] text-rose-600 hover:underline">✕</button>
            </div>
          ) : deceSig?.tipo === "fisica" ? (
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-semibold text-amber-800 bg-amber-50 border border-amber-300 px-1.5 py-0.5 rounded">📄 Papel</span>
              <button type="button" onClick={() => setIsSignModalOpen(true)} className="text-[10px] text-brand-700 hover:underline">Cambiar</button>
              <button type="button" onClick={() => setDeceSig(null)} className="text-[10px] text-rose-600 hover:underline">✕</button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsSignModalOpen(true)}
              className="text-xs font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-200 px-2.5 py-1 rounded"
            >
              ✍️ Registrar Firma
            </button>
          )}
        </div>
      </div>

      {/* Respaldo Físico DECE y Ubicación Institucional */}
      <div className="p-4 bg-amber-50/60 rounded-xl border border-amber-200 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
            <span>📁</span> Respaldo Físico DECE y Ubicación de Archivo Institucional
          </span>
          <span className="text-[11px] text-amber-700 bg-amber-100/70 border border-amber-300 px-2 py-0.5 rounded-full font-medium">
            Custodia DECE
          </span>
        </div>
        <p className="text-xs text-amber-800/90 leading-relaxed">
          Para garantizar la constancia legal y auditoría física, registra la ubicación física en carpeta/archivador y opcionalmente adjunta copia escaneada o foto (PDF o Imagen) del plan de atención firmado.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div>
            <label className="block text-[11px] font-semibold text-amber-900 mb-1">
              Ubicación en Archivo Físico Institucional
            </label>
            <input
              type="text"
              value={physicalFileRef}
              onChange={(e) => setPhysicalFileRef(e.target.value)}
              placeholder="Ej. Archivador Planes de Atención 2026 / Carpeta Caso"
              className="w-full text-xs rounded-lg border border-amber-300 bg-white px-3 py-2 text-slate-800 placeholder-slate-400 focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-amber-900 mb-1">
              Adjuntar Plan Sellado / Firmado (PDF o Imagen)
            </label>
            {physicalEvidenceUrl ? (
              <div className="flex items-center justify-between p-2 bg-white rounded-lg border border-amber-300">
                <span className="text-xs text-emerald-800 font-medium flex items-center gap-1.5 truncate max-w-[200px]">
                  <span>📎</span> {physicalEvidenceName || "Plan_Atencion_Sellado"}
                </span>
                <div className="flex items-center gap-2">
                  <a href={physicalEvidenceUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">Ver</a>
                  <button type="button" onClick={() => { setPhysicalEvidenceUrl(""); setPhysicalEvidenceName(""); }} className="text-xs text-rose-600 hover:underline font-medium">Quitar</button>
                </div>
              </div>
            ) : (
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={handleEvidenceUpload}
                className="w-full text-xs text-slate-600 file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-amber-100 file:text-amber-800 hover:file:bg-amber-200 cursor-pointer"
              />
            )}
          </div>
        </div>
      </div>

      {isSignModalOpen && (
        <DualSignatureModal
          isOpen={true}
          onClose={() => setIsSignModalOpen(false)}
          signatoryName={defaultProfessionalName || "Profesional DECE"}
          signatoryRole="PROFESIONAL DECE"
          initialData={deceSig}
          onSave={(data) => {
            setDeceSig(data);
            setIsSignModalOpen(false);
          }}
        />
      )}

      <div className="flex justify-end gap-3 pt-3">
        <Link href={`/casos/${caseId}/atencion/${plan.id}/imprimir`} className="btn-secondary">
          Cancelar
        </Link>
        <SubmitButton />
      </div>
    </form>
  );
}
