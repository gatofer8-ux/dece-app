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
}: {
  caseId: string;
  studentName: string;
  studentCourseFormatted?: string;
  report: ViolenceReportRow;
  defaultRepresentativeName?: string;
  defaultRepresentativeAddress?: string;
  defaultRepresentativePhone?: string;
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

  return (
    <form action={formAction} className="card p-6 space-y-6 max-w-3xl">
      {state.error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{state.error}</div>
      )}

      {/* 1. Datos generales de identificación del estudiante */}
      <div>
        <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">
          1. Datos generales de identificación del estudiante
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-2">
          <input value={studentName} disabled className="input bg-slate-50 font-medium" />
          <input name="report_number" defaultValue={report.report_number || ""} placeholder="N° de informe (ej. 001)" className="input" />
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

      {/* Firmas y responsables */}
      <div>
        <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">Firmas y responsables</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <label className="label text-xs">Profesional DECE</label>
            <input name="analyst_name" defaultValue={report.analyst_name || ""} className="input text-xs" />
          </div>
          <div>
            <label className="label text-xs">Rol del profesional</label>
            <input name="analyst_role" defaultValue={report.analyst_role || "ANALISTA DECE"} className="input text-xs" />
          </div>
          <div>
            <label className="label text-xs">Rector/a de la institución</label>
            <input name="rectora_name" defaultValue={report.rectora_name || ""} className="input text-xs" />
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-3">
        <Link href={`/casos/${caseId}/hecho-violencia/${report.id}/imprimir`} className="btn-secondary">
          Cancelar
        </Link>
        <SubmitButton />
      </div>
    </form>
  );
}
