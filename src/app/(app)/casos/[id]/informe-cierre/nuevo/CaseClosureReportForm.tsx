"use client";

import { useState } from "react";
import { studentGradeLabel } from "@/lib/studentCourse";
import { currentSchoolYearSpaced } from "@/lib/schoolYearText";
import { useFormState, useFormStatus } from "react-dom";
import { useToastOnChange } from "@/components/Toast";
import Link from "next/link";
import {
  createCaseClosureReport,
  updateCaseClosureReport,
  type ActionState,
} from "../../../actions";
import { generateClosureReportAiDraft } from "../../ai-actions";
import type {
  CaseClosureReportRow,
  ClosureType,
  StudentRow,
  CaseFileRow,
  InstitutionRow,
} from "@/lib/types";
import { CLOSURE_TYPE_LABELS } from "@/lib/types";
import {
  DEFAULT_LEGAL_FRAMEWORK,
  DEFAULT_METHODOLOGY,
  buildDefaultTopic,
  buildDefaultClosureReasons,
  buildDefaultScope,
  buildDefaultObjective,
  type BimonthlyConsolidatedItem,
} from "@/lib/caseClosureReport";
import VoiceDictationButton from "@/components/VoiceDictationButton";
import AIAssistButton from "@/components/AIAssistButton";
import DualSignatureModal, { type DualSignatureData } from "@/components/DualSignatureModal";

const initialState: ActionState = { error: null };

function SubmitButton({ isEditing }: { isEditing: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="btn-primary disabled:opacity-60 text-xs px-5 py-2.5 flex items-center gap-2 shadow-sm font-semibold"
    >
      {pending ? (
        <>
          <span className="animate-spin inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full" />
          <span>Guardando informe...</span>
        </>
      ) : isEditing ? (
        "Actualizar Informe de Cierre"
      ) : (
        "Guardar Informe de Cierre"
      )}
    </button>
  );
}

export default function CaseClosureReportForm({
  caseId,
  student,
  caseFile,
  institution,
  schoolYearText,
  defaultReportNumber,
  defaultPsychosocialSummary,
  bimonthlyItems,
  report,
  deceProfessional,
  authority,
  deceCoordinator,
}: {
  caseId: string;
  student: StudentRow;
  caseFile: CaseFileRow;
  institution: InstitutionRow;
  schoolYearText?: string;
  defaultReportNumber: string;
  defaultPsychosocialSummary: string;
  bimonthlyItems: BimonthlyConsolidatedItem[];
  report?: CaseClosureReportRow;
  deceProfessional?: { fullName: string; name: string; role: string; email: string; phoneExt: string };
  authority?: { fullName: string; name: string; role: string };
  deceCoordinator?: { fullName: string; name: string; role: string };
}) {
  const isEditing = Boolean(report);
  const actionFn = report
    ? updateCaseClosureReport.bind(null, report.id, caseId)
    : createCaseClosureReport.bind(null, caseId);
  const [state, formAction] = useFormState(actionFn, initialState);
  useToastOnChange(state.error, "error");

  const activeSchoolYear = schoolYearText || report?.school_year_text || currentSchoolYearSpaced();
  const calculatedAge = student.birth_date
    ? Math.floor((Date.now() - new Date(student.birth_date).getTime()) / (365.25 * 24 * 3600 * 1000))
    : "";

  // Estados interactivos
  const [closureType, setClosureType] = useState<ClosureType>(
    report?.closure_type || "FINALIZACION_ANO_LECTIVO"
  );
  const [topic, setTopic] = useState(
    report?.topic ||
      buildDefaultTopic(
        "FINALIZACION_ANO_LECTIVO",
        student.full_name,
        student.course,
        student.parallel || "",
        "MATUTINA"
      )
  );
  const [closureReasons, setClosureReasons] = useState(
    report?.closure_reasons ||
      buildDefaultClosureReasons(
        "FINALIZACION_ANO_LECTIVO",
        student.full_name,
        activeSchoolYear
      )
  );
  // Estados de firmas duales y respaldo físico
  const initialSignatures: DualSignatureData[] = (() => {
    try {
      return report?.signatures_json ? JSON.parse(report.signatures_json) : [];
    } catch {
      return [];
    }
  })();

  const [elaboratedName, setElaboratedName] = useState(
    report?.elaborated_by_name || deceProfessional?.fullName || "Psic. Profesional DECE"
  );
  const [reviewedName, setReviewedName] = useState(
    report?.reviewed_by_name || deceCoordinator?.fullName || "Coordinadora DECE Institucional"
  );
  const [approvedName, setApprovedName] = useState(
    report?.approved_by_name || authority?.fullName || "Msc. Máxima Autoridad Institucional"
  );

  const [elaboratedSig, setElaboratedSig] = useState<DualSignatureData | null>(
    initialSignatures.find((s) => s.signer_id === "elaborated" || s.role?.toLowerCase().includes("analista") || s.role?.toLowerCase().includes("dece")) || null
  );
  const [reviewedSig, setReviewedSig] = useState<DualSignatureData | null>(
    initialSignatures.find((s) => s.signer_id === "reviewed" || s.role?.toLowerCase().includes("coord")) || null
  );
  const [approvedSig, setApprovedSig] = useState<DualSignatureData | null>(
    initialSignatures.find((s) => s.signer_id === "approved" || s.role?.toLowerCase().includes("rector")) || null
  );

  const [activeSignerModal, setActiveSignerModal] = useState<"elaborated" | "reviewed" | "approved" | null>(null);
  const [physicalFileRef, setPhysicalFileRef] = useState(report?.physical_file_ref || "");
  const [physicalEvidenceUrl, setPhysicalEvidenceUrl] = useState(report?.physical_evidence_url || "");
  const [physicalEvidenceName, setPhysicalEvidenceName] = useState("");

  const handleEvidenceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhysicalEvidenceName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setPhysicalEvidenceUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const currentSignatures: DualSignatureData[] = [
    ...(elaboratedSig ? [{ ...elaboratedSig, signer_id: "elaborated" }] : []),
    ...(reviewedSig ? [{ ...reviewedSig, signer_id: "reviewed" }] : []),
    ...(approvedSig ? [{ ...approvedSig, signer_id: "approved" }] : []),
  ];

  const overallSignatureType =
    currentSignatures.length === 0
      ? "PENDIENTE"
      : currentSignatures.every((s) => s.tipo === "digital")
      ? "DIGITAL"
      : currentSignatures.every((s) => s.tipo === "fisica")
      ? "FISICA"
      : "MIXTA";

  const [scope, setScope] = useState(
    report?.scope || buildDefaultScope("FINALIZACION_ANO_LECTIVO")
  );
  const [objective, setObjective] = useState(
    report?.objective ||
      buildDefaultObjective("FINALIZACION_ANO_LECTIVO", student.full_name)
  );
  const [psychosocialSummary, setPsychosocialSummary] = useState(
    report?.activities_psychosocial || defaultPsychosocialSummary
  );
  const [conclusions, setConclusions] = useState(
    report?.conclusions ||
      `1. Se brindó acompañamiento continuo, contención emocional y seguimiento pedagógico al estudiante ${student.full_name} durante todo el año lectivo.\n2. Se garantizó la restitución de sus derechos y la no revictimización en el contexto escolar, verificando avances favorables en su desarrollo integral.\n3. Se coordinó activamente con el representante legal y las instancias distritales e interinstitucionales correspondientes.`
  );
  const [recommendations, setRecommendations] = useState(
    report?.recommendations ||
      `1. Mantener un ambiente escolar protector, inclusivo y libre de estigmatizaciones para garantizar la continuidad pedagógica.\n2. Al representante legal: continuar fortaleciendo la corresponsabilidad familiar y los vínculos afectivos seguros en el hogar.\n3. A los docentes tutores: observar el desenvolvimiento socioafectivo y académico reportando cualquier señal de alerta al DECE institucional.`
  );

  // Estados de carga de IA
  const [loadingAiField, setLoadingAiField] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  const handleClosureTypeChange = (newType: ClosureType) => {
    setClosureType(newType);
    if (!report) {
      setTopic(
        buildDefaultTopic(
          newType,
          student.full_name,
          student.course,
          student.parallel || "",
          "MATUTINA"
        )
      );
      setClosureReasons(
        buildDefaultClosureReasons(
          newType,
          student.full_name,
          activeSchoolYear
        )
      );
      setScope(buildDefaultScope(newType));
      setObjective(buildDefaultObjective(newType, student.full_name));
    }
  };

  const handleAiDraft = async (
    field: "closure_reasons" | "conclusions" | "recommendations" | "psychosocial_summary",
    setter: (val: string) => void,
    currentVal: string
  ) => {
    setLoadingAiField(field);
    setAiError(null);
    try {
      const res = await generateClosureReportAiDraft({
        caseId,
        field,
        closureType,
        currentText: currentVal,
      });
      if (res.error) {
        setAiError(res.error);
      } else if (res.text) {
        setter(res.text);
      }
    } catch {
      setAiError("Ocurrió un error al consultar el asistente de IA.");
    } finally {
      setLoadingAiField(null);
    }
  };

  return (
    <form action={formAction} className="card p-6 space-y-8 max-w-5xl">
      {state.error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      )}

      {aiError && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800 flex items-center justify-between">
          <span>{aiError}</span>
          <button
            type="button"
            onClick={() => setAiError(null)}
            className="text-amber-600 hover:text-amber-900 font-bold ml-2"
          >
            ×
          </button>
        </div>
      )}

      {/* Tipo de Informe de Cierre y Metadatos */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2">
              <span>📋 Modalidad y Datos del Informe</span>
            </h3>
            <p className="text-xs text-slate-500">
              Seleccione la modalidad de cierre para pre-configurar la estructura oficial.
            </p>
          </div>
          <div className="text-xs text-slate-500">
            Caso: <strong className="text-slate-800">{caseFile.code}</strong> | Estudiante: <strong className="text-slate-800">{student.full_name}</strong>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="label text-xs font-semibold">Tipo de Cierre / Finalización *</label>
            <select
              name="closure_type"
              value={closureType}
              onChange={(e) => handleClosureTypeChange(e.target.value as ClosureType)}
              className="select text-xs font-medium"
              required
            >
              {Object.entries(CLOSURE_TYPE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label text-xs font-semibold">Número de Informe Técnico *</label>
            <input
              type="text"
              name="report_number"
              defaultValue={report?.report_number || defaultReportNumber}
              readOnly
              required
              className="input text-xs font-mono font-bold bg-slate-100 text-slate-800 border-slate-300 cursor-not-allowed select-all"
              title="Generado automáticamente según la codificación oficial DECE"
            />
            <p className="text-[10px] text-slate-500 mt-0.5">Consecutivo oficial inmutable</p>
          </div>

          <div>
            <label className="label text-xs font-semibold">Fecha del Informe *</label>
            <input
              type="date"
              name="report_date"
              defaultValue={report?.report_date || new Date().toISOString().split("T")[0]}
              required
              className="input text-xs"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label text-xs font-semibold">Año Lectivo *</label>
            <input
              type="text"
              name="school_year_text"
              defaultValue={report?.school_year_text || activeSchoolYear}
              required
              className="input text-xs"
              placeholder={currentSchoolYearSpaced()}
            />
          </div>
          <div>
            <label className="label text-xs font-semibold">Institución Educativa</label>
            <input
              type="text"
              disabled
              value={institution.name}
              className="input text-xs bg-slate-100 text-slate-600"
            />
          </div>
        </div>
      </div>

      {/* Remitente DECE y Destinatario Autoridad */}
      <div className="border border-slate-200 rounded-xl p-5 space-y-4">
        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide border-b border-slate-200 pb-2">
          1. Datos de Remitente y Autoridad Destinataria
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* DECE */}
          <div className="space-y-3 bg-blue-50/40 p-4 rounded-lg border border-blue-100">
            <h4 className="text-xs font-bold text-blue-900 uppercase">Profesional DECE Remitente</h4>
            <div>
              <label className="label text-xs">Nombre y Apellido *</label>
              <input
                type="text"
                name="dece_name"
                defaultValue={report?.dece_name || deceProfessional?.fullName || "Profesional DECE"}
                required
                className="input text-xs"
              />
            </div>
            <div>
              <label className="label text-xs">Cargo Institucional *</label>
              <input
                type="text"
                name="dece_role"
                defaultValue={report?.dece_role || deceProfessional?.role || "PROFESIONAL DECE INSTITUCIONAL"}
                required
                className="input text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="label text-xs">Teléfono / Extensión</label>
                <input
                  type="text"
                  name="dece_phone_ext"
                  defaultValue={report?.dece_phone_ext || deceProfessional?.phoneExt || ""}
                  className="input text-xs"
                  placeholder="Ext. 104"
                />
              </div>
              <div>
                <label className="label text-xs">Correo Electrónico</label>
                <input
                  type="email"
                  name="dece_email"
                  defaultValue={report?.dece_email || deceProfessional?.email || ""}
                  className="input text-xs"
                  placeholder="dece@institucion.edu.ec"
                />
              </div>
            </div>
          </div>

          {/* Autoridad */}
          <div className="space-y-3 bg-slate-50 p-4 rounded-lg border border-slate-200">
            <h4 className="text-xs font-bold text-slate-900 uppercase">Máxima Autoridad Destinataria</h4>
            <div>
              <label className="label text-xs">Nombre y Título *</label>
              <input
                type="text"
                name="authority_name"
                defaultValue={report?.authority_name || authority?.fullName || "Msc. Máxima Autoridad Institucional"}
                required
                className="input text-xs"
              />
            </div>
            <div>
              <label className="label text-xs">Cargo *</label>
              <input
                type="text"
                name="authority_role"
                defaultValue={report?.authority_role || authority?.role || "RECTOR (E) DE LA UNIDAD EDUCATIVA"}
                required
                className="input text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="label text-xs">Teléfono / Extensión</label>
                <input
                  type="text"
                  name="authority_phone_ext"
                  defaultValue={report?.authority_phone_ext || ""}
                  className="input text-xs"
                  placeholder="Ext. 101"
                />
              </div>
              <div>
                <label className="label text-xs">Correo Electrónico</label>
                <input
                  type="email"
                  name="authority_email"
                  defaultValue={report?.authority_email || ""}
                  className="input text-xs"
                  placeholder="rectorado@institucion.edu.ec"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tema, Razones, Marco Legal, Alcance, Objetivo */}
      <div className="border border-slate-200 rounded-xl p-5 space-y-5">
        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide border-b border-slate-200 pb-2">
          2. Justificación y Fundamentación Técnica
        </h3>

        {/* Tema */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="label text-xs font-bold uppercase text-slate-700">Tema del Informe *</label>
            <div className="flex items-center gap-1.5">
              <VoiceDictationButton targetId="closure-topic" compact />
              <AIAssistButton targetId="closure-topic" caseId={caseId} fieldLabel="Tema del informe de cierre" compact />
            </div>
          </div>
          <textarea
            id="closure-topic"
            name="topic"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            required
            rows={2}
            className="input text-xs font-semibold uppercase"
          />
        </div>

        {/* Razones del Cierre o Traslado */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="label text-xs font-bold uppercase text-slate-700">
              Razones del Cierre o Traslado de Caso *
            </label>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleAiDraft("closure_reasons", setClosureReasons, closureReasons)}
                disabled={loadingAiField === "closure_reasons"}
                className="text-[11px] px-2.5 py-1 rounded-full bg-violet-50 text-violet-700 border border-violet-300 hover:bg-violet-100 font-medium inline-flex items-center gap-1 transition-colors"
                title="Redactar razones técnicas con IA según el expediente"
              >
                <span>✨</span>
                <span>{loadingAiField === "closure_reasons" ? "Redactando con IA..." : "Redactar Razones con IA"}</span>
              </button>
              <VoiceDictationButton targetId="closure-reasons" compact />
            </div>
          </div>
          <textarea
            id="closure-reasons"
            name="closure_reasons"
            value={closureReasons}
            onChange={(e) => setClosureReasons(e.target.value)}
            required
            rows={4}
            className="input text-xs leading-relaxed"
          />
        </div>

        {/* Marco Legal */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="label text-xs font-bold uppercase text-slate-700">Marco Legal Aplicable *</label>
            <VoiceDictationButton targetId="closure-legal-framework" compact />
          </div>
          <textarea
            id="closure-legal-framework"
            name="legal_framework"
            defaultValue={report?.legal_framework || DEFAULT_LEGAL_FRAMEWORK}
            required
            rows={6}
            className="input text-xs font-mono leading-relaxed"
          />
        </div>

        {/* Alcance y Objetivo */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="label text-xs font-bold uppercase text-slate-700">Alcance *</label>
              <VoiceDictationButton targetId="closure-scope" compact />
            </div>
            <textarea
              id="closure-scope"
              name="scope"
              value={scope}
              onChange={(e) => setScope(e.target.value)}
              required
              rows={3}
              className="input text-xs"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="label text-xs font-bold uppercase text-slate-700">Objetivo *</label>
              <div className="flex items-center gap-1">
                <VoiceDictationButton targetId="closure-objective" compact />
                <AIAssistButton targetId="closure-objective" caseId={caseId} fieldLabel="Objetivo del informe de cierre" compact />
              </div>
            </div>
            <textarea
              id="closure-objective"
              name="objective"
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              required
              rows={3}
              className="input text-xs"
            />
          </div>
        </div>
      </div>

      {/* Tabla 1: Datos Generales del Estudiante y Representante */}
      <div className="border border-slate-200 rounded-xl p-5 space-y-4">
        <div className="border-b border-slate-200 pb-2">
          <h3 className="text-xs font-bold text-[#366092] uppercase tracking-wide">
            3. Datos Generales de la Niña, Niño o Adolescente (Tabla 1)
          </h3>
          <p className="text-[11px] text-slate-500">
            Formato oficial con membrete ministerial y estilo institucional azul.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="lg:col-span-2">
            <label className="label text-xs">Nombres y Apellidos Completos *</label>
            <input
              type="text"
              name="student_name"
              defaultValue={report?.student_name || student.full_name}
              required
              className="input text-xs font-semibold"
            />
          </div>
          <div>
            <label className="label text-xs">N° Cédula / Identificación</label>
            <input
              type="text"
              name="student_id_num"
              defaultValue={report?.student_id_num || student.document_id || ""}
              className="input text-xs font-mono"
            />
          </div>
          <div>
            <label className="label text-xs">Edad (Años)</label>
            <input
              type="number"
              name="student_age"
              defaultValue={report?.student_age || calculatedAge || ""}
              className="input text-xs"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="label text-xs">Fecha de Nacimiento</label>
            <input
              type="date"
              name="student_birth_date"
              defaultValue={report?.student_birth_date || student.birth_date || ""}
              className="input text-xs"
            />
          </div>
          <div>
            <label className="label text-xs">Año de Educación / Grado *</label>
            <input
              type="text"
              name="student_grade"
              defaultValue={report?.student_grade || studentGradeLabel(student)}
              required
              className="input text-xs"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label text-xs">Paralelo</label>
              <input
                type="text"
                name="student_parallel"
                defaultValue={report?.student_parallel || student.parallel || ""}
                className="input text-xs font-bold uppercase text-center"
              />
            </div>
            <div>
              <label className="label text-xs">Sección</label>
              <input
                type="text"
                name="student_section"
                defaultValue={report?.student_section || student.jornada || "MATUTINA"}
                className="input text-xs font-semibold uppercase text-center"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="label text-xs">Dirección Domiciliaria</label>
            <input
              type="text"
              name="student_address"
              defaultValue={report?.student_address || student.address || ""}
              className="input text-xs"
              placeholder="Barrio Central, Calle 10 de Agosto"
            />
          </div>
          <div>
            <label className="label text-xs">Referencia Domiciliaria</label>
            <input
              type="text"
              name="student_address_ref"
              defaultValue={report?.student_address_ref || ""}
              className="input text-xs"
              placeholder="Frente al parque infantil"
            />
          </div>
        </div>

        <div className="border-t border-slate-100 pt-3">
          <h4 className="text-[11px] font-bold text-slate-700 uppercase mb-2">
            Datos del Representante Legal
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="label text-xs">Nombres y Apellidos Representante</label>
              <input
                type="text"
                name="rep_name"
                defaultValue={report?.rep_name || student.representative || ""}
                className="input text-xs"
              />
            </div>
            <div>
              <label className="label text-xs">N° Cédula Representante</label>
              <input
                type="text"
                name="rep_id_num"
                defaultValue={report?.rep_id_num || student.representative_document_id || ""}
                className="input text-xs font-mono"
              />
            </div>
            <div>
              <label className="label text-xs">Teléfono / Celular de Contacto</label>
              <input
                type="text"
                name="rep_phone"
                defaultValue={report?.rep_phone || student.rep_phone || ""}
                className="input text-xs"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Tabla 2: Actividades Realizadas por Ejes y Consolidado Bimensual */}
      <div className="border border-slate-200 rounded-xl p-5 space-y-6">
        <div className="border-b border-slate-200 pb-2">
          <h3 className="text-xs font-bold text-[#366092] uppercase tracking-wide flex items-center justify-between">
            <span>4. Actividades Realizadas por Ejes de Intervención (Tabla 2)</span>
            <span className="text-[11px] font-normal text-slate-500 lowercase">
              Consolidación anual obligatoria
            </span>
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Incluye Consejería, Prevención, Atención Psicosocial integral y el{" "}
            <strong>Consolidado de todos los Informes Bimensuales del año</strong>.
          </p>
        </div>

        {/* Eje 1: Consejería */}
        <div className="bg-slate-50/50 p-3 rounded-lg border border-slate-200">
          <div className="flex items-center justify-between mb-1">
            <label className="label text-xs font-bold text-slate-700">
              Eje de Consejería
            </label>
            <div className="flex items-center gap-1.5">
              <VoiceDictationButton targetId="closure-counseling" compact />
              <AIAssistButton targetId="closure-counseling" caseId={caseId} fieldLabel="Eje de Consejería en informe de cierre" compact />
            </div>
          </div>
          <textarea
            id="closure-counseling"
            name="activities_counseling"
            defaultValue={
              report?.activities_counseling ||
              "Orientación y acompañamiento socioemocional individual periódico, fomento de habilidades para la vida y toma de decisiones."
            }
            rows={2}
            className="input text-xs leading-relaxed"
          />
        </div>

        {/* Eje 2: Promoción y Prevención */}
        <div className="bg-slate-50/50 p-3 rounded-lg border border-slate-200">
          <div className="flex items-center justify-between mb-1">
            <label className="label text-xs font-bold text-slate-700">
              Eje de Promoción y Prevención
            </label>
            <div className="flex items-center gap-1.5">
              <VoiceDictationButton targetId="closure-prevention" compact />
              <AIAssistButton targetId="closure-prevention" caseId={caseId} fieldLabel="Eje de Promoción y Prevención en informe de cierre" compact />
            </div>
          </div>
          <textarea
            id="closure-prevention"
            name="activities_prevention"
            defaultValue={
              report?.activities_prevention ||
              "Talleres áulicos de sensibilización sobre resolución pacífica de conflictos, prevención de violencia escolar y autocuidado dirigidos a la comunidad educativa."
            }
            rows={2}
            className="input text-xs leading-relaxed"
          />
        </div>

        {/* Eje 3: Atención Psicosocial */}
        <div className="bg-slate-50/50 p-3 rounded-lg border border-slate-200">
          <div className="flex items-center justify-between mb-1">
            <div>
              <label className="label text-xs font-bold text-slate-700">
                Eje de Atención Psicosocial (Detección, Intervención, Seguimiento, Derivación, Reparación)
              </label>
              <p className="text-[11px] text-slate-500">
                Se recopilan cronológicamente las fechas y acciones registradas en el expediente del caso.
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleAiDraft("psychosocial_summary", setPsychosocialSummary, psychosocialSummary)}
                disabled={loadingAiField === "psychosocial_summary"}
                className="text-[11px] px-2.5 py-1 rounded-full bg-violet-50 text-violet-700 border border-violet-300 hover:bg-violet-100 font-medium inline-flex items-center gap-1 transition-colors"
                title="Sintetizar y redactar con IA el eje psicosocial"
              >
                <span>✨</span>
                <span>{loadingAiField === "psychosocial_summary" ? "Redactando..." : "Sintetizar con IA"}</span>
              </button>
              <VoiceDictationButton targetId="closure-psychosocial" compact />
            </div>
          </div>
          <textarea
            id="closure-psychosocial"
            name="activities_psychosocial"
            value={psychosocialSummary}
            onChange={(e) => setPsychosocialSummary(e.target.value)}
            rows={7}
            className="input text-xs leading-relaxed"
          />
        </div>

        {/* Eje 4: Inclusión Socioeducativa */}
        <div className="bg-slate-50/50 p-3 rounded-lg border border-slate-200">
          <div className="flex items-center justify-between mb-1">
            <label className="label text-xs font-bold text-slate-700">
              Eje de Inclusión Socioeducativa
            </label>
            <div className="flex items-center gap-1.5">
              <VoiceDictationButton targetId="closure-inclusion" compact />
              <AIAssistButton targetId="closure-inclusion" caseId={caseId} fieldLabel="Eje de Inclusión Socioeducativa en informe de cierre" compact />
            </div>
          </div>
          <textarea
            id="closure-inclusion"
            name="activities_inclusion"
            defaultValue={
              report?.activities_inclusion ||
              "Articulación docente para la adaptación pedagógica, garantía de permanencia educativa y seguimiento a la convivencia escolar armónica."
            }
            rows={2}
            className="input text-xs leading-relaxed"
          />
        </div>

        {/* CONSOLIDADO DE INFORMES BIMENSUALES DEL AÑO LECTIVO */}
        <div className="border border-blue-200 bg-blue-50/30 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold text-blue-900 uppercase flex items-center gap-2">
                <span>📁 Consolidado de Informes Bimensuales del Año Lectivo</span>
                <span className="bg-blue-200 text-blue-800 text-[10px] px-2 py-0.5 rounded-full font-semibold">
                  {bimonthlyItems.length} {bimonthlyItems.length === 1 ? "informe registrado" : "informes registrados"}
                </span>
              </h4>
              <p className="text-[11px] text-slate-600 mt-0.5">
                La normativa dispone que la información de todos los seguimientos bimensuales debe constar en este informe final.
              </p>
            </div>
          </div>

          <input
            type="hidden"
            name="bimonthly_summary_json"
            value={JSON.stringify(bimonthlyItems)}
          />

          {bimonthlyItems.length === 0 ? (
            <div className="text-center py-6 bg-white rounded-lg border border-dashed border-slate-300">
              <p className="text-xs text-slate-500">
                No se registran informes bimensuales previos para este caso.
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                Puede guardar este informe de cierre de todas formas, o registrar los seguimientos bimensuales desde la ficha del caso.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {bimonthlyItems.map((item, idx) => (
                <div
                  key={item.id || idx}
                  className="bg-white border border-slate-200 rounded-lg p-3 shadow-xs"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
                    <span className="font-bold text-xs text-slate-800">
                      Bimestre: {item.period_months} ({item.school_year_text})
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Fecha: {item.created_at ? item.created_at.split("T")[0] : "S/F"}
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-[11px] border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                          <th className="py-1 px-2 font-semibold">Proceso</th>
                          <th className="py-1 px-2 font-semibold">Ejecutor / Servicio</th>
                          <th className="py-1 px-2 text-center font-semibold">Personas</th>
                          <th className="py-1 px-2 text-center font-semibold">Vigencia</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {item.processes.map((proc, pIdx) => (
                          <tr key={proc.id || pIdx} className="hover:bg-slate-50/50">
                            <td className="py-1.5 px-2 font-medium text-slate-800">
                              {proc.process_name}
                            </td>
                            <td className="py-1.5 px-2 text-slate-600">
                              {proc.executed_by || "—"}
                            </td>
                            <td className="py-1.5 px-2 text-center text-slate-600 font-mono">
                              {proc.beneficiaries_count || "1"}
                            </td>
                            <td className="py-1.5 px-2 text-center text-slate-500 text-[10px]">
                              {proc.start_date || "—"} al {proc.end_date || "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Metodología, Conclusiones y Recomendaciones */}
      <div className="border border-slate-200 rounded-xl p-5 space-y-6">
        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide border-b border-slate-200 pb-2">
          5. Metodología, Conclusiones y Recomendaciones
        </h3>

        {/* Metodología */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="label text-xs font-bold uppercase text-slate-700">Metodología Aplicada *</label>
            <VoiceDictationButton targetId="closure-methodology" compact />
          </div>
          <textarea
            id="closure-methodology"
            name="methodology"
            defaultValue={report?.methodology || DEFAULT_METHODOLOGY}
            required
            rows={4}
            className="input text-xs leading-relaxed"
          />
        </div>

        {/* Conclusiones */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="label text-xs font-bold uppercase text-slate-700">Conclusiones Técnicas *</label>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleAiDraft("conclusions", setConclusions, conclusions)}
                disabled={loadingAiField === "conclusions"}
                className="text-[11px] px-2.5 py-1 rounded-full bg-violet-50 text-violet-700 border border-violet-300 hover:bg-violet-100 font-medium inline-flex items-center gap-1 transition-colors"
                title="Generar conclusiones técnicas basadas en la evolución y seguimientos del caso"
              >
                <span>✨</span>
                <span>{loadingAiField === "conclusions" ? "Redactando con IA..." : "Redactar Conclusiones con IA"}</span>
              </button>
              <VoiceDictationButton targetId="closure-conclusions" compact />
            </div>
          </div>
          <textarea
            id="closure-conclusions"
            name="conclusions"
            value={conclusions}
            onChange={(e) => setConclusions(e.target.value)}
            required
            rows={5}
            className="input text-xs leading-relaxed"
          />
        </div>

        {/* Recomendaciones */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="label text-xs font-bold uppercase text-slate-700">Recomendaciones Técnicas *</label>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleAiDraft("recommendations", setRecommendations, recommendations)}
                disabled={loadingAiField === "recommendations"}
                className="text-[11px] px-2.5 py-1 rounded-full bg-violet-50 text-violet-700 border border-violet-300 hover:bg-violet-100 font-medium inline-flex items-center gap-1 transition-colors"
                title="Generar recomendaciones formales con IA adaptadas a la modalidad de cierre"
              >
                <span>✨</span>
                <span>{loadingAiField === "recommendations" ? "Redactando con IA..." : "Redactar Recomendaciones con IA"}</span>
              </button>
              <VoiceDictationButton targetId="closure-recommendations" compact />
            </div>
          </div>
          <textarea
            id="closure-recommendations"
            name="recommendations"
            value={recommendations}
            onChange={(e) => setRecommendations(e.target.value)}
            required
            rows={5}
            className="input text-xs leading-relaxed"
          />
        </div>
      </div>

      {/* Firmas de Responsabilidad (Tabla 3 replica) */}
      <div className="border border-slate-200 rounded-xl p-5 space-y-4">
        <div className="border-b border-slate-200 pb-2">
          <h3 className="text-xs font-bold text-[#366092] uppercase tracking-wide">
            6. Firmas de Responsabilidad Institucional (Tabla 3)
          </h3>
          <p className="text-[11px] text-slate-500">
            Responsables de elaboración, revisión y aprobación según el orgánico funcional DECE.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Elaborado */}
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2">
            <span className="text-[11px] font-bold text-slate-700 uppercase block">Elaborado Por</span>
            <div>
              <label className="label text-[11px]">Nombre</label>
              <input
                type="text"
                name="elaborated_by_name"
                value={elaboratedName}
                onChange={(e) => setElaboratedName(e.target.value)}
                required
                className="input text-xs font-medium"
              />
            </div>
            <div>
              <label className="label text-[11px]">Cargo</label>
              <input
                type="text"
                name="elaborated_by_role"
                defaultValue={report?.elaborated_by_role || deceProfessional?.role || "ANALISTA DECE"}
                required
                className="input text-xs"
              />
            </div>
            <div>
              <label className="label text-[11px]">Fecha</label>
              <input
                type="date"
                name="elaborated_date"
                defaultValue={report?.elaborated_date || new Date().toISOString().split("T")[0]}
                required
                className="input text-xs"
              />
            </div>
            <div className="pt-2 flex flex-wrap items-center justify-between gap-1 border-t border-slate-200">
              {elaboratedSig?.tipo === "digital" || elaboratedSig?.firma_data_url ? (
                <div className="flex flex-wrap items-center gap-1">
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-300 px-1.5 py-0.5 rounded">✓ Digital</span>
                  {elaboratedSig.firma_data_url && (
                    <img src={elaboratedSig.firma_data_url} alt="Firma Elaborador" className="h-5 max-w-[55px] object-contain border border-slate-200 rounded px-1 bg-white" />
                  )}
                  <button type="button" onClick={() => setActiveSignerModal("elaborated")} className="text-[10px] text-brand-700 hover:underline">Cambiar</button>
                  <button type="button" onClick={() => setElaboratedSig(null)} className="text-[10px] text-rose-600 hover:underline">✕</button>
                </div>
              ) : elaboratedSig?.tipo === "fisica" ? (
                <div className="flex flex-wrap items-center gap-1">
                  <span className="text-[10px] font-semibold text-amber-800 bg-amber-50 border border-amber-300 px-1.5 py-0.5 rounded">📄 Papel</span>
                  <button type="button" onClick={() => setActiveSignerModal("elaborated")} className="text-[10px] text-brand-700 hover:underline">Cambiar</button>
                  <button type="button" onClick={() => setElaboratedSig(null)} className="text-[10px] text-rose-600 hover:underline">✕</button>
                </div>
              ) : (
                <button type="button" onClick={() => setActiveSignerModal("elaborated")} className="w-full text-center py-1 text-[10px] font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-200 rounded">
                  ✍️ Registrar Firma
                </button>
              )}
            </div>
          </div>

          {/* Revisado */}
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2">
            <span className="text-[11px] font-bold text-slate-700 uppercase block">Revisado Por</span>
            <div>
              <label className="label text-[11px]">Nombre</label>
              <input
                type="text"
                name="reviewed_by_name"
                value={reviewedName}
                onChange={(e) => setReviewedName(e.target.value)}
                required
                className="input text-xs font-medium"
              />
            </div>
            <div>
              <label className="label text-[11px]">Cargo</label>
              <input
                type="text"
                name="reviewed_by_role"
                defaultValue={report?.reviewed_by_role || "COORDINADORA DECE INSTITUCIONAL"}
                required
                className="input text-xs"
              />
            </div>
            <div>
              <label className="label text-[11px]">Fecha</label>
              <input
                type="date"
                name="reviewed_date"
                defaultValue={report?.reviewed_date || new Date().toISOString().split("T")[0]}
                required
                className="input text-xs"
              />
            </div>
            <div className="pt-2 flex flex-wrap items-center justify-between gap-1 border-t border-slate-200">
              {reviewedSig?.tipo === "digital" || reviewedSig?.firma_data_url ? (
                <div className="flex flex-wrap items-center gap-1">
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-300 px-1.5 py-0.5 rounded">✓ Digital</span>
                  {reviewedSig.firma_data_url && (
                    <img src={reviewedSig.firma_data_url} alt="Firma Revisor" className="h-5 max-w-[55px] object-contain border border-slate-200 rounded px-1 bg-white" />
                  )}
                  <button type="button" onClick={() => setActiveSignerModal("reviewed")} className="text-[10px] text-brand-700 hover:underline">Cambiar</button>
                  <button type="button" onClick={() => setReviewedSig(null)} className="text-[10px] text-rose-600 hover:underline">✕</button>
                </div>
              ) : reviewedSig?.tipo === "fisica" ? (
                <div className="flex flex-wrap items-center gap-1">
                  <span className="text-[10px] font-semibold text-amber-800 bg-amber-50 border border-amber-300 px-1.5 py-0.5 rounded">📄 Papel</span>
                  <button type="button" onClick={() => setActiveSignerModal("reviewed")} className="text-[10px] text-brand-700 hover:underline">Cambiar</button>
                  <button type="button" onClick={() => setReviewedSig(null)} className="text-[10px] text-rose-600 hover:underline">✕</button>
                </div>
              ) : (
                <button type="button" onClick={() => setActiveSignerModal("reviewed")} className="w-full text-center py-1 text-[10px] font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-200 rounded">
                  ✍️ Registrar Firma
                </button>
              )}
            </div>
          </div>

          {/* Aprobado */}
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2">
            <span className="text-[11px] font-bold text-slate-700 uppercase block">Aprobado Por</span>
            <div>
              <label className="label text-[11px]">Nombre</label>
              <input
                type="text"
                name="approved_by_name"
                value={approvedName}
                onChange={(e) => setApprovedName(e.target.value)}
                required
                className="input text-xs font-medium"
              />
            </div>
            <div>
              <label className="label text-[11px]">Cargo</label>
              <input
                type="text"
                name="approved_by_role"
                defaultValue={report?.approved_by_role || "RECTOR (E) DE LA UNIDAD EDUCATIVA"}
                required
                className="input text-xs"
              />
            </div>
            <div>
              <label className="label text-[11px]">Fecha</label>
              <input
                type="date"
                name="approved_date"
                defaultValue={report?.approved_date || new Date().toISOString().split("T")[0]}
                required
                className="input text-xs"
              />
            </div>
            <div className="pt-2 flex flex-wrap items-center justify-between gap-1 border-t border-slate-200">
              {approvedSig?.tipo === "digital" || approvedSig?.firma_data_url ? (
                <div className="flex flex-wrap items-center gap-1">
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-300 px-1.5 py-0.5 rounded">✓ Digital</span>
                  {approvedSig.firma_data_url && (
                    <img src={approvedSig.firma_data_url} alt="Firma Aprobador" className="h-5 max-w-[55px] object-contain border border-slate-200 rounded px-1 bg-white" />
                  )}
                  <button type="button" onClick={() => setActiveSignerModal("approved")} className="text-[10px] text-brand-700 hover:underline">Cambiar</button>
                  <button type="button" onClick={() => setApprovedSig(null)} className="text-[10px] text-rose-600 hover:underline">✕</button>
                </div>
              ) : approvedSig?.tipo === "fisica" ? (
                <div className="flex flex-wrap items-center gap-1">
                  <span className="text-[10px] font-semibold text-amber-800 bg-amber-50 border border-amber-300 px-1.5 py-0.5 rounded">📄 Papel</span>
                  <button type="button" onClick={() => setActiveSignerModal("approved")} className="text-[10px] text-brand-700 hover:underline">Cambiar</button>
                  <button type="button" onClick={() => setApprovedSig(null)} className="text-[10px] text-rose-600 hover:underline">✕</button>
                </div>
              ) : (
                <button type="button" onClick={() => setActiveSignerModal("approved")} className="w-full text-center py-1 text-[10px] font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-200 rounded">
                  ✍️ Registrar Firma
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Respaldo Físico DECE e Informe de Cierre en Papel */}
      <div className="p-4 bg-amber-50/60 rounded-xl border border-amber-200 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
            <span>📁</span> Respaldo Físico DECE e Informe de Cierre en Papel (Auditoría Ministerial)
          </span>
          <span className="text-[11px] text-amber-700 bg-amber-100/70 border border-amber-300 px-2 py-0.5 rounded-full font-medium">
            Custodia Institucional
          </span>
        </div>
        <p className="text-xs text-amber-800/90 leading-relaxed">
          Para garantizar la constancia legal y auditoría física, registra la ubicación física en carpeta/archivador y opcionalmente adjunta copia escaneada o foto (PDF o Imagen) del informe con firmas manuscritas y sellos.
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
              placeholder="Ej. Archivador Informes de Cierre 2026 / Carpeta Caso"
              className="w-full text-xs rounded-lg border border-amber-300 bg-white px-3 py-2 text-slate-800 placeholder-slate-400 focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-amber-900 mb-1">
              Adjuntar Informe de Cierre Sellado / Firmado (PDF o Imagen)
            </label>
            {physicalEvidenceUrl ? (
              <div className="flex items-center justify-between p-2 bg-white rounded-lg border border-amber-300">
                <span className="text-xs text-emerald-800 font-medium flex items-center gap-1.5 truncate max-w-[200px]">
                  <span>📎</span> {physicalEvidenceName || "Informe_Cierre_Sellado"}
                </span>
                <div className="flex items-center gap-2">
                  <a href={physicalEvidenceUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">Ver</a>
                  <button type="button" onClick={() => { setPhysicalEvidenceUrl(""); setPhysicalEvidenceName(""); }} className="text-xs text-rose-600 hover:underline font-medium">Quitar</button>
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
            activeSignerModal === "elaborated"
              ? elaboratedName || "Profesional DECE"
              : activeSignerModal === "reviewed"
              ? reviewedName || "Coordinadora DECE"
              : approvedName || "Autoridad Institucional"
          }
          signatoryRole={
            activeSignerModal === "elaborated"
              ? report?.elaborated_by_role || "ANALISTA DECE"
              : activeSignerModal === "reviewed"
              ? report?.reviewed_by_role || "COORDINADORA DECE INSTITUCIONAL"
              : report?.approved_by_role || "RECTOR (E) DE LA UNIDAD EDUCATIVA"
          }
          initialData={
            activeSignerModal === "elaborated"
              ? elaboratedSig
              : activeSignerModal === "reviewed"
              ? reviewedSig
              : approvedSig
          }
          onSave={(data) => {
            if (activeSignerModal === "elaborated") setElaboratedSig(data);
            else if (activeSignerModal === "reviewed") setReviewedSig(data);
            else if (activeSignerModal === "approved") setApprovedSig(data);
            setActiveSignerModal(null);
          }}
        />
      )}

      {/* Anexos */}
      <div className="border border-slate-200 rounded-xl p-5 space-y-2">
        <div className="flex items-center justify-between">
          <label className="label text-xs font-bold uppercase text-slate-700">7. Anexos y Documentos de Respaldo</label>
          <VoiceDictationButton targetId="closure-annexes" compact />
        </div>
        <textarea
          id="closure-annexes"
          name="annexes_notes"
          defaultValue={
            report?.annexes_notes ||
            "• Expediente confidencial de caso\n• Ficha de detección de presunta vulneración de derechos\n• Plan de Acompañamiento Psicosocial Integral\n• Informes bimensuales de seguimiento al plan de acompañamiento\n• Notificaciones y derivaciones a organismos de protección externa\n• Actas de compromisos y corresponsabilidad familiar"
          }
          rows={4}
          className="input text-xs leading-relaxed"
        />
      </div>

      {/* Botones de acción final */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-200">
        <Link
          href={`/casos/${caseId}`}
          className="btn-secondary text-xs px-4 py-2 hover:bg-slate-100"
        >
          Cancelar y volver al caso
        </Link>
        <SubmitButton isEditing={isEditing} />
      </div>
    </form>
  );
}
