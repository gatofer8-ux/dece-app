"use client";

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

      {/* Firmas */}
      <div>
        <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">Firmas de responsabilidad del documento</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="border border-slate-200 rounded-lg p-3">
            <p className="text-xs font-medium mb-2">1. Elaborado por (Desarrollo)</p>
            <input name="preparer_name" defaultValue={(report as any)?.preparer_name || defaultResponsibleName || ""} placeholder="Nombre" className="input mb-2" />
            <input name="preparer_role" defaultValue={(report as any)?.preparer_role || defaultResponsibleRole || "ANALISTA DECE"} placeholder="Cargo" className="input" />
          </div>
          <div className="border border-slate-200 rounded-lg p-3">
            <p className="text-xs font-medium mb-2">2. Revisado por</p>
            <input name="reviewer_name" defaultValue={(report as any)?.reviewer_name || defaultCoordinatorName || ""} placeholder="Nombre" className="input mb-2" />
            <input name="reviewer_role" defaultValue={(report as any)?.reviewer_role || "COORDINADOR/A DECE"} placeholder="Cargo" className="input" />
          </div>
          <div className="border border-slate-200 rounded-lg p-3">
            <p className="text-xs font-medium mb-2">3. Aprobado por</p>
            <input name="approver_name" defaultValue={(report as any)?.approver_name || defaultAuthorityName || ""} placeholder="Nombre" className="input mb-2" />
            <input name="approver_role" defaultValue={(report as any)?.approver_role || defaultAuthorityRole || "RECTOR/A"} placeholder="Cargo" className="input" />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <SubmitButton />
      </div>
    </form>
  );
}


