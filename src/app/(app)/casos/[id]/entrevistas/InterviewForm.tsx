"use client";

import { useState } from "react";
import Link from "next/link";
import type { CaseInterviewRow, StudentRow } from "@/lib/types";
import VoiceDictationButton from "@/components/VoiceDictationButton";
import AIAssistButton from "@/components/AIAssistButton";
import AppendAwarenessNoteButton from "@/components/AppendAwarenessNoteButton";
import DualSignatureModal, { type DualSignatureData } from "@/components/DualSignatureModal";
import { getDefaultInterviewCommitment } from "@/lib/interviewDefaults";

const EMOTIONAL_OPTIONS = ["Estable", "Inestable", "Llanto fácil", "Triste", "Alegre", "Agresivo", "Evasivo"];
const SOCIAL_OPTIONS = ["Sociable", "Aislado"];

interface InterviewFormProps {
  caseId: string;
  student: StudentRow;
  interview?: CaseInterviewRow;
  defaultDeceName: string;
  defaultDeceRole?: string;
  action: (formData: FormData) => Promise<void>;
  isEditing?: boolean;
  cancelHref?: string;
}

export default function InterviewForm({
  caseId,
  student,
  interview,
  defaultDeceName,
  defaultDeceRole = "PROFESIONAL DECE",
  action,
  isEditing = false,
  cancelHref,
}: InterviewFormProps) {
  // Existing signatures parsing
  let initialSignatures: Record<string, DualSignatureData> = {};
  if (interview?.signatures_json) {
    try {
      initialSignatures = JSON.parse(interview.signatures_json);
    } catch {
      initialSignatures = {};
    }
  }

  const [deceSig, setDeceSig] = useState<DualSignatureData | null>(initialSignatures.dece || null);
  const [repSig, setRepSig] = useState<DualSignatureData | null>(initialSignatures.rep || null);
  const [studentSig, setStudentSig] = useState<DualSignatureData | null>(initialSignatures.student || null);

  const [activeSignerModal, setActiveSignerModal] = useState<"dece" | "rep" | "student" | null>(null);

  const [physicalFileRef, setPhysicalFileRef] = useState<string>(interview?.physical_file_ref || "");
  const [physicalEvidenceUrl, setPhysicalEvidenceUrl] = useState<string>(interview?.physical_evidence_url || "");
  const [physicalEvidenceName, setPhysicalEvidenceName] = useState<string>("");

  const [intervieweeName, setIntervieweeName] = useState<string>(
    interview?.interviewee_full_name || student.full_name || ""
  );
  const [representativeName, setRepresentativeName] = useState<string>(
    interview?.representative_name || student.representative || student.mother_name || student.father_name || ""
  );

  const emotionalStates = (interview?.emotional_state || "").split(",").map((s) => s.trim());
  const socialRelations = (interview?.social_relations || "").split(",").map((s) => s.trim());

  const handleEvidenceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("El archivo excede el límite máximo de 5MB.");
      return;
    }

    setPhysicalEvidenceName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setPhysicalEvidenceUrl(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const signaturesPayload = JSON.stringify({
    dece: deceSig,
    rep: repSig,
    student: studentSig,
  });

  const hasDigital = [deceSig, repSig, studentSig].some((s) => s?.tipo === "digital" || s?.firma_data_url);
  const hasPhysical = [deceSig, repSig, studentSig].some((s) => s?.tipo === "fisica");
  const overallSignatureType =
    hasDigital && hasPhysical
      ? "MIXTA"
      : hasPhysical
      ? "FISICA"
      : "DIGITAL";

  return (
    <form action={action} className="card p-6 space-y-6 max-w-3xl">
      {/* 1. Datos personales */}
      <div>
        <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">Datos personales</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="label text-xs">Nombres del entrevistado</label>
            <input
              name="full_name"
              required
              value={intervieweeName}
              onChange={(e) => setIntervieweeName(e.target.value)}
              placeholder="Nombres y apellidos del entrevistado"
              className="input"
            />
          </div>
          <div>
            <label className="label text-xs">Cédula</label>
            <input
              name="cedula"
              defaultValue={interview?.interviewee_cedula || student.document_id || ""}
              placeholder="Cédula"
              className="input"
            />
          </div>
          <div>
            <label className="label text-xs">Curso</label>
            <input
              name="course"
              defaultValue={interview?.course || `${student.course} ${student.parallel || ""}`.trim()}
              placeholder="Curso"
              className="input"
            />
          </div>
          <div>
            <label className="label text-xs">Edad</label>
            <input
              name="age"
              defaultValue={interview?.age || ""}
              placeholder="Edad"
              className="input"
            />
          </div>
          <div>
            <label className="label text-xs">Fecha de aplicación</label>
            <input
              type="date"
              name="application_date"
              defaultValue={interview?.application_date || new Date().toISOString().slice(0, 10)}
              className="input"
            />
          </div>
          <div>
            <label className="label text-xs">Nombre del representante</label>
            <input
              name="representative_name"
              value={representativeName}
              onChange={(e) => setRepresentativeName(e.target.value)}
              placeholder="Nombre del representante (si aplica)"
              className="input"
            />
          </div>
        </div>
      </div>

      {/* 2. Resumen */}
      <div>
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">1. Resumen de lo tratado en la entrevista</h3>
          <div className="flex items-center gap-2">
            <VoiceDictationButton targetId="interview-summary" />
            <AIAssistButton targetId="interview-summary" caseId={caseId} fieldLabel="Resumen de lo tratado en la entrevista semiestructurada" />
          </div>
        </div>
        <textarea
          id="interview-summary"
          name="summary"
          rows={5}
          defaultValue={interview?.summary || ""}
          placeholder="Resumen de lo conversado..."
          className="textarea"
        />
      </div>

      {/* 3. Situación del estudiante */}
      <div>
        <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">2. Situación del estudiante</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label text-xs">Relación familiar</label>
            <select name="family_relation" className="select" defaultValue={interview?.family_relation || ""}>
              <option value="">Seleccionar...</option>
              <option>Buena</option>
              <option>Regular</option>
              <option>Mala</option>
              <option>Ausentes</option>
            </select>
          </div>
          <div>
            <label className="label text-xs">Antecedentes académicos</label>
            <select name="academic_history" className="select" defaultValue={interview?.academic_history || ""}>
              <option value="">Seleccionar...</option>
              <option>Bueno</option>
              <option>Regular</option>
              <option>Malo</option>
            </select>
          </div>
        </div>
        <div className="mt-3">
          <label className="label text-xs">Estado emocional (puedes marcar varios)</label>
          <div className="flex flex-wrap gap-3 text-sm">
            {EMOTIONAL_OPTIONS.map((opt) => (
              <label key={opt} className="flex items-center gap-1">
                <input
                  type="checkbox"
                  name="emotional_state"
                  value={opt}
                  defaultChecked={emotionalStates.includes(opt)}
                  className="rounded"
                />{" "}
                {opt}
              </label>
            ))}
          </div>
        </div>
        <div className="mt-3">
          <label className="label text-xs">Relaciones sociales</label>
          <div className="flex flex-wrap gap-3 text-sm">
            {SOCIAL_OPTIONS.map((opt) => (
              <label key={opt} className="flex items-center gap-1">
                <input
                  type="checkbox"
                  name="social_relations"
                  value={opt}
                  defaultChecked={socialRelations.includes(opt)}
                  className="rounded"
                />{" "}
                {opt}
              </label>
            ))}
            <label className="flex items-center gap-1">
              <input
                type="checkbox"
                name="bullying_history"
                value="1"
                defaultChecked={!!interview?.bullying_history}
                className="rounded"
              />{" "}
              Antecedentes de acoso escolar
            </label>
          </div>
        </div>
      </div>

      {/* 4. Recomendaciones */}
      <div>
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">3. Recomendaciones</h3>
          <div className="flex items-center gap-2">
            <VoiceDictationButton targetId="interview-recommendations" />
            <AIAssistButton targetId="interview-recommendations" caseId={caseId} fieldLabel="Recomendaciones de la entrevista semiestructurada" />
          </div>
        </div>
        <textarea
          id="interview-recommendations"
          name="recommendations"
          rows={3}
          defaultValue={interview?.recommendations || ""}
          placeholder="Recomendaciones..."
          className="textarea"
        />
      </div>

      {/* 5. Compromiso */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-xs font-semibold text-slate-500 uppercase">4. Compromiso</h3>
          <div className="flex items-center gap-2">
            <AppendAwarenessNoteButton targetId="interview-commitment" />
            <VoiceDictationButton targetId="interview-commitment" />
            <AIAssistButton targetId="interview-commitment" caseId={caseId} fieldLabel="Compromisos asumidos en la entrevista" />
          </div>
        </div>
        <p className="text-[11px] text-slate-500 mb-1.5">
          Incluye acuerdos específicos y la constancia de toma de conocimiento y corresponsabilidad del representante.
        </p>
        <textarea
          id="interview-commitment"
          name="commitment"
          rows={7}
          defaultValue={interview?.commitment || getDefaultInterviewCommitment(student.full_name)}
          placeholder="Compromisos asumidos..."
          className="textarea text-xs leading-relaxed"
        />
      </div>

      {/* 6. Firmas y Respaldo Dual */}
      <div className="space-y-4 border-t border-slate-200 pt-5">
        <input type="hidden" name="signatures_json" value={signaturesPayload} />
        <input type="hidden" name="signature_type" value={overallSignatureType} />
        <input type="hidden" name="physical_file_ref" value={physicalFileRef} />
        <input type="hidden" name="physical_evidence_url" value={physicalEvidenceUrl} />

        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-slate-500 uppercase">
            Firmas de Responsabilidad (Digital / Física)
          </h3>
          <span className="text-[11px] font-semibold text-brand-700 bg-brand-50 border border-brand-200 px-2.5 py-0.5 rounded-full">
            Modalidad: {overallSignatureType}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Profesional DECE */}
          <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-2 shadow-2xs">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Profesional DECE
              </label>
              <div className="text-xs font-medium text-slate-800 truncate">
                {defaultDeceName || "Profesional DECE"}
              </div>
              <div className="text-[10px] text-slate-500">{defaultDeceRole}</div>
            </div>
            <div className="pt-1 flex flex-wrap items-center justify-between gap-1 border-t border-slate-100">
              {deceSig?.tipo === "digital" || deceSig?.firma_data_url ? (
                <div className="flex flex-wrap items-center gap-1">
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-300 px-1.5 py-0.5 rounded">
                    ✓ Digital
                  </span>
                  {deceSig.firma_data_url && (
                    <img
                      src={deceSig.firma_data_url}
                      alt="Firma DECE"
                      className="h-5 max-w-[55px] object-contain border border-slate-200 rounded px-1 bg-white"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => setActiveSignerModal("dece")}
                    className="text-[10px] text-brand-700 hover:underline"
                  >
                    Cambiar
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeceSig(null)}
                    className="text-[10px] text-rose-600 hover:underline"
                  >
                    ✕
                  </button>
                </div>
              ) : deceSig?.tipo === "fisica" ? (
                <div className="flex flex-wrap items-center gap-1">
                  <span className="text-[10px] font-semibold text-amber-800 bg-amber-50 border border-amber-300 px-1.5 py-0.5 rounded">
                    📄 Papel
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveSignerModal("dece")}
                    className="text-[10px] text-brand-700 hover:underline"
                  >
                    Cambiar
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeceSig(null)}
                    className="text-[10px] text-rose-600 hover:underline"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setActiveSignerModal("dece")}
                  className="w-full text-center py-1 text-[10px] font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-200 rounded"
                >
                  ✍️ Registrar Firma
                </button>
              )}
            </div>
          </div>

          {/* Representante Legal */}
          <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-2 shadow-2xs">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Representante Legal
              </label>
              <div className="text-xs font-medium text-slate-800 truncate">
                {representativeName || "Por registrar"}
              </div>
              <div className="text-[10px] text-slate-500">Toma de conocimiento y acuerdos</div>
            </div>
            <div className="pt-1 flex flex-wrap items-center justify-between gap-1 border-t border-slate-100">
              {repSig?.tipo === "digital" || repSig?.firma_data_url ? (
                <div className="flex flex-wrap items-center gap-1">
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-300 px-1.5 py-0.5 rounded">
                    ✓ Digital
                  </span>
                  {repSig.firma_data_url && (
                    <img
                      src={repSig.firma_data_url}
                      alt="Firma Representante"
                      className="h-5 max-w-[55px] object-contain border border-slate-200 rounded px-1 bg-white"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => setActiveSignerModal("rep")}
                    className="text-[10px] text-brand-700 hover:underline"
                  >
                    Cambiar
                  </button>
                  <button
                    type="button"
                    onClick={() => setRepSig(null)}
                    className="text-[10px] text-rose-600 hover:underline"
                  >
                    ✕
                  </button>
                </div>
              ) : repSig?.tipo === "fisica" ? (
                <div className="flex flex-wrap items-center gap-1">
                  <span className="text-[10px] font-semibold text-amber-800 bg-amber-50 border border-amber-300 px-1.5 py-0.5 rounded">
                    📄 Papel
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveSignerModal("rep")}
                    className="text-[10px] text-brand-700 hover:underline"
                  >
                    Cambiar
                  </button>
                  <button
                    type="button"
                    onClick={() => setRepSig(null)}
                    className="text-[10px] text-rose-600 hover:underline"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setActiveSignerModal("rep")}
                  className="w-full text-center py-1 text-[10px] font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-200 rounded"
                >
                  ✍️ Registrar Firma
                </button>
              )}
            </div>
          </div>

          {/* Estudiante */}
          <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-2 shadow-2xs">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Estudiante Entrevistado
              </label>
              <div className="text-xs font-medium text-slate-800 truncate">
                {intervieweeName || "Estudiante"}
              </div>
              <div className="text-[10px] text-slate-500">Participante activo</div>
            </div>
            <div className="pt-1 flex flex-wrap items-center justify-between gap-1 border-t border-slate-100">
              {studentSig?.tipo === "digital" || studentSig?.firma_data_url ? (
                <div className="flex flex-wrap items-center gap-1">
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-300 px-1.5 py-0.5 rounded">
                    ✓ Digital
                  </span>
                  {studentSig.firma_data_url && (
                    <img
                      src={studentSig.firma_data_url}
                      alt="Firma Estudiante"
                      className="h-5 max-w-[55px] object-contain border border-slate-200 rounded px-1 bg-white"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => setActiveSignerModal("student")}
                    className="text-[10px] text-brand-700 hover:underline"
                  >
                    Cambiar
                  </button>
                  <button
                    type="button"
                    onClick={() => setStudentSig(null)}
                    className="text-[10px] text-rose-600 hover:underline"
                  >
                    ✕
                  </button>
                </div>
              ) : studentSig?.tipo === "fisica" ? (
                <div className="flex flex-wrap items-center gap-1">
                  <span className="text-[10px] font-semibold text-amber-800 bg-amber-50 border border-amber-300 px-1.5 py-0.5 rounded">
                    📄 Papel
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveSignerModal("student")}
                    className="text-[10px] text-brand-700 hover:underline"
                  >
                    Cambiar
                  </button>
                  <button
                    type="button"
                    onClick={() => setStudentSig(null)}
                    className="text-[10px] text-rose-600 hover:underline"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setActiveSignerModal("student")}
                  className="w-full text-center py-1 text-[10px] font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-200 rounded"
                >
                  ✍️ Registrar Firma
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Respaldo Físico DECE y Evidencia de Entrevista Manuscrita */}
      <div className="p-4 bg-amber-50/60 rounded-xl border border-amber-200 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
            <span>📁</span> Respaldo Físico DECE y Entrevista Firmada en Papel (Auditoría Distrital)
          </span>
          <span className="text-[11px] text-amber-700 bg-amber-100/70 border border-amber-300 px-2 py-0.5 rounded-full font-medium">
            Custodia Institucional
          </span>
        </div>
        <p className="text-xs text-amber-800/90 leading-relaxed">
          Para garantizar la validez legal y auditoría distrital física, registra la ubicación de la carpeta física donde reposa la entrevista original firmada a mano, y opcionalmente adjunta copia digitalizada (PDF o foto) con las firmas manuscritas.
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
              placeholder="Ej. Archivador Entrevistas 2026 / Carpeta Caso"
              className="w-full text-xs rounded-lg border border-amber-300 bg-white px-3 py-2 text-slate-800 placeholder-slate-400 focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-amber-900 mb-1">
              Adjuntar Entrevista Física Escaneada (PDF o Imagen)
            </label>
            {physicalEvidenceUrl ? (
              <div className="flex items-center justify-between p-2 bg-white rounded-lg border border-amber-300">
                <span className="text-xs text-emerald-800 font-medium flex items-center gap-1.5 truncate max-w-[200px]">
                  <span>📎</span> {physicalEvidenceName || "Entrevista_Fisica_Escaneada"}
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
                    className="text-xs text-rose-600 hover:underline font-medium"
                  >
                    Quitar
                  </button>
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
            activeSignerModal === "dece"
              ? defaultDeceName || "Profesional DECE"
              : activeSignerModal === "rep"
              ? representativeName || "Representante Legal"
              : intervieweeName || "Estudiante"
          }
          signatoryRole={
            activeSignerModal === "dece"
              ? defaultDeceRole
              : activeSignerModal === "rep"
              ? "Representante Legal"
              : "Estudiante"
          }
          initialData={
            activeSignerModal === "dece"
              ? deceSig
              : activeSignerModal === "rep"
              ? repSig
              : studentSig
          }
          onSave={(data) => {
            if (activeSignerModal === "dece") setDeceSig(data);
            else if (activeSignerModal === "rep") setRepSig(data);
            else if (activeSignerModal === "student") setStudentSig(data);
            setActiveSignerModal(null);
          }}
        />
      )}

      <div className="flex justify-end gap-3 pt-2">
        {cancelHref && (
          <Link href={cancelHref} className="btn-secondary">
            Cancelar
          </Link>
        )}
        <button type="submit" className="btn-primary">
          {isEditing ? "Guardar cambios" : "Guardar entrevista"}
        </button>
      </div>
    </form>
  );
}
