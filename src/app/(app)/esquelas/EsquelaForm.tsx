"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import type { DeceEsquelaRow } from "@/lib/types";
import { createEsquelaAction, updateEsquelaAction } from "./actions";

function normalizeSearchText(text?: string | null): string {
  return (text || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

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
  representative_document_id?: string | null;
  jornada?: string | null;
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
  const [studentSearch, setStudentSearch] = useState("");
  const [courseFilter, setCourseFilter] = useState("");
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

  // Estudiante seleccionado del catálogo institucional
  const selectedStudentObj = useMemo(() => {
    if (!selectedStudentId) return null;
    return studentsList.find((s) => s.id === selectedStudentId) || null;
  }, [studentsList, selectedStudentId]);

  // Cursos únicos presentes en el plantel para filtrado rápido
  const uniqueCourses = useMemo(() => {
    const set = new Set<string>();
    for (const s of studentsList) {
      if (s.course && s.course.trim()) {
        set.add(s.course.trim());
      }
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "es", { numeric: true }));
  }, [studentsList]);

  // Búsqueda en vivo tolerante a tildes, mayúsculas y subcadenas
  const filteredStudents = useMemo(() => {
    const q = normalizeSearchText(studentSearch);
    return studentsList.filter((s) => {
      if (courseFilter && (s.course || "").trim() !== courseFilter) {
        return false;
      }
      if (!q) return true;

      const fullName = normalizeSearchText(s.full_name);
      const doc = normalizeSearchText(s.document_id || s.id_number);
      const rep = normalizeSearchText(s.representative || s.representative_name);
      const c = normalizeSearchText(s.course);
      const p = normalizeSearchText(s.parallel);

      return (
        fullName.includes(q) ||
        doc.includes(q) ||
        rep.includes(q) ||
        c.includes(q) ||
        p.includes(q)
      );
    });
  }, [studentsList, studentSearch, courseFilter]);

  const handlePickStudent = (s: StudentOption) => {
    setSelectedStudentId(s.id);
    setStudentName(s.full_name);
    const docId = s.document_id || s.id_number;
    if (docId) setStudentIdNumber(docId);
    if (s.course) setCourse(s.course);
    if (s.parallel) setParallel(s.parallel);
    if (s.jornada) setJornada(s.jornada);
    const rep = s.representative || s.representative_name;
    if (rep) setRepresentativeName(rep);
    const repDoc = s.representative_document_id;
    if (repDoc) setRepresentativeIdNumber(repDoc);
    const phone = s.rep_phone || s.representative_phone;
    if (phone) setRepresentativePhone(phone);
  };

  const handleClearSelectedStudent = () => {
    setSelectedStudentId("");
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
              {isEditing ? "Edición de Convocatoria" : "Nueva Convocatoria de Asistencia"}
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

      {/* Buscador inteligente de estudiante registrado */}
      {!caseFileId && studentsList.length > 0 && !isEditing && (
        <div className="space-y-3">
          {selectedStudentObj ? (
            <div className="card p-4 bg-gradient-to-r from-emerald-50 via-teal-50/40 to-white border border-emerald-200 shadow-sm rounded-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-sm shrink-0 mt-0.5">
                    ✓
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider bg-emerald-100 px-2 py-0.5 rounded">
                        Estudiante Seleccionado
                      </span>
                      {selectedStudentObj.course && (
                        <span className="text-xs font-bold text-slate-700 bg-white border border-slate-200 px-2 py-0.5 rounded">
                          {selectedStudentObj.course} {selectedStudentObj.parallel || ""}
                        </span>
                      )}
                    </div>
                    <div className="text-base font-bold text-slate-900 mt-1">
                      {selectedStudentObj.full_name}
                    </div>
                    <div className="text-xs text-slate-600 mt-1 flex flex-wrap gap-x-4 gap-y-1">
                      {(selectedStudentObj.document_id || selectedStudentObj.id_number) && (
                        <span>
                          <strong className="text-slate-700">C.I:</strong> {selectedStudentObj.document_id || selectedStudentObj.id_number}
                        </span>
                      )}
                      {(selectedStudentObj.representative || selectedStudentObj.representative_name) && (
                        <span>
                          <strong className="text-slate-700">Representante:</strong> {selectedStudentObj.representative || selectedStudentObj.representative_name}
                        </span>
                      )}
                      {(selectedStudentObj.rep_phone || selectedStudentObj.representative_phone) && (
                        <span>
                          <strong className="text-slate-700">Teléfono:</strong> {selectedStudentObj.rep_phone || selectedStudentObj.representative_phone}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
                  <button
                    type="button"
                    onClick={handleClearSelectedStudent}
                    className="text-xs font-semibold text-slate-700 hover:text-brand-900 bg-white hover:bg-slate-50 border border-slate-300 hover:border-brand-300 px-3 py-1.5 rounded-lg shadow-sm transition-all flex items-center gap-1.5"
                  >
                    <span>🔄</span> Cambiar / Buscar otro
                  </button>
                </div>
              </div>
              <p className="text-[11px] text-emerald-700/90 mt-2.5 border-t border-emerald-100/80 pt-1.5">
                Datos cargados en el formulario. Puedes ajustar o completar cualquier campo abajo antes de emitir la citación.
              </p>
            </div>
          ) : (
            <div className="card p-4 bg-slate-50/90 border border-slate-200 rounded-xl space-y-3 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <div>
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <span className="text-brand-600 font-normal">🔍</span> Autocompletar con estudiante registrado (Opcional)
                  </label>
                  <p className="text-[11px] text-slate-500">
                    Escribe nombre, apellido, cédula o representante, o filtra por curso para autocompletar en 1 clic.
                  </p>
                </div>
                <span className="text-[11px] bg-white border border-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-medium w-fit">
                  {studentsList.length} en el plantel
                </span>
              </div>

              {/* Fila de Controles: Barra de búsqueda + Filtro por Curso */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="sm:col-span-2 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    placeholder="Escribe apellido, nombre o cédula para buscar..."
                    className="input pl-9 pr-8 text-sm w-full bg-white shadow-sm"
                  />
                  {studentSearch && (
                    <button
                      type="button"
                      onClick={() => setStudentSearch("")}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 text-xs font-bold"
                      title="Borrar búsqueda"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <div>
                  <select
                    value={courseFilter}
                    onChange={(e) => setCourseFilter(e.target.value)}
                    className="select text-sm w-full bg-white shadow-sm"
                  >
                    <option value="">Todos los cursos ({uniqueCourses.length})</option>
                    {uniqueCourses.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Resultados interactivos */}
              {filteredStudents.length > 0 ? (
                <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-inner max-h-56 overflow-y-auto divide-y divide-slate-100">
                  {filteredStudents.slice(0, 15).map((s) => {
                    const docId = s.document_id || s.id_number;
                    const rep = s.representative || s.representative_name;
                    const phone = s.rep_phone || s.representative_phone;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => handlePickStudent(s)}
                        className="w-full text-left p-2.5 hover:bg-brand-50/80 active:bg-brand-100/70 transition-colors flex items-center justify-between gap-3 group"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-slate-800 group-hover:text-brand-800 truncate">
                              {s.full_name}
                            </span>
                            {s.course && (
                              <span className="text-[11px] font-medium bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200 group-hover:bg-brand-100/60 group-hover:border-brand-200">
                                {s.course} {s.parallel || ""}
                              </span>
                            )}
                            {docId && (
                              <span className="text-[11px] font-mono text-slate-500">
                                CI: {docId}
                              </span>
                            )}
                          </div>
                          {(rep || phone) && (
                            <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                              {rep ? `Rep: ${rep}` : ""} {phone ? `· Telf: ${phone}` : ""}
                            </div>
                          )}
                        </div>
                        <div className="shrink-0 text-xs font-semibold text-brand-700 group-hover:translate-x-0.5 transition-transform">
                          Seleccionar →
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="p-4 bg-white border border-slate-200 rounded-lg text-center text-xs text-slate-500">
                  No se encontraron estudiantes que coincidan con la búsqueda. Puedes ingresar los datos manualmente abajo.
                </div>
              )}

              <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-slate-500 px-1 gap-1">
                <span>
                  {filteredStudents.length > 15
                    ? `Mostrando los primeros 15 de ${filteredStudents.length} resultados. Escribe más para afinar.`
                    : `${filteredStudents.length} resultado${filteredStudents.length === 1 ? "" : "s"}.`}
                </span>
                <span className="text-slate-400">
                  💡 Si no encuentras al estudiante, escribe sus datos en la sección 1 directamente.
                </span>
              </div>
            </div>
          )}
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
              <span>{isEditing ? "Guardar Cambios" : "Emitir Convocatoria de Asistencia"}</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}
