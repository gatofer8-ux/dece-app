"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useToastOnChange } from "@/components/Toast";
import { createViolenceReport, type ActionState } from "../../../actions";
import {
  VIOLENCE_TYPE_OPTIONS,
  VIOLENCE_MODALITY_OPTIONS,
  PERPETRATOR_RELATIONSHIP_CATEGORIES,
  DUTY_TO_REPORT_TEXT,
} from "@/lib/violenceReport";
import VoiceDictationButton from "@/components/VoiceDictationButton";
import AIAssistButton from "@/components/AIAssistButton";
import DualSignatureModal, { type DualSignatureData } from "@/components/DualSignatureModal";

const initialState: ActionState = { error: null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary disabled:opacity-60">
      {pending ? "Guardando..." : "Guardar reporte"}
    </button>
  );
}

export default function ViolenceReportForm({
  caseId,
  studentName,
  studentCourseFormatted = "",
  defaultReportNumber = "",
  defaultRepresentativeName = "",
  defaultRepresentativeRelationship = "Representante legal",
  defaultRepresentativeAddress = "",
  defaultRepresentativePhone = "",
  defaultProfessionalName,
  defaultProfessionalRole = "ANALISTA DECE",
  defaultRectoraName = "",
  defaultInformantName = "",
  defaultInformantIdNumber = "",
  defaultInformantRole = "",
}: {
  caseId: string;
  studentName: string;
  studentCourseFormatted?: string;
  defaultReportNumber?: string;
  defaultRepresentativeName?: string;
  defaultRepresentativeRelationship?: string;
  defaultRepresentativeAddress?: string;
  defaultRepresentativePhone?: string;
  defaultProfessionalName: string;
  defaultProfessionalRole?: string;
  defaultRectoraName?: string;
  defaultInformantName?: string;
  defaultInformantIdNumber?: string;
  defaultInformantRole?: string;
}) {
  const createForThisCase = createViolenceReport.bind(null, caseId);
  const [state, formAction] = useFormState(createForThisCase, initialState);
  useToastOnChange(state.error, "error");
  const [relationship, setRelationship] = useState("");

  // Estados de firmas duales y respaldo físico
  const [analystName, setAnalystName] = useState(defaultProfessionalName || "");
  const [analystRole, setAnalystRole] = useState(defaultProfessionalRole || "ANALISTA DECE");
  const [rectoraName, setRectoraName] = useState(defaultRectoraName || "");

  const [analystSig, setAnalystSig] = useState<DualSignatureData | null>(null);
  const [rectoraSig, setRectoraSig] = useState<DualSignatureData | null>(null);
  const [activeSignerModal, setActiveSignerModal] = useState<"analyst" | "rectora" | null>(null);

  const [physicalFileRef, setPhysicalFileRef] = useState("");
  const [physicalEvidenceUrl, setPhysicalEvidenceUrl] = useState("");
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
            <label className="label text-xs">N° de informe (Automático)</label>
            <input
              name="report_number"
              defaultValue={defaultReportNumber}
              readOnly
              className="input bg-slate-100 font-mono font-bold text-slate-800 border-slate-300 cursor-not-allowed select-all text-xs"
              title="Generado automáticamente según la codificación oficial DECE"
            />
            <p className="text-[10px] text-slate-400 mt-0.5">Consecutivo oficial inmutable</p>
          </div>
          <div>
            <label className="label text-xs">Fecha del informe</label>
            <input type="date" name="report_date" defaultValue={new Date().toISOString().slice(0, 10)} className="input" />
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
              defaultValue={defaultRepresentativeRelationship}
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

      {/* 3. Datos sobre la presunta situación de violencia */}
      <div>
        <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">
          3. Datos sobre la presunta situación de violencia
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="label text-xs">Fecha del hecho</label>
            <input type="date" name="incident_date" className="input text-xs" />
          </div>
          <div>
            <label className="label text-xs">Lugar del hecho</label>
            <input name="incident_place" placeholder="Ej. Patio de recreo, aula, domicilio..." className="input text-xs" />
          </div>
          <div>
            <label className="label text-xs">Nombre de presunta persona agresora</label>
            <input name="perpetrator_name" placeholder="Nombres y apellidos o Desconocido" className="input text-xs" />
          </div>
          <div>
            <label className="label text-xs">Fecha de nacimiento de la presunta persona agresora</label>
            <input type="date" name="perpetrator_birth_date" className="input text-xs" />
          </div>
          <div>
            <label className="label text-xs">Edad aproximada</label>
            <input name="perpetrator_age" placeholder="Edad o 'Se desconoce'" className="input text-xs" />
          </div>
          <div>
            <label className="label text-xs">N° documento de identidad (si se conoce)</label>
            <input name="perpetrator_document_id" placeholder="Cédula de presunto agresor" className="input text-xs" />
          </div>
          <div>
            <label className="label text-xs">Género</label>
            <input name="perpetrator_gender" placeholder="Masculino / Femenino / No determinado" className="input text-xs" />
          </div>

          {/* Submenú oficial del MINEDUC 3ra Edición */}
          <div className="sm:col-span-2 space-y-1 bg-slate-50 p-3 rounded-lg border border-slate-200">
            <div className="flex items-center justify-between">
              <label className="label text-xs font-semibold text-slate-800">
                Tipo de relación de la persona agresora con la víctima (Manual MINEDUC 3ra Edición) *
              </label>
              <span className="text-[11px] text-slate-500">Seleccione del menú o escriba</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <select
                className="input bg-white text-xs font-medium border-blue-300"
                value={relationship}
                onChange={(e) => setRelationship(e.target.value)}
              >
                <option value="">-- Seleccionar opción oficial MINEDUC (3ra Ed.) --</option>
                {PERPETRATOR_RELATIONSHIP_CATEGORIES.map((cat) => (
                  <optgroup key={cat.category} label={`📂 ${cat.category}`}>
                    {cat.options.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <input
                name="perpetrator_relationship"
                value={relationship}
                onChange={(e) => setRelationship(e.target.value)}
                placeholder="Escriba o ajuste la relación con la víctima"
                className="input text-xs"
                list="perpetrator-relationship-list"
                required
              />
              <datalist id="perpetrator-relationship-list">
                {PERPETRATOR_RELATIONSHIP_CATEGORIES.flatMap((c) => c.options).map((opt) => (
                  <option key={opt} value={opt} />
                ))}
              </datalist>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Datos de la persona que refiere el caso */}
      <div>
        <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">4. Datos de la persona que refiere el caso</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="label text-xs">Nombres y apellidos</label>
            <input
              name="informant_name"
              defaultValue={defaultInformantName}
              placeholder="Nombres y apellidos de quien refiere"
              className="input text-xs"
            />
          </div>
          <div>
            <label className="label text-xs">N° de cédula</label>
            <input
              name="informant_id_number"
              defaultValue={defaultInformantIdNumber}
              placeholder="N° de cédula"
              className="input text-xs"
            />
          </div>
          <div>
            <label className="label text-xs">Rol / cargo institucional</label>
            <input
              name="informant_role"
              defaultValue={defaultInformantRole}
              placeholder="Ej. Docente tutor/a, Inspector/a, etc."
              className="input text-xs"
            />
          </div>
        </div>
      </div>

      {/* 5. Tipo de violencia identificada */}
      <div>
        <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">5. Tipo de violencia identificada</h3>
        <div className="flex flex-wrap gap-4 text-sm">
          {VIOLENCE_TYPE_OPTIONS.map((o) => (
            <label key={o.value} className="flex items-center gap-2">
              <input type="checkbox" name="violence_types" value={o.value} className="rounded" />
              {o.label}
            </label>
          ))}
        </div>
      </div>

      {/* 6. Modalidad de violencia identificada */}
      <div>
        <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">6. Modalidad de violencia identificada</h3>
        <div className="flex flex-wrap gap-4 text-sm mb-2">
          {VIOLENCE_MODALITY_OPTIONS.map((o) => (
            <label key={o.value} className="flex items-center gap-2">
              <input type="checkbox" name="violence_modalities" value={o.value} className="rounded" />
              {o.label}
            </label>
          ))}
        </div>
        <input name="violence_modality_other" placeholder="Especificar si 'Otras'" className="input text-xs" />
      </div>

      {/* 7. Resumen del presunto hecho de violencia cometido o detectado */}
      <div>
        <div className="flex items-center justify-between">
          <label className="label text-xs font-semibold">7. Resumen del presunto hecho de violencia cometido o detectado *</label>
          <div className="flex items-center gap-2">
            <VoiceDictationButton targetId="violence-report-summary" />
            <AIAssistButton targetId="violence-report-summary" caseId={caseId} fieldLabel="Resumen del presunto hecho de violencia (redactar de forma objetiva, sin agregar hechos no mencionados)" />
          </div>
        </div>
        <p className="text-xs text-slate-400 mb-1">
          (Transcriba detalladamente lo expresado por el/la estudiante o la persona que refiere la presunta situación,
          de manera objetiva)
        </p>
        <textarea id="violence-report-summary" name="summary" required rows={4} className="textarea" />
      </div>

      <div>
        <div className="flex items-center justify-between">
          <label className="label text-xs">Observaciones</label>
          <AIAssistButton targetId="violence-report-observations" caseId={caseId} fieldLabel="Observaciones sobre el hecho de violencia" />
        </div>
        <textarea id="violence-report-observations" name="observations" rows={3} className="textarea" />
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
              <select
                name="analyst_role"
                value={analystRole}
                onChange={(e) => setAnalystRole(e.target.value)}
                className="input bg-white text-xs font-semibold text-slate-800"
              >
                <option value="COORDINADOR/A DECE">COORDINADOR/A DECE</option>
                <option value="ANALISTA DECE">ANALISTA DECE</option>
              </select>
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

      <p className="text-xs text-slate-400 border-t border-slate-100 pt-3 italic">{DUTY_TO_REPORT_TEXT}</p>

      <div className="flex justify-end">
        <SubmitButton />
      </div>
    </form>
  );
}


