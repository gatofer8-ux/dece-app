"use client";

import DualSignatureModal, { type DualSignatureData } from "@/components/DualSignatureModal";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useToastOnChange } from "@/components/Toast";
import Link from "next/link";
import { createBimonthlyReport, updateBimonthlyReport, type ActionState } from "../../../actions";
import { generateBimonthlyMatrixSuggestions } from "../../ai-actions";
import type { BimonthlyReportRow, BimonthlyProcessItem } from "@/lib/types";
import { BIMONTHLY_PERIODS, getDefaultBimonthlyProcesses, parseProcessesData } from "@/lib/bimonthlyReport";
import { currentSchoolYearText } from "@/lib/schoolYearText";
import VoiceDictationButton from "@/components/VoiceDictationButton";
import AIAssistButton from "@/components/AIAssistButton";

const initialState: ActionState = { error: null };

function SubmitButton({ isEditing }: { isEditing: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary disabled:opacity-60 text-xs px-4 py-2">
      {pending ? "Guardando..." : isEditing ? "Actualizar informe bimensual" : "Guardar informe bimensual"}
    </button>
  );
}

export default function BimonthlyReportForm({
  caseId,
  studentName,
  victimInitials,
  institutionName,
  amieCode,
  schoolYearText,
  defaultReportNumber = "",
  defaultResponsibleName,
  defaultAuthorityName,
  report,
}: {
  caseId: string;
  studentName: string;
  victimInitials: string;
  institutionName: string;
  amieCode: string;
  schoolYearText: string;
  defaultReportNumber?: string;
  defaultResponsibleName: string;
  defaultAuthorityName?: string;
  report?: BimonthlyReportRow;
}) {
  const isEditing = Boolean(report);
  const actionFn = report
    ? updateBimonthlyReport.bind(null, report.id, caseId)
    : createBimonthlyReport.bind(null, caseId);
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

  const [elaboratedSig, setElaboratedSig] = useState<DualSignatureData | null>(initialSignatures.elaborated || null);
  const [reviewedSig, setReviewedSig] = useState<DualSignatureData | null>(initialSignatures.reviewed || null);
  const [approvedSig, setApprovedSig] = useState<DualSignatureData | null>(initialSignatures.approved || null);

  const [activeSignerModal, setActiveSignerModal] = useState<"elaborated" | "reviewed" | "approved" | null>(null);

  const [elaboratedName, setElaboratedName] = useState<string>(report?.elaborated_by_name || defaultResponsibleName || "");
  const [reviewedName, setReviewedName] = useState<string>(report?.reviewed_by_name || defaultAuthorityName || "Autoridad educativa");
  const [approvedName, setApprovedName] = useState<string>(report?.approved_by_name || "Psc. Ed. Mg. Fernando Pérez");

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
    elaborated: elaboratedSig,
    reviewed: reviewedSig,
    approved: approvedSig,
  });

  const hasDigital = [elaboratedSig, reviewedSig, approvedSig].some((s) => s?.tipo === "digital" || s?.firma_data_url);
  const hasPhysical = [elaboratedSig, reviewedSig, approvedSig].some((s) => s?.tipo === "fisica");
  const overallSignatureType =
    hasDigital && hasPhysical
      ? "MIXTA"
      : hasPhysical
      ? "FISICA"
      : "DIGITAL";

  const [processes, setProcesses] = useState<BimonthlyProcessItem[]>(() => {
    if (report && report.processes_data) {
      return parseProcessesData(report.processes_data);
    }
    return getDefaultBimonthlyProcesses();
  });

  const [isDraftingAll, setIsDraftingAll] = useState(false);
  const [aiGlobalError, setAiGlobalError] = useState<string | null>(null);

  const updateProcess = (index: number, field: keyof BimonthlyProcessItem, value: string) => {
    setProcesses((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleAutoDraftAll = async () => {
    setIsDraftingAll(true);
    setAiGlobalError(null);
    try {
      const res = await generateBimonthlyMatrixSuggestions(caseId);
      if (res.error) {
        setAiGlobalError(res.error);
        return;
      }
      if (res.suggestions) {
        setProcesses((prev) =>
          prev.map((proc, idx) => {
            const key = proc.id || `proc-${idx + 1}`;
            const suggested = res.suggestions?.[key] || res.suggestions?.[`proc-${idx + 1}`];
            if (suggested) {
              return { ...proc, executed_by: suggested };
            }
            return proc;
          })
        );
      }
    } catch {
      setAiGlobalError("Error al conectar con la ayuda de IA.");
    } finally {
      setIsDraftingAll(false);
    }
  };

  const addRow = () => {
    setProcesses((prev) => [
      ...prev,
      {
        id: `custom-${Date.now()}`,
        process_name: "Acción complementaria de seguimiento",
        executed_by: "",
        beneficiaries_count: "1",
        start_date: "",
        end_date: "",
      },
    ]);
  };

  const removeRow = (index: number) => {
    if (processes.length <= 1) return;
    setProcesses((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <form action={formAction} className="card p-6 space-y-6 max-w-5xl">
      {state.error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{state.error}</div>
      )}

      {/* Input oculto con el JSON de los procesos */}
      <input type="hidden" name="processes_data" value={JSON.stringify(processes)} />

      {/* Encabezado informativo */}
      <div className="border-b border-slate-200 pb-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            1. Datos Informativos Institucionales
          </h3>
          <span className="text-xs text-slate-400">Estudiante: <strong>{studentName}</strong></span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <label className="label text-xs font-semibold">N° de Informe *</label>
            <input
              type="text"
              name="report_number"
              defaultValue={report?.report_number || defaultReportNumber}
              readOnly
              className="input text-xs font-mono font-bold bg-slate-100 text-slate-800 border-slate-300 cursor-not-allowed select-all"
              title="Generado automáticamente según la codificación oficial DECE"
            />
            <p className="text-[10px] text-slate-500 mt-0.5">Consecutivo oficial inmutable</p>
          </div>

          <div>
            <label className="label text-xs">Año lectivo *</label>
            <input
              type="text"
              name="school_year_text"
              defaultValue={report?.school_year_text || schoolYearText || currentSchoolYearText()}
              required
              className="input text-xs"
              placeholder={currentSchoolYearText()}
            />
          </div>

          <div>
            <label className="label text-xs">Período / Bimestre *</label>
            <select
              name="period_months"
              defaultValue={report?.period_months || "Mayo - Junio"}
              className="select text-xs"
              required
            >
              {BIMONTHLY_PERIODS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label text-xs">Código AMIE *</label>
            <input
              type="text"
              name="amie_code"
              defaultValue={report?.amie_code || amieCode}
              required
              className="input text-xs font-mono"
            />
          </div>

          <div>
            <label className="label text-xs">Iniciales víctima (Confidencialidad) *</label>
            <input
              type="text"
              name="victim_initials"
              defaultValue={report?.victim_initials || victimInitials}
              required
              className="input text-xs font-semibold uppercase text-brand-900"
              placeholder="L.A.S.A."
              title="Por protocolo en violencia sexual se usan únicamente iniciales"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label className="label text-xs">Nombre de la institución educativa *</label>
            <VoiceDictationButton targetId="bimonthly-institution-name" compact />
          </div>
          <input
            id="bimonthly-institution-name"
            type="text"
            name="institution_name"
            defaultValue={report?.institution_name || institutionName}
            required
            className="input text-xs"
            placeholder="Unidad Educativa Santa Rosa"
          />
        </div>
      </div>

      {/* Matriz de los 8 Procesos de Acompañamiento */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
              2. Matriz de Seguimiento al Plan de Acompañamiento
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Los 8 procesos normativos vienen precargados. Puedes usar <strong>Dictar por voz 🎤</strong> o <strong>Ayuda de IA ✨</strong> en cada celda, o autocompletar la matriz entera.
            </p>
            {aiGlobalError && (
              <p className="text-xs text-red-600 mt-1 font-medium bg-red-50 border border-red-200 px-2 py-0.5 rounded inline-block">
                {aiGlobalError}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleAutoDraftAll}
              disabled={isDraftingAll}
              className="inline-flex items-center gap-1.5 text-xs rounded-lg px-3 py-1.5 font-medium border border-violet-300 bg-violet-50 text-violet-700 hover:bg-violet-100 disabled:opacity-60 transition-colors shadow-sm"
              title="Redactar automáticamente los seguimientos de todos los procesos con IA según el expediente"
            >
              <span aria-hidden>✨</span>
              <span>{isDraftingAll ? "Redactando matriz con IA..." : "Completar matriz con IA"}</span>
            </button>
            <button
              type="button"
              onClick={addRow}
              className="btn-secondary text-xs px-2.5 py-1.5 flex items-center gap-1 hover:bg-slate-100"
            >
              <span>+</span> Agregar fila
            </button>
          </div>
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-lg shadow-sm">
          <table className="w-full text-left text-xs border-collapse divide-y divide-slate-200">
            <thead className="bg-slate-100 text-slate-700 font-bold uppercase">
              <tr>
                <th className="py-2.5 px-3 w-1/4 border-r border-slate-200">PROCESO IMPLEMENTADO</th>
                <th className="py-2.5 px-3 w-2/5 border-r border-slate-200">
                  ¿QUIÉNES EJECUTARÁN? (institución que brindará el servicio)
                </th>
                <th className="py-2.5 px-2 w-28 text-center border-r border-slate-200">N° PERSONAS</th>
                <th className="py-2.5 px-2 w-28 text-center border-r border-slate-200">FECHA INICIO</th>
                <th className="py-2.5 px-2 w-28 text-center border-r border-slate-200">FECHA FINAL</th>
                <th className="py-2.5 px-1.5 w-10 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {processes.map((p, idx) => (
                <tr key={p.id || idx} className="hover:bg-slate-50/50 align-top">
                  <td className="p-2 border-r border-slate-100">
                    <div className="flex items-center justify-between gap-1 mb-1.5">
                      <span className="text-[10px] text-slate-400 font-medium">Proceso #{idx + 1}</span>
                      <VoiceDictationButton
                        targetId={`bimonthly-name-${idx}`}
                        onResult={(val) => updateProcess(idx, "process_name", val)}
                        compact
                      />
                    </div>
                    <textarea
                      id={`bimonthly-name-${idx}`}
                      rows={3}
                      value={p.process_name}
                      onChange={(e) => updateProcess(idx, "process_name", e.target.value)}
                      className="textarea text-xs font-semibold text-slate-800 !py-1 w-full"
                      placeholder="Nombre del proceso"
                    />
                  </td>
                  <td className="p-2 border-r border-slate-100">
                    <div className="flex items-center justify-between gap-1 mb-1.5">
                      <span className="text-[10px] text-slate-400 font-medium">Instancias y detalle</span>
                      <div className="flex items-center gap-1.5">
                        <VoiceDictationButton
                          targetId={`bimonthly-exec-${idx}`}
                          onResult={(val) => updateProcess(idx, "executed_by", val)}
                          compact
                        />
                        <AIAssistButton
                          targetId={`bimonthly-exec-${idx}`}
                          caseId={caseId}
                          fieldLabel={`Informe Bimensual de Violencia Sexual - Seguimiento estructurado por actores y entidades para: ${p.process_name}`}
                          onResult={(val) => updateProcess(idx, "executed_by", val)}
                          compact
                        />
                      </div>
                    </div>
                    <textarea
                      id={`bimonthly-exec-${idx}`}
                      rows={4}
                      value={p.executed_by}
                      onChange={(e) => updateProcess(idx, "executed_by", e.target.value)}
                      className="textarea text-xs text-slate-700 !py-1 w-full font-normal"
                      placeholder="Detalle de instancias, profesionales y novedades..."
                    />
                  </td>
                  <td className="p-2 border-r border-slate-100">
                    <input
                      type="text"
                      value={p.beneficiaries_count}
                      onChange={(e) => updateProcess(idx, "beneficiaries_count", e.target.value)}
                      className="input text-xs text-center !py-1 w-full"
                      placeholder="1 / NO APLICA"
                    />
                  </td>
                  <td className="p-2 border-r border-slate-100">
                    <input
                      type="text"
                      value={p.start_date}
                      onChange={(e) => updateProcess(idx, "start_date", e.target.value)}
                      className="input text-xs text-center !py-1 w-full"
                      placeholder="dd/mm/aaaa"
                    />
                  </td>
                  <td className="p-2 border-r border-slate-100">
                    <input
                      type="text"
                      value={p.end_date}
                      onChange={(e) => updateProcess(idx, "end_date", e.target.value)}
                      className="input text-xs text-center !py-1 w-full"
                      placeholder="dd/mm/aaaa"
                    />
                  </td>
                  <td className="p-2 text-center align-middle">
                    <button
                      type="button"
                      onClick={() => removeRow(idx)}
                      title="Eliminar fila"
                      className="text-slate-300 hover:text-red-500 font-bold p-1 text-sm"
                    >
                      &times;
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Firmas y Respaldo Dual */}
      <div className="border-t border-slate-200 pt-5 space-y-4">
        <input type="hidden" name="signatures_json" value={signaturesPayload} />
        <input type="hidden" name="signature_type" value={overallSignatureType} />
        <input type="hidden" name="physical_file_ref" value={physicalFileRef} />
        <input type="hidden" name="physical_evidence_url" value={physicalEvidenceUrl} />

        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
            3. Firmas de Responsabilidad Institucional (Digital / Física)
          </h3>
          <span className="text-[11px] font-semibold text-brand-700 bg-brand-50 border border-brand-200 px-2.5 py-0.5 rounded-full">
            Modalidad: {overallSignatureType}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Elaborado por */}
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2">
            <span className="text-xs font-semibold text-slate-700 block">Elaborado por:</span>
            <input
              type="text"
              name="elaborated_by_role"
              defaultValue={report?.elaborated_by_role || "DECE institucional"}
              className="input text-xs"
              placeholder="Cargo (ej. DECE institucional)"
            />
            <input
              type="text"
              name="elaborated_by_name"
              value={elaboratedName}
              onChange={(e) => setElaboratedName(e.target.value)}
              className="input text-xs font-medium"
              placeholder="Nombres y título profesional"
            />
            <div className="pt-2 flex flex-wrap items-center justify-between gap-1 border-t border-slate-200">
              {elaboratedSig?.tipo === "digital" || elaboratedSig?.firma_data_url ? (
                <div className="flex flex-wrap items-center gap-1">
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-300 px-1.5 py-0.5 rounded">✓ Digital</span>
                  {elaboratedSig.firma_data_url && (
                    <img src={elaboratedSig.firma_data_url} alt="Firma Elaborador" className="h-5 max-w-[55px] object-contain border border-slate-200 rounded px-1 bg-white" />
                  )}
                  <button type="button" onClick={() => setActiveSignerModal("elaborated")} className="text-[10px] text-brand-700 hover:underline">Cambiar</button>
                  <button type="button" onClick={() => setElaboratedSig(null)} className="text-[10px] text-rose-600 hover:underline">✕</button>
                </div>
              ) : elaboratedSig?.tipo === "fisica" ? (
                <div className="flex flex-wrap items-center gap-1">
                  <span className="text-[10px] font-semibold text-amber-800 bg-amber-50 border border-amber-300 px-1.5 py-0.5 rounded">📄 Papel</span>
                  <button type="button" onClick={() => setActiveSignerModal("elaborated")} className="text-[10px] text-brand-700 hover:underline">Cambiar</button>
                  <button type="button" onClick={() => setElaboratedSig(null)} className="text-[10px] text-rose-600 hover:underline">✕</button>
                </div>
              ) : (
                <button type="button" onClick={() => setActiveSignerModal("elaborated")} className="w-full text-center py-1 text-[10px] font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-200 rounded">
                  ✍️ Registrar Firma
                </button>
              )}
            </div>
          </div>

          {/* Revisado por */}
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2">
            <span className="text-xs font-semibold text-slate-700 block">Revisado por:</span>
            <input
              type="text"
              name="reviewed_by_role"
              defaultValue={report?.reviewed_by_role || "Autoridad educativa"}
              className="input text-xs"
              placeholder="Cargo (ej. Autoridad educativa)"
            />
            <input
              type="text"
              name="reviewed_by_name"
              value={reviewedName}
              onChange={(e) => setReviewedName(e.target.value)}
              className="input text-xs font-medium"
              placeholder="Nombres y título de la autoridad"
            />
            <div className="pt-2 flex flex-wrap items-center justify-between gap-1 border-t border-slate-200">
              {reviewedSig?.tipo === "digital" || reviewedSig?.firma_data_url ? (
                <div className="flex flex-wrap items-center gap-1">
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-300 px-1.5 py-0.5 rounded">✓ Digital</span>
                  {reviewedSig.firma_data_url && (
                    <img src={reviewedSig.firma_data_url} alt="Firma Revisor" className="h-5 max-w-[55px] object-contain border border-slate-200 rounded px-1 bg-white" />
                  )}
                  <button type="button" onClick={() => setActiveSignerModal("reviewed")} className="text-[10px] text-brand-700 hover:underline">Cambiar</button>
                  <button type="button" onClick={() => setReviewedSig(null)} className="text-[10px] text-rose-600 hover:underline">✕</button>
                </div>
              ) : reviewedSig?.tipo === "fisica" ? (
                <div className="flex flex-wrap items-center gap-1">
                  <span className="text-[10px] font-semibold text-amber-800 bg-amber-50 border border-amber-300 px-1.5 py-0.5 rounded">📄 Papel</span>
                  <button type="button" onClick={() => setActiveSignerModal("reviewed")} className="text-[10px] text-brand-700 hover:underline">Cambiar</button>
                  <button type="button" onClick={() => setReviewedSig(null)} className="text-[10px] text-rose-600 hover:underline">✕</button>
                </div>
              ) : (
                <button type="button" onClick={() => setActiveSignerModal("reviewed")} className="w-full text-center py-1 text-[10px] font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-200 rounded">
                  ✍️ Registrar Firma
                </button>
              )}
            </div>
          </div>

          {/* Aprobado por */}
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2">
            <span className="text-xs font-semibold text-slate-700 block">Aprobado por:</span>
            <input
              type="text"
              name="approved_by_role"
              defaultValue={report?.approved_by_role || "Profesional de apoyo DECE Distrital"}
              className="input text-xs"
              placeholder="Cargo (ej. Profesional DECE Distrital)"
            />
            <input
              type="text"
              name="approved_by_name"
              value={approvedName}
              onChange={(e) => setApprovedName(e.target.value)}
              className="input text-xs font-medium"
              placeholder="Nombres y título del profesional distrital"
            />
            <div className="pt-2 flex flex-wrap items-center justify-between gap-1 border-t border-slate-200">
              {approvedSig?.tipo === "digital" || approvedSig?.firma_data_url ? (
                <div className="flex flex-wrap items-center gap-1">
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-300 px-1.5 py-0.5 rounded">✓ Digital</span>
                  {approvedSig.firma_data_url && (
                    <img src={approvedSig.firma_data_url} alt="Firma Aprobador" className="h-5 max-w-[55px] object-contain border border-slate-200 rounded px-1 bg-white" />
                  )}
                  <button type="button" onClick={() => setActiveSignerModal("approved")} className="text-[10px] text-brand-700 hover:underline">Cambiar</button>
                  <button type="button" onClick={() => setApprovedSig(null)} className="text-[10px] text-rose-600 hover:underline">✕</button>
                </div>
              ) : approvedSig?.tipo === "fisica" ? (
                <div className="flex flex-wrap items-center gap-1">
                  <span className="text-[10px] font-semibold text-amber-800 bg-amber-50 border border-amber-300 px-1.5 py-0.5 rounded">📄 Papel</span>
                  <button type="button" onClick={() => setActiveSignerModal("approved")} className="text-[10px] text-brand-700 hover:underline">Cambiar</button>
                  <button type="button" onClick={() => setApprovedSig(null)} className="text-[10px] text-rose-600 hover:underline">✕</button>
                </div>
              ) : (
                <button type="button" onClick={() => setActiveSignerModal("approved")} className="w-full text-center py-1 text-[10px] font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-200 rounded">
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
            <span>📁</span> Respaldo Físico DECE e Informe Bimensual en Papel (Auditoría Ministerial)
          </span>
          <span className="text-[11px] text-amber-700 bg-amber-100/70 border border-amber-300 px-2 py-0.5 rounded-full font-medium">
            Custodia Institucional
          </span>
        </div>
        <p className="text-xs text-amber-800/90 leading-relaxed">
          Para garantizar la constancia legal y auditoría física, registra la ubicación física en carpeta/archivador y opcionalmente adjunta copia escaneada o foto (PDF o Imagen) del informe con firmas manuscritas y sellos.
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
              placeholder="Ej. Archivador Informes Bimensuales 2026 / Caso"
              className="w-full text-xs rounded-lg border border-amber-300 bg-white px-3 py-2 text-slate-800 placeholder-slate-400 focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-amber-900 mb-1">
              Adjuntar Informe Bimensual Sellado / Firmado (PDF o Imagen)
            </label>
            {physicalEvidenceUrl ? (
              <div className="flex items-center justify-between p-2 bg-white rounded-lg border border-amber-300">
                <span className="text-xs text-emerald-800 font-medium flex items-center gap-1.5 truncate max-w-[200px]">
                  <span>📎</span> {physicalEvidenceName || "Informe_Bimensual_Sellado"}
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
          signatoryName={
            activeSignerModal === "elaborated"
              ? elaboratedName || "DECE Institucional"
              : activeSignerModal === "reviewed"
              ? reviewedName || "Autoridad Educativa"
              : approvedName || "DECE Distrital"
          }
          signatoryRole={
            activeSignerModal === "elaborated"
              ? report?.elaborated_by_role || "DECE institucional"
              : activeSignerModal === "reviewed"
              ? report?.reviewed_by_role || "Autoridad educativa"
              : report?.approved_by_role || "Profesional de apoyo DECE Distrital"
          }
          initialData={
            activeSignerModal === "elaborated"
              ? elaboratedSig
              : activeSignerModal === "reviewed"
              ? reviewedSig
              : approvedSig
          }
          onSave={(data) => {
            if (activeSignerModal === "elaborated") setElaboratedSig(data);
            else if (activeSignerModal === "reviewed") setReviewedSig(data);
            else if (activeSignerModal === "approved") setApprovedSig(data);
            setActiveSignerModal(null);
          }}
        />
      )}

      <div className="flex items-center justify-between border-t border-slate-200 pt-5">
        <Link href={`/casos/${caseId}`} className="text-xs text-slate-500 hover:underline">
          &larr; Volver al caso sin guardar
        </Link>
        <SubmitButton isEditing={isEditing} />
      </div>
    </form>
  );
}
