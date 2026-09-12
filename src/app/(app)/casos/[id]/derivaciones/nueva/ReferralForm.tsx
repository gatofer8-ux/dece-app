"use client";

import { useCallback, useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useToastOnChange } from "@/components/Toast";
import { createOfficialReferral, updateOfficialReferral, type ActionState } from "../../../../derivaciones/actions";
import { DESTINATION_OPTIONS, DESTINATION_GROUP_LABELS } from "@/lib/referral";
import type { ReferralRow } from "@/lib/types";
import VoiceDictationButton from "@/components/VoiceDictationButton";
import AIAssistButton from "@/components/AIAssistButton";
import DualSignatureModal, { type DualSignatureData } from "@/components/DualSignatureModal";
import { estimateReferralOverflow, REFERRAL_OVERFLOW_MESSAGE } from "@/lib/referralOverflow";

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

  // Aviso en vivo: si el texto libre va a hacer que la ficha se pase de 1 hoja.
  const [overflowOver, setOverflowOver] = useState(0);
  const recalcOverflow = useCallback(() => {
    if (typeof document === "undefined") return;
    const val = (id: string) => (document.getElementById(id) as HTMLTextAreaElement | HTMLInputElement | null)?.value || "";
    const est = estimateReferralOverflow({
      current_situation_history: val("referral-background"),
      actions_taken: val("referral-actions"),
      observations: val("referral-observations"),
      care_type_required: val("referral-care-type"),
    });
    setOverflowOver(est.overflow ? est.linesOver : 0);
  }, []);
  useEffect(() => {
    recalcOverflow();
  }, [recalcOverflow]);

  const defaultDate = initialData?.referral_date
    ? initialData.referral_date.slice(0, 10)
    : new Date().toISOString().slice(0, 10);

  // Parse existing signatures
  const parsedSigs = (() => {
    try {
      return initialData?.signatures_json ? JSON.parse(initialData.signatures_json) : {};
    } catch {
      return {};
    }
  })();

  const [elaboratedByName, setElaboratedByName] = useState(initialData?.elaborated_by_name || defaultElaboratedBy || "");
  const [receivedBy, setReceivedBy] = useState(initialData?.received_by || "");
  const [authorityName, setAuthorityName] = useState(initialData?.authority_name || "");

  const [deceSig, setDeceSig] = useState<DualSignatureData | null>(parsedSigs.dece || null);
  const [repSig, setRepSig] = useState<DualSignatureData | null>(parsedSigs.rep || null);
  const [authoritySig, setAuthoritySig] = useState<DualSignatureData | null>(parsedSigs.authority || null);

  const [physicalFileRef, setPhysicalFileRef] = useState(initialData?.physical_file_ref || "");
  const [physicalEvidenceUrl, setPhysicalEvidenceUrl] = useState(initialData?.physical_evidence_url || "");
  const [physicalEvidenceName, setPhysicalEvidenceName] = useState("");
  const [activeSignerModal, setActiveSignerModal] = useState<"dece" | "rep" | "authority" | null>(null);

  const signaturesPayload = JSON.stringify({
    dece: deceSig ? { ...deceSig, roleKey: "dece", nombre: elaboratedByName, cargo: "Profesional DECE" } : null,
    rep: repSig ? { ...repSig, roleKey: "rep", nombre: receivedBy, cargo: "Representante Legal / Receptor" } : null,
    authority: authoritySig ? { ...authoritySig, roleKey: "authority", nombre: authorityName, cargo: "Autoridad Institucional" } : null,
  });

  let overallSignatureType = initialData?.signature_type || "PENDIENTE";
  const activeSigs = [deceSig, repSig, authoritySig].filter(Boolean);
  if (activeSigs.length > 0) {
    const hasDig = activeSigs.some((s) => s?.tipo === "digital");
    const hasFis = activeSigs.some((s) => s?.tipo === "fisica") || Boolean(physicalFileRef || physicalEvidenceUrl);
    if (hasDig && hasFis) overallSignatureType = "MIXTA";
    else if (hasDig) overallSignatureType = "DIGITAL";
    else if (hasFis) overallSignatureType = "FISICA";
  } else if (physicalFileRef || physicalEvidenceUrl) {
    overallSignatureType = "FISICA";
  }

  function handleEvidenceUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) {
      alert("El archivo no debe exceder los 15 MB.");
      return;
    }
    setPhysicalEvidenceName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setPhysicalEvidenceUrl((ev.target?.result as string) || "");
    };
    reader.readAsDataURL(file);
  }

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

      {/* "MOTIVO DE REFERENCIA" en el formato oficial es solo un encabezado de
          sección: no se llena un texto libre, se desglosa en Historia de la
          situación actual, Acciones desarrolladas, Tipo de atención y
          Observaciones. Por eso aquí no hay campo "Motivo". */}
      <div>
        <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">Motivo de referencia</h3>
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
          onInput={recalcOverflow}
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
          onInput={recalcOverflow}
          defaultValue={initialData?.actions_taken || ""}
          placeholder="- Diálogo con la madre de familia&#10;- Acta de consentimiento informado&#10;- Intervención con el estudiante&#10;- Agendamiento de cita"
          rows={3}
          className="textarea"
        />
      </div>

      <div>
        <label className="label text-xs">Tipo de atención que se requiere</label>
        <input
          id="referral-care-type"
          name="care_type_required"
          onInput={recalcOverflow}
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
        <p className="text-xs text-slate-400 mb-1">Pautas e indicaciones directas (lista con viñetas •, 2 a 5 líneas breves; incluye cita si existe).</p>
        <textarea
          id="referral-observations"
          name="observations"
          onInput={recalcOverflow}
          defaultValue={initialData?.observations || ""}
          placeholder="• Brindar atención psicológica al estudiante.&#10;• Favor enviar certificado de asistencia.&#10;• N° cita: 91665562; Fecha: 22/10/2024; Hora: 10h00"
          rows={3}
          className="textarea"
        />
      </div>

      {/* Firmas y Respaldo Dual */}
      <div className="space-y-4 border-t border-slate-200 pt-5">
        <input type="hidden" name="signatures_json" value={signaturesPayload} />
        <input type="hidden" name="signature_type" value={overallSignatureType} />
        <input type="hidden" name="physical_file_ref" value={physicalFileRef} />
        <input type="hidden" name="physical_evidence_url" value={physicalEvidenceUrl} />

        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-slate-500 uppercase">
            Firmas de Responsabilidad de la Derivación (Digital / Física)
          </h3>
          <span className="text-[11px] font-semibold text-brand-700 bg-brand-50 border border-brand-200 px-2.5 py-0.5 rounded-full">
            Modalidad: {overallSignatureType}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Elaborada por DECE */}
          <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-2 shadow-2xs">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Ficha elaborada por (DECE)
              </label>
              <input
                type="text"
                name="elaborated_by_name"
                value={elaboratedByName}
                onChange={(e) => setElaboratedByName(e.target.value)}
                placeholder="Nombre del profesional DECE"
                className="w-full text-xs rounded border border-slate-300 px-2.5 py-1.5 font-medium"
              />
            </div>
            <div className="pt-1 flex flex-wrap items-center justify-between gap-1 border-t border-slate-100">
              {deceSig?.tipo === "digital" || deceSig?.firma_data_url ? (
                <div className="flex flex-wrap items-center gap-1">
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-300 px-1.5 py-0.5 rounded">
                    ✓ Digital
                  </span>
                  {deceSig.firma_data_url && (
                    <img
                      src={deceSig.firma_data_url}
                      alt="Firma DECE"
                      className="h-5 max-w-[55px] object-contain border border-slate-200 rounded px-1 bg-white"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => setActiveSignerModal("dece")}
                    className="text-[10px] text-brand-700 hover:underline"
                  >
                    Cambiar
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeceSig(null)}
                    className="text-[10px] text-rose-600 hover:underline"
                  >
                    ✕
                  </button>
                </div>
              ) : deceSig?.tipo === "fisica" ? (
                <div className="flex flex-wrap items-center gap-1">
                  <span className="text-[10px] font-semibold text-amber-800 bg-amber-50 border border-amber-300 px-1.5 py-0.5 rounded">
                    📄 Papel
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveSignerModal("dece")}
                    className="text-[10px] text-brand-700 hover:underline"
                  >
                    Cambiar
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeceSig(null)}
                    className="text-[10px] text-rose-600 hover:underline"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setActiveSignerModal("dece")}
                  className="w-full text-center py-1 text-[10px] font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-200 rounded"
                >
                  ✍️ Registrar Firma
                </button>
              )}
            </div>
          </div>

          {/* Recibido por Representante */}
          <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-2 shadow-2xs">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Recibido por (Representante)
              </label>
              <input
                type="text"
                name="received_by"
                value={receivedBy}
                onChange={(e) => setReceivedBy(e.target.value)}
                placeholder="Nombre de quien recibe"
                className="w-full text-xs rounded border border-slate-300 px-2.5 py-1.5 font-medium"
              />
            </div>
            <div className="pt-1 flex flex-wrap items-center justify-between gap-1 border-t border-slate-100">
              {repSig?.tipo === "digital" || repSig?.firma_data_url ? (
                <div className="flex flex-wrap items-center gap-1">
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-300 px-1.5 py-0.5 rounded">
                    ✓ Digital
                  </span>
                  {repSig.firma_data_url && (
                    <img
                      src={repSig.firma_data_url}
                      alt="Firma Representante"
                      className="h-5 max-w-[55px] object-contain border border-slate-200 rounded px-1 bg-white"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => setActiveSignerModal("rep")}
                    className="text-[10px] text-brand-700 hover:underline"
                  >
                    Cambiar
                  </button>
                  <button
                    type="button"
                    onClick={() => setRepSig(null)}
                    className="text-[10px] text-rose-600 hover:underline"
                  >
                    ✕
                  </button>
                </div>
              ) : repSig?.tipo === "fisica" ? (
                <div className="flex flex-wrap items-center gap-1">
                  <span className="text-[10px] font-semibold text-amber-800 bg-amber-50 border border-amber-300 px-1.5 py-0.5 rounded">
                    📄 Papel
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveSignerModal("rep")}
                    className="text-[10px] text-brand-700 hover:underline"
                  >
                    Cambiar
                  </button>
                  <button
                    type="button"
                    onClick={() => setRepSig(null)}
                    className="text-[10px] text-rose-600 hover:underline"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setActiveSignerModal("rep")}
                  className="w-full text-center py-1 text-[10px] font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-200 rounded"
                >
                  ✍️ Registrar Firma
                </button>
              )}
            </div>
          </div>

          {/* Autoridad Institucional */}
          <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-2 shadow-2xs">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Autoridad (Rector/a)
              </label>
              <input
                type="text"
                name="authority_name"
                value={authorityName}
                onChange={(e) => setAuthorityName(e.target.value)}
                placeholder="Nombre de la Autoridad"
                className="w-full text-xs rounded border border-slate-300 px-2.5 py-1.5 font-medium"
              />
            </div>
            <div className="pt-1 flex flex-wrap items-center justify-between gap-1 border-t border-slate-100">
              {authoritySig?.tipo === "digital" || authoritySig?.firma_data_url ? (
                <div className="flex flex-wrap items-center gap-1">
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-300 px-1.5 py-0.5 rounded">
                    ✓ Digital
                  </span>
                  {authoritySig.firma_data_url && (
                    <img
                      src={authoritySig.firma_data_url}
                      alt="Firma Autoridad"
                      className="h-5 max-w-[55px] object-contain border border-slate-200 rounded px-1 bg-white"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => setActiveSignerModal("authority")}
                    className="text-[10px] text-brand-700 hover:underline"
                  >
                    Cambiar
                  </button>
                  <button
                    type="button"
                    onClick={() => setAuthoritySig(null)}
                    className="text-[10px] text-rose-600 hover:underline"
                  >
                    ✕
                  </button>
                </div>
              ) : authoritySig?.tipo === "fisica" ? (
                <div className="flex flex-wrap items-center gap-1">
                  <span className="text-[10px] font-semibold text-amber-800 bg-amber-50 border border-amber-300 px-1.5 py-0.5 rounded">
                    📄 Papel
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveSignerModal("authority")}
                    className="text-[10px] text-brand-700 hover:underline"
                  >
                    Cambiar
                  </button>
                  <button
                    type="button"
                    onClick={() => setAuthoritySig(null)}
                    className="text-[10px] text-rose-600 hover:underline"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setActiveSignerModal("authority")}
                  className="w-full text-center py-1 text-[10px] font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-200 rounded"
                >
                  ✍️ Registrar Firma
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Respaldo Físico DECE y Evidencia de Derivación Externa */}
        <div className="p-4 bg-amber-50/60 rounded-xl border border-amber-200 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
              <span>📁</span> Respaldo Físico DECE y Sello de Recepción / Turno (Auditoría Ministerial)
            </span>
            <span className="text-[11px] text-amber-700 bg-amber-100/70 border border-amber-300 px-2 py-0.5 rounded-full font-medium">
              Custodia Institucional
            </span>
          </div>
          <p className="text-xs text-amber-800/90 leading-relaxed">
            Registra la carpeta o archivador físico institucional donde reposa la ficha de derivación con los sellos correspondientes, y adjunta copia digitalizada (PDF o foto) del documento con el sello de recibido de la entidad externa (MSP, Fiscalía, etc.) o turno asignado.
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
                placeholder="Ej. Archivador Derivaciones 2026 / Tomo MSP"
                className="w-full text-xs rounded-lg border border-amber-300 bg-white px-3 py-2 text-slate-800 placeholder-slate-400 focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-amber-900 mb-1">
                Adjuntar Ficha Sellada / Turno Escaneado (PDF o Imagen)
              </label>
              {physicalEvidenceUrl ? (
                <div className="flex items-center justify-between p-2 bg-white rounded-lg border border-amber-300">
                  <span className="text-xs text-emerald-800 font-medium flex items-center gap-1.5 truncate max-w-[200px]">
                    <span>📎</span> {physicalEvidenceName || "Ficha_Derivacion_Sellada"}
                  </span>
                  <div className="flex items-center gap-2">
                    <a
                      href={physicalEvidenceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Ver
                    </a>
                    <button
                      type="button"
                      onClick={() => {
                        setPhysicalEvidenceUrl("");
                        setPhysicalEvidenceName("");
                      }}
                      className="text-xs text-rose-600 hover:underline font-medium"
                    >
                      Quitar
                    </button>
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

        {/* Modal DualSignatureModal */}
        {activeSignerModal && (
          <DualSignatureModal
            isOpen={true}
            onClose={() => setActiveSignerModal(null)}
            signatoryName={
              activeSignerModal === "dece"
                ? elaboratedByName || "Profesional DECE"
                : activeSignerModal === "rep"
                ? receivedBy || "Representante Legal"
                : authorityName || "Autoridad Institucional"
            }
            signatoryRole={
              activeSignerModal === "dece"
                ? "Profesional DECE"
                : activeSignerModal === "rep"
                ? "Representante Legal"
                : "Autoridad Institucional (Rector/a)"
            }
            initialData={
              activeSignerModal === "dece"
                ? deceSig
                : activeSignerModal === "rep"
                ? repSig
                : authoritySig
            }
            onSave={(data) => {
              if (activeSignerModal === "dece") setDeceSig(data);
              else if (activeSignerModal === "rep") setRepSig(data);
              else if (activeSignerModal === "authority") setAuthoritySig(data);
              setActiveSignerModal(null);
            }}
          />
        )}
      </div>

      {overflowOver > 0 && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-xs text-amber-900 flex items-start gap-2">
          <span className="text-base leading-none">⚠️</span>
          <div>
            <p className="font-semibold">{REFERRAL_OVERFLOW_MESSAGE}</p>
            <p className="mt-0.5 text-amber-700">Estimado: ~{overflowOver} línea(s) de más para una sola hoja.</p>
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <SubmitButton isEditing={isEditing} />
      </div>
    </form>
  );
}
