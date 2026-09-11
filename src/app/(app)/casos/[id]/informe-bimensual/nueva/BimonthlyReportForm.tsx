"use client";

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

      {/* Firmas de Responsabilidad */}
      <div className="border-t border-slate-200 pt-5 space-y-4">
        <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
          3. Firmas de Responsabilidad Institucional
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              defaultValue={report?.elaborated_by_name || defaultResponsibleName}
              className="input text-xs font-medium"
              placeholder="Nombres y título profesional"
            />
          </div>

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
              defaultValue={report?.reviewed_by_name || defaultAuthorityName || "Autoridad educativa"}
              className="input text-xs font-medium"
              placeholder="Nombres y título de la autoridad"
            />
          </div>

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
              defaultValue={report?.approved_by_name || "Psc. Ed. Mg. Fernando Pérez"}
              className="input text-xs font-medium"
              placeholder="Nombres y título del profesional distrital"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-slate-200 pt-5">
        <Link href={`/casos/${caseId}`} className="text-xs text-slate-500 hover:underline">
          &larr; Volver al caso sin guardar
        </Link>
        <SubmitButton isEditing={isEditing} />
      </div>
    </form>
  );
}
