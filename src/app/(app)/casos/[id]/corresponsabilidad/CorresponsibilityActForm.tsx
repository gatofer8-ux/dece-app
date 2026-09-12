"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useToastOnChange } from "@/components/Toast";
import Link from "next/link";
import { createCorresponsibilityAct, updateCorresponsibilityAct, type ActionState } from "../../actions";
import {
  generateCorresponsibilityDifficultyAi,
  generateCorresponsibilityCommitmentsAi,
} from "../ai-actions";
import type { CaseCorresponsibilityActRow } from "@/lib/types";
import VoiceDictationButton from "@/components/VoiceDictationButton";
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
  tutor?: SignerData;
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

const initialState: ActionState = { error: null };

function SubmitButton({ isEditing }: { isEditing: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-2 px-6 py-2.5 bg-brand-700 hover:bg-brand-800 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-50"
    >
      {pending ? (
        <>
          <span className="animate-spin text-base">⏳</span>
          <span>{isEditing ? "Guardando cambios..." : "Generando acta oficial..."}</span>
        </>
      ) : (
        <>
          <span>💾</span>
          <span>{isEditing ? "Guardar y ver documento oficial" : "Guardar acta y ver documento oficial"}</span>
        </>
      )}
    </button>
  );
}

export default function CorresponsibilityActForm({
  caseId,
  caseCode,
  studentName,
  studentGrade,
  studentParallel = "",
  studentJornada = "MATUTINA",
  representativeName = "",
  representativeIdNum = "",
  representativeRelationship = "Madre",
  representativePhone = "",
  representativeAddress = "",
  initialData,
  isEditing = false,
  actId,
}: {
  caseId: string;
  caseCode: string;
  studentName: string;
  studentGrade: string;
  studentParallel?: string | null;
  studentJornada?: string | null;
  representativeName?: string | null;
  representativeIdNum?: string | null;
  representativeRelationship?: string | null;
  representativePhone?: string | null;
  representativeAddress?: string | null;
  initialData?: Partial<CaseCorresponsibilityActRow>;
  isEditing?: boolean;
  actId?: string;
}) {
  const actionToUse = isEditing
    ? updateCorresponsibilityAct.bind(null, actId!, caseId)
    : createCorresponsibilityAct.bind(null, caseId);

  const [state, formAction] = useFormState(actionToUse, initialState);
  useToastOnChange(state.error, "error");

  // Campos de Comparecencia
  const [city, setCity] = useState(initialData?.city || "Ambato");
  const [actDate, setActDate] = useState(
    initialData?.act_date || new Date().toISOString().slice(0, 10)
  );
  const [actTime, setActTime] = useState(initialData?.act_time || "09:00");

  // Representante Legal
  const [repName, setRepName] = useState(initialData?.representative_name || representativeName || "");
  const [repIdNum, setRepIdNum] = useState(initialData?.representative_id_num || representativeIdNum || "");
  const [repRel, setRepRel] = useState(
    initialData?.representative_relationship || representativeRelationship || "Madre"
  );
  const [repPhone, setRepPhone] = useState(initialData?.representative_phone || representativePhone || "");
  const [repAddress, setRepAddress] = useState(initialData?.representative_address || representativeAddress || "");

  // Estudiante
  const [studName, setStudName] = useState(initialData?.student_name || studentName);
  const [studGrade, setStudGrade] = useState(initialData?.student_grade || studentGrade);
  const [studParallel, setStudParallel] = useState(initialData?.student_parallel || studentParallel || "");
  const [jornada, setJornada] = useState(initialData?.jornada || studentJornada || "MATUTINA");

  // Personal DECE y Autoridad
  const [deceProfName, setDeceProfName] = useState(initialData?.dece_professional_name || "");
  const [tutorAuthName, setTutorAuthName] = useState(initialData?.tutor_authority_name || "");
  const [tutorAuthRole, setTutorAuthRole] = useState(initialData?.tutor_authority_role || "Docente Tutor / Autoridad");

  // Firmas y Respaldo Físico Dual
  const initialSignatures = parseSignaturesJson(initialData?.signatures_json);
  const [repSig, setRepSig] = useState<SignerData | null>(initialSignatures.rep || null);
  const [deceSig, setDeceSig] = useState<SignerData | null>(initialSignatures.dece || null);
  const [tutorSig, setTutorSig] = useState<SignerData | null>(initialSignatures.tutor || null);

  const [physicalFileRef, setPhysicalFileRef] = useState(initialData?.physical_file_ref || "");
  const [physicalEvidenceUrl, setPhysicalEvidenceUrl] = useState(initialData?.physical_evidence_url || "");
  const [physicalEvidenceName, setPhysicalEvidenceName] = useState("");

  const [activeSignerModal, setActiveSignerModal] = useState<"rep" | "dece" | "tutor" | null>(null);

  const signaturesPayload = JSON.stringify({
    rep: repSig ? { ...repSig, roleKey: "rep", nombre: repName, cargo: `Representante Legal (${repRel})`, ci: repIdNum } : null,
    dece: deceSig ? { ...deceSig, roleKey: "dece", nombre: deceProfName, cargo: "Profesional DECE" } : null,
    tutor: tutorSig ? { ...tutorSig, roleKey: "tutor", nombre: tutorAuthName, cargo: tutorAuthRole } : null,
  });

  let overallSignatureType = "PENDIENTE";
  const activeSigs = [repSig, deceSig, tutorSig].filter(Boolean);
  if (activeSigs.length > 0) {
    const hasDig = activeSigs.some((s) => s?.tipo === "digital");
    const hasFis = activeSigs.some((s) => s?.tipo === "fisica") || Boolean(physicalFileRef || physicalEvidenceUrl);
    if (hasDig && hasFis) overallSignatureType = "MIXTA";
    else if (hasDig) overallSignatureType = "DIGITAL";
    else if (hasFis) overallSignatureType = "FISICA";
  } else if (physicalFileRef || physicalEvidenceUrl) {
    overallSignatureType = "FISICA";
  }

  // Campos de Redacción Libre (con Voz e IA)
  const [detectedDifficulty, setDetectedDifficulty] = useState(initialData?.detected_difficulty || "");
  const [agreementsAndCommitments, setAgreementsAndCommitments] = useState(
    initialData?.agreements_and_commitments || initialData?.commitments_representative || ""
  );

  // Estados de Asistencia IA
  const [loadingAiDifficulty, setLoadingAiDifficulty] = useState(false);
  const [loadingAiCommitments, setLoadingAiCommitments] = useState(false);
  const [aiMessage, setAiMessage] = useState<string | null>(null);

  // Manejador para Mejorar Dificultad con IA
  async function handleImproveDifficultyAi() {
    setLoadingAiDifficulty(true);
    setAiMessage(null);
    try {
      const res = await generateCorresponsibilityDifficultyAi({
        caseId,
        conflictType: (initialData?.conflict_type || "OTRO") as any,
        detectedNotes: detectedDifficulty.trim() || undefined,
      });

      if (res && "error" in res && res.error) {
        setAiMessage("⚠️ " + res.error);
      } else if (res && "text" in res && res.text) {
        setDetectedDifficulty(res.text);
        setAiMessage("✨ Dificultad redactada en lenguaje técnico profesional.");
      }
    } catch (err: any) {
      setAiMessage("⚠️ Error de conexión con el servicio de IA.");
    } finally {
      setLoadingAiDifficulty(false);
    }
  }

  // Manejador para Mejorar Acuerdos y Compromisos con IA
  async function handleImproveCommitmentsAi() {
    setLoadingAiCommitments(true);
    setAiMessage(null);
    try {
      const res = await generateCorresponsibilityCommitmentsAi({
        caseId,
        conflictType: (initialData?.conflict_type || "OTRO") as any,
        detectedDifficulty: detectedDifficulty.trim() || "Dificultad identificada en el expediente",
      });

      if (res && "error" in res && res.error) {
        setAiMessage("⚠️ " + res.error);
      } else if (res) {
        const parts: string[] = [];
        if ("representativeCommitments" in res && res.representativeCommitments) {
          parts.push(res.representativeCommitments);
        }
        if ("deceCommitments" in res && res.deceCommitments) {
          parts.push(res.deceCommitments);
        }
        if ("studentCommitments" in res && res.studentCommitments) {
          parts.push(res.studentCommitments);
        }
        if (parts.length > 0) {
          setAgreementsAndCommitments(parts.join("\n\n"));
          setAiMessage("✨ Acuerdos estructurados claramente en base a la situación del estudiante.");
        }
      }
    } catch (err: any) {
      setAiMessage("⚠️ Error al consultar la asistencia de IA.");
    } finally {
      setLoadingAiCommitments(false);
    }
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

  return (
    <form action={formAction} className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Encabezado del Formulario */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4 mb-5">
          <div>
            <Link
              href={isEditing ? `/casos/${caseId}/corresponsabilidad/${actId}` : `/casos/${caseId}`}
              className="text-xs font-semibold text-brand-700 hover:text-brand-800 flex items-center gap-1 mb-1"
            >
              ← {isEditing ? "Cancelar y ver acta" : "Volver al caso"}
            </Link>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <span>✍️</span>
              <span>{isEditing ? "Editar Acta de Corresponsabilidad" : "Nueva Acta de Corresponsabilidad"}</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Caso #{caseCode} &bull; Formato Institucional Oficial (Fidelidad 100% al documento físico)
            </p>
          </div>

          <SubmitButton isEditing={isEditing} />
        </div>

        {/* Notificaciones de error o éxito de IA */}
        {state.error && (
          <div className="p-3 mb-4 rounded-lg bg-red-50 border border-red-200 text-xs font-semibold text-red-700">
            ❌ {state.error}
          </div>
        )}
        {aiMessage && (
          <div className="p-3 mb-4 rounded-lg bg-blue-50 border border-blue-200 text-xs font-medium text-blue-800 flex items-center justify-between">
            <span>{aiMessage}</span>
            <button
              type="button"
              onClick={() => setAiMessage(null)}
              className="text-blue-500 hover:text-blue-700 text-xs ml-2"
            >
              ✕
            </button>
          </div>
        )}

        {/* SECCIÓN 1: IDENTIFICACIÓN Y COMPARECENCIA */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-brand-100 text-brand-800 text-xs font-bold">1</span>
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
              Comparecencia e Identificación Oficial
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Ciudad</label>
              <input
                type="text"
                name="city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                required
                className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 focus:ring-1 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Fecha del Acta</label>
              <input
                type="date"
                name="act_date"
                value={actDate}
                onChange={(e) => setActDate(e.target.value)}
                required
                className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 focus:ring-1 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Hora de Suscripción</label>
              <input
                type="time"
                name="act_time"
                value={actTime}
                onChange={(e) => setActTime(e.target.value)}
                required
                className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 focus:ring-1 focus:ring-brand-500"
              />
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
            <span className="text-xs font-bold text-slate-700 block">Datos del Representante Legal:</span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Nombres y Apellidos Completos</label>
                <input
                  type="text"
                  name="representative_name"
                  value={repName}
                  onChange={(e) => setRepName(e.target.value)}
                  placeholder="Ej. MARÍA CARMEN LÓPEZ PÉREZ"
                  required
                  className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 uppercase font-medium focus:ring-1 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Cédula de Identidad (CI)</label>
                <input
                  type="text"
                  name="representative_id_num"
                  value={repIdNum}
                  onChange={(e) => setRepIdNum(e.target.value)}
                  placeholder="10 dígitos"
                  className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 focus:ring-1 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Teléfono de Contacto</label>
                <input
                  type="text"
                  name="representative_phone"
                  value={repPhone}
                  onChange={(e) => setRepPhone(e.target.value)}
                  placeholder="099..."
                  className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 focus:ring-1 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Parentesco</label>
                <input
                  type="text"
                  name="representative_relationship"
                  value={repRel}
                  onChange={(e) => setRepRel(e.target.value)}
                  placeholder="Madre, Padre, Tutor"
                  className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 focus:ring-1 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Dirección Domiciliaria (Opcional)</label>
                <input
                  type="text"
                  name="representative_address"
                  value={repAddress}
                  onChange={(e) => setRepAddress(e.target.value)}
                  placeholder="Barrio / Calle"
                  className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 focus:ring-1 focus:ring-brand-500"
                />
              </div>
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
            <span className="text-xs font-bold text-slate-700 block">Datos del Estudiante y Régimen:</span>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Estudiante</label>
                <input
                  type="text"
                  name="student_name"
                  value={studName}
                  onChange={(e) => setStudName(e.target.value)}
                  required
                  className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 uppercase font-medium bg-slate-100"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Curso / Grado</label>
                <input
                  type="text"
                  name="student_grade"
                  value={studGrade}
                  onChange={(e) => setStudGrade(e.target.value)}
                  required
                  className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Paralelo</label>
                <input
                  type="text"
                  name="student_parallel"
                  value={studParallel}
                  onChange={(e) => setStudParallel(e.target.value)}
                  placeholder="A, B, C..."
                  className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 uppercase"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">Jornada</label>
              <div className="flex items-center gap-4">
                <label className="inline-flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="radio"
                    name="jornada"
                    value="MATUTINA"
                    checked={jornada.toUpperCase().includes("MAT")}
                    onChange={() => setJornada("MATUTINA")}
                    className="text-brand-600 focus:ring-brand-500"
                  />
                  <span>Matutina: <strong>M ( X ) V ( &nbsp; )</strong></span>
                </label>
                <label className="inline-flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="radio"
                    name="jornada"
                    value="VESPERTINA"
                    checked={jornada.toUpperCase().includes("VESP")}
                    onChange={() => setJornada("VESPERTINA")}
                    className="text-brand-600 focus:ring-brand-500"
                  />
                  <span>Vespertina: <strong>M ( &nbsp; ) V ( X )</strong></span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* SECCIÓN 2: DIFICULTAD DETECTADA */}
        <div className="space-y-3 pt-4 border-t border-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-brand-100 text-brand-800 text-xs font-bold">2</span>
              <label htmlFor="detected_difficulty" className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                Dificultad Detectada
              </label>
            </div>

            <div className="flex items-center gap-2">
              <VoiceDictationButton
                targetId="detected_difficulty"
                onResult={(text) => setDetectedDifficulty(text)}
              />
              <button
                type="button"
                onClick={handleImproveDifficultyAi}
                disabled={loadingAiDifficulty}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
                title="Reformula en lenguaje técnico sin inventar hechos clínicos"
              >
                <span>✨</span>
                <span>{loadingAiDifficulty ? "Redactando..." : "Mejorar con IA"}</span>
              </button>
            </div>
          </div>

          <textarea
            id="detected_difficulty"
            name="detected_difficulty"
            rows={4}
            value={detectedDifficulty}
            onChange={(e) => setDetectedDifficulty(e.target.value)}
            placeholder="Describe los hechos observados, ausentismos, bajas calificaciones o dificultades conductuales/socioemocionales detectadas..."
            required
            className="w-full text-xs rounded-lg border border-slate-300 p-3 leading-relaxed focus:ring-1 focus:ring-brand-500"
          />
          <p className="text-[11px] text-slate-500 italic">
            Puedes dictar directamente con el botón del micrófono o redactar un borrador y hacer clic en "Mejorar con IA" para adaptarlo al estándar técnico del DECE.
          </p>
        </div>

        {/* SECCIÓN 3: ACUERDOS Y COMPROMISOS */}
        <div className="space-y-3 pt-4 border-t border-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-brand-100 text-brand-800 text-xs font-bold">3</span>
              <label htmlFor="agreements_and_commitments" className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                Acuerdos y Compromisos
              </label>
            </div>

            <div className="flex items-center gap-2">
              <VoiceDictationButton
                targetId="agreements_and_commitments"
                onResult={(text) => setAgreementsAndCommitments(text)}
              />
              <button
                type="button"
                onClick={handleImproveCommitmentsAi}
                disabled={loadingAiCommitments}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
                title="Estructura los acuerdos y compromisos en puntos claros y realizables"
              >
                <span>✨</span>
                <span>{loadingAiCommitments ? "Estructurando..." : "Mejorar con IA"}</span>
              </button>
            </div>
          </div>

          <textarea
            id="agreements_and_commitments"
            name="agreements_and_commitments"
            rows={5}
            value={agreementsAndCommitments}
            onChange={(e) => setAgreementsAndCommitments(e.target.value)}
            placeholder="1. El representante legal se compromete a...\n2. El DECE brindará acompañamiento...\n3. El estudiante se compromete a..."
            required
            className="w-full text-xs rounded-lg border border-slate-300 p-3 leading-relaxed focus:ring-1 focus:ring-brand-500 font-mono"
          />
          {/* Campo oculto para compatibilidad con código anterior */}
          <input type="hidden" name="commitments_representative" value={agreementsAndCommitments} />
        </div>

        {/* SECCIÓN 4: FIRMAS INSTITUCIONALES Y RESPALDO FÍSICO */}
        <div className="space-y-5 pt-4 border-t border-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-brand-100 text-brand-800 text-xs font-bold">4</span>
              <div>
                <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                  Suscripción de Compromisos (Firma Digital / Física)
                </h2>
                <p className="text-xs text-slate-500">
                  Todo documento DECE permite firma digital en pantalla o constancia de firma manuscrita con referencia de archivo físico y respaldo escaneado.
                </p>
              </div>
            </div>
          </div>

          {/* Hidden inputs para el servidor */}
          <input type="hidden" name="signatures_json" value={signaturesPayload} />
          <input type="hidden" name="signature_type" value={overallSignatureType} />
          <input type="hidden" name="physical_file_ref" value={physicalFileRef} />
          <input type="hidden" name="physical_evidence_url" value={physicalEvidenceUrl} />

          {/* Bloque de Firmas: 2 Columnas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
            {/* Columna Izquierda: DECE y Autoridad */}
            <div className="space-y-4">
              <span className="text-xs font-bold text-slate-800 block border-b border-slate-200 pb-1">
                Autoridades Institucionales y DECE
              </span>

              {/* Profesional DECE */}
              <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-2.5 shadow-2xs">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Profesional DECE Responsable</label>
                  <input
                    type="text"
                    name="dece_professional_name"
                    value={deceProfName}
                    onChange={(e) => setDeceProfName(e.target.value)}
                    placeholder="Nombre del profesional a cargo"
                    className="w-full text-xs rounded-lg border border-slate-300 px-3 py-1.5 uppercase font-medium"
                  />
                </div>

                {/* Estado de Firma DECE */}
                <div className="pt-1 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100">
                  {deceSig?.tipo === "digital" || deceSig?.firma_data_url ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-300 px-2 py-0.5 rounded flex items-center gap-1">
                        <span>✓</span> Firma digital
                      </span>
                      {deceSig.firma_data_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={deceSig.firma_data_url}
                          alt="Firma DECE"
                          className="h-6 max-w-[80px] object-contain border border-slate-200 rounded px-1 bg-white"
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => setActiveSignerModal("dece")}
                        className="text-xs text-brand-700 hover:underline"
                      >
                        Cambiar
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeceSig(null)}
                        className="text-xs text-rose-600 hover:underline"
                      >
                        Borrar
                      </button>
                    </div>
                  ) : deceSig?.tipo === "fisica" ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-300 px-2 py-0.5 rounded flex items-center gap-1">
                        <span>📄</span> Firma física (Papel)
                      </span>
                      {deceSig.referencia_fisica && (
                        <span className="text-[11px] text-slate-600 truncate max-w-[130px]">
                          📁 {deceSig.referencia_fisica}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => setActiveSignerModal("dece")}
                        className="text-xs text-brand-700 hover:underline"
                      >
                        Cambiar
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeceSig(null)}
                        className="text-xs text-rose-600 hover:underline"
                      >
                        Borrar
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setActiveSignerModal("dece")}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-200 rounded-md transition-colors"
                    >
                      <span>✍️</span> Registrar Firma (Digital o Física)
                    </button>
                  )}
                </div>
              </div>

              {/* Docente Tutor o Autoridad */}
              <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-2.5 shadow-2xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Nombre Tutor o Autoridad</label>
                    <input
                      type="text"
                      name="tutor_authority_name"
                      value={tutorAuthName}
                      onChange={(e) => setTutorAuthName(e.target.value)}
                      placeholder="Ej. LIC. MARCO PÉREZ"
                      className="w-full text-xs rounded-lg border border-slate-300 px-3 py-1.5 uppercase font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Cargo / Rol</label>
                    <input
                      type="text"
                      name="tutor_authority_role"
                      value={tutorAuthRole}
                      onChange={(e) => setTutorAuthRole(e.target.value)}
                      placeholder="Docente Tutor / Rector"
                      className="w-full text-xs rounded-lg border border-slate-300 px-3 py-1.5"
                    />
                  </div>
                </div>

                {/* Estado de Firma Tutor/Autoridad */}
                <div className="pt-1 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100">
                  {tutorSig?.tipo === "digital" || tutorSig?.firma_data_url ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-300 px-2 py-0.5 rounded flex items-center gap-1">
                        <span>✓</span> Firma digital
                      </span>
                      {tutorSig.firma_data_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={tutorSig.firma_data_url}
                          alt="Firma Tutor"
                          className="h-6 max-w-[80px] object-contain border border-slate-200 rounded px-1 bg-white"
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => setActiveSignerModal("tutor")}
                        className="text-xs text-brand-700 hover:underline"
                      >
                        Cambiar
                      </button>
                      <button
                        type="button"
                        onClick={() => setTutorSig(null)}
                        className="text-xs text-rose-600 hover:underline"
                      >
                        Borrar
                      </button>
                    </div>
                  ) : tutorSig?.tipo === "fisica" ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-300 px-2 py-0.5 rounded flex items-center gap-1">
                        <span>📄</span> Firma física (Papel)
                      </span>
                      {tutorSig.referencia_fisica && (
                        <span className="text-[11px] text-slate-600 truncate max-w-[130px]">
                          📁 {tutorSig.referencia_fisica}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => setActiveSignerModal("tutor")}
                        className="text-xs text-brand-700 hover:underline"
                      >
                        Cambiar
                      </button>
                      <button
                        type="button"
                        onClick={() => setTutorSig(null)}
                        className="text-xs text-rose-600 hover:underline"
                      >
                        Borrar
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setActiveSignerModal("tutor")}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-200 rounded-md transition-colors"
                    >
                      <span>✍️</span> Registrar Firma (Digital o Física)
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Columna Derecha: Representante Legal */}
            <div className="space-y-4">
              <span className="text-xs font-bold text-slate-800 block border-b border-slate-200 pb-1">
                Representante Legal o Padre/Madre
              </span>

              <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-2.5 shadow-2xs">
                <div className="text-xs space-y-1">
                  <p className="font-semibold text-slate-800 border-b border-dashed border-slate-200 pb-1">
                    REPRESENTANTE LEGAL
                  </p>
                  <p className="text-slate-600">
                    <span className="font-medium">Nombres:</span> {repName || "—"}
                  </p>
                  <p className="text-slate-600">
                    <span className="font-medium">Cédula:</span> {repIdNum || "—"}
                  </p>
                  <p className="text-slate-600">
                    <span className="font-medium">Parentesco:</span> {repRel || "—"}
                  </p>
                  <p className="text-slate-600">
                    <span className="font-medium">Teléfono:</span> {repPhone || "—"}
                  </p>
                </div>

                {/* Estado de Firma Representante */}
                <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100">
                  {repSig?.tipo === "digital" || repSig?.firma_data_url ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-300 px-2 py-0.5 rounded flex items-center gap-1">
                        <span>✓</span> Firma digital
                      </span>
                      {repSig.firma_data_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={repSig.firma_data_url}
                          alt="Firma Representante"
                          className="h-6 max-w-[80px] object-contain border border-slate-200 rounded px-1 bg-white"
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => setActiveSignerModal("rep")}
                        className="text-xs text-brand-700 hover:underline"
                      >
                        Cambiar
                      </button>
                      <button
                        type="button"
                        onClick={() => setRepSig(null)}
                        className="text-xs text-rose-600 hover:underline"
                      >
                        Borrar
                      </button>
                    </div>
                  ) : repSig?.tipo === "fisica" ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-300 px-2 py-0.5 rounded flex items-center gap-1">
                        <span>📄</span> Firma física (Papel)
                      </span>
                      {repSig.referencia_fisica && (
                        <span className="text-[11px] text-slate-600 truncate max-w-[130px]">
                          📁 {repSig.referencia_fisica}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => setActiveSignerModal("rep")}
                        className="text-xs text-brand-700 hover:underline"
                      >
                        Cambiar
                      </button>
                      <button
                        type="button"
                        onClick={() => setRepSig(null)}
                        className="text-xs text-rose-600 hover:underline"
                      >
                        Borrar
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setActiveSignerModal("rep")}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-200 rounded-md transition-colors"
                    >
                      <span>✍️</span> Registrar Firma (Digital o Física)
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Sección de Respaldo Físico General DECE y Auditoría */}
          <div className="p-4 bg-amber-50/60 rounded-xl border border-amber-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                <span>📁</span> Respaldo Físico DECE y Evidencia de Auditoría Distrital
              </span>
              <span className="text-[11px] text-amber-700 bg-amber-100/70 border border-amber-300 px-2 py-0.5 rounded-full font-medium">
                Normativa Ministerial DECE
              </span>
            </div>
            <p className="text-xs text-amber-800/90 leading-relaxed">
              Para cumplir con las auditorías distritales del Ministerio de Educación, deja constancia de la carpeta o archivador físico institucional donde reposa el documento original impreso, y opcionalmente adjunta el escaneo o fotografía del acta firmada y sellada.
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
                  placeholder="Ej. Carpeta DECE 2026 / Ficha C-14 / Estante 2"
                  className="w-full text-xs rounded-lg border border-amber-300 bg-white px-3 py-2 text-slate-800 placeholder-slate-400 focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-amber-900 mb-1">
                  Adjuntar Escaneo o Foto del Acta Física (PDF o Imagen)
                </label>
                {physicalEvidenceUrl ? (
                  <div className="flex items-center justify-between p-2 bg-white rounded-lg border border-amber-300">
                    <span className="text-xs text-emerald-800 font-medium flex items-center gap-1.5 truncate max-w-[200px]">
                      <span>📎</span> {physicalEvidenceName || "Acta_Fisica_Escaneada"}
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
        </div>

        {/* Modal de Firma Dual para el firmante activo */}
        <DualSignatureModal
          isOpen={activeSignerModal !== null}
          title={
            activeSignerModal === "rep"
              ? "Firma del Representante Legal"
              : activeSignerModal === "dece"
              ? "Firma del Profesional DECE"
              : "Firma del Tutor o Autoridad"
          }
          signatoryName={
            activeSignerModal === "rep"
              ? repName || "Representante Legal"
              : activeSignerModal === "dece"
              ? deceProfName || "Profesional DECE"
              : tutorAuthName || "Docente Tutor / Autoridad"
          }
          signatoryRole={
            activeSignerModal === "rep"
              ? `Representante Legal (${repRel})`
              : activeSignerModal === "dece"
              ? "Profesional DECE"
              : tutorAuthRole || "Tutor / Autoridad"
          }
          initialData={
            (activeSignerModal === "rep"
              ? repSig
              : activeSignerModal === "dece"
              ? deceSig
              : tutorSig) || undefined
          }
          onSave={(data) => {
            if (activeSignerModal === "rep") setRepSig(data);
            else if (activeSignerModal === "dece") setDeceSig(data);
            else if (activeSignerModal === "tutor") setTutorSig(data);
            // Si registró referencia física y el campo general está vacío, auto-rellenar
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

        {/* Barra inferior fija de acciones */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-slate-200">
          <Link
            href={isEditing ? `/casos/${caseId}/corresponsabilidad/${actId}` : `/casos/${caseId}`}
            className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 text-center border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Cancelar
          </Link>
          <SubmitButton isEditing={isEditing} />
        </div>
      </div>
    </form>
  );
}
