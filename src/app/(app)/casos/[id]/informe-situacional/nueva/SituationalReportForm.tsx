"use client";

import { useState } from "react";
import DualSignatureModal, { type DualSignatureData } from "@/components/DualSignatureModal";

import { useFormState, useFormStatus } from "react-dom";
import { useToastOnChange } from "@/components/Toast";
import { createSituationalReport, updateSituationalReport, type ActionState } from "../../../actions";
import type { SituationalReportRow } from "@/lib/types";
import { METHODOLOGY_OPTIONS, LEGAL_BASIS_TEXT } from "@/lib/situationalReport";
import VoiceDictationButton from "@/components/VoiceDictationButton";
import AIAssistButton from "@/components/AIAssistButton";

const initialState: ActionState = { error: null };

const EJE_FIELDS: { name: string; label: string }[] = [
  { name: "eje_deteccion", label: "AEP1. Eje de Detección" },
  { name: "eje_diagnostico_individual", label: "AEAP2. Diagnóstico Situacional — Valoración individual" },
  { name: "eje_diagnostico_familiar", label: "AEAP2. Diagnóstico Situacional — Valoración familiar" },
  { name: "eje_diagnostico_institucional", label: "AEAP2. Diagnóstico Situacional — Valoración institucional" },
  { name: "eje_atencion_psicosocial", label: "AEAP3. Eje de Atención Psicosocial (Intervención)" },
  { name: "eje_derivacion", label: "AEP4. Eje de Derivación" },
  { name: "eje_seguimiento", label: "AEAP5. Eje de Seguimiento" },
  { name: "eje_reparacion", label: "AERP6. Eje de Reparación" },
];

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary disabled:opacity-60">
      {pending ? "Guardando..." : "Guardar informe"}
    </button>
  );
}

export default function SituationalReportForm({
  report,
  caseId,
  studentName,
  studentCourse,
  studentParallel,
  defaultResponsibleName,
  defaultResponsibleRole,
  defaultCoordinatorName,
  defaultAuthorityName,
  defaultAuthorityRole,
  defaultReportNumber = "",
}: {
  caseId: string;
  studentName: string;
  studentCourse: string;
  studentParallel: string;
  defaultResponsibleName: string;
  defaultResponsibleRole?: string;
  defaultCoordinatorName?: string;
  defaultAuthorityName?: string;
  defaultAuthorityRole?: string;
  defaultReportNumber?: string;
  report?: SituationalReportRow;
}) {
  const actionFn = report ? updateSituationalReport.bind(null, report.id, caseId) : createSituationalReport.bind(null, caseId);
  const [state, formAction] = useFormState(actionFn, initialState);
  useToastOnChange(state.error, "error");

  let initialSignatures: Record<string, DualSignatureData> = {};
  if (report?.signatures_json) {
    try {
      initialSignatures = JSON.parse(report.signatures_json);
    } catch {
      initialSignatures = {};
    }
  }

  const [preparerSig, setPreparerSig] = useState<DualSignatureData | null>(initialSignatures.preparer || null);
  const [reviewerSig, setReviewerSig] = useState<DualSignatureData | null>(initialSignatures.reviewer || null);
  const [approverSig, setApproverSig] = useState<DualSignatureData | null>(initialSignatures.approver || null);

  const [activeSignerModal, setActiveSignerModal] = useState<"preparer" | "reviewer" | "approver" | null>(null);

  const [preparerName, setPreparerName] = useState<string>((report as any)?.preparer_name || defaultResponsibleName || "");
  const [reviewerName, setReviewerName] = useState<string>((report as any)?.reviewer_name || defaultCoordinatorName || "");
  const [approverName, setApproverName] = useState<string>((report as any)?.approver_name || defaultAuthorityName || "");

  const [physicalFileRef, setPhysicalFileRef] = useState<string>(report?.physical_file_ref || "");
  const [physicalEvidenceUrl, setPhysicalEvidenceUrl] = useState<string>(report?.physical_evidence_url || "");
  const [physicalEvidenceName, setPhysicalEvidenceName] = useState<string>("");

  const handleEvidenceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("El archivo excede el límite máximo de 5MB.");
      return;
    }
    setPhysicalEvidenceName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setPhysicalEvidenceUrl(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const signaturesPayload = JSON.stringify({
    preparer: preparerSig,
    reviewer: reviewerSig,
    approver: approverSig,
  });

  const hasDigital = [preparerSig, reviewerSig, approverSig].some((s) => s?.tipo === "digital" || s?.firma_data_url);
  const hasPhysical = [preparerSig, reviewerSig, approverSig].some((s) => s?.tipo === "fisica");
  const overallSignatureType =
    hasDigital && hasPhysical
      ? "MIXTA"
      : hasPhysical
      ? "FISICA"
      : "DIGITAL";

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
            <label className="label text-xs font-semibold">Estudiante</label>
            <input value={studentName} disabled className="input bg-slate-50 font-medium" />
          </div>
          <div>
            <label className="label text-xs font-semibold">Número de informe (Automático)</label>
            <input
              type="text"
              name="report_number"
              value={(report as any)?.report_number || defaultReportNumber || ""}
              readOnly
              className="input bg-slate-100 text-slate-800 font-mono font-bold cursor-not-allowed border-slate-300 select-all"
            />
            <p className="text-[10px] text-slate-400 mt-0.5">Consecutivo oficial inmutable</p>
          </div>
          <div>
            <label className="label text-xs font-semibold">Fecha del informe</label>
            <input type="date" name="report_date" className="input" defaultValue={(report as any)?.report_date || new Date().toISOString().slice(0, 10)} />
          </div>
        </div>

        <div className="mt-3">
          <label className="label text-xs">Tipo de situación *</label>
          <input
            name="situation_type" defaultValue={(report as any)?.situation_type || ""}
            required
            placeholder="Ej. intento autolítico, violencia sexual, comportamental..."
            className="input"
          />
        </div>

        <div className="mt-3">
          <label className="label text-xs">Tema / título del informe</label>
          <textarea
            name="tema"
            rows={2}
            placeholder={`INFORME TÉCNICO SITUACIONAL SOBRE [TIPO DE SITUACIÓN] AL ${studentCourse.toUpperCase()} PARALELO "${studentParallel.toUpperCase()}" JORNADA [MATUTINA/VESPERTINA]`}
            className="textarea"
          />
          <p className="text-xs text-slate-400 mt-1">
            (Se puede completar automáticamente combinando el tipo de situación y el curso; edítalo libremente)
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <div className="border border-slate-200 rounded-lg p-3">
            <p className="text-xs font-medium mb-2">Funcionario responsable del informe</p>
            <div className="space-y-2">
              <input name="responsible_name" defaultValue={(report as any)?.responsible_name || defaultResponsibleName} placeholder="Nombre" className="input" />
              <input type="text" name="responsible_role" placeholder="Cargo (Ej. Analista DECE)" className="input" defaultValue={(report as any)?.responsible_role || ""} />
              <input type="tel" name="responsible_phone" placeholder="Teléfono" className="input" defaultValue={(report as any)?.responsible_phone || ""} />
              <input type="email" name="responsible_email" placeholder="Correo" className="input" defaultValue={(report as any)?.responsible_email || ""} />
            </div>
          </div>
          <div className="border border-slate-200 rounded-lg p-3">
            <p className="text-xs font-medium mb-2">Informe dirigido a</p>
            <div className="space-y-2">
              <input type="text" name="addressed_to_name" placeholder="Nombre" className="input" defaultValue={(report as any)?.addressed_to_name || ""} />
              <input type="text" name="addressed_to_role" placeholder="Cargo (Ej. Rector/a)" className="input" defaultValue={(report as any)?.addressed_to_role || ""} />
              <input type="tel" name="addressed_to_phone" placeholder="Teléfono" className="input" defaultValue={(report as any)?.addressed_to_phone || ""} />
              <input type="email" name="addressed_to_email" placeholder="Correo" className="input" defaultValue={(report as any)?.addressed_to_email || ""} />
            </div>
          </div>
        </div>

        <input name="tutor_name" defaultValue={(report as any)?.tutor_name || ""} placeholder="Nombre del/la docente tutor/a" className="input mt-3" />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="label mb-0">1. Antecedentes / Marco Legal *</label>
          <div className="flex items-center gap-2">
            <VoiceDictationButton targetId="sr-legal" />
            <AIAssistButton targetId="sr-legal" caseId={caseId} fieldLabel="Marco legal aplicable a este caso (en Ecuador)" />
          </div>
        </div>
        <p className="text-xs text-slate-500 mb-2">Se cargar\u00E1 un texto legal por defecto, pero puedes editarlo o usar la IA para generar normativa legal ecuatoriana espec\u00EDfica seg\u00FAn el tipo de caso (ej. acoso, violencia, autolesi\u00F3n).</p>
        <textarea
          id="sr-legal"
          name="legal_basis"
          required
          rows={10}
          defaultValue={(report as any)?.legal_basis || LEGAL_BASIS_TEXT}
          className="input resize-y"
        ></textarea>
      </div>

      {/* Alcance */}
      <div>
        <div className="flex items-center justify-between">
          <label className="label text-xs">2. Alcance</label>
          <div className="flex items-center gap-2">
            <VoiceDictationButton targetId="sr-scope" />
            <AIAssistButton targetId="sr-scope" caseId={caseId} fieldLabel="Alcance del informe técnico situacional" />
          </div>
        </div>
        <textarea id="sr-scope" name="scope_text" rows={3} className="textarea" defaultValue={(report as any)?.scope_text || ""} />
      </div>

      {/* Objetivo */}
      <div>
        <div className="flex items-center justify-between">
          <label className="label text-xs">3. Objetivo</label>
          <div className="flex items-center gap-2">
            <VoiceDictationButton targetId="sr-objective" />
            <AIAssistButton targetId="sr-objective" caseId={caseId} fieldLabel="Objetivo del informe técnico situacional" />
          </div>
        </div>
        <textarea id="sr-objective" name="objective_text" rows={2} className="textarea" defaultValue={(report as any)?.objective_text || ""} />
      </div>

      {/* Desarrollo o análisis — ejes de acción */}
      <div>
        <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">
          4. Desarrollo o análisis (ejes de acción)
        </h3>
        <div className="space-y-4">
          {EJE_FIELDS.map((eje) => (
            <div key={eje.name}>
              <div className="flex items-center justify-between">
                <label className="label text-xs">{eje.label}</label>
                <div className="flex items-center gap-2">
                  <VoiceDictationButton targetId={`sr-${eje.name}`} />
                  <AIAssistButton targetId={`sr-${eje.name}`} caseId={caseId} fieldLabel={`${eje.label} (informe técnico situacional)`} />
                </div>
              </div>
              <textarea id={`sr-${eje.name}`} name={eje.name} rows={3} className="textarea" />
            </div>
          ))}
        </div>
      </div>

      {/* Metodología */}
      <div>
        <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">5. Metodología</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {(() => {
            const repMeth = (report as any)?.methodology ? JSON.parse((report as any)?.methodology || "[]") : [];
            return METHODOLOGY_OPTIONS.map((m) => (
              <label key={m} className="flex items-center gap-2 text-sm">
                <input type="checkbox" defaultChecked={repMeth.includes(m)} name="methodology" value={m} className="rounded" />
                {m}
              </label>
            ));
          })()}
        </div>
      </div>

      {/* Conclusiones */}
      <div>
        <div className="flex items-center justify-between">
          <label className="label text-xs">6. Conclusiones</label>
          <div className="flex items-center gap-2">
            <VoiceDictationButton targetId="sr-conclusions" />
            <AIAssistButton targetId="sr-conclusions" caseId={caseId} fieldLabel="Conclusiones del informe técnico situacional (Redactar obligatoriamente al menos 4 conclusiones estructuradas en viñetas)" />
          </div>
        </div>
        <textarea id="sr-conclusions" name="conclusions" rows={4} className="textarea" defaultValue={(report as any)?.conclusions || ""} />
      </div>

      {/* Recomendaciones */}
      <div>
        <div className="flex items-center justify-between">
          <label className="label text-xs">7. Recomendaciones</label>
          <div className="flex items-center gap-2">
            <VoiceDictationButton targetId="sr-recommendations" />
            <AIAssistButton targetId="sr-recommendations" caseId={caseId} fieldLabel="Recomendaciones del informe técnico situacional, dirigidas a autoridad institucional, representantes legales y equipo docente" />
          </div>
        </div>
        <p className="text-xs text-slate-400 mb-1">
          (Dirigidas a distintos destinatarios: máxima autoridad institucional, representantes legales, equipo
          docente...)
        </p>
        <textarea id="sr-recommendations" name="recommendations" rows={4} className="textarea" defaultValue={(report as any)?.recommendations || ""} />
      </div>

      {/* Firmas y Respaldo Dual */}
      <div className="space-y-4 border-t border-slate-200 pt-5">
        <input type="hidden" name="signatures_json" value={signaturesPayload} />
        <input type="hidden" name="signature_type" value={overallSignatureType} />
        <input type="hidden" name="physical_file_ref" value={physicalFileRef} />
        <input type="hidden" name="physical_evidence_url" value={physicalEvidenceUrl} />

        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-slate-500 uppercase">
            Firmas de Responsabilidad del Informe (Digital / Física)
          </h3>
          <span className="text-[11px] font-semibold text-brand-700 bg-brand-50 border border-brand-200 px-2.5 py-0.5 rounded-full">
            Modalidad: {overallSignatureType}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* 1. Elaborado por */}
          <div className="border border-slate-200 rounded-lg p-3 bg-white space-y-2 shadow-2xs">
            <p className="text-xs font-bold text-slate-700">1. Elaborado por (Desarrollo)</p>
            <input
              name="preparer_name"
              value={preparerName}
              onChange={(e) => setPreparerName(e.target.value)}
              placeholder="Nombre del profesional DECE"
              className="input text-xs mb-1"
            />
            <input
              name="preparer_role"
              defaultValue={(report as any)?.preparer_role || defaultResponsibleRole || "ANALISTA DECE"}
              placeholder="Cargo"
              className="input text-xs"
            />
            <div className="pt-2 flex flex-wrap items-center justify-between gap-1 border-t border-slate-100">
              {preparerSig?.tipo === "digital" || preparerSig?.firma_data_url ? (
                <div className="flex flex-wrap items-center gap-1">
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-300 px-1.5 py-0.5 rounded">
                    ✓ Digital
                  </span>
                  {preparerSig.firma_data_url && (
                    <img src={preparerSig.firma_data_url} alt="Firma Elaborador" className="h-5 max-w-[55px] object-contain border border-slate-200 rounded px-1 bg-white" />
                  )}
                  <button type="button" onClick={() => setActiveSignerModal("preparer")} className="text-[10px] text-brand-700 hover:underline">Cambiar</button>
                  <button type="button" onClick={() => setPreparerSig(null)} className="text-[10px] text-rose-600 hover:underline">✕</button>
                </div>
              ) : preparerSig?.tipo === "fisica" ? (
                <div className="flex flex-wrap items-center gap-1">
                  <span className="text-[10px] font-semibold text-amber-800 bg-amber-50 border border-amber-300 px-1.5 py-0.5 rounded">📄 Papel</span>
                  <button type="button" onClick={() => setActiveSignerModal("preparer")} className="text-[10px] text-brand-700 hover:underline">Cambiar</button>
                  <button type="button" onClick={() => setPreparerSig(null)} className="text-[10px] text-rose-600 hover:underline">✕</button>
                </div>
              ) : (
                <button type="button" onClick={() => setActiveSignerModal("preparer")} className="w-full text-center py-1 text-[10px] font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-200 rounded">
                  ✍️ Registrar Firma
                </button>
              )}
            </div>
          </div>

          {/* 2. Revisado por */}
          <div className="border border-slate-200 rounded-lg p-3 bg-white space-y-2 shadow-2xs">
            <p className="text-xs font-bold text-slate-700">2. Revisado por (Coordinación)</p>
            <input
              name="reviewer_name"
              value={reviewerName}
              onChange={(e) => setReviewerName(e.target.value)}
              placeholder="Nombre de la Coordinación DECE"
              className="input text-xs mb-1"
            />
            <input
              name="reviewer_role"
              defaultValue={(report as any)?.reviewer_role || "COORDINADOR/A DECE"}
              placeholder="Cargo"
              className="input text-xs"
            />
            <div className="pt-2 flex flex-wrap items-center justify-between gap-1 border-t border-slate-100">
              {reviewerSig?.tipo === "digital" || reviewerSig?.firma_data_url ? (
                <div className="flex flex-wrap items-center gap-1">
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-300 px-1.5 py-0.5 rounded">
                    ✓ Digital
                  </span>
                  {reviewerSig.firma_data_url && (
                    <img src={reviewerSig.firma_data_url} alt="Firma Revisor" className="h-5 max-w-[55px] object-contain border border-slate-200 rounded px-1 bg-white" />
                  )}
                  <button type="button" onClick={() => setActiveSignerModal("reviewer")} className="text-[10px] text-brand-700 hover:underline">Cambiar</button>
                  <button type="button" onClick={() => setReviewerSig(null)} className="text-[10px] text-rose-600 hover:underline">✕</button>
                </div>
              ) : reviewerSig?.tipo === "fisica" ? (
                <div className="flex flex-wrap items-center gap-1">
                  <span className="text-[10px] font-semibold text-amber-800 bg-amber-50 border border-amber-300 px-1.5 py-0.5 rounded">📄 Papel</span>
                  <button type="button" onClick={() => setActiveSignerModal("reviewer")} className="text-[10px] text-brand-700 hover:underline">Cambiar</button>
                  <button type="button" onClick={() => setReviewerSig(null)} className="text-[10px] text-rose-600 hover:underline">✕</button>
                </div>
              ) : (
                <button type="button" onClick={() => setActiveSignerModal("reviewer")} className="w-full text-center py-1 text-[10px] font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-200 rounded">
                  ✍️ Registrar Firma
                </button>
              )}
            </div>
          </div>

          {/* 3. Aprobado por */}
          <div className="border border-slate-200 rounded-lg p-3 bg-white space-y-2 shadow-2xs">
            <p className="text-xs font-bold text-slate-700">3. Aprobado por (Rectorado)</p>
            <input
              name="approver_name"
              value={approverName}
              onChange={(e) => setApproverName(e.target.value)}
              placeholder="Nombre de la Autoridad Institucional"
              className="input text-xs mb-1"
            />
            <input
              name="approver_role"
              defaultValue={(report as any)?.approver_role || defaultAuthorityRole || "RECTOR/A"}
              placeholder="Cargo"
              className="input text-xs"
            />
            <div className="pt-2 flex flex-wrap items-center justify-between gap-1 border-t border-slate-100">
              {approverSig?.tipo === "digital" || approverSig?.firma_data_url ? (
                <div className="flex flex-wrap items-center gap-1">
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-300 px-1.5 py-0.5 rounded">
                    ✓ Digital
                  </span>
                  {approverSig.firma_data_url && (
                    <img src={approverSig.firma_data_url} alt="Firma Aprobador" className="h-5 max-w-[55px] object-contain border border-slate-200 rounded px-1 bg-white" />
                  )}
                  <button type="button" onClick={() => setActiveSignerModal("approver")} className="text-[10px] text-brand-700 hover:underline">Cambiar</button>
                  <button type="button" onClick={() => setApproverSig(null)} className="text-[10px] text-rose-600 hover:underline">✕</button>
                </div>
              ) : approverSig?.tipo === "fisica" ? (
                <div className="flex flex-wrap items-center gap-1">
                  <span className="text-[10px] font-semibold text-amber-800 bg-amber-50 border border-amber-300 px-1.5 py-0.5 rounded">📄 Papel</span>
                  <button type="button" onClick={() => setActiveSignerModal("approver")} className="text-[10px] text-brand-700 hover:underline">Cambiar</button>
                  <button type="button" onClick={() => setApproverSig(null)} className="text-[10px] text-rose-600 hover:underline">✕</button>
                </div>
              ) : (
                <button type="button" onClick={() => setActiveSignerModal("approver")} className="w-full text-center py-1 text-[10px] font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-200 rounded">
                  ✍️ Registrar Firma
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Respaldo Físico DECE y Evidencia Escaneada */}
      <div className="p-4 bg-amber-50/60 rounded-xl border border-amber-200 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
            <span>📁</span> Respaldo Físico DECE e Informe Firmado en Papel (Auditoría Ministerial)
          </span>
          <span className="text-[11px] text-amber-700 bg-amber-100/70 border border-amber-300 px-2 py-0.5 rounded-full font-medium">
            Custodia Institucional
          </span>
        </div>
        <p className="text-xs text-amber-800/90 leading-relaxed">
          Para garantizar la constancia legal ante el Ministerio de Educación o auditorías distritales, indica el archivador institucional físico donde reposa el informe técnico original firmado a mano, y opcionalmente adjunta copia escaneada o foto (PDF o Imagen) con los sellos respectivos.
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
              placeholder="Ej. Archivador Informes Situacionales 2026 / Carpeta Caso"
              className="w-full text-xs rounded-lg border border-amber-300 bg-white px-3 py-2 text-slate-800 placeholder-slate-400 focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-amber-900 mb-1">
              Adjuntar Informe Físico Sellado / Firmado (PDF o Imagen)
            </label>
            {physicalEvidenceUrl ? (
              <div className="flex items-center justify-between p-2 bg-white rounded-lg border border-amber-300">
                <span className="text-xs text-emerald-800 font-medium flex items-center gap-1.5 truncate max-w-[200px]">
                  <span>📎</span> {physicalEvidenceName || "Informe_Fisico_Sellado"}
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
            activeSignerModal === "preparer"
              ? preparerName || "Profesional DECE Elaborador"
              : activeSignerModal === "reviewer"
              ? reviewerName || "Coordinador/a DECE"
              : approverName || "Autoridad Institucional"
          }
          signatoryRole={
            activeSignerModal === "preparer"
              ? (report as any)?.preparer_role || defaultResponsibleRole || "ANALISTA DECE"
              : activeSignerModal === "reviewer"
              ? (report as any)?.reviewer_role || "COORDINADOR/A DECE"
              : (report as any)?.approver_role || defaultAuthorityRole || "RECTOR/A"
          }
          initialData={
            activeSignerModal === "preparer"
              ? preparerSig
              : activeSignerModal === "reviewer"
              ? reviewerSig
              : approverSig
          }
          onSave={(data) => {
            if (activeSignerModal === "preparer") setPreparerSig(data);
            else if (activeSignerModal === "reviewer") setReviewerSig(data);
            else if (activeSignerModal === "approver") setApproverSig(data);
            setActiveSignerModal(null);
          }}
        />
      )}

      <div className="flex justify-end">
        <SubmitButton />
      </div>
    </form>
  );
}


