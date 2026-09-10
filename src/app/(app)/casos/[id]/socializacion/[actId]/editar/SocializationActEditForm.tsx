"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useToastOnChange } from "@/components/Toast";
import Link from "next/link";
import { updateSocializationAct, type ActionState } from "../../../../actions";
import { NORMATIVE_TEXT, CONFIDENTIALITY_TEXT, CURRICULAR_ADAPTATION_OPTIONS, parseJsonArray, type TeacherSignatureEntry } from "@/lib/socializationAct";
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

  interface TeacherRowState {
    key: number;
    asignatura: string;
    docente: string;
  }

  const existingTeacherSignatures = parseJsonArray<TeacherSignatureEntry>(act.teacher_signatures);
  const [teacherSignatures, setTeacherSignatures] = useState<TeacherRowState[]>(() => {
    const base = existingTeacherSignatures.length > 0 ? existingTeacherSignatures : [];
    const count = Math.max(18, base.length);
    const initial: TeacherRowState[] = [];
    for (let i = 0; i < count; i++) {
      initial.push({
        key: i,
        asignatura: base[i]?.asignatura || "",
        docente: base[i]?.docente || "",
      });
    }
    return initial;
  });
  const [nextTeacherKey, setNextTeacherKey] = useState(() => Math.max(18, existingTeacherSignatures.length) + 1);

  function addAgreementRow() {
    setAgreementRows((rows) => [...rows, { key: nextAgreementKey, defaultValue: "" }]);
    setNextAgreementKey((n) => n + 1);
  }

  function removeAgreementRow(key: number) {
    setAgreementRows((rows) => rows.filter((r) => r.key !== key));
  }

  function syncAgreementsContext() {
    const vuln = (document.getElementById("edit-socialization-vulnerability-type") as HTMLInputElement)?.value || "";
    const strat = (document.getElementById("edit-sa-psychosocial-strategies") as HTMLTextAreaElement)?.value || "";
    const trigger = document.getElementById("edit-sa-agreements-ai-trigger") as HTMLTextAreaElement | null;
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

  function setTeacherRowCount(targetCount: number) {
    const clamped = Math.max(6, Math.min(20, targetCount));
    setTeacherSignatures((prev) => {
      const next = prev.map((item) => {
        const subInput = document.getElementById(`edit-teacher-subj-${item.key}`) as HTMLInputElement | null;
        const nameInput = document.getElementById(`edit-teacher-name-${item.key}`) as HTMLInputElement | null;
        return {
          key: item.key,
          asignatura: subInput ? subInput.value : item.asignatura,
          docente: nameInput ? nameInput.value : item.docente,
        };
      });

      if (next.length < clamped) {
        let curKey = nextTeacherKey;
        while (next.length < clamped) {
          next.push({ key: curKey++, asignatura: "", docente: "" });
        }
        setNextTeacherKey(curKey);
      } else if (next.length > clamped) {
        next.splice(clamped);
      }
      return next;
    });
  }

  function addTeacherRow() {
    setTeacherRowCount(teacherSignatures.length + 1);
  }

  function removeTeacherRow(key: number) {
    if (teacherSignatures.length <= 6) return;
    setTeacherSignatures((prev) => {
      const filtered = prev.filter((item) => item.key !== key);
      return filtered.map((item) => {
        const subInput = document.getElementById(`edit-teacher-subj-${item.key}`) as HTMLInputElement | null;
        const nameInput = document.getElementById(`edit-teacher-name-${item.key}`) as HTMLInputElement | null;
        return {
          key: item.key,
          asignatura: subInput ? subInput.value : item.asignatura,
          docente: nameInput ? nameInput.value : item.docente,
        };
      });
    });
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

      {/* ESTRATEGIAS PARA EL ACOMPAÑAMIENTO SOCIOEMOCIONAL */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="label text-xs font-semibold text-slate-700 uppercase">ESTRATEGIAS PARA EL ACOMPAÑAMIENTO SOCIOEMOCIONAL</label>
          <div className="flex items-center gap-2">
            <VoiceDictationButton targetId="edit-sa-psychosocial-strategies" />
            <AIAssistButton targetId="edit-sa-psychosocial-strategies" caseId={caseId} fieldLabel="Estrategias de aula para el acompañamiento socioemocional dirigidas al personal docente (Acta de Socialización)" />
          </div>
        </div>
        <p className="text-xs text-slate-500 mb-1">
          Pautas y estrategias de aula dirigidas al personal docente y tutores (contención emocional en clase, manejo de aula, flexibilidad en tiempos y evaluación, confidencialidad, señales de alerta y comunicación asertiva).
        </p>
        <textarea
          id="edit-sa-psychosocial-strategies"
          name="psychosocial_strategies"
          rows={5}
          defaultValue={act.psychosocial_strategies || ""}
          placeholder="Estrategias de aula para docentes: contención emocional, manejo grupal, flexibilidad pedagógica, confidencialidad y señales de alerta..."
          className="textarea resize-y"
        ></textarea>
      </div>

      {/* Acuerdos */}
      <div>
        <textarea id="edit-sa-agreements-ai-trigger" className="hidden" defaultValue="" readOnly />
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-semibold text-slate-500 uppercase">Acuerdos</h3>
            <div onMouseEnter={syncAgreementsContext} onPointerDown={syncAgreementsContext}>
              <AIAssistButton
                targetId="edit-sa-agreements-ai-trigger"
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
                id={`edit-sa-agreement-row-${row.key}`}
                name="agreement"
                defaultValue={row.defaultValue}
                rows={2}
                className="textarea flex-1"
              />
              <div className="flex items-center gap-1 mt-1 shrink-0">
                <VoiceDictationButton targetId={`edit-sa-agreement-row-${row.key}`} />
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
          defaultValue={
            act.curricular_adaptation_grade &&
            CURRICULAR_ADAPTATION_OPTIONS.includes(act.curricular_adaptation_grade as any)
              ? act.curricular_adaptation_grade
              : act.curricular_adaptation_grade && /1|2|ajuste/i.test(act.curricular_adaptation_grade)
              ? "Ajustes razonables"
              : act.curricular_adaptation_grade && /3|adaptaci/i.test(act.curricular_adaptation_grade)
              ? "Adaptaciones curriculares"
              : "Ninguna"
          }
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
              Filas visibles: <span className="font-semibold text-slate-700">{teacherSignatures.length}</span> (por defecto 18, mín. 6, máx. 20). Las filas vacías se imprimirán con renglones en blanco para firma a mano.
            </p>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-slate-400 mr-0.5">Filas:</span>
            <button
              type="button"
              onClick={() => setTeacherRowCount(6)}
              className={`px-2 py-0.5 text-xs rounded border transition-colors ${teacherSignatures.length === 6 ? "bg-brand-50 border-brand-500 text-brand-700 font-semibold" : "border-slate-300 hover:bg-slate-50 text-slate-700"}`}
            >
              6
            </button>
            <button
              type="button"
              onClick={() => setTeacherRowCount(12)}
              className={`px-2 py-0.5 text-xs rounded border transition-colors ${teacherSignatures.length === 12 ? "bg-brand-50 border-brand-500 text-brand-700 font-semibold" : "border-slate-300 hover:bg-slate-50 text-slate-700"}`}
            >
              12
            </button>
            <button
              type="button"
              onClick={() => setTeacherRowCount(18)}
              className={`px-2 py-0.5 text-xs rounded border transition-colors ${teacherSignatures.length === 18 ? "bg-brand-50 border-brand-500 text-brand-700 font-semibold" : "border-slate-300 hover:bg-slate-50 text-slate-700"}`}
            >
              18 (estándar)
            </button>
            <button
              type="button"
              onClick={addTeacherRow}
              disabled={teacherSignatures.length >= 20}
              className="px-2 py-0.5 text-xs rounded border border-brand-600 text-brand-700 hover:bg-brand-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium ml-1"
            >
              + Añadir
            </button>
            <button
              type="button"
              onClick={() => setTeacherRowCount(teacherSignatures.length - 1)}
              disabled={teacherSignatures.length <= 6}
              className="px-2 py-0.5 text-xs rounded border border-slate-300 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              - Quitar
            </button>
          </div>
        </div>
        <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1 border border-slate-200 rounded-md p-2 bg-slate-50/50">
          {teacherSignatures.map((item, i) => (
            <div key={item.key} className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-mono w-6 text-right shrink-0">#{i + 1}</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 flex-1">
                <input
                  id={`edit-teacher-subj-${item.key}`}
                  name="teacher_subject"
                  defaultValue={item.asignatura}
                  placeholder={`Asignatura ${i + 1} (ej: Matemáticas)`}
                  className="input bg-white text-xs"
                />
                <div className="flex gap-1.5">
                  <input
                    id={`edit-teacher-name-${item.key}`}
                    name="teacher_name"
                    defaultValue={item.docente}
                    placeholder={`Nombre del docente ${i + 1}`}
                    className="input bg-white text-xs flex-1"
                  />
                  {teacherSignatures.length > 6 && (
                    <button
                      type="button"
                      onClick={() => removeTeacherRow(item.key)}
                      className="text-red-500 hover:text-red-700 text-xs px-2"
                      title="Eliminar fila"
                    >
                      ✕
                    </button>
                  )}
                </div>
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
