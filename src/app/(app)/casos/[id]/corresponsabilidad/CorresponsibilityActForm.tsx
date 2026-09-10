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

        {/* SECCIÓN 4: FIRMAS Y AUTORIDADES */}
        <div className="space-y-4 pt-4 border-t border-slate-200">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-brand-100 text-brand-800 text-xs font-bold">4</span>
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
              Bloque de Firmas Institucionales (2 Columnas)
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
            {/* Columna Izquierda: DECE y Autoridad */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-slate-800 block border-b border-slate-200 pb-1">
                Columna Izquierda (DECE y Tutor/Autoridad)
              </span>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Nombre del Profesional DECE</label>
                <input
                  type="text"
                  name="dece_professional_name"
                  value={deceProfName}
                  onChange={(e) => setDeceProfName(e.target.value)}
                  placeholder="Nombre del profesional a cargo"
                  className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 uppercase"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Nombre de Tutor o Autoridad</label>
                <input
                  type="text"
                  name="tutor_authority_name"
                  value={tutorAuthName}
                  onChange={(e) => setTutorAuthName(e.target.value)}
                  placeholder="Ej. LIC. MARCO PÉREZ"
                  className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 uppercase"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Cargo / Rol</label>
                <input
                  type="text"
                  name="tutor_authority_role"
                  value={tutorAuthRole}
                  onChange={(e) => setTutorAuthRole(e.target.value)}
                  placeholder="Docente Tutor / Inspector / Rector"
                  className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>
            </div>

            {/* Columna Derecha: Representante Legal */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-slate-800 block border-b border-slate-200 pb-1">
                Columna Derecha (Representante Legal)
              </span>
              <div className="p-3 bg-white rounded-lg border border-slate-200 text-xs space-y-1.5">
                <p className="font-semibold text-slate-800 text-center pb-1 border-b border-dashed border-slate-200">
                  REPRESENTANTE LEGAL
                </p>
                <p className="text-slate-600">
                  <span className="font-medium">Nombres completos:</span> {repName || "—"}
                </p>
                <p className="text-slate-600">
                  <span className="font-medium">Cédula:</span> {repIdNum || "—"}
                </p>
                <p className="text-slate-600">
                  <span className="font-medium">Teléfono:</span> {repPhone || "—"}
                </p>
                <p className="text-[11px] text-slate-400 mt-2 italic">
                  * Estos datos se sincronizan automáticamente con la comparecencia de la sección 1.
                </p>
              </div>
            </div>
          </div>
        </div>

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
