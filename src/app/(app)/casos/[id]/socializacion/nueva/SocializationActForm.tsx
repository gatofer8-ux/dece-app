"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useToastOnChange } from "@/components/Toast";
import { createSocializationAct, type ActionState } from "../../../actions";
import { NORMATIVE_TEXT, CONFIDENTIALITY_TEXT, DEFAULT_AGREEMENTS, CURRICULAR_ADAPTATION_OPTIONS } from "@/lib/socializationAct";
import VoiceDictationButton from "@/components/VoiceDictationButton";
import AIAssistButton from "@/components/AIAssistButton";
import { getTodayEcuador } from "@/components/ui";
import DualSignatureModal, { type DualSignatureData } from "@/components/DualSignatureModal";

const initialState: ActionState = { error: null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary disabled:opacity-60">
      {pending ? "Guardando..." : "Guardar acta"}
    </button>
  );
}

interface AgreementRow {
  key: number;
  defaultValue: string;
}

export default function SocializationActForm({
  caseId,
  studentName,
  defaultPreparedBy,
}: {
  caseId: string;
  studentName: string;
  defaultPreparedBy: string;
}) {
  const createForThisCase = createSocializationAct.bind(null, caseId);
  const [state, formAction] = useFormState(createForThisCase, initialState);
  useToastOnChange(state.error, "error");

  const [agreementRows, setAgreementRows] = useState<AgreementRow[]>(() => [
    ...DEFAULT_AGREEMENTS.map((text, i) => ({ key: i, defaultValue: text })),
    { key: DEFAULT_AGREEMENTS.length, defaultValue: "" },
  ]);
  const [nextAgreementKey, setNextAgreementKey] = useState(DEFAULT_AGREEMENTS.length + 1);

  const [teacherRowCount, setTeacherRowCount] = useState(18);

  // Firmas y Respaldo Físico Dual
  const [preparedByName, setPreparedByName] = useState(defaultPreparedBy || "");
  const [approvedByName, setApprovedByName] = useState("");
  const [receivedByName, setReceivedByName] = useState("");
  const [receivedByRole, setReceivedByRole] = useState("Tutor del curso");

  const [deceSig, setDeceSig] = useState<DualSignatureData | null>(null);
  const [approvedSig, setApprovedSig] = useState<DualSignatureData | null>(null);
  const [receivedSig, setReceivedSig] = useState<DualSignatureData | null>(null);

  const [physicalFileRef, setPhysicalFileRef] = useState("");
  const [physicalEvidenceUrl, setPhysicalEvidenceUrl] = useState("");
  const [physicalEvidenceName, setPhysicalEvidenceName] = useState("");
  const [activeSignerModal, setActiveSignerModal] = useState<"dece" | "approved" | "received" | null>(null);

  const signaturesPayload = JSON.stringify({
    dece: deceSig ? { ...deceSig, roleKey: "dece", nombre: preparedByName, cargo: "Profesional DECE" } : null,
    approved: approvedSig ? { ...approvedSig, roleKey: "approved", nombre: approvedByName, cargo: "Rectora/Rector" } : null,
    received: receivedSig ? { ...receivedSig, roleKey: "received", nombre: receivedByName, cargo: receivedByRole } : null,
  });

  let overallSignatureType = "PENDIENTE";
  const activeSigs = [deceSig, approvedSig, receivedSig].filter(Boolean);
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

  function addAgreementRow() {
    setAgreementRows((rows) => [...rows, { key: nextAgreementKey, defaultValue: "" }]);
    setNextAgreementKey((n) => n + 1);
  }

  function removeAgreementRow(key: number) {
    setAgreementRows((rows) => rows.filter((r) => r.key !== key));
  }

  function syncAgreementsContext() {
    const vuln = (document.getElementById("socialization-vulnerability-type") as HTMLInputElement)?.value || "";
    const strat = (document.getElementById("sa-psychosocial-strategies") as HTMLTextAreaElement)?.value || "";
    const trigger = document.getElementById("sa-agreements-ai-trigger") as HTMLTextAreaElement | null;
    if (trigger) {
      trigger.value = `TIPO DE VULNERABILIDAD DEL CASO:\n${vuln}\n\nESTRATEGIAS DE AULA REDACTADAS:\n${strat}`;
    }
  }

  function handleAgreementsAiResult(text: string) {
    const lines = text
      .split(/\n+/)
      .map((l) => l.replace(/^(\d+[\.\)\-]|•|\*|-)\s*/, "").trim())
      .filter((l) => l.length > 5);
    if (lines.length > 0) {
      setAgreementRows(lines.map((val, idx) => ({ key: Date.now() + idx, defaultValue: val })));
      setNextAgreementKey(Date.now() + lines.length);
    }
  }

  return (
    <form action={formAction} className="card p-6 space-y-6 max-w-3xl">
      {state.error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{state.error}</div>
      )}

      {/* Datos generales */}
      <div>
        <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">Datos generales</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input value={studentName} disabled className="input bg-slate-50" />
          <div>
            <label className="label text-xs">Fecha del acta</label>
            <input type="date" name="act_date" defaultValue={getTodayEcuador()} className="input" />
          </div>
          <input name="act_place" placeholder="Lugar" className="input" />
        </div>
      </div>

      {/* Tipo de vulnerabilidad */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="label text-xs">Tipo de vulnerabilidad *</label>
          <div className="flex items-center gap-2">
            <VoiceDictationButton targetId="socialization-vulnerability-type" />
            <AIAssistButton targetId="socialization-vulnerability-type" caseId={caseId} fieldLabel="Tipo de vulnerabilidad del Acta de Socialización" />
          </div>
        </div>
        <input
          id="socialization-vulnerability-type"
          name="vulnerability_type"
          required
          placeholder="Tipo de vulnerabilidad (ej. situación económica, salud, familiar...)"
          className="input"
        />
      </div>

      {/* Base Legal */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="label mb-0">Base Legal *</label>
          <div className="flex items-center gap-2">
            <VoiceDictationButton targetId="sa-normative" />
            <AIAssistButton targetId="sa-normative" caseId={caseId} fieldLabel="Base legal aplicable a este caso (Acta de Socialización)" />
          </div>
        </div>
        <p className="text-xs text-slate-500 mb-2">Se cargará el texto oficial por defecto. Puedes editarlo o generar normativa legal ecuatoriana específica al caso con la IA.</p>
        <textarea
          id="sa-normative"
          name="normative_text"
          required
          rows={6}
          defaultValue={NORMATIVE_TEXT}
          className="input resize-y"
        ></textarea>
      </div>

      {/* ESTRATEGIAS PARA EL ACOMPAÑAMIENTO SOCIOEMOCIONAL */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="label text-xs font-semibold text-slate-700 uppercase">ESTRATEGIAS PARA EL ACOMPAÑAMIENTO SOCIOEMOCIONAL</label>
          <div className="flex items-center gap-2">
            <VoiceDictationButton targetId="sa-psychosocial-strategies" />
            <AIAssistButton targetId="sa-psychosocial-strategies" caseId={caseId} fieldLabel="Estrategias de aula para el acompañamiento socioemocional dirigidas al personal docente (Acta de Socialización)" />
          </div>
        </div>
        <p className="text-xs text-slate-500 mb-1">
          Pautas y estrategias de aula dirigidas al personal docente y tutores (contención emocional en clase, manejo de aula, flexibilidad en tiempos y evaluación, confidencialidad, señales de alerta y comunicación asertiva).
        </p>
        <textarea
          id="sa-psychosocial-strategies"
          name="psychosocial_strategies"
          rows={5}
          placeholder="Estrategias de aula para docentes: contención emocional, manejo grupal, flexibilidad pedagógica, confidencialidad y señales de alerta..."
          className="textarea resize-y"
        ></textarea>
      </div>

      {/* Acuerdos */}
      <div>
        <textarea id="sa-agreements-ai-trigger" className="hidden" defaultValue="" readOnly />
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-semibold text-slate-500 uppercase">Acuerdos</h3>
            <div onMouseEnter={syncAgreementsContext} onPointerDown={syncAgreementsContext}>
              <AIAssistButton
                targetId="sa-agreements-ai-trigger"
                caseId={caseId}
                fieldLabel="Acuerdos y compromisos específicos del Acta de Socialización"
                onResult={handleAgreementsAiResult}
              />
            </div>
          </div>
          <button type="button" onClick={addAgreementRow} className="text-xs text-brand-700 hover:underline">
            + Agregar acuerdo
          </button>
        </div>
        <div className="space-y-2">
          {agreementRows.map((row) => (
            <div key={row.key} className="flex items-start gap-2">
              <textarea
                id={`sa-agreement-row-${row.key}`}
                name="agreement"
                defaultValue={row.defaultValue}
                rows={2}
                className="textarea flex-1"
              />
              <div className="flex items-center gap-1 mt-1 shrink-0">
                <VoiceDictationButton targetId={`sa-agreement-row-${row.key}`} />
                <button
                  type="button"
                  onClick={() => removeAgreementRow(row.key)}
                  className="text-xs text-red-600 hover:underline px-1"
                >
                  Quitar
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Ajuste / adaptación curricular */}
      <div>
        <label className="label text-xs font-medium text-slate-700">Ajuste / adaptación curricular recomendada (opcional)</label>
        <select
          name="curricular_adaptation_grade"
          className="select"
          defaultValue="Ninguna"
        >
          {CURRICULAR_ADAPTATION_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
        <p className="text-xs text-slate-400 mt-1">
          Según el Art. 160 del RLOEI, para situaciones de vulnerabilidad se recomienda aplicar ajustes razonables o adaptaciones curriculares. Si seleccionas "Ninguna", se omitirá este apartado en el documento final.
        </p>
      </div>

      {/* Firmas de docentes */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <div>
            <h3 className="text-xs font-semibold text-slate-500 uppercase">Docentes que reciben la socialización</h3>
            <p className="text-xs text-slate-400">
              Filas configuradas: <span className="font-semibold text-slate-700">{teacherRowCount}</span> (por defecto 18, mín. 1, máx. 35). Todos los casilleros agregados (incluso vacíos) se reflejarán en la previsualización, impresión y Word para que los docentes escriban sus datos y firmen a mano.
            </p>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-slate-400 mr-0.5">Filas:</span>
            <button
              type="button"
              onClick={() => setTeacherRowCount(6)}
              className={`px-2 py-0.5 text-xs rounded border transition-colors ${teacherRowCount === 6 ? "bg-brand-50 border-brand-500 text-brand-700 font-semibold" : "border-slate-300 hover:bg-slate-50 text-slate-700"}`}
            >
              6
            </button>
            <button
              type="button"
              onClick={() => setTeacherRowCount(12)}
              className={`px-2 py-0.5 text-xs rounded border transition-colors ${teacherRowCount === 12 ? "bg-brand-50 border-brand-500 text-brand-700 font-semibold" : "border-slate-300 hover:bg-slate-50 text-slate-700"}`}
            >
              12
            </button>
            <button
              type="button"
              onClick={() => setTeacherRowCount(18)}
              className={`px-2 py-0.5 text-xs rounded border transition-colors ${teacherRowCount === 18 ? "bg-brand-50 border-brand-500 text-brand-700 font-semibold" : "border-slate-300 hover:bg-slate-50 text-slate-700"}`}
            >
              18 (estándar)
            </button>
            <button
              type="button"
              onClick={() => setTeacherRowCount(24)}
              className={`px-2 py-0.5 text-xs rounded border transition-colors ${teacherRowCount === 24 ? "bg-brand-50 border-brand-500 text-brand-700 font-semibold" : "border-slate-300 hover:bg-slate-50 text-slate-700"}`}
            >
              24
            </button>
            <button
              type="button"
              onClick={() => setTeacherRowCount((n) => Math.min(35, n + 1))}
              disabled={teacherRowCount >= 35}
              className="px-2 py-0.5 text-xs rounded border border-brand-600 text-brand-700 hover:bg-brand-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium ml-1"
            >
              + Añadir
            </button>
            <button
              type="button"
              onClick={() => setTeacherRowCount((n) => Math.max(1, n - 1))}
              disabled={teacherRowCount <= 1}
              className="px-2 py-0.5 text-xs rounded border border-slate-300 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              - Quitar
            </button>
          </div>
        </div>
        <input type="hidden" name="teacher_row_count" value={teacherRowCount} />
        <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1 border border-slate-200 rounded-md p-2 bg-slate-50/50">
          {Array.from({ length: teacherRowCount }).map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-mono w-6 text-right shrink-0">#{i + 1}</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 flex-1">
                <input name="teacher_subject" placeholder={`Asignatura ${i + 1} (ej: Matemáticas o en blanco)`} className="input bg-white text-xs" />
                <input name="teacher_name" placeholder={`Nombre del docente ${i + 1} (o en blanco para firma a mano)`} className="input bg-white text-xs" />
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-end mt-1.5">
          <button
            type="button"
            onClick={() => setTeacherRowCount((n) => Math.min(35, n + 1))}
            disabled={teacherRowCount >= 35}
            className="text-xs text-brand-700 hover:underline font-medium"
          >
            + Agregar casillero adicional para firma a mano
          </button>
        </div>
      </div>

      {/* Firmas de responsabilidad institucional y Respaldo Dual */}
      <div className="space-y-4 border-t border-slate-200 pt-5">
        <input type="hidden" name="signatures_json" value={signaturesPayload} />
        <input type="hidden" name="signature_type" value={overallSignatureType} />
        <input type="hidden" name="physical_file_ref" value={physicalFileRef} />
        <input type="hidden" name="physical_evidence_url" value={physicalEvidenceUrl} />

        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-slate-500 uppercase">
            Firmas de Responsabilidad Institucional (Digital / Física)
          </h3>
          <span className="text-[11px] font-semibold text-brand-700 bg-brand-50 border border-brand-200 px-2.5 py-0.5 rounded-full">
            Modalidad: {overallSignatureType}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Profesional DECE */}
          <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-2.5 shadow-2xs">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Desarrollo (Profesional DECE) *
              </label>
              <input
                type="text"
                name="prepared_by_name"
                value={preparedByName}
                onChange={(e) => setPreparedByName(e.target.value)}
                placeholder="Nombre del profesional DECE"
                className="w-full text-xs rounded-lg border border-slate-300 px-3 py-1.5 font-medium"
              />
            </div>
            <div className="pt-1 flex flex-wrap items-center justify-between gap-1 border-t border-slate-100">
              {deceSig?.tipo === "digital" || deceSig?.firma_data_url ? (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-300 px-2 py-0.5 rounded">
                    ✓ Digital
                  </span>
                  {deceSig.firma_data_url && (
                    <img
                      src={deceSig.firma_data_url}
                      alt="Firma DECE"
                      className="h-5 max-w-[60px] object-contain border border-slate-200 rounded px-1 bg-white"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => setActiveSignerModal("dece")}
                    className="text-[11px] text-brand-700 hover:underline"
                  >
                    Cambiar
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeceSig(null)}
                    className="text-[11px] text-rose-600 hover:underline"
                  >
                    Borrar
                  </button>
                </div>
              ) : deceSig?.tipo === "fisica" ? (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] font-semibold text-amber-800 bg-amber-50 border border-amber-300 px-2 py-0.5 rounded">
                    📄 Papel
                  </span>
                  {deceSig.referencia_fisica && (
                    <span className="text-[10px] text-slate-600 truncate max-w-[90px]">
                      📁 {deceSig.referencia_fisica}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setActiveSignerModal("dece")}
                    className="text-[11px] text-brand-700 hover:underline"
                  >
                    Cambiar
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeceSig(null)}
                    className="text-[11px] text-rose-600 hover:underline"
                  >
                    Borrar
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setActiveSignerModal("dece")}
                  className="w-full text-center py-1 text-[11px] font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-200 rounded transition-colors"
                >
                  ✍️ Registrar Firma
                </button>
              )}
            </div>
          </div>

          {/* Rector/a */}
          <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-2.5 shadow-2xs">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Aprobación (Rectora/Rector)
              </label>
              <input
                type="text"
                name="approved_by_name"
                value={approvedByName}
                onChange={(e) => setApprovedByName(e.target.value)}
                placeholder="Nombre de la Rectora o Rector"
                className="w-full text-xs rounded-lg border border-slate-300 px-3 py-1.5 font-medium"
              />
            </div>
            <div className="pt-1 flex flex-wrap items-center justify-between gap-1 border-t border-slate-100">
              {approvedSig?.tipo === "digital" || approvedSig?.firma_data_url ? (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-300 px-2 py-0.5 rounded">
                    ✓ Digital
                  </span>
                  {approvedSig.firma_data_url && (
                    <img
                      src={approvedSig.firma_data_url}
                      alt="Firma Rector"
                      className="h-5 max-w-[60px] object-contain border border-slate-200 rounded px-1 bg-white"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => setActiveSignerModal("approved")}
                    className="text-[11px] text-brand-700 hover:underline"
                  >
                    Cambiar
                  </button>
                  <button
                    type="button"
                    onClick={() => setApprovedSig(null)}
                    className="text-[11px] text-rose-600 hover:underline"
                  >
                    Borrar
                  </button>
                </div>
              ) : approvedSig?.tipo === "fisica" ? (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] font-semibold text-amber-800 bg-amber-50 border border-amber-300 px-2 py-0.5 rounded">
                    📄 Papel
                  </span>
                  {approvedSig.referencia_fisica && (
                    <span className="text-[10px] text-slate-600 truncate max-w-[90px]">
                      📁 {approvedSig.referencia_fisica}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setActiveSignerModal("approved")}
                    className="text-[11px] text-brand-700 hover:underline"
                  >
                    Cambiar
                  </button>
                  <button
                    type="button"
                    onClick={() => setApprovedSig(null)}
                    className="text-[11px] text-rose-600 hover:underline"
                  >
                    Borrar
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setActiveSignerModal("approved")}
                  className="w-full text-center py-1 text-[11px] font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-200 rounded transition-colors"
                >
                  ✍️ Registrar Firma
                </button>
              )}
            </div>
          </div>

          {/* Recibido por (Tutor) */}
          <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-2.5 shadow-2xs">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Recibido por (Nombre y Rol)
              </label>
              <input
                type="text"
                name="received_by_name"
                value={receivedByName}
                onChange={(e) => setReceivedByName(e.target.value)}
                placeholder="Nombre de quien recibe"
                className="w-full text-xs rounded-lg border border-slate-300 px-3 py-1.5 font-medium mb-1.5"
              />
              <input
                type="text"
                name="received_by_role"
                value={receivedByRole}
                onChange={(e) => setReceivedByRole(e.target.value)}
                placeholder="Rol (ej. Tutor del curso)"
                className="w-full text-xs rounded-lg border border-slate-300 px-3 py-1 text-slate-600"
              />
            </div>
            <div className="pt-1 flex flex-wrap items-center justify-between gap-1 border-t border-slate-100">
              {receivedSig?.tipo === "digital" || receivedSig?.firma_data_url ? (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-300 px-2 py-0.5 rounded">
                    ✓ Digital
                  </span>
                  {receivedSig.firma_data_url && (
                    <img
                      src={receivedSig.firma_data_url}
                      alt="Firma Tutor"
                      className="h-5 max-w-[60px] object-contain border border-slate-200 rounded px-1 bg-white"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => setActiveSignerModal("received")}
                    className="text-[11px] text-brand-700 hover:underline"
                  >
                    Cambiar
                  </button>
                  <button
                    type="button"
                    onClick={() => setReceivedSig(null)}
                    className="text-[11px] text-rose-600 hover:underline"
                  >
                    Borrar
                  </button>
                </div>
              ) : receivedSig?.tipo === "fisica" ? (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] font-semibold text-amber-800 bg-amber-50 border border-amber-300 px-2 py-0.5 rounded">
                    📄 Papel
                  </span>
                  {receivedSig.referencia_fisica && (
                    <span className="text-[10px] text-slate-600 truncate max-w-[90px]">
                      📁 {receivedSig.referencia_fisica}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setActiveSignerModal("received")}
                    className="text-[11px] text-brand-700 hover:underline"
                  >
                    Cambiar
                  </button>
                  <button
                    type="button"
                    onClick={() => setReceivedSig(null)}
                    className="text-[11px] text-rose-600 hover:underline"
                  >
                    Borrar
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setActiveSignerModal("received")}
                  className="w-full text-center py-1 text-[11px] font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-200 rounded transition-colors"
                >
                  ✍️ Registrar Firma
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Respaldo Físico DECE y Evidencia para Auditoría */}
        <div className="p-4 bg-amber-50/60 rounded-xl border border-amber-200 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
              <span>📁</span> Respaldo Físico DECE y Evidencia de Auditoría Distrital
            </span>
            <span className="text-[11px] text-amber-700 bg-amber-100/70 border border-amber-300 px-2 py-0.5 rounded-full font-medium">
              Auditoría Ministerial
            </span>
          </div>
          <p className="text-xs text-amber-800/90 leading-relaxed">
            Permite respaldar la ubicación en el archivador físico de la institución y adjuntar copia digitalizada del acta original con firmas y sellos.
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
                placeholder="Ej. Archivador Socializaciones 2026 / Tomo 1"
                className="w-full text-xs rounded-lg border border-amber-300 bg-white px-3 py-2 text-slate-800 placeholder-slate-400 focus:ring-1 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-amber-900 mb-1">
                Adjuntar Escaneo o Foto del Acta Física (PDF o Imagen)
              </label>
              {physicalEvidenceUrl ? (
                <div className="flex items-center justify-between p-2 bg-white rounded-lg border border-amber-300">
                  <span className="text-xs text-emerald-800 font-medium flex items-center gap-1.5 truncate max-w-[200px]">
                    <span>📎</span> {physicalEvidenceName || "Acta_Socializacion_Escaneada"}
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
                ? preparedByName || "Profesional DECE"
                : activeSignerModal === "approved"
                ? approvedByName || "Rectora/Rector"
                : receivedByName || "Tutor del curso"
            }
            signatoryRole={
              activeSignerModal === "dece"
                ? "Profesional DECE"
                : activeSignerModal === "approved"
                ? "Rectora/Rector"
                : receivedByRole || "Tutor del curso"
            }
            initialData={
              activeSignerModal === "dece"
                ? deceSig
                : activeSignerModal === "approved"
                ? approvedSig
                : receivedSig
            }
            onSave={(data) => {
              if (activeSignerModal === "dece") setDeceSig(data);
              else if (activeSignerModal === "approved") setApprovedSig(data);
              else if (activeSignerModal === "received") setReceivedSig(data);
              setActiveSignerModal(null);
            }}
          />
        )}
      </div>

      <div className="flex justify-end pt-2">
        <SubmitButton />
      </div>
    </form>
  );
}
