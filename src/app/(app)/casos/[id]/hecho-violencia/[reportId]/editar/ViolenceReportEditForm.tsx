"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useToastOnChange } from "@/components/Toast";
import Link from "next/link";
import { updateViolenceReport, type ActionState } from "../../../../actions";
import {
  VIOLENCE_TYPE_OPTIONS,
  VIOLENCE_MODALITY_OPTIONS,
  PERPETRATOR_RELATIONSHIP_CATEGORIES,
  DUTY_TO_REPORT_TEXT,
} from "@/lib/violenceReport";
import type { ViolenceReportRow } from "@/lib/types";
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

export default function ViolenceReportEditForm({
  caseId,
  studentName,
  studentCourseFormatted = "",
  report,
  defaultRepresentativeName = "",
  defaultRepresentativeAddress = "",
  defaultRepresentativePhone = "",
  defaultProfessionalName = "",
  defaultProfessionalRole = "ANALISTA DECE",
  defaultRectoraName = "",
}: {
  caseId: string;
  studentName: string;
  studentCourseFormatted?: string;
  report: ViolenceReportRow;
  defaultRepresentativeName?: string;
  defaultRepresentativeAddress?: string;
  defaultRepresentativePhone?: string;
  defaultProfessionalName?: string;
  defaultProfessionalRole?: string;
  defaultRectoraName?: string;
}) {
  const updateForThisReport = updateViolenceReport.bind(null, caseId, report.id);
  const [state, formAction] = useFormState(updateForThisReport, initialState);
  useToastOnChange(state.error, "error");

  const selectedTypes: string[] = (() => {
    try { return JSON.parse(report.violence_types || "[]"); } catch { return []; }
  })();
  const selectedModalities: string[] = (() => {
    try { return JSON.parse(report.violence_modalities || "[]"); } catch { return []; }
  })();

  const [relationship, setRelationship] = useState(report.perpetrator_relationship || "");

  // Firmas duales y respaldo físico
  const initialSignatures: DualSignatureData[] = (() => {
    try {
      return report.signatures_json ? JSON.parse(report.signatures_json) : [];
    } catch {
      return [];
    }
  })();

  const [analystName, setAnalystName] = useState(report.analyst_name || defaultProfessionalName || "");
  const [analystRole, setAnalystRole] = useState(report.analyst_role || defaultProfessionalRole || "ANALISTA DECE");
  const [rectoraName, setRectoraName] = useState(report.rectora_name || defaultRectoraName || "");

  const [analystSig, setAnalystSig] = useState<DualSignatureData | null>(
    initialSignatures.find((s) => s.signer_id === "analyst" || s.role?.toLowerCase().includes("analista") || s.role?.toLowerCase().includes("dece")) || null
  );
  const [rectoraSig, setRectoraSig] = useState<DualSignatureData | null>(
    initialSignatures.find((s) => s.signer_id === "rectora" || s.role?.toLowerCase().includes("rector")) || null
  );
  const [activeSignerModal, setActiveSignerModal] = useState<"analyst" | "rectora" | null>(null);

  const [physicalFileRef, setPhysicalFileRef] = useState(report.physical_file_ref || "");
  const [physicalEvidenceUrl, setPhysicalEvidenceUrl] = useState(report.physical_evidence_url || "");
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

  const currentSignatures: DualSignatureData[] = [
    ...(analystSig ? [{ ...analystSig, signer_id: "analyst", role: analystRole, signer_name: analystName }] : []),
    ...(rectoraSig ? [{ ...rectoraSig, signer_id: "rectora", role: "RECTORA", signer_name: rectoraName }] : []),
  ];

  const overallSignatureType =
    currentSignatures.length === 0
      ? "PENDIENTE"
      : currentSignatures.every((s) => s.tipo === "digital")
      ? "DIGITAL"
      : currentSignatures.every((s) => s.tipo === "fisica")
      ? "FISICA"
      : "MIXTA";

  return (
    <form action={formAction} className="card p-6 space-y-6 max-w-3xl">
      <input type="hidden" name="signatures_json" value={JSON.stringify(currentSignatures)} />
      <input type="hidden" name="signature_type" value={overallSignatureType} />
      <input type="hidden" name="physical_file_ref" value={physicalFileRef} />
      <input type="hidden" name="physical_evidence_url" value={physicalEvidenceUrl} />
      {state.error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{state.error}</div>
      )}

      {/* 1. Datos generales de identificación del estudiante */}
      <div>
        <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">
          1. Datos generales de identificación del estudiante
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-2">
          <div>
            <label className="label text-xs">Estudiante</label>
            <input value={studentName} disabled className="input bg-slate-50 font-medium" />
          </div>
          <div>
            <label className="label text-xs">N° de informe (Oficial)</label>
            <input
              name="report_number"
              defaultValue={report.report_number || ""}
              readOnly
              className="input bg-slate-100 font-mono font-bold text-slate-800 border-slate-300 cursor-not-allowed select-all text-xs"
            />
            <p className="text-[10px] text-slate-400 mt-0.5">Consecutivo oficial inmutable</p>
          </div>
          <div>
            <label className="label text-xs">Fecha del informe</label>
            <input type="date" name="report_date" defaultValue={report.report_date} className="input" />
          </div>
        </div>
        {studentCourseFormatted && (
          <div className="text-xs text-slate-600 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-md flex items-center gap-2">
            <span className="font-semibold text-slate-700">Curso / Grado precargado:</span>
            <span className="text-blue-700 font-medium">{studentCourseFormatted}</span>
          </div>
        )}
      </div>

      {/* 2. Datos del/la representante legal */}
      <div>
        <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">2. Datos del/la representante legal</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="label text-xs">Nombres y apellidos del representante</label>
            <input
              value={defaultRepresentativeName}
              disabled
              placeholder="Sin representante registrado"
              className="input bg-slate-50 text-xs font-medium"
            />
          </div>
          <div>
            <label className="label text-xs">Vínculo con el/la estudiante</label>
            <input
              name="representative_relationship"
              defaultValue={report.representative_relationship || "Representante legal"}
              placeholder="Relación (madre, padre, tutor/a legal...)"
              className="input text-xs"
            />
          </div>
          <div>
            <label className="label text-xs">Dirección del domicilio</label>
            <input
              value={defaultRepresentativeAddress}
              disabled
              placeholder="Dirección registrada del estudiante"
              className="input bg-slate-50 text-xs"
            />
          </div>
          <div>
            <label className="label text-xs">Teléfono de contacto</label>
            <input
              value={defaultRepresentativePhone}
              disabled
              placeholder="Teléfono registrado"
              className="input bg-slate-50 text-xs"
            />
          </div>
        </div>
      </div>

      {/* 3. Datos de la presunta persona agresora */}
      <div>
        <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">
          3. Datos de la presunta persona agresora
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <div>
            <label className="label text-xs">Nombres y apellidos</label>
            <input name="perpetrator_name" defaultValue={report.perpetrator_name || ""} placeholder="Nombres completos" className="input text-xs" />
          </div>
          <div>
            <label className="label text-xs">Cédula de identidad</label>
            <input name="perpetrator_document_id" defaultValue={report.perpetrator_document_id || ""} placeholder="N° de cédula o pasaporte" className="input text-xs" />
          </div>
          <div>
            <label className="label text-xs">Fecha de nacimiento</label>
            <input type="date" name="perpetrator_birth_date" defaultValue={report.perpetrator_birth_date || ""} className="input text-xs" />
          </div>
          <div>
            <label className="label text-xs">Edad aproximada</label>
            <input name="perpetrator_age" defaultValue={report.perpetrator_age || ""} placeholder="Edad (ej. 35 años)" className="input text-xs" />
          </div>
          <div>
            <label className="label text-xs">Sexo / Género</label>
            <select name="perpetrator_gender" defaultValue={report.perpetrator_gender || ""} className="select text-xs">
              <option value="">Seleccionar...</option>
              <option value="MASCULINO">Masculino</option>
              <option value="FEMENINO">Femenino</option>
              <option value="OTRO">Otro / No determinado</option>
            </select>
          </div>
          <div>
            <label className="label text-xs">Relación con la víctima</label>
            <select
              name="perpetrator_relationship"
              value={relationship}
              onChange={(e) => setRelationship(e.target.value)}
              className="select text-xs"
            >
              <option value="">Seleccionar relación...</option>
              {PERPETRATOR_RELATIONSHIP_CATEGORIES.map((cat) => (
                <optgroup key={cat.category} label={cat.category}>
                  {cat.options.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 4. Datos de la persona que refiere el caso */}
      <div>
        <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">
          4. Datos de la persona que refiere el caso
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="label text-xs">Nombres y apellidos</label>
            <input name="informant_name" defaultValue={report.informant_name || ""} placeholder="Nombre de quien refiere" className="input text-xs" />
          </div>
          <div>
            <label className="label text-xs">Cédula de identidad</label>
            <input name="informant_id_number" defaultValue={report.informant_id_number || ""} placeholder="Cédula" className="input text-xs" />
          </div>
          <div>
            <label className="label text-xs">Cargo o rol institucional</label>
            <input name="informant_role" defaultValue={report.informant_role || ""} placeholder="Ej. Docente Tutor" className="input text-xs" />
          </div>
        </div>
      </div>

      {/* 5. Tipo de violencia identificada */}
      <div>
        <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">5. Tipo de violencia identificada</h3>
        <div className="flex flex-wrap gap-4 text-xs">
          {VIOLENCE_TYPE_OPTIONS.map((o) => (
            <label key={o.value} className="flex items-center gap-1.5 font-medium">
              <input type="checkbox" name="violence_types" value={o.value} defaultChecked={selectedTypes.includes(o.value)} className="rounded" />
              {o.label}
            </label>
          ))}
        </div>
      </div>

      {/* 6. Modalidad de la violencia */}
      <div>
        <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">6. Modalidad de la violencia</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          {VIOLENCE_MODALITY_OPTIONS.map((o) => (
            <label key={o.value} className="flex items-center gap-1.5">
              <input type="checkbox" name="violence_modalities" value={o.value} defaultChecked={selectedModalities.includes(o.value)} className="rounded" />
              {o.label}
            </label>
          ))}
        </div>
        <input
          name="violence_modality_other"
          defaultValue={report.violence_modality_other || ""}
          placeholder="Especificar otra modalidad (si aplica)..."
          className="input text-xs mt-2"
        />
      </div>

      {/* 7. Resumen del hecho de violencia */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="label text-xs font-semibold text-slate-700 uppercase">
            7. Resumen del hecho de violencia *
          </label>
          <div className="flex items-center gap-2">
            <VoiceDictationButton targetId="violence-report-summary" />
            <AIAssistButton targetId="violence-report-summary" caseId={caseId} fieldLabel="Resumen del presunto hecho de violencia" />
          </div>
        </div>
        <textarea
          id="violence-report-summary"
          name="summary"
          required
          rows={5}
          defaultValue={report.summary || ""}
          placeholder="Relato objetivo y cronológico de los hechos..."
          className="textarea text-xs"
        />
      </div>

      {/* 8. Observaciones */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="label text-xs font-semibold text-slate-700 uppercase">8. Observaciones</label>
          <div className="flex items-center gap-2">
            <VoiceDictationButton targetId="violence-report-observations" />
            <AIAssistButton targetId="violence-report-observations" caseId={caseId} fieldLabel="Observaciones sobre el hecho de violencia" />
          </div>
        </div>
        <textarea
          id="violence-report-observations"
          name="observations"
          rows={3}
          defaultValue={report.observations || ""}
          placeholder="Observaciones adicionales, estado físico visible, etc."
          className="textarea text-xs"
        />
      </div>

      {/* Firmas de Responsabilidad Institucional */}
      <div>
        <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">Firmas de responsabilidad del documento</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Profesional DECE */}
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2">
            <span className="text-[11px] font-bold text-slate-700 uppercase block">Profesional DECE</span>
            <div>
              <label className="label text-[11px]">Nombre</label>
              <input
                name="analyst_name"
                value={analystName}
                onChange={(e) => setAnalystName(e.target.value)}
                placeholder="Nombre del profesional DECE"
                className="input text-xs font-medium"
                required
              />
            </div>
            <div>
              <label className="label text-[11px]">Cargo</label>
              <input
                name="analyst_role"
                value={analystRole}
                onChange={(e) => setAnalystRole(e.target.value)}
                className="input text-xs font-semibold"
                required
              />
            </div>
            <div className="pt-2 flex flex-wrap items-center justify-between gap-1 border-t border-slate-200">
              {analystSig?.tipo === "digital" || analystSig?.firma_data_url ? (
                <div className="flex flex-wrap items-center gap-1">
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-300 px-1.5 py-0.5 rounded">✓ Digital</span>
                  {analystSig.firma_data_url && (
                    <img src={analystSig.firma_data_url} alt="Firma Analista" className="h-5 max-w-[55px] object-contain border border-slate-200 rounded px-1 bg-white" />
                  )}
                  <button type="button" onClick={() => setActiveSignerModal("analyst")} className="text-[10px] text-brand-700 hover:underline">Cambiar</button>
                  <button type="button" onClick={() => setAnalystSig(null)} className="text-[10px] text-rose-600 hover:underline">✕</button>
                </div>
              ) : analystSig?.tipo === "fisica" ? (
                <div className="flex flex-wrap items-center gap-1">
                  <span className="text-[10px] font-semibold text-amber-800 bg-amber-50 border border-amber-300 px-1.5 py-0.5 rounded">📄 Papel</span>
                  <button type="button" onClick={() => setActiveSignerModal("analyst")} className="text-[10px] text-brand-700 hover:underline">Cambiar</button>
                  <button type="button" onClick={() => setAnalystSig(null)} className="text-[10px] text-rose-600 hover:underline">✕</button>
                </div>
              ) : (
                <button type="button" onClick={() => setActiveSignerModal("analyst")} className="w-full text-center py-1 text-[10px] font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-200 rounded">
                  ✍️ Registrar Firma Profesional
                </button>
              )}
            </div>
          </div>

          {/* Rectora */}
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2">
            <span className="text-[11px] font-bold text-slate-700 uppercase block">Máxima Autoridad (Rector/a)</span>
            <div>
              <label className="label text-[11px]">Nombre</label>
              <input
                name="rectora_name"
                value={rectoraName}
                onChange={(e) => setRectoraName(e.target.value)}
                placeholder="Rectora/Rector"
                className="input text-xs font-medium"
                required
              />
            </div>
            <div>
              <label className="label text-[11px]">Cargo</label>
              <input value="RECTORA" disabled className="input text-xs bg-slate-100 font-semibold" />
            </div>
            <div className="pt-2 flex flex-wrap items-center justify-between gap-1 border-t border-slate-200">
              {rectoraSig?.tipo === "digital" || rectoraSig?.firma_data_url ? (
                <div className="flex flex-wrap items-center gap-1">
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-300 px-1.5 py-0.5 rounded">✓ Digital</span>
                  {rectoraSig.firma_data_url && (
                    <img src={rectoraSig.firma_data_url} alt="Firma Rectoral" className="h-5 max-w-[55px] object-contain border border-slate-200 rounded px-1 bg-white" />
                  )}
                  <button type="button" onClick={() => setActiveSignerModal("rectora")} className="text-[10px] text-brand-700 hover:underline">Cambiar</button>
                  <button type="button" onClick={() => setRectoraSig(null)} className="text-[10px] text-rose-600 hover:underline">✕</button>
                </div>
              ) : rectoraSig?.tipo === "fisica" ? (
                <div className="flex flex-wrap items-center gap-1">
                  <span className="text-[10px] font-semibold text-amber-800 bg-amber-50 border border-amber-300 px-1.5 py-0.5 rounded">📄 Papel</span>
                  <button type="button" onClick={() => setActiveSignerModal("rectora")} className="text-[10px] text-brand-700 hover:underline">Cambiar</button>
                  <button type="button" onClick={() => setRectoraSig(null)} className="text-[10px] text-rose-600 hover:underline">✕</button>
                </div>
              ) : (
                <button type="button" onClick={() => setActiveSignerModal("rectora")} className="w-full text-center py-1 text-[10px] font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-200 rounded">
                  ✍️ Registrar Firma Rectoral
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Respaldo Físico DECE e Informe en Papel */}
      <div className="p-4 bg-amber-50/60 rounded-xl border border-amber-200 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
            <span>📁</span> Respaldo Físico DECE e Informe de Hecho de Violencia en Papel (Auditoría Ministerial)
          </span>
          <span className="text-[11px] text-amber-700 bg-amber-100/70 border border-amber-300 px-2 py-0.5 rounded-full font-medium">
            Custodia Institucional
          </span>
        </div>
        <p className="text-xs text-amber-800/90 leading-relaxed">
          Para garantizar la constancia legal y auditoría física, registra la ubicación física en carpeta/archivador y opcionalmente adjunta copia escaneada o foto (PDF o Imagen) del informe con firmas manuscritas y sellos institucionales.
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
              placeholder="Ej. Archivador Casos Violencia 2026 / Carpeta Confidencial"
              className="w-full text-xs rounded-lg border border-amber-300 bg-white px-3 py-2 text-slate-800 placeholder-slate-400 focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-amber-900 mb-1">
              Adjuntar Informe Sellado / Firmado (PDF o Imagen)
            </label>
            {physicalEvidenceUrl ? (
              <div className="flex items-center justify-between p-2 bg-white rounded-lg border border-amber-300">
                <span className="text-xs text-emerald-800 font-medium flex items-center gap-1.5 truncate max-w-[200px]">
                  <span>📎</span> {physicalEvidenceName || "Informe_Violencia_Sellado"}
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

      {/* Modal DualSignatureModal */}
      {activeSignerModal && (
        <DualSignatureModal
          isOpen={true}
          onClose={() => setActiveSignerModal(null)}
          signatoryName={activeSignerModal === "analyst" ? analystName || "Profesional DECE" : rectoraName || "Rectora"}
          signatoryRole={activeSignerModal === "analyst" ? analystRole : "RECTORA"}
          initialData={activeSignerModal === "analyst" ? analystSig : rectoraSig}
          onSave={(data) => {
            if (activeSignerModal === "analyst") setAnalystSig(data);
            else if (activeSignerModal === "rectora") setRectoraSig(data);
            setActiveSignerModal(null);
          }}
        />
      )}

      <div className="flex justify-end gap-3 pt-3">
        <Link href={`/casos/${caseId}/hecho-violencia/${report.id}/imprimir`} className="btn-secondary">
          Cancelar
        </Link>
        <SubmitButton />
      </div>
    </form>
  );
}
