"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useToastOnChange } from "@/components/Toast";
import Link from "next/link";
import { updateSocializationAct, type ActionState } from "../../../../actions";
import { NORMATIVE_TEXT, CONFIDENTIALITY_TEXT, CURRICULAR_ADAPTATION_TEXT, parseJsonArray, type TeacherSignatureEntry } from "@/lib/socializationAct";
import type { SocializationActRow } from "@/lib/types";
import VoiceDictationButton from "@/components/VoiceDictationButton";
import AIAssistButton from "@/components/AIAssistButton";

const initialState: ActionState = { error: null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary disabled:opacity-60">
      {pending ? "Guardando cambios..." : "Guardar cambios"}
    </button>
  );
}

interface AgreementRow {
  key: number;
  defaultValue: string;
}

export default function SocializationActEditForm({
  caseId,
  studentName,
  act,
  defaultPreparedBy,
  defaultApprovedBy,
}: {
  caseId: string;
  studentName: string;
  act: SocializationActRow;
  defaultPreparedBy?: string;
  defaultApprovedBy?: string;
}) {
  const updateForThisAct = updateSocializationAct.bind(null, caseId, act.id);
  const [state, formAction] = useFormState(updateForThisAct, initialState);
  useToastOnChange(state.error, "error");

  const existingAgreements = parseJsonArray<string>(act.agreements);
  const [agreementRows, setAgreementRows] = useState<AgreementRow[]>(() =>
    existingAgreements.length > 0
      ? existingAgreements.map((text, i) => ({ key: i, defaultValue: text }))
      : [{ key: 0, defaultValue: "" }]
  );
  const [nextAgreementKey, setNextAgreementKey] = useState(existingAgreements.length + 1);

  const existingTeacherSignatures = parseJsonArray<TeacherSignatureEntry>(act.teacher_signatures);
  const [teacherSignatures, setTeacherSignatures] = useState<TeacherSignatureEntry[]>(() =>
    existingTeacherSignatures.length > 0
      ? existingTeacherSignatures
      : Array.from({ length: 4 }).map(() => ({ asignatura: "", docente: "" }))
  );

  function addAgreementRow() {
    setAgreementRows((rows) => [...rows, { key: nextAgreementKey, defaultValue: "" }]);
    setNextAgreementKey((n) => n + 1);
  }

  function removeAgreementRow(key: number) {
    setAgreementRows((rows) => rows.filter((r) => r.key !== key));
  }

  function addTeacherRow() {
    setTeacherSignatures((rows) => [...rows, { asignatura: "", docente: "" }]);
  }

  function removeTeacherRow(idx: number) {
    setTeacherSignatures((rows) => rows.filter((_, i) => i !== idx));
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
            <input type="date" name="act_date" defaultValue={act.act_date} className="input" />
          </div>
          <input name="act_place" defaultValue={act.act_place || ""} placeholder="Lugar" className="input" />
        </div>
      </div>

      {/* Tipo de vulnerabilidad */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="label text-xs">Tipo de vulnerabilidad *</label>
          <div className="flex items-center gap-2">
            <VoiceDictationButton targetId="edit-socialization-vulnerability-type" />
            <AIAssistButton targetId="edit-socialization-vulnerability-type" caseId={caseId} fieldLabel="Tipo de vulnerabilidad del Acta de Socialización" />
          </div>
        </div>
        <input
          id="edit-socialization-vulnerability-type"
          name="vulnerability_type"
          required
          defaultValue={act.vulnerability_type}
          placeholder="Tipo de vulnerabilidad (ej. situación económica, salud, familiar...)"
          className="input"
        />
      </div>

      {/* Base Legal */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="label mb-0">Base Legal *</label>
          <div className="flex items-center gap-2">
            <VoiceDictationButton targetId="edit-sa-normative" />
            <AIAssistButton targetId="edit-sa-normative" caseId={caseId} fieldLabel="Base legal aplicable a este caso (Acta de Socialización)" />
          </div>
        </div>
        <textarea
          id="edit-sa-normative"
          name="normative_text"
          required
          rows={6}
          defaultValue={act.normative_text || NORMATIVE_TEXT}
          className="input resize-y"
        ></textarea>
      </div>

      {/* NUEVO APARTADO: Estrategias para el acompañamiento psicosocial */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="label text-xs font-semibold text-slate-700 uppercase">Estrategias para el acompañamiento psicosocial</label>
          <div className="flex items-center gap-2">
            <VoiceDictationButton targetId="edit-sa-psychosocial-strategies" />
            <AIAssistButton targetId="edit-sa-psychosocial-strategies" caseId={caseId} fieldLabel="Estrategias pedagógicas y socioemocionales para el acompañamiento psicosocial" />
          </div>
        </div>
        <p className="text-xs text-slate-500 mb-1">
          Estrategias sugeridas al equipo docente y tutores para la atención integral y acompañamiento del/la estudiante.
        </p>
        <textarea
          id="edit-sa-psychosocial-strategies"
          name="psychosocial_strategies"
          rows={4}
          defaultValue={act.psychosocial_strategies || ""}
          placeholder="Describir las estrategias pedagógicas, socioemocionales, adaptaciones de tiempo o ambiente, y acciones de acompañamiento..."
          className="textarea resize-y"
        ></textarea>
      </div>

      {/* Acuerdos */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold text-slate-500 uppercase">Acuerdos</h3>
          <button type="button" onClick={addAgreementRow} className="text-xs text-brand-700 hover:underline">
            + Agregar acuerdo
          </button>
        </div>
        <div className="space-y-2">
          {agreementRows.map((row) => (
            <div key={row.key} className="flex items-start gap-2">
              <textarea name="agreement" defaultValue={row.defaultValue} rows={2} className="textarea flex-1" />
              <button
                type="button"
                onClick={() => removeAgreementRow(row.key)}
                className="text-xs text-red-600 hover:underline mt-1 shrink-0"
              >
                Quitar
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Adaptación curricular */}
      <div>
        <label className="label text-xs">Grado de adaptación curricular recomendada (opcional)</label>
        <input
          name="curricular_adaptation_grade"
          defaultValue={act.curricular_adaptation_grade || ""}
          placeholder="Ej: 1, 2, 3 o Grado 2 no significativa..."
          className="input"
        />
        <p className="text-xs text-slate-400 mt-1">{CURRICULAR_ADAPTATION_TEXT} [grado ingresado].</p>
      </div>

      {/* Firmas de docentes */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold text-slate-500 uppercase">Docentes que reciben la socialización</h3>
          <button type="button" onClick={addTeacherRow} className="text-xs text-brand-700 hover:underline">
            + Agregar docente
          </button>
        </div>
        <div className="space-y-2">
          {teacherSignatures.map((item, i) => (
            <div key={i} className="grid grid-cols-1 sm:grid-cols-2 gap-2 relative">
              <input name="teacher_subject" defaultValue={item.asignatura} placeholder="Asignatura (ej: Matemáticas)" className="input" />
              <div className="flex gap-2">
                <input name="teacher_name" defaultValue={item.docente} placeholder="Nombre del docente" className="input flex-1" />
                {teacherSignatures.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeTeacherRow(i)}
                    className="text-red-500 hover:text-red-700 text-xs px-2"
                    title="Eliminar fila"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Firmas de responsabilidad institucional */}
      <div>
        <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">Firmas de responsabilidad institucional</h3>
        <div className="space-y-3 text-xs">
          <div>
            <label className="label text-xs">Desarrollo del documento (profesional DECE)</label>
            <input name="prepared_by_name" defaultValue={act.prepared_by_name || defaultPreparedBy || ""} className="input" />
          </div>
          <div>
            <label className="label text-xs">Aprobación del documento (Rectora/Rector)</label>
            <input name="approved_by_name" defaultValue={act.approved_by_name || defaultApprovedBy || ""} placeholder="Nombre de la Rectora o Rector" className="input" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="label text-xs">Recibido por (nombre)</label>
              <input name="received_by_name" defaultValue={act.received_by_name || ""} placeholder="Nombre de quien recibe" className="input" />
            </div>
            <div>
              <label className="label text-xs">Rol de quien recibe</label>
              <input name="received_by_role" defaultValue={act.received_by_role || "Tutor del curso"} className="input" />
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Link href={`/casos/${caseId}/socializacion/${act.id}/imprimir`} className="btn-secondary">
          Cancelar
        </Link>
        <SubmitButton />
      </div>
    </form>
  );
}
