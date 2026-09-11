"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useToastOnChange } from "@/components/Toast";
import { createSocializationAct, type ActionState } from "../../../actions";
import { NORMATIVE_TEXT, CONFIDENTIALITY_TEXT, DEFAULT_AGREEMENTS, CURRICULAR_ADAPTATION_OPTIONS } from "@/lib/socializationAct";
import VoiceDictationButton from "@/components/VoiceDictationButton";
import AIAssistButton from "@/components/AIAssistButton";
import { getTodayEcuador } from "@/components/ui";

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

      {/* Firmas de responsabilidad institucional */}
      <div>
        <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">Firmas de responsabilidad institucional</h3>
        <div className="space-y-3 text-xs">
          <div>
            <label className="label text-xs">Desarrollo del documento (profesional DECE)</label>
            <input name="prepared_by_name" defaultValue={defaultPreparedBy} className="input" />
          </div>
          <div>
            <label className="label text-xs">Aprobación del documento (Rectora/Rector)</label>
            <input name="approved_by_name" placeholder="Nombre de la Rectora o Rector" className="input" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="label text-xs">Recibido por (nombre)</label>
              <input name="received_by_name" placeholder="Nombre de quien recibe" className="input" />
            </div>
            <div>
              <label className="label text-xs">Rol de quien recibe</label>
              <input name="received_by_role" defaultValue="Tutor del curso" className="input" />
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <SubmitButton />
      </div>
    </form>
  );
}
