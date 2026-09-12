"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { createCircleConsentAction, updateCircleConsentAction } from "@/lib/restorativeCircleConsent";
import type { RestorativeCircleConsentRow, StudentRow } from "@/lib/types";
import DualSignatureModal from "@/components/DualSignatureModal";

interface SignerData {
  tipo?: "digital" | "fisica";
  firma_data_url?: string;
  referencia_fisica?: string;
  fecha_firma?: string;
  respaldo_archivo_url?: string;
  respaldo_nombre?: string;
  observacion_firma?: string;
}

function parseSignaturesJson(json?: string | null): {
  rep?: SignerData;
  dece?: SignerData;
} {
  if (!json) return {};
  try {
    const parsed = JSON.parse(json);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed;
    }
    if (Array.isArray(parsed)) {
      const res: Record<string, SignerData> = {};
      for (const item of parsed) {
        if (item && item.roleKey) res[item.roleKey] = item;
      }
      return res;
    }
  } catch {}
  return {};
}

export function computeStudentDefaults(st?: StudentRow | null) {
  if (!st) {
    return {
      studentName: "",
      courseParallel: "",
      courseParallelFull: "1° Año de Bachillerato en Ciencias, paralelo “B”",
      courseParallelShort: "1° BGU “B”",
      shift: "Matutina",
      representativeName: "",
      representativeCi: "",
      representativePhone: "",
    };
  }

  const rawCourse = (st.course || "").trim();
  const rawParallel = (st.parallel || "").trim();
  const specialty = (st.bachillerato_specialty || "").trim();
  const parQuotes = rawParallel ? `“${rawParallel}”` : "";
  const parFullSuffix = rawParallel ? `, paralelo “${rawParallel}”` : "";

  // 1. Cabecera (course_parallel): ej "8vo EGB “A”" o "1° BGU “B”"
  const courseParallel = rawParallel ? `${rawCourse} ${parQuotes}`.trim() : rawCourse;

  // 2. Sección 4 Corta (course_parallel_short): ej "8vo EGB “A”" o "1° BGU “B”"
  const courseParallelShort = courseParallel;

  // 3. Sección 1 Completa (course_parallel_full):
  let fullCourse = rawCourse;
  const mBgu = rawCourse.match(/^(1|2|3)(?:ro|do|er|ero|°)?\s*(?:bgu|bachillerato)/i);
  if (mBgu) {
    const num = mBgu[1];
    fullCourse = `${num}° Año de Bachillerato${specialty ? ` en ${specialty}` : " en Ciencias"}`;
  } else {
    const mEgb = rawCourse.match(/^(10|9|8|7|6|5|4|3|2|1)(?:mo|no|vo|to|ro|do|er|ero|°)?\s*(?:egb|básica|basica)?/i);
    if (mEgb && (rawCourse.toLowerCase().includes("egb") || rawCourse.toLowerCase().includes("básica") || rawCourse.toLowerCase().includes("basica"))) {
      const num = mEgb[1];
      fullCourse = `${num}° Año de Educación General Básica`;
    }
  }
  const courseParallelFull = `${fullCourse}${parFullSuffix}`.trim();

  // 4. Jornada / Shift
  let shift = "Matutina";
  if (st.jornada) {
    const j = st.jornada.toUpperCase();
    if (j.includes("VESP")) shift = "Vespertina";
    else if (j.includes("NOCT")) shift = "Nocturna";
    else shift = "Matutina";
  }

  // 5. Representante Legal (con cascada completa de fallbacks)
  const representativeName = st.representative || st.mother_name || st.father_name || "";
  const representativeCi = st.representative_document_id || st.mother_document_id || st.father_document_id || "";
  const representativePhone = st.rep_phone || st.mother_phone || st.father_phone || "";

  return {
    studentName: st.full_name || "",
    courseParallel,
    courseParallelFull,
    courseParallelShort,
    shift,
    representativeName,
    representativeCi,
    representativePhone,
  };
}

interface Props {
  initialData?: RestorativeCircleConsentRow | null;
  students: StudentRow[];
  prefilledCaseId?: string | null;
  prefilledStudentId?: string | null;
  prefilledStudent?: StudentRow | null;
  caseCode?: string | null;
  currentUserName: string;
}

export default function CirculoConsentForm({
  initialData,
  students,
  prefilledCaseId,
  prefilledStudentId,
  prefilledStudent,
  caseCode,
  currentUserName,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Determine pre-selected student
  const defaultStudentId = initialData?.student_id || prefilledStudentId || prefilledStudent?.id || "";
  const initialStudent = prefilledStudent || students.find((s) => s.id === defaultStudentId);
  const defaults = computeStudentDefaults(initialStudent);

  const [studentId, setStudentId] = useState(defaultStudentId);
  const [studentSearch, setStudentSearch] = useState("");

  const [studentName, setStudentName] = useState(
    initialData?.student_name || defaults.studentName
  );

  const [courseParallel, setCourseParallel] = useState(
    initialData?.course_parallel || defaults.courseParallel
  );
  const [courseParallelFull, setCourseParallelFull] = useState(
    initialData?.course_parallel_full || defaults.courseParallelFull
  );
  const [courseParallelShort, setCourseParallelShort] = useState(
    initialData?.course_parallel_short || defaults.courseParallelShort
  );

  const [shift, setShift] = useState(initialData?.shift || defaults.shift);
  const [representativePhone, setRepresentativePhone] = useState(
    initialData?.representative_phone || defaults.representativePhone
  );
  const [consentDate, setConsentDate] = useState(
    initialData?.consent_date || new Date().toISOString().split("T")[0]
  );
  const [representativeName, setRepresentativeName] = useState(
    initialData?.representative_name || defaults.representativeName
  );
  const [representativeCi, setRepresentativeCi] = useState(
    initialData?.representative_ci || defaults.representativeCi
  );

  const [deceName, setDeceName] = useState(initialData?.dece_name || currentUserName || "");
  const [deceRole, setDeceRole] = useState(initialData?.dece_role || "Profesional DECE");

  // Firmas y Respaldo Físico Dual
  const initialSignatures = parseSignaturesJson(initialData?.signatures_json);
  const [repSig, setRepSig] = useState<SignerData | null>(initialSignatures.rep || null);
  const [deceSig, setDeceSig] = useState<SignerData | null>(initialSignatures.dece || null);

  const [physicalFileRef, setPhysicalFileRef] = useState(initialData?.physical_file_ref || "");
  const [physicalEvidenceUrl, setPhysicalEvidenceUrl] = useState(initialData?.physical_evidence_url || "");
  const [physicalEvidenceName, setPhysicalEvidenceName] = useState("");

  const [activeSignerModal, setActiveSignerModal] = useState<"rep" | "dece" | null>(null);

  const signaturesPayload = JSON.stringify({
    rep: repSig ? { ...repSig, roleKey: "rep", nombre: representativeName, cargo: "Representante Legal / Estudiante", ci: representativeCi } : null,
    dece: deceSig ? { ...deceSig, roleKey: "dece", nombre: deceName, cargo: deceRole } : null,
  });

  let overallSignatureType = "PENDIENTE";
  const activeSigs = [repSig, deceSig].filter(Boolean);
  if (activeSigs.length > 0) {
    const hasDig = activeSigs.some((s) => s?.tipo === "digital");
    const hasFis = activeSigs.some((s) => s?.tipo === "fisica") || Boolean(physicalFileRef || physicalEvidenceUrl);
    if (hasDig && hasFis) overallSignatureType = "MIXTA";
    else if (hasDig) overallSignatureType = "DIGITAL";
    else if (hasFis) overallSignatureType = "FISICA";
  } else if (physicalFileRef || physicalEvidenceUrl) {
    overallSignatureType = "FISICA";
  }

  function handleGeneralEvidenceUpload(e: React.ChangeEvent<HTMLInputElement>) {
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

  const filteredStudents = students
    .filter((s) => {
      if (!studentSearch.trim()) return true;
      const term = studentSearch.toLowerCase();
      const name = (s.full_name || "").toLowerCase();
      const c = (s.course || "").toLowerCase();
      return name.includes(term) || c.includes(term) || (s.document_id || "").includes(term);
    })
    .slice(0, 40);

  const handleSelectStudent = (st: StudentRow) => {
    const d = computeStudentDefaults(st);
    setStudentId(st.id);
    setStudentName(d.studentName);
    setCourseParallel(d.courseParallel);
    setCourseParallelFull(d.courseParallelFull);
    setCourseParallelShort(d.courseParallelShort);
    setShift(d.shift);
    setRepresentativeName(d.representativeName);
    setRepresentativeCi(d.representativeCi);
    setRepresentativePhone(d.representativePhone);
    setStudentSearch("");
  };

  const handleClearStudent = () => {
    setStudentId("");
    setStudentName("");
    setCourseParallel("");
    setCourseParallelFull("");
    setCourseParallelShort("");
    setRepresentativeName("");
    setRepresentativeCi("");
    setRepresentativePhone("");
  };

  const handleSetBlankForm = () => {
    setStudentId("");
    setStudentName("");
    setCourseParallel("");
    setCourseParallelFull("Año de Bachillerato / EGB, paralelo “ ”");
    setCourseParallelShort("");
    setRepresentativeName("");
    setRepresentativeCi("");
    setRepresentativePhone("");
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      try {
        if (initialData) {
          await updateCircleConsentAction(initialData.id, formData);
        } else {
          await createCircleConsentAction(formData);
        }
      } catch (err: any) {
        if (err?.message?.includes("NEXT_REDIRECT")) return;
        setError(err?.message || "Error al guardar el consentimiento.");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-6">
      <input type="hidden" name="case_file_id" value={initialData?.case_file_id || prefilledCaseId || ""} />
      <input type="hidden" name="student_id" value={studentId} />
      <input type="hidden" name="student_name" value={studentName} />
      <input type="hidden" name="signatures_json" value={signaturesPayload} />
      <input type="hidden" name="signature_type" value={overallSignatureType} />
      <input type="hidden" name="physical_file_ref" value={physicalFileRef} />
      <input type="hidden" name="physical_evidence_url" value={physicalEvidenceUrl} />

      {error && (
        <div className="bg-rose-50 border-l-4 border-rose-500 p-4 rounded-r-md text-sm text-rose-800">
          {error}
        </div>
      )}

      {/* Tarjeta 1: Selección de Estudiante */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-4 mb-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <span>👤</span> Estudiante del Círculo Restaurativo
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {prefilledCaseId
                ? `Datos auto-cargados del caso ${caseCode ? `(${caseCode})` : ""}. Puedes modificarlos si es necesario.`
                : "Puedes seleccionar un estudiante registrado para auto-rellenar los datos, o escribir libremente."}
            </p>
          </div>
          <button
            type="button"
            onClick={handleSetBlankForm}
            className="text-xs text-brand-600 hover:text-brand-800 font-medium underline"
          >
            Formato en blanco (para aula)
          </button>
        </div>

        {studentId ? (
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-brand-50 border border-brand-200 rounded-lg gap-3">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-brand-700 bg-brand-100 px-2 py-0.5 rounded">
                  ✓ Estudiante seleccionado
                </span>
                <div className="font-bold text-brand-950 text-base mt-1">{studentName}</div>
                <div className="text-xs text-brand-800 mt-0.5">
                  {courseParallel} · Jornada {shift} · Repr: {representativeName || "Sin registrar"}
                  {representativePhone ? ` · Tel: ${representativePhone}` : ""}
                </div>
              </div>
              <button
                type="button"
                onClick={handleClearStudent}
                className="text-xs bg-white text-brand-700 border border-brand-300 hover:bg-brand-100 px-3 py-1.5 rounded font-medium shadow-xs shrink-0 self-start sm:self-center"
              >
                Cambiar / Desvincular
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nombre del/la estudiante (como aparecerá en el documento):
              </label>
              <input
                type="text"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="Ej: PÉREZ LÓPEZ JUAN CARLOS"
                className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar por apellido, nombre o cédula de estudiante..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
              />
              {studentSearch.trim() && (
                <div className="absolute z-20 top-full left-0 right-0 mt-1 max-h-56 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-lg">
                  {filteredStudents.length === 0 ? (
                    <div className="p-3 text-sm text-slate-500 text-center">No se encontraron estudiantes</div>
                  ) : (
                    filteredStudents.map((st) => (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => handleSelectStudent(st)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-brand-50 border-b border-slate-100 last:border-none flex justify-between items-center"
                      >
                        <div>
                          <span className="font-semibold text-slate-800">
                            {st.full_name}
                          </span>
                          <span className="text-xs text-slate-500 ml-2">({st.document_id || "S/C"})</span>
                        </div>
                        <span className="text-xs text-brand-700 bg-brand-50 px-2 py-0.5 rounded font-medium">
                          {st.course || ""} {st.parallel || ""}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nombre del/la estudiante (como aparecerá en el documento):
              </label>
              <input
                type="text"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="Ej: PÉREZ LÓPEZ JUAN CARLOS (o dejar vacío para formato en blanco)"
                className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
              />
            </div>
          </div>
        )}
      </div>

      {/* Tarjeta 2: Datos del Curso y Convivencia */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4">
        <h2 className="text-base font-bold text-slate-800 flex items-center gap-2 pb-3 border-b border-slate-100">
          <span>🏫</span> Datos del Curso y Círculo Restaurativo
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Curso y paralelo (cabecera):
            </label>
            <input
              type="text"
              name="course_parallel"
              value={courseParallel}
              onChange={(e) => setCourseParallel(e.target.value)}
              placeholder="Ej: 1° BGU “B”"
              required
              className="w-full p-2 text-sm border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Jornada:</label>
            <select
              name="shift"
              value={shift}
              onChange={(e) => setShift(e.target.value)}
              className="w-full p-2 text-sm border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-brand-500 bg-white"
            >
              <option value="Matutina">Matutina</option>
              <option value="Vespertina">Vespertina</option>
              <option value="Nocturna">Nocturna</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Fecha del consentimiento:</label>
            <input
              type="date"
              name="consent_date"
              value={consentDate}
              onChange={(e) => setConsentDate(e.target.value)}
              required
              className="w-full p-2 text-sm border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Descripción en Sección 1 (Finalidad):
            </label>
            <input
              type="text"
              name="course_parallel_full"
              value={courseParallelFull}
              onChange={(e) => setCourseParallelFull(e.target.value)}
              placeholder="Ej: 1° Año de Bachillerato en Ciencias, paralelo “B”"
              required
              className="w-full p-2 text-sm border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-brand-500"
            />
            <span className="text-[11px] text-slate-500">
              Aparece en: &quot;...desarrollará un Círculo Restaurativo con los estudiantes del <b>[este texto]</b>...&quot;
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Descripción corta en Sección 4 (Estudiante):
            </label>
            <input
              type="text"
              name="course_parallel_short"
              value={courseParallelShort}
              onChange={(e) => setCourseParallelShort(e.target.value)}
              placeholder="Ej: 1° BGU “B”"
              required
              className="w-full p-2 text-sm border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-brand-500"
            />
            <span className="text-[11px] text-slate-500">
              Aparece en: &quot;Yo, [Nombre] estudiante de <b>[este texto]</b>, declaro...&quot;
            </span>
          </div>
        </div>
      </div>

      {/* Tarjeta 3: Datos del Padre, Madre o Representante Legal y Firma */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <span>👨‍👩‍👦</span> Datos del Padre, Madre o Representante Legal
          </h2>
          {/* Badge / Botón de Firma Representante */}
          <div>
            {repSig?.tipo === "digital" || repSig?.firma_data_url ? (
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-300 px-2.5 py-1 rounded-md flex items-center gap-1">
                  <span>✓</span> Firma digital
                </span>
                {repSig.firma_data_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={repSig.firma_data_url} alt="Firma Representante" className="h-6 max-w-[70px] object-contain border border-slate-200 rounded px-1 bg-white" />
                )}
                <button type="button" onClick={() => setActiveSignerModal("rep")} className="text-xs text-brand-700 hover:underline">
                  Cambiar
                </button>
                <button type="button" onClick={() => setRepSig(null)} className="text-xs text-rose-600 hover:underline">
                  Borrar
                </button>
              </div>
            ) : repSig?.tipo === "fisica" ? (
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-300 px-2.5 py-1 rounded-md flex items-center gap-1">
                  <span>📄</span> Firma física (Papel)
                </span>
                <button type="button" onClick={() => setActiveSignerModal("rep")} className="text-xs text-brand-700 hover:underline">
                  Cambiar
                </button>
                <button type="button" onClick={() => setRepSig(null)} className="text-xs text-rose-600 hover:underline">
                  Borrar
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setActiveSignerModal("rep")}
                className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-200 rounded-md transition-colors"
              >
                <span>✍️</span> Registrar Firma (Digital o Física)
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Nombre completo:</label>
            <input
              type="text"
              name="representative_name"
              value={representativeName}
              onChange={(e) => setRepresentativeName(e.target.value)}
              placeholder="Nombre del representante"
              className="w-full p-2 text-sm border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Cédula de Identidad (C.I.):</label>
            <input
              type="text"
              name="representative_ci"
              value={representativeCi}
              onChange={(e) => setRepresentativeCi(e.target.value)}
              placeholder="C.I. del representante"
              className="w-full p-2 text-sm border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Teléfono de contacto:</label>
            <input
              type="text"
              name="representative_phone"
              value={representativePhone}
              onChange={(e) => setRepresentativePhone(e.target.value)}
              placeholder="0999999999"
              className="w-full p-2 text-sm border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>
      </div>

      {/* Tarjeta 4: Profesional DECE Responsable y Firma */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <span>✍️</span> Profesional DECE Firmante
          </h2>
          {/* Badge / Botón de Firma DECE */}
          <div>
            {deceSig?.tipo === "digital" || deceSig?.firma_data_url ? (
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-300 px-2.5 py-1 rounded-md flex items-center gap-1">
                  <span>✓</span> Firma digital
                </span>
                {deceSig.firma_data_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={deceSig.firma_data_url} alt="Firma DECE" className="h-6 max-w-[70px] object-contain border border-slate-200 rounded px-1 bg-white" />
                )}
                <button type="button" onClick={() => setActiveSignerModal("dece")} className="text-xs text-brand-700 hover:underline">
                  Cambiar
                </button>
                <button type="button" onClick={() => setDeceSig(null)} className="text-xs text-rose-600 hover:underline">
                  Borrar
                </button>
              </div>
            ) : deceSig?.tipo === "fisica" ? (
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-300 px-2.5 py-1 rounded-md flex items-center gap-1">
                  <span>📄</span> Firma física (Papel)
                </span>
                <button type="button" onClick={() => setActiveSignerModal("dece")} className="text-xs text-brand-700 hover:underline">
                  Cambiar
                </button>
                <button type="button" onClick={() => setDeceSig(null)} className="text-xs text-rose-600 hover:underline">
                  Borrar
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setActiveSignerModal("dece")}
                className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-200 rounded-md transition-colors"
              >
                <span>✍️</span> Registrar Firma (Digital o Física)
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Nombre del Profesional:</label>
            <input
              type="text"
              name="dece_name"
              value={deceName}
              onChange={(e) => setDeceName(e.target.value)}
              required
              className="w-full p-2 text-sm border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Cargo / Rol:</label>
            <input
              type="text"
              name="dece_role"
              value={deceRole}
              onChange={(e) => setDeceRole(e.target.value)}
              required
              className="w-full p-2 text-sm border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>
      </div>

      {/* Tarjeta 5: Respaldo Físico DECE y Auditoría */}
      <div className="bg-amber-50/70 p-5 rounded-xl border border-amber-200 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
            <span>📁</span> Respaldo Físico DECE y Evidencia de Auditoría Distrital
          </span>
          <span className="text-[11px] text-amber-700 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full font-medium">
            Normativa Ministerial
          </span>
        </div>
        <p className="text-xs text-amber-800/90 leading-relaxed">
          Permite registrar la ubicación en archivador físico institucional del consentimiento firmado en papel, y adjuntar el escaneo o foto para auditoría distrital.
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
              placeholder="Ej. Carpeta DECE 2026 / Círculos Restaurativos / Exp #12"
              className="w-full text-xs rounded-lg border border-amber-300 bg-white px-3 py-2 text-slate-800 placeholder-slate-400 focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-amber-900 mb-1">
              Adjuntar Escaneo o Foto del Consentimiento Firmado (PDF o Imagen)
            </label>
            {physicalEvidenceUrl ? (
              <div className="flex items-center justify-between p-2 bg-white rounded-lg border border-amber-300">
                <span className="text-xs text-emerald-800 font-medium flex items-center gap-1.5 truncate max-w-[200px]">
                  <span>📎</span> {physicalEvidenceName || "Consentimiento_Fisico_Escaneado"}
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
                    className="text-xs text-rose-600 hover:underline"
                  >
                    Quitar
                  </button>
                </div>
              </div>
            ) : (
              <input
                type="file"
                accept="application/pdf,image/png,image/jpeg,image/webp"
                onChange={handleGeneralEvidenceUpload}
                className="w-full text-xs text-slate-600 file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-amber-100 file:text-amber-800 hover:file:bg-amber-200 cursor-pointer"
              />
            )}
          </div>
        </div>
      </div>

      {/* Modal de Firma Dual para Círculo */}
      <DualSignatureModal
        isOpen={activeSignerModal !== null}
        title={
          activeSignerModal === "rep"
            ? "Firma de Consentimiento del Representante Legal"
            : "Firma de Responsabilidad del Profesional DECE"
        }
        signatoryName={
          activeSignerModal === "rep"
            ? representativeName || "Padre / Madre / Representante"
            : deceName || "Profesional DECE"
        }
        signatoryRole={
          activeSignerModal === "rep"
            ? "Representante Legal"
            : deceRole || "Profesional DECE"
        }
        initialData={
          (activeSignerModal === "rep" ? repSig : deceSig) || undefined
        }
        onSave={(data) => {
          if (activeSignerModal === "rep") setRepSig(data);
          else if (activeSignerModal === "dece") setDeceSig(data);
          if (data.referencia_fisica && !physicalFileRef) {
            setPhysicalFileRef(data.referencia_fisica);
          }
          if (data.respaldo_archivo_url && !physicalEvidenceUrl) {
            setPhysicalEvidenceUrl(data.respaldo_archivo_url);
            if (data.respaldo_nombre) setPhysicalEvidenceName(data.respaldo_nombre);
          }
          setActiveSignerModal(null);
        }}
        onClose={() => setActiveSignerModal(null)}
      />

      {/* Barra de Acciones */}
      <div className="flex items-center justify-between pt-4">
        <Link
          href={
            initialData?.case_file_id
              ? `/casos/${initialData.case_file_id}`
              : prefilledCaseId
              ? `/casos/${prefilledCaseId}`
              : "/circulos-restaurativos"
          }
          className="btn-secondary"
        >
          ← Cancelar y volver
        </Link>
        <button
          type="submit"
          disabled={isPending}
          className="btn-primary flex items-center gap-2 px-6"
        >
          {isPending ? (
            <>
              <span className="animate-spin inline-block h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
              Guardando y generando documento...
            </>
          ) : (
            <>
              <span>💾</span> {initialData ? "Guardar cambios" : "Generar Consentimiento"}
            </>
          )}
        </button>
      </div>
    </form>
  );
}
