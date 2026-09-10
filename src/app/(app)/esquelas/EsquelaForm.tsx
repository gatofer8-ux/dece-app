"use client";

import { useState } from "react";
import Link from "next/link";
import type { DeceEsquelaRow } from "@/lib/types";
import { createEsquelaAction, updateEsquelaAction } from "./actions";

interface StudentOption {
  id: string;
  full_name: string;
  course: string | null;
  parallel: string | null;
  document_id?: string | null;
  representative?: string | null;
  rep_phone?: string | null;
  id_number?: string | null;
  representative_name?: string | null;
  representative_phone?: string | null;
}

const COMMON_REASONS = [
  "Entrevista de seguimiento psicopedagógico",
  "Dificultades académicas y bajo rendimiento",
  "Situación comportamental y disciplinaria",
  "Notificación y suscripción de acta de compromiso",
  "Inasistencias injustificadas reiteradas",
  "Acompañamiento en Orientación Vocacional (OVP)",
  "Coordinación interinstitucional de apoyo",
];

export default function EsquelaForm({
  initialData,
  previewCode,
  schoolYearText,
  isEditing = false,
  caseFileId,
  returnToCase = false,
  studentsList = [],
  currentUserName,
}: {
  initialData?: Partial<DeceEsquelaRow>;
  previewCode: string;
  schoolYearText: string;
  isEditing?: boolean;
  caseFileId?: string | null;
  returnToCase?: boolean;
  studentsList?: StudentOption[];
  currentUserName?: string;
}) {
  const [selectedStudentId, setSelectedStudentId] = useState(initialData?.student_id || "");
  const [studentName, setStudentName] = useState(initialData?.student_name || "");
  const [studentIdNumber, setStudentIdNumber] = useState(initialData?.student_id_number || "");
  const [course, setCourse] = useState(initialData?.course || "");
  const [parallel, setParallel] = useState(initialData?.parallel || "");
  const [jornada, setJornada] = useState(initialData?.jornada || "MATUTINA");
  const [representativeName, setRepresentativeName] = useState(initialData?.representative_name || "");
  const [representativeIdNumber, setRepresentativeIdNumber] = useState(initialData?.representative_id_number || "");
  const [representativePhone, setRepresentativePhone] = useState(initialData?.representative_phone || "");
  const [citationReason, setCitationReason] = useState(initialData?.citation_reason || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleStudentSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const sId = e.target.value;
    setSelectedStudentId(sId);
    if (!sId) return;

    const found = studentsList.find((s) => s.id === sId);
    if (found) {
      setStudentName(found.full_name);
      const docId = found.document_id || found.id_number;
      if (docId) setStudentIdNumber(docId);
      if (found.course) setCourse(found.course);
      if (found.parallel) setParallel(found.parallel);
      const rep = found.representative || found.representative_name;
      if (rep) setRepresentativeName(rep);
      const phone = found.rep_phone || found.representative_phone;
      if (phone) setRepresentativePhone(phone);
    }
  };

  // Fecha de la cita: por defecto mañana o la fecha guardada
  const defaultDate =
    initialData?.citation_date ||
    (() => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow.toISOString().slice(0, 10);
    })();

  const defaultTime = initialData?.citation_time || "08:30";

  return (
    <form
      action={async (formData: FormData) => {
        setIsSubmitting(true);
        try {
          if (isEditing && initialData?.id) {
            await updateEsquelaAction(initialData.id, formData);
          } else {
            await createEsquelaAction(formData);
          }
        } finally {
          setIsSubmitting(false);
        }
      }}
      className="space-y-6 max-w-4xl"
    >
      <input type="hidden" name="case_file_id" value={caseFileId || initialData?.case_file_id || ""} />
      <input type="hidden" name="student_id" value={selectedStudentId} />
      <input type="hidden" name="return_to_case" value={returnToCase ? "true" : "false"} />
      <input type="hidden" name="school_year_text" value={schoolYearText} />

      {/* Cabecera / Identificador Oficial */}
      <div className="card p-5 bg-gradient-to-r from-brand-50/50 to-white border-brand-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-brand-700 bg-brand-100 px-2 py-0.5 rounded">
              {isEditing ? "Edición de Citación" : "Nueva Esquela de Citación"}
            </span>
            <h2 className="text-xl font-bold text-slate-800 mt-1">
              {isEditing ? `Citación N° ${initialData?.citation_number}` : "Convocatoria a Representante / Estudiante"}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Año lectivo: <span className="font-semibold text-slate-700">{schoolYearText}</span>
              {caseFileId && <span className="ml-2 text-indigo-700 font-semibold">· Vinculada al expediente</span>}
            </p>
          </div>

          <div className="sm:text-right bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm">
            <div className="text-[10px] font-semibold uppercase text-slate-400">
              {isEditing ? "Código Oficial Asignado" : "Número Precalculado (Inmutable)"}
            </div>
            <div className="font-mono text-sm sm:text-base font-bold text-brand-800">
              {isEditing ? initialData?.citation_number : previewCode}
            </div>
            <div className="text-[10px] text-slate-400">Numeración independiente de citaciones</div>
          </div>
        </div>
      </div>

      {/* Selector de estudiante registrado (si hay lista y no está en modo edición forzada) */}
      {!caseFileId && studentsList.length > 0 && !isEditing && (
        <div className="card p-4 bg-slate-50 border-dashed border-slate-300">
          <label className="label text-xs font-bold text-slate-700">
            🔍 Autocompletar con un estudiante registrado en el plantel (Opcional):
          </label>
          <select
            value={selectedStudentId}
            onChange={handleStudentSelect}
            className="select text-sm w-full bg-white"
          >
            <option value="">-- Ingresar datos manualmente o seleccionar de la lista --</option>
            {studentsList.map((s) => (
              <option key={s.id} value={s.id}>
                {s.full_name} {s.course ? `· ${s.course} ${s.parallel || ""}` : ""} {s.document_id || s.id_number ? `(${s.document_id || s.id_number})` : ""}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-slate-500 mt-1">
            Si el estudiante no está en el sistema o es un caso no registrado, puedes escribir sus datos directamente abajo.
          </p>
        </div>
      )}

      {/* Datos del Estudiante */}
      <div className="card p-5 space-y-4">
        <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">
          1. Datos del Estudiante Convocado
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="label text-xs font-semibold">
              Nombres y Apellidos del Estudiante <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="student_name"
              required
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              placeholder="Ej: Pérez Morales Juan Carlos"
              className="input font-medium"
            />
          </div>

          <div>
            <label className="label text-xs font-semibold">N° Cédula de Identidad</label>
            <input
              type="text"
              name="student_id_number"
              value={studentIdNumber}
              onChange={(e) => setStudentIdNumber(e.target.value)}
              placeholder="Ej: 1801234567"
              className="input font-mono text-sm"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <label className="label text-xs font-semibold">Grado / Curso</label>
              <input
                type="text"
                name="course"
                value={course}
                onChange={(e) => setCourse(e.target.value)}
                placeholder="Ej: 10mo EGB / 1 BGU"
                className="input text-sm"
              />
            </div>
            <div>
              <label className="label text-xs font-semibold">Paralelo</label>
              <input
                type="text"
                name="parallel"
                value={parallel}
                onChange={(e) => setParallel(e.target.value)}
                placeholder="A, B..."
                className="input text-sm uppercase"
              />
            </div>
          </div>

          <div>
            <label className="label text-xs font-semibold">Jornada</label>
            <select
              name="jornada"
              value={jornada}
              onChange={(e) => setJornada(e.target.value)}
              className="select text-sm"
            >
              <option value="MATUTINA">Matutina</option>
              <option value="VESPERTINA">Vespertina</option>
              <option value="NOCTURNA">Nocturna</option>
            </select>
          </div>
        </div>
      </div>

      {/* Datos del Representante Legal */}
      <div className="card p-5 space-y-4">
        <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">
          2. Datos del Representante Legal o Padre de Familia
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <label className="label text-xs font-semibold">
              Nombres del Representante Legal <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="representative_name"
              required
              value={representativeName}
              onChange={(e) => setRepresentativeName(e.target.value)}
              placeholder="Ej: Morales Gómez Rosa Elena"
              className="input"
            />
          </div>

          <div>
            <label className="label text-xs font-semibold">Cédula del Representante</label>
            <input
              type="text"
              name="representative_id_number"
              value={representativeIdNumber}
              onChange={(e) => setRepresentativeIdNumber(e.target.value)}
              placeholder="Ej: 1803456789"
              className="input font-mono text-sm"
            />
          </div>

          <div>
            <label className="label text-xs font-semibold">Teléfono / Celular de Contacto</label>
            <input
              type="text"
              name="representative_phone"
              value={representativePhone}
              onChange={(e) => setRepresentativePhone(e.target.value)}
              placeholder="Ej: 0991234567"
              className="input text-sm"
            />
          </div>
        </div>
      </div>

      {/* Datos de la Cita / Convocatoria */}
      <div className="card p-5 space-y-4">
        <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">
          3. Datos de la Convocatoria
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="label text-xs font-semibold">
              Fecha de la Cita <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              name="citation_date"
              required
              defaultValue={defaultDate}
              className="input font-medium"
            />
          </div>

          <div>
            <label className="label text-xs font-semibold">
              Hora de la Cita <span className="text-red-500">*</span>
            </label>
            <input
              type="time"
              name="citation_time"
              required
              defaultValue={defaultTime}
              className="input font-medium"
            />
          </div>

          <div>
            <label className="label text-xs font-semibold">Carácter / Urgencia</label>
            <select
              name="urgency_level"
              defaultValue={initialData?.urgency_level || "ORDINARIA"}
              className="select text-sm font-medium"
            >
              <option value="ORDINARIA">Ordinaria</option>
              <option value="URGENTE">⚠️ Urgente</option>
            </select>
          </div>

          <div className="sm:col-span-3">
            <label className="label text-xs font-semibold">Lugar de la Cita</label>
            <input
              type="text"
              name="citation_place"
              defaultValue={initialData?.citation_place || "Oficina del Departamento de Consejería Estudiantil (DECE)"}
              className="input text-sm"
            />
          </div>

          <div className="sm:col-span-3 space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <label className="label text-xs font-semibold">
                Motivo / Asunto de la Citación <span className="text-red-500">*</span>
              </label>
              <span className="text-[11px] text-slate-400">Puedes seleccionar un motivo común o escribir uno:</span>
            </div>

            {/* Botones de sugerencias rápidas */}
            <div className="flex flex-wrap gap-1.5 pb-1">
              {COMMON_REASONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setCitationReason(r)}
                  className="text-[11px] px-2.5 py-1 bg-slate-100 hover:bg-brand-50 text-slate-700 hover:text-brand-800 border border-slate-200 rounded-full transition-colors text-left"
                >
                  + {r}
                </button>
              ))}
            </div>

            <textarea
              name="citation_reason"
              required
              rows={3}
              value={citationReason}
              onChange={(e) => setCitationReason(e.target.value)}
              placeholder="Describa el motivo de la convocatoria..."
              className="textarea text-sm"
            />
          </div>
        </div>
      </div>

      {/* Profesional Emisor y Observaciones */}
      <div className="card p-5 space-y-4">
        <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">
          4. Profesional que Convoca
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label text-xs font-semibold">Nombre del Profesional DECE</label>
            <input
              type="text"
              name="professional_name"
              defaultValue={initialData?.professional_name || currentUserName || "Profesional DECE"}
              required
              className="input text-sm"
            />
          </div>

          <div>
            <label className="label text-xs font-semibold">Cargo / Rol</label>
            <input
              type="text"
              name="professional_role"
              defaultValue={initialData?.professional_role || "Profesional DECE"}
              className="input text-sm"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="label text-xs font-semibold">Observaciones o Instrucciones Adicionales (Opcional)</label>
            <input
              type="text"
              name="observations"
              defaultValue={initialData?.observations || ""}
              placeholder="Ej: Traer cédula de identidad original y copia, informes médicos previos si dispone..."
              className="input text-sm"
            />
          </div>
        </div>
      </div>

      {/* Botones de Acción */}
      <div className="flex items-center justify-between gap-3 pt-2">
        <Link
          href={caseFileId ? `/casos/${caseFileId}` : "/esquelas"}
          className="btn-secondary text-sm"
        >
          ← Cancelar
        </Link>

        <button
          type="submit"
          disabled={isSubmitting}
          className="btn-primary text-sm px-6 py-2.5 flex items-center gap-2 font-semibold shadow-sm"
        >
          {isSubmitting ? (
            <span>Guardando...</span>
          ) : (
            <>
              <span>📨</span>
              <span>{isEditing ? "Guardar Cambios" : "Emitir Esquela de Citación"}</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}
