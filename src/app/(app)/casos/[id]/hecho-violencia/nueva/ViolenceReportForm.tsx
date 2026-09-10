"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { createViolenceReport, type ActionState } from "../../../actions";
import {
  VIOLENCE_TYPE_OPTIONS,
  VIOLENCE_MODALITY_OPTIONS,
  PERPETRATOR_RELATIONSHIP_CATEGORIES,
  DUTY_TO_REPORT_TEXT,
} from "@/lib/violenceReport";
import VoiceDictationButton from "@/components/VoiceDictationButton";
import AIAssistButton from "@/components/AIAssistButton";

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
  const [relationship, setRelationship] = useState("");

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
          <input name="report_number" placeholder="N° de informe (ej. 001)" className="input" />
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

      {/* Firmas */}
      <div>
        <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">Firmas de responsabilidad del documento</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="label text-xs">Profesional DECE (Nombre)</label>
            <input
              name="analyst_name"
              defaultValue={defaultProfessionalName}
              placeholder="Nombre del profesional DECE"
              className="input text-xs font-medium"
              required
            />
          </div>
          <div>
            <label className="label text-xs">Cargo del profesional</label>
            <select
              name="analyst_role"
              defaultValue={defaultProfessionalRole}
              className="input bg-white text-xs font-semibold text-slate-800"
            >
              <option value="COORDINADOR/A DECE">COORDINADOR/A DECE</option>
              <option value="ANALISTA DECE">ANALISTA DECE</option>
            </select>
          </div>
          <div>
            <label className="label text-xs">Máxima Autoridad (Rector/a)</label>
            <input
              name="rectora_name"
              defaultValue={defaultRectoraName}
              placeholder="Rectora/Rector"
              className="input text-xs font-medium"
              required
            />
          </div>
        </div>
      </div>

      <p className="text-xs text-slate-400 border-t border-slate-100 pt-3 italic">{DUTY_TO_REPORT_TEXT}</p>

      <div className="flex justify-end">
        <SubmitButton />
      </div>
    </form>
  );
}


