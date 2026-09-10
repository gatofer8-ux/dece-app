"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useToastOnChange } from "@/components/Toast";
import Link from "next/link";
import { createObservationSheet, updateObservationSheet, type ActionState } from "../../actions";
import { generateObservationCommentAi, generateObservationGlobalAnalysisAi } from "../ai-actions";
import type { OfficialObservationData, OfficialObservationQuestionItem } from "@/lib/types";
import { OFFICIAL_OBSERVATION_QUESTIONS } from "@/lib/observationSheet";
import VoiceDictationButton from "@/components/VoiceDictationButton";

const initialState: ActionState = { error: null };

function SubmitButton({ isEditing }: { isEditing: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="btn-primary px-6 py-2.5 text-sm font-semibold shadow-sm flex items-center gap-2"
    >
      {pending ? (
        <>
          <span className="animate-spin">⏳</span>
          <span>Guardando ficha oficial...</span>
        </>
      ) : (
        <>
          <span>💾</span>
          <span>{isEditing ? "Guardar cambios" : "Guardar ficha de observación"}</span>
        </>
      )}
    </button>
  );
}

export default function ObservationSheetOfficialForm({
  caseId,
  caseCode,
  studentName,
  studentCourse,
  defaultData,
  sheetId,
  isEditing = false,
}: {
  caseId: string;
  caseCode: string;
  studentName: string;
  studentCourse: string;
  defaultData: OfficialObservationData;
  sheetId?: string;
  isEditing?: boolean;
}) {
  const actionToUse = isEditing
    ? updateObservationSheet.bind(null, sheetId!, caseId)
    : createObservationSheet.bind(null, caseId, "SUPERIOR_BACHILLERATO");

  const [state, formAction] = useFormState(actionToUse, initialState);
  useToastOnChange(state.error, "error");

  // Estados locales de la Ficha Oficial
  const [studentNameVal, setStudentNameVal] = useState(studentName);
  const [studentCourseVal, setStudentCourseVal] = useState(studentCourse);
  const [duration, setDuration] = useState(defaultData.duration || "");
  const [isAulica, setIsAulica] = useState(defaultData.is_aulica || false);
  const [isExterna, setIsExterna] = useState(defaultData.is_externa || false);

  // 17 Preguntas conductuales
  const [questions, setQuestions] = useState<OfficialObservationQuestionItem[]>(() => {
    return OFFICIAL_OBSERVATION_QUESTIONS.map((q) => {
      const found = defaultData.questions?.find((it) => it.id === q.id);
      return {
        id: q.id,
        question: q.question,
        answer: found?.answer || "",
        comment: found?.comment || "",
      };
    });
  });

  // Sección 3: Tipos de atención
  const [requiresDece, setRequiresDece] = useState<"SI" | "NO" | "">(
    defaultData.care_types?.requires_dece?.answer || ""
  );
  const [deceDetail, setDeceDetail] = useState(
    defaultData.care_types?.requires_dece?.detail || ""
  );
  const [requiresOther, setRequiresOther] = useState<"SI" | "NO" | "">(
    defaultData.care_types?.requires_other?.answer || ""
  );
  const [otherDetail, setOtherDetail] = useState(
    defaultData.care_types?.requires_other?.detail || ""
  );

  // Sección 4: Derivaciones
  const [derivarInterna, setDerivarInterna] = useState<"SI" | "NO" | "">(
    defaultData.referrals?.internal?.answer || ""
  );
  const [internaInspeccion, setInternaInspeccion] = useState(
    defaultData.referrals?.internal?.inspeccion || false
  );
  const [internaInclusion, setInternaInclusion] = useState(
    defaultData.referrals?.internal?.inclusion || false
  );
  const [internaMedico, setInternaMedico] = useState(
    defaultData.referrals?.internal?.medico || false
  );
  const [internaOtro, setInternaOtro] = useState(
    defaultData.referrals?.internal?.otro || false
  );
  const [internaOtroDetail, setInternaOtroDetail] = useState(
    defaultData.referrals?.internal?.otro_detail || ""
  );

  const [derivarExterna, setDerivarExterna] = useState<"SI" | "NO" | "">(
    defaultData.referrals?.external?.answer || ""
  );
  const [externaMedica, setExternaMedica] = useState(
    defaultData.referrals?.external?.medica || false
  );
  const [externaPsicologica, setExternaPsicologica] = useState(
    defaultData.referrals?.external?.psicologica || false
  );
  const [externaUdai, setExternaUdai] = useState(
    defaultData.referrals?.external?.udai || false
  );
  const [externaOtro, setExternaOtro] = useState(
    defaultData.referrals?.external?.otro || false
  );
  const [externaOtroDetail, setExternaOtroDetail] = useState(
    defaultData.referrals?.external?.otro_detail || ""
  );

  // Sección 5: Datos de cierre
  const [professionalName, setProfessionalName] = useState(
    defaultData.professional_name || ""
  );
  const [applicationDate, setApplicationDate] = useState(
    defaultData.application_date || new Date().toISOString().slice(0, 10)
  );

  // Estados de IA
  const [generatingQuestionId, setGeneratingQuestionId] = useState<number | null>(null);
  const [generatingGlobal, setGeneratingGlobal] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Manejo de actualización de preguntas
  const updateQuestionAnswer = (id: number, answer: "SI" | "NO" | "") => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, answer } : q))
    );
  };

  const updateQuestionComment = (id: number, comment: string) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, comment } : q))
    );
  };

  // Generador de resumen actual para nutrir a la IA
  const buildCurrentObservationSummary = () => {
    const answered = questions
      .filter((q) => q.answer)
      .map(
        (q) =>
          `• ${q.question} => [${q.answer}] ${q.comment ? `(Comentario: ${q.comment})` : ""}`
      );
    return answered.length > 0
      ? answered.join("\n")
      : "Aún no se han completado respuestas previas en la ficha.";
  };

  // Asistencia IA para un comentario específico
  const handleAiCommentSuggestion = async (qItem: OfficialObservationQuestionItem, guidance?: string) => {
    setGeneratingQuestionId(qItem.id);
    setAiError(null);

    const answeredSummary = buildCurrentObservationSummary();
    const contextSpaces = [
      isAulica ? "Áulica" : "",
      isExterna ? "Espacios externos al aula" : "",
    ]
      .filter(Boolean)
      .join(", ");

    try {
      const res = await generateObservationCommentAi({
        caseId,
        targetQuestion: qItem.question,
        targetQuestionGuidance: guidance,
        userDraft: qItem.comment,
        currentObservationContext: `Duración: ${duration || "No especificada"}; Espacio: ${contextSpaces || "Institucional"}`,
        answeredQuestionsSummary: answeredSummary,
      });

      if (res.error) {
        setAiError(res.error);
      } else if (res.text) {
        updateQuestionComment(qItem.id, res.text);
        if (!qItem.answer) {
          updateQuestionAnswer(qItem.id, "SI");
        }
      }
    } catch (err: any) {
      setAiError(err?.message || "Ocurrió un error al consultar a la IA.");
    } finally {
      setGeneratingQuestionId(null);
    }
  };

  // Análisis Global con IA (Atención requerida y Derivaciones)
  const handleAiGlobalAnalysis = async () => {
    setGeneratingGlobal(true);
    setAiError(null);

    const summary = buildCurrentObservationSummary();

    try {
      const res = await generateObservationGlobalAnalysisAi({
        caseId,
        observationSummary: summary,
      });

      if ("error" in res && res.error) {
        setAiError(res.error);
      } else if (!("error" in res)) {
        if (res.requires_dece) setRequiresDece(res.requires_dece);
        if (res.requires_dece_detail) setDeceDetail(res.requires_dece_detail);
        if (res.requires_other) setRequiresOther(res.requires_other);
        if (res.requires_other_detail) setOtherDetail(res.requires_other_detail);

        if (res.internal_referral_suggested) {
          setDerivarInterna("SI");
          if (res.internal_departments.includes("inspeccion")) setInternaInspeccion(true);
          if (res.internal_departments.includes("inclusion")) setInternaInclusion(true);
          if (res.internal_departments.includes("medico")) setInternaMedico(true);
          if (res.internal_departments.includes("otro") || res.internal_other) {
            setInternaOtro(true);
            if (res.internal_other) setInternaOtroDetail(res.internal_other);
          }
        }

        if (res.external_referral_suggested) {
          setDerivarExterna("SI");
          if (res.external_departments.includes("medica")) setExternaMedica(true);
          if (res.external_departments.includes("psicologica")) setExternaPsicologica(true);
          if (res.external_departments.includes("udai")) setExternaUdai(true);
          if (res.external_departments.includes("otro") || res.external_other) {
            setExternaOtro(true);
            if (res.external_other) setExternaOtroDetail(res.external_other);
          }
        }
      }
    } catch (err: any) {
      setAiError(err?.message || "Ocurrió un error al generar el análisis global.");
    } finally {
      setGeneratingGlobal(false);
    }
  };

  // Payload consolidado para enviar en FormData
  const fullObservationData: OfficialObservationData = {
    duration,
    is_aulica: isAulica,
    is_externa: isExterna,
    questions,
    care_types: {
      requires_dece: { answer: requiresDece, detail: deceDetail },
      requires_other: { answer: requiresOther, detail: otherDetail },
    },
    referrals: {
      internal: {
        answer: derivarInterna,
        inspeccion: internaInspeccion,
        inclusion: internaInclusion,
        medico: internaMedico,
        otro: internaOtro,
        otro_detail: internaOtroDetail,
      },
      external: {
        answer: derivarExterna,
        medica: externaMedica,
        psicologica: externaPsicologica,
        udai: externaUdai,
        otro: externaOtro,
        otro_detail: externaOtroDetail,
      },
    },
    professional_name: professionalName,
    application_date: applicationDate,
  };

  return (
    <form action={formAction} className="space-y-6 max-w-5xl mx-auto pb-24">
      <input type="hidden" name="official_format" value="1" />
      <input
        type="hidden"
        name="observation_data"
        value={JSON.stringify(fullObservationData)}
      />
      <input type="hidden" name="observation_date" value={applicationDate} />

      {/* Alerta de Error de envío */}
      {state.error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800 flex items-start gap-3">
          <span className="text-xl">⚠️</span>
          <div>
            <div className="font-bold">Error al guardar la ficha de observación</div>
            <div>{state.error}</div>
          </div>
        </div>
      )}

      {/* Barra de Asistente IA Global y Volver */}
      <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href={`/casos/${caseId}`}
              className="text-xs text-slate-500 hover:text-slate-800 font-medium flex items-center gap-1"
            >
              <span>←</span>
              <span>Volver al Caso {caseCode}</span>
            </Link>
            <span className="text-slate-300">|</span>
            <span className="text-xs font-semibold text-brand-700 bg-brand-50 px-2 py-0.5 rounded">
              Formato Oficial MINEDUC
            </span>
          </div>
          <h1 className="text-lg font-black text-slate-900 mt-1">
            Ficha de Observación Oficial del Estudiante
          </h1>
          <p className="text-xs text-slate-500">
            {studentName} — Registro confidencial de observación conductual y psicosocial.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            disabled={generatingGlobal}
            onClick={handleAiGlobalAnalysis}
            className="btn-secondary text-xs px-3.5 py-2 font-bold text-purple-700 border-purple-200 bg-purple-50 hover:bg-purple-100 flex items-center gap-1.5 shadow-2xs"
            title="Analiza las preguntas respondidas y sugiere las atenciones requeridas y derivaciones"
          >
            {generatingGlobal ? (
              <>
                <span className="animate-spin">⏳</span>
                <span>Analizando ficha con IA...</span>
              </>
            ) : (
              <>
                <span>✨</span>
                <span>Análisis Global con IA</span>
              </>
            )}
          </button>
        </div>
      </div>

      {aiError && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center justify-between">
          <span>⚠️ {aiError}</span>
          <button
            type="button"
            onClick={() => setAiError(null)}
            className="text-red-500 font-bold ml-2"
          >
            ✖
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* FORMATO OFICIAL CALCA FIEL (TABLA MINISTERIAL) */}
      {/* ========================================================================= */}
      <div className="bg-white border-2 border-slate-800 rounded-xl overflow-hidden shadow-sm text-slate-900">
        
        {/* ENCABEZADO OFICIAL */}
        <div className="border-b-2 border-slate-800 bg-slate-50 p-4 text-center space-y-1">
          <h2 className="text-base font-black tracking-wider uppercase text-slate-900">
            FICHA DE OBSERVACIÓN
          </h2>
          <div className="text-xs font-semibold tracking-wide text-slate-600 uppercase">
            Departamento de Consejería Estudiantil - DECE
          </div>
        </div>

        {/* 1. DATOS INFORMATIVOS GENERALES */}
        <div className="border-b-2 border-slate-800">
          <div className="bg-slate-200/80 px-4 py-2 text-xs font-black uppercase tracking-wider text-slate-900 border-b border-slate-800">
            DATOS INFORMATIVOS GENERALES
          </div>

          <div className="divide-y divide-slate-300 text-xs">
            {/* Nombre de el/la estudiante */}
            <div className="grid grid-cols-1 md:grid-cols-12">
              <div className="md:col-span-4 p-2.5 font-bold bg-slate-50/80 border-r border-slate-300 flex items-center">
                Nombre de el/la estudiante:
              </div>
              <div className="md:col-span-8 p-2">
                <input
                  type="text"
                  value={studentNameVal}
                  onChange={(e) => setStudentNameVal(e.target.value)}
                  className="input input-sm w-full text-xs font-medium"
                  placeholder="Nombre completo del estudiante"
                />
              </div>
            </div>

            {/* Grado o Curso */}
            <div className="grid grid-cols-1 md:grid-cols-12">
              <div className="md:col-span-4 p-2.5 font-bold bg-slate-50/80 border-r border-slate-300 flex items-center">
                Grado o Curso:
              </div>
              <div className="md:col-span-8 p-2">
                <input
                  type="text"
                  value={studentCourseVal}
                  onChange={(e) => setStudentCourseVal(e.target.value)}
                  className="input input-sm w-full text-xs"
                  placeholder="ej. Primer Año de Bachillerato Técnico en Gestión Financiera paralelo 'B'"
                />
              </div>
            </div>

            {/* Duración de la observación */}
            <div className="grid grid-cols-1 md:grid-cols-12">
              <div className="md:col-span-4 p-2.5 font-bold bg-slate-50/80 border-r border-slate-300 flex items-center">
                Duración de la observación:
              </div>
              <div className="md:col-span-8 p-2">
                <input
                  type="text"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="input input-sm w-full text-xs"
                  placeholder="ej. 1:30 o 45 minutos"
                />
              </div>
            </div>

            {/* Espacios de Observación */}
            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-300 p-2.5 bg-slate-50/40">
              <label className="flex items-center gap-3 p-1 cursor-pointer hover:bg-slate-100 rounded">
                <input
                  type="checkbox"
                  checked={isAulica}
                  onChange={(e) => setIsAulica(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-400 text-brand-600 focus:ring-brand-500"
                />
                <span className="font-semibold text-xs text-slate-800">
                  Observación áulica
                </span>
              </label>

              <label className="flex items-center gap-3 p-1 md:pl-4 cursor-pointer hover:bg-slate-100 rounded">
                <input
                  type="checkbox"
                  checked={isExterna}
                  onChange={(e) => setIsExterna(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-400 text-brand-600 focus:ring-brand-500"
                />
                <span className="font-semibold text-xs text-slate-800">
                  Observación en otros espacios externos al aula
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* 2. PREGUNTAS PARA RESPONDER DURANTE LA OBSERVACIÓN (17 REACTIVOS) */}
        <div className="border-b-2 border-slate-800">
          <div className="bg-slate-200/80 px-4 py-2 text-xs font-black uppercase tracking-wider text-slate-900 border-b border-slate-800 flex items-center justify-between">
            <span>Preguntas para responder durante la observación</span>
            <span className="text-[11px] font-normal lowercase text-slate-600">
              (17 preguntas estandarizadas)
            </span>
          </div>

          {/* Encabezados de Columnas de la Tabla Oficial */}
          <div className="grid grid-cols-12 bg-slate-100 border-b border-slate-300 font-bold text-xs text-slate-800">
            <div className="col-span-12 md:col-span-5 p-2.5 border-r border-slate-300">
              Preguntas
            </div>
            <div className="col-span-3 md:col-span-1 p-2.5 text-center border-r border-slate-300">
              Si
            </div>
            <div className="col-span-3 md:col-span-1 p-2.5 text-center border-r border-slate-300">
              No
            </div>
            <div className="col-span-6 md:col-span-5 p-2.5">
              Comentario
            </div>
          </div>

          {/* 17 Filas Oficiales */}
          <div className="divide-y divide-slate-300">
            {questions.map((q, idx) => {
              const guidance = OFFICIAL_OBSERVATION_QUESTIONS[idx]?.guidance;
              const isAiLoading = generatingQuestionId === q.id;

              return (
                <div
                  key={q.id}
                  className={`grid grid-cols-12 transition-colors ${
                    q.answer === "SI"
                      ? "bg-amber-50/30"
                      : q.answer === "NO"
                      ? "bg-slate-50/20"
                      : "hover:bg-slate-50/50"
                  }`}
                >
                  {/* Columna Pregunta */}
                  <div className="col-span-12 md:col-span-5 p-3 border-r border-slate-300 flex flex-col justify-between">
                    <div>
                      <div className="font-bold text-xs text-slate-900 leading-relaxed">
                        {idx + 1}. {q.question}
                      </div>
                      {guidance && (
                        <div className="text-[11px] text-slate-500 mt-1 italic flex items-start gap-1">
                          <span className="text-amber-500 font-bold">💡</span>
                          <span>{guidance}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Columna Si */}
                  <div className="col-span-3 md:col-span-1 p-2 border-r border-slate-300 flex items-center justify-center">
                    <button
                      type="button"
                      onClick={() =>
                        updateQuestionAnswer(q.id, q.answer === "SI" ? "" : "SI")
                      }
                      className={`w-8 h-8 rounded-lg text-xs font-black transition-all flex items-center justify-center ${
                        q.answer === "SI"
                          ? "bg-amber-500 text-white shadow-xs scale-105"
                          : "bg-slate-100 text-slate-500 hover:bg-slate-200 border border-slate-300"
                      }`}
                      title="Marcar SÍ"
                    >
                      {q.answer === "SI" ? "X" : ""}
                    </button>
                  </div>

                  {/* Columna No */}
                  <div className="col-span-3 md:col-span-1 p-2 border-r border-slate-300 flex items-center justify-center">
                    <button
                      type="button"
                      onClick={() =>
                        updateQuestionAnswer(q.id, q.answer === "NO" ? "" : "NO")
                      }
                      className={`w-8 h-8 rounded-lg text-xs font-black transition-all flex items-center justify-center ${
                        q.answer === "NO"
                          ? "bg-slate-700 text-white shadow-xs scale-105"
                          : "bg-slate-100 text-slate-500 hover:bg-slate-200 border border-slate-300"
                      }`}
                      title="Marcar NO"
                    >
                      {q.answer === "NO" ? "X" : ""}
                    </button>
                  </div>

                  {/* Columna Comentario con Dictado por Voz e IA */}
                  <div className="col-span-6 md:col-span-5 p-2.5 flex flex-col justify-between gap-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 font-medium">
                        {q.answer === "SI" ? "Justificación de conducta:" : "Observaciones:"}
                      </span>
                      <div className="flex items-center gap-1">
                        <VoiceDictationButton
                          targetId={`q_comment_${q.id}`}
                          compact
                          onResult={(t) =>
                            updateQuestionComment(
                              q.id,
                              q.comment ? q.comment + " " + t : t
                            )
                          }
                        />

                        <button
                          type="button"
                          disabled={isAiLoading}
                          onClick={() => handleAiCommentSuggestion(q, guidance)}
                          className="px-2 py-0.5 text-[11px] font-bold text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-200 rounded flex items-center gap-1 transition-all"
                          title="Redactar comentario técnico con IA en base al caso"
                        >
                          {isAiLoading ? (
                            <span className="animate-spin text-[10px]">⏳</span>
                          ) : (
                            <span>✨ IA</span>
                          )}
                        </button>
                      </div>
                    </div>

                    <textarea
                      id={`q_comment_${q.id}`}
                      rows={2}
                      value={q.comment}
                      onChange={(e) => updateQuestionComment(q.id, e.target.value)}
                      placeholder="Registra aquí la descripción objetiva de la conducta observada..."
                      className="textarea w-full text-xs font-normal bg-white"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 3. PREGUNTAS PARA IDENTIFICAR LOS POSIBLES TIPOS DE ATENCIÓN REQUERIDA */}
        <div className="border-b-2 border-slate-800">
          <div className="bg-slate-200/80 px-4 py-2 text-xs font-black uppercase tracking-wider text-slate-900 border-b border-slate-800">
            Preguntas para identificar los posibles tipos de atención requerida
          </div>

          <div className="grid grid-cols-12 bg-slate-100 border-b border-slate-300 font-bold text-xs text-slate-800">
            <div className="col-span-12 md:col-span-6 p-2.5 border-r border-slate-300">
              Preguntas
            </div>
            <div className="col-span-3 md:col-span-1 p-2.5 text-center border-r border-slate-300">
              Sí
            </div>
            <div className="col-span-3 md:col-span-1 p-2.5 text-center border-r border-slate-300">
              No
            </div>
            <div className="col-span-6 md:col-span-4 p-2.5">
              Detalle del tipo de intervención requerida si la respuesta es SÍ
            </div>
          </div>

          <div className="divide-y divide-slate-300">
            {/* Atención Psicosocial DECE */}
            <div className="grid grid-cols-12">
              <div className="col-span-12 md:col-span-6 p-3 border-r border-slate-300 font-bold text-xs text-slate-900 leading-relaxed">
                ¿A partir de la observación se identifica que él o la estudiante posiblemente requiere atención psicosocial de parte del Departamento de Consejería Estudiantil?
              </div>

              <div className="col-span-3 md:col-span-1 p-2 border-r border-slate-300 flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => setRequiresDece(requiresDece === "SI" ? "" : "SI")}
                  className={`w-8 h-8 rounded-lg text-xs font-black transition-all flex items-center justify-center ${
                    requiresDece === "SI"
                      ? "bg-amber-500 text-white shadow-xs"
                      : "bg-slate-100 text-slate-500 hover:bg-slate-200 border border-slate-300"
                  }`}
                >
                  {requiresDece === "SI" ? "X" : ""}
                </button>
              </div>

              <div className="col-span-3 md:col-span-1 p-2 border-r border-slate-300 flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => setRequiresDece(requiresDece === "NO" ? "" : "NO")}
                  className={`w-8 h-8 rounded-lg text-xs font-black transition-all flex items-center justify-center ${
                    requiresDece === "NO"
                      ? "bg-slate-700 text-white shadow-xs"
                      : "bg-slate-100 text-slate-500 hover:bg-slate-200 border border-slate-300"
                  }`}
                >
                  {requiresDece === "NO" ? "X" : ""}
                </button>
              </div>

              <div className="col-span-6 md:col-span-4 p-2.5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">Detalle técnico:</span>
                  <VoiceDictationButton
                    targetId="dece_detail_target"
                    compact
                    onResult={(t) => setDeceDetail((prev) => (prev ? prev + " " + t : t))}
                  />
                </div>
                <textarea
                  id="dece_detail_target"
                  rows={3}
                  value={deceDetail}
                  onChange={(e) => setDeceDetail(e.target.value)}
                  placeholder="ej. A partir de la observación e indicadores emocionales observados, se identifica la necesidad de brindar contención emocional, acompañamiento permanente y seguimiento del bienestar integral..."
                  className="textarea w-full text-xs font-normal bg-white"
                />
              </div>
            </div>

            {/* Atención Distinta a la Psicosocial */}
            <div className="grid grid-cols-12">
              <div className="col-span-12 md:col-span-6 p-3 border-r border-slate-300 font-bold text-xs text-slate-900 leading-relaxed">
                ¿A partir de la observación se identifica que él o la estudiante posiblemente requiere una atención distinta a la psicosocial?
                <span className="block font-normal text-[11px] text-slate-500 mt-0.5">
                  Por ejemplo: evaluación psicopedagógica; valoración de lenguaje, valoración médica
                </span>
              </div>

              <div className="col-span-3 md:col-span-1 p-2 border-r border-slate-300 flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => setRequiresOther(requiresOther === "SI" ? "" : "SI")}
                  className={`w-8 h-8 rounded-lg text-xs font-black transition-all flex items-center justify-center ${
                    requiresOther === "SI"
                      ? "bg-amber-500 text-white shadow-xs"
                      : "bg-slate-100 text-slate-500 hover:bg-slate-200 border border-slate-300"
                  }`}
                >
                  {requiresOther === "SI" ? "X" : ""}
                </button>
              </div>

              <div className="col-span-3 md:col-span-1 p-2 border-r border-slate-300 flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => setRequiresOther(requiresOther === "NO" ? "" : "NO")}
                  className={`w-8 h-8 rounded-lg text-xs font-black transition-all flex items-center justify-center ${
                    requiresOther === "NO"
                      ? "bg-slate-700 text-white shadow-xs"
                      : "bg-slate-100 text-slate-500 hover:bg-slate-200 border border-slate-300"
                  }`}
                >
                  {requiresOther === "NO" ? "X" : ""}
                </button>
              </div>

              <div className="col-span-6 md:col-span-4 p-2.5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">Detalle de valoración requerida:</span>
                  <VoiceDictationButton
                    targetId="other_detail_target"
                    compact
                    onResult={(t) => setOtherDetail((prev) => (prev ? prev + " " + t : t))}
                  />
                </div>
                <textarea
                  id="other_detail_target"
                  rows={2}
                  value={otherDetail}
                  onChange={(e) => setOtherDetail(e.target.value)}
                  placeholder="Detallar si requiere evaluación externa (pediátrica, neurológica, audiológica, etc.)..."
                  className="textarea w-full text-xs font-normal bg-white"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 4. PREGUNTAS QUE GUÍAN A IDENTIFICAR LA NECESIDAD DE DERIVAR ESTUDIANTES */}
        <div className="border-b-2 border-slate-800">
          <div className="bg-slate-200/80 px-4 py-2 text-xs font-black uppercase tracking-wider text-slate-900 border-b border-slate-800">
            Preguntas que guían a identificar la necesidad de derivar estudiantes para la atención con otras instancias
          </div>

          <div className="grid grid-cols-12 bg-slate-100 border-b border-slate-300 font-bold text-xs text-slate-800">
            <div className="col-span-12 md:col-span-6 p-2.5 border-r border-slate-300">
              Preguntas
            </div>
            <div className="col-span-3 md:col-span-1 p-2.5 text-center border-r border-slate-300">
              Sí
            </div>
            <div className="col-span-3 md:col-span-1 p-2.5 text-center border-r border-slate-300">
              No
            </div>
            <div className="col-span-6 md:col-span-4 p-2.5">
              Seleccione solo cuando la respuesta sea SÍ
            </div>
          </div>

          <div className="divide-y divide-slate-300 text-xs">
            {/* Derivación Interna */}
            <div className="grid grid-cols-12">
              <div className="col-span-12 md:col-span-6 p-3 border-r border-slate-300 font-bold text-slate-900 leading-relaxed">
                ¿Se requiere derivar al estudiante a un departamento o unidad interna a la institución educativa?
              </div>

              <div className="col-span-3 md:col-span-1 p-2 border-r border-slate-300 flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => setDerivarInterna(derivarInterna === "SI" ? "" : "SI")}
                  className={`w-8 h-8 rounded-lg text-xs font-black transition-all flex items-center justify-center ${
                    derivarInterna === "SI"
                      ? "bg-amber-500 text-white shadow-xs"
                      : "bg-slate-100 text-slate-500 hover:bg-slate-200 border border-slate-300"
                  }`}
                >
                  {derivarInterna === "SI" ? "X" : ""}
                </button>
              </div>

              <div className="col-span-3 md:col-span-1 p-2 border-r border-slate-300 flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => setDerivarInterna(derivarInterna === "NO" ? "" : "NO")}
                  className={`w-8 h-8 rounded-lg text-xs font-black transition-all flex items-center justify-center ${
                    derivarInterna === "NO"
                      ? "bg-slate-700 text-white shadow-xs"
                      : "bg-slate-100 text-slate-500 hover:bg-slate-200 border border-slate-300"
                  }`}
                >
                  {derivarInterna === "NO" ? "X" : ""}
                </button>
              </div>

              <div className="col-span-6 md:col-span-4 p-3 space-y-1.5 bg-slate-50/50">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={internaInspeccion}
                    onChange={(e) => setInternaInspeccion(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-slate-400"
                  />
                  <span>Inspección</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={internaInclusion}
                    onChange={(e) => setInternaInclusion(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-slate-400"
                  />
                  <span>Dpto. Inclusión</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={internaMedico}
                    onChange={(e) => setInternaMedico(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-slate-400"
                  />
                  <span>Dpto. médico</span>
                </label>
                <div className="flex items-center gap-2 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={internaOtro}
                      onChange={(e) => setInternaOtro(e.target.checked)}
                      className="w-3.5 h-3.5 rounded border-slate-400"
                    />
                    <span>Otro:</span>
                  </label>
                  <input
                    type="text"
                    value={internaOtroDetail}
                    onChange={(e) => setInternaOtroDetail(e.target.value)}
                    placeholder="¿Cuál?"
                    className="input input-xs w-full text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Derivación Externa */}
            <div className="grid grid-cols-12">
              <div className="col-span-12 md:col-span-6 p-3 border-r border-slate-300 font-bold text-slate-900 leading-relaxed">
                ¿Se requiere derivar al estudiante a una entidad u organización externa a la institución educativa?
              </div>

              <div className="col-span-3 md:col-span-1 p-2 border-r border-slate-300 flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => setDerivarExterna(derivarExterna === "SI" ? "" : "SI")}
                  className={`w-8 h-8 rounded-lg text-xs font-black transition-all flex items-center justify-center ${
                    derivarExterna === "SI"
                      ? "bg-amber-500 text-white shadow-xs"
                      : "bg-slate-100 text-slate-500 hover:bg-slate-200 border border-slate-300"
                  }`}
                >
                  {derivarExterna === "SI" ? "X" : ""}
                </button>
              </div>

              <div className="col-span-3 md:col-span-1 p-2 border-r border-slate-300 flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => setDerivarExterna(derivarExterna === "NO" ? "" : "NO")}
                  className={`w-8 h-8 rounded-lg text-xs font-black transition-all flex items-center justify-center ${
                    derivarExterna === "NO"
                      ? "bg-slate-700 text-white shadow-xs"
                      : "bg-slate-100 text-slate-500 hover:bg-slate-200 border border-slate-300"
                  }`}
                >
                  {derivarExterna === "NO" ? "X" : ""}
                </button>
              </div>

              <div className="col-span-6 md:col-span-4 p-3 space-y-1.5 bg-slate-50/50">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={externaMedica}
                    onChange={(e) => setExternaMedica(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-slate-400"
                  />
                  <span>Centro atención médica</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={externaPsicologica}
                    onChange={(e) => setExternaPsicologica(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-slate-400"
                  />
                  <span className="font-semibold text-brand-900">Centro atención psicológica</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={externaUdai}
                    onChange={(e) => setExternaUdai(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-slate-400"
                  />
                  <span>UDAI</span>
                </label>
                <div className="flex items-center gap-2 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={externaOtro}
                      onChange={(e) => setExternaOtro(e.target.checked)}
                      className="w-3.5 h-3.5 rounded border-slate-400"
                    />
                    <span>Otro:</span>
                  </label>
                  <input
                    type="text"
                    value={externaOtroDetail}
                    onChange={(e) => setExternaOtroDetail(e.target.value)}
                    placeholder="¿Cuál?"
                    className="input input-xs w-full text-xs"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 5. DATOS DE FIRMA Y RESPONSABILIDAD */}
        <div className="p-4 bg-slate-50/60 space-y-4 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1 md:col-span-2">
              <label className="font-bold text-slate-800">
                Nombre de la o el profesional DECE que realiza la observación:
              </label>
              <input
                type="text"
                value={professionalName}
                onChange={(e) => setProfessionalName(e.target.value)}
                placeholder="ej. Mgtr. Marlon Jácome"
                className="input input-sm w-full text-xs font-semibold"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-800">Fecha de aplicación:</label>
              <input
                type="date"
                value={applicationDate}
                onChange={(e) => setApplicationDate(e.target.value)}
                className="input input-sm w-full text-xs"
              />
            </div>
          </div>

          <div className="p-4 bg-white border border-dashed border-slate-300 rounded-lg text-center space-y-2">
            <div className="text-slate-400 text-[11px]">Espacio para Firma de Responsabilidad</div>
            <div className="w-64 border-b border-slate-800 mx-auto pt-8"></div>
            <div className="font-bold text-slate-800 text-xs">
              {professionalName || "Profesional DECE"}
            </div>
            <div className="text-slate-500 text-[11px]">DECE Institucional</div>
          </div>

          <div className="text-[11px] text-slate-500 italic text-center pt-1 border-t border-slate-200">
            *La información registrada en este documento es confidencial y de uso exclusivo del Departamento de Consejería Estudiantil.
          </div>
        </div>
      </div>

      {/* BARRA INFERIOR DE GUARDADO */}
      <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <Link href={`/casos/${caseId}`} className="btn-secondary text-xs px-4 py-2">
          Cancelar y Volver
        </Link>
        <SubmitButton isEditing={isEditing} />
      </div>
    </form>
  );
}
