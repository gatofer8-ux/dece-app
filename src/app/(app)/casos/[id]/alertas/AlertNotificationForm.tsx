"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { createAlertNotification, updateAlertNotification, type ActionState } from "../../actions";
import { generateAlertInterventionAi } from "../ai-actions";
import type { CaseAlertNotificationRow } from "@/lib/types";
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
          <span>{isEditing ? "Guardando cambios..." : "Generando ficha oficial..."}</span>
        </>
      ) : (
        <>
          <span>💾</span>
          <span>{isEditing ? "Guardar y ver documento oficial" : "Guardar ficha y ver documento oficial"}</span>
        </>
      )}
    </button>
  );
}

export default function AlertNotificationForm({
  caseId,
  caseCode,
  studentName,
  studentIdNum = "",
  studentBirthDate = "",
  studentAge = "",
  representativeName = "",
  representativeAddress = "",
  representativePhone = "",
  studentGrade = "",
  studentParallel = "",
  studentJornada = "MATUTINA",
  docenteTutor = "",
  defaultNotificadorNombre = "",
  defaultNotificadorCargo = "Analista DECE",
  defaultNotificadorContacto = "",
  initialData,
  isEditing = false,
  alertId,
}: {
  caseId: string;
  caseCode: string;
  studentName: string;
  studentIdNum?: string;
  studentBirthDate?: string;
  studentAge?: string;
  representativeName?: string;
  representativeAddress?: string;
  representativePhone?: string;
  studentGrade?: string;
  studentParallel?: string;
  studentJornada?: string;
  docenteTutor?: string;
  defaultNotificadorNombre?: string;
  defaultNotificadorCargo?: string;
  defaultNotificadorContacto?: string;
  initialData?: CaseAlertNotificationRow | null;
  isEditing?: boolean;
  alertId?: string;
}) {
  const formAction = isEditing && alertId
    ? updateAlertNotification.bind(null, alertId, caseId)
    : createAlertNotification.bind(null, caseId);

  const [state, dispatch] = useFormState(formAction, initialState);

  // Estados locales para los campos enriquecidos con IA y dictado por voz
  const [especificarAlerta, setEspecificarAlerta] = useState(initialData?.especificar_alerta || "");
  const [lugarFechaHechos, setLugarFechaHechos] = useState(
    initialData?.lugar_fecha_hechos ||
    `Ambato, ${new Date().toLocaleDateString("es-EC", { day: "2-digit", month: "long", year: "numeric" })}. Se identifican dificultades en el ámbito psicosocial y académico del estudiante.`
  );
  const [pregunta1, setPregunta1] = useState(
    initialData?.intervencion_pregunta_1 ||
    "La estudiante requiere atención psicosocial urgente del DECE para evaluación integral, contención emocional y activación de protocolos de protección."
  );
  const [pregunta2, setPregunta2] = useState(
    initialData?.intervencion_pregunta_2 ||
    "Se evidencian dificultades emocionales, aislamiento social, baja motivación académica y factores de riesgo en el entorno intrafamiliar."
  );
  const [pregunta3, setPregunta3] = useState(
    initialData?.intervencion_pregunta_3 ||
    "Presuntas dinámicas familiares complejas, dificultades de comunicación en el hogar y falta de redes de apoyo afectivo."
  );
  const [pregunta4, setPregunta4] = useState(
    initialData?.intervencion_pregunta_4 ||
    "Se han mantenido diálogos de escucha activa, acompañamiento pedagógico en el aula y comunicación inicial con los representantes legales."
  );
  const [pregunta5, setPregunta5] = useState(
    initialData?.intervencion_pregunta_5 ||
    "Se remite ficha de alerta al Departamento de Consejería Estudiantil para la apertura del expediente institucional y abordaje interdisciplinario."
  );

  // Estados de carga de IA por campo
  const [aiLoading, setAiLoading] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  const handleAiDraft = async (
    key: "pregunta_1" | "pregunta_2" | "pregunta_3" | "pregunta_4" | "pregunta_5" | "hechos" | "especificar",
    setter: (val: string) => void,
    currentText: string
  ) => {
    setAiLoading(key);
    setAiError(null);
    try {
      const res = await generateAlertInterventionAi({
        caseId,
        questionKey: key,
        currentText,
      });
      if (res.error) {
        setAiError(res.error);
      } else if (res.text) {
        setter(res.text);
      }
    } catch (e: any) {
      setAiError(e?.message || "Error al generar sugerencia con IA.");
    } finally {
      setAiLoading(null);
    }
  };

  return (
    <form action={dispatch} className="space-y-6">
      {/* Banner de Estado */}
      <div className="bg-gradient-to-r from-amber-600 to-orange-700 text-white p-5 rounded-2xl shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">⚠️</span>
            <h2 className="text-lg font-bold">
              {isEditing ? "Editar Ficha de Notificación de Alerta" : "Nueva Ficha de Notificación de Alerta"}
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20 text-white border border-white/30">
              Caso: {caseCode}
            </span>
          </div>
          <p className="text-xs text-amber-100 mt-1 max-w-2xl">
            Genera automáticamente la Ficha Oficial de Alerta DECE con tipografía Agency FB idéntica al formato institucional ministerial.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={isEditing && alertId ? `/casos/${caseId}/alertas/${alertId}` : `/casos/${caseId}`}
            className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold transition"
          >
            ← Cancelar
          </Link>
          <SubmitButton isEditing={isEditing} />
        </div>
      </div>

      {state.error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs font-medium flex items-center gap-2">
          <span>⚠️</span>
          <span>{state.error}</span>
        </div>
      )}

      {aiError && (
        <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs font-medium flex items-center justify-between gap-2">
          <span>🤖 {aiError}</span>
          <button type="button" onClick={() => setAiError(null)} className="text-amber-500 hover:text-amber-700">✕</button>
        </div>
      )}

      {/* SECCIÓN 1: DATOS DEL ESTUDIANTE */}
      <div className="card p-5 space-y-4">
        <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
          <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
            <span>👤</span> 1. Información General del Estudiante
          </h3>
          <span className="text-[11px] text-slate-400 font-normal">Campos canónicos de la cabecera</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nombre Completo del Estudiante *
            </label>
            <input
              name="student_name"
              defaultValue={initialData?.student_name || studentName}
              required
              className="input text-xs w-full font-bold"
              placeholder="Ej. Tatiana Lizbeth Toapanta Pilamunga"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Cédula de Identidad
            </label>
            <input
              name="student_id_num"
              defaultValue={initialData?.student_id_num || studentIdNum}
              className="input text-xs w-full font-mono"
              placeholder="1850811231"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Fecha de Nacimiento
            </label>
            <input
              name="student_birth_date"
              defaultValue={initialData?.student_birth_date || studentBirthDate}
              className="input text-xs w-full"
              placeholder="Ej. 28/04/2010"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Edad
            </label>
            <input
              name="student_age"
              defaultValue={initialData?.student_age || studentAge}
              className="input text-xs w-full"
              placeholder="Ej. 15 años"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Grado / Curso *
            </label>
            <input
              name="student_grade"
              defaultValue={initialData?.student_grade || studentGrade}
              required
              className="input text-xs w-full"
              placeholder="Ej. 1ro. BGU"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Paralelo
            </label>
            <input
              name="student_parallel"
              defaultValue={initialData?.student_parallel || studentParallel}
              className="input text-xs w-full uppercase"
              placeholder="B"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Jornada *
            </label>
            <select
              name="jornada"
              defaultValue={initialData?.jornada || studentJornada}
              className="input text-xs w-full font-semibold"
            >
              <option value="MATUTINA">MATUTINA ( M )</option>
              <option value="VESPERTINA">VESPERTINA ( V )</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Docente Tutor Asignado
            </label>
            <input
              name="docente_tutor"
              defaultValue={initialData?.docente_tutor || docenteTutor}
              className="input text-xs w-full"
              placeholder="Ej. Licda. Cecilia Naranjo"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1 border-t border-slate-100">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Representante Legal
            </label>
            <input
              name="representative_name"
              defaultValue={initialData?.representative_name || representativeName}
              className="input text-xs w-full"
              placeholder="Ej. Rosa María Pilamunga Flores"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Teléfono Representante
            </label>
            <input
              name="representative_phone"
              defaultValue={initialData?.representative_phone || representativePhone}
              className="input text-xs w-full font-mono"
              placeholder="0989330713"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Dirección Domiciliaria
            </label>
            <input
              name="representative_address"
              defaultValue={initialData?.representative_address || representativeAddress}
              className="input text-xs w-full"
              placeholder="Ej. Santa Rosa, Sector San Pablo"
            />
          </div>
        </div>
      </div>

      {/* SECCIÓN 2: ASPECTOS DE DIFICULTAD (12 CASILLAS OFICIALES) */}
      <div className="card p-5 space-y-4">
        <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
          <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
            <span>📋</span> 2. Aspectos de Dificultad (Marque los aplicables)
          </h3>
          <span className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded font-semibold">
            12 Categorías Oficiales
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {[
            { id: "alerta_inestabilidad_emocional", label: "Inestabilidad Emocional", icon: "🧠" },
            { id: "alerta_hijo_ppl", label: "Hijo/a de PPL", icon: "⚖️" },
            { id: "alerta_trabajo_infantil", label: "Trabajo infantil", icon: "⚠️" },
            { id: "alerta_riesgo_psicosocial", label: "Riesgo Psicosocial", icon: "🛡️" },
            { id: "alerta_movilidad_humana", label: "Movilidad Humana", icon: "🌐" },
            { id: "alerta_conflictos_intrafamiliares", label: "Conflictos intrafamiliares", icon: "🏠" },
            { id: "alerta_autolesiones_ideacion", label: "Autolesiones / Ideación", icon: "🩹" },
            { id: "alerta_hostigamiento_academico", label: "Hostigamiento Académico", icon: "📚" },
            { id: "alerta_embarazo_maternidad_paternidad", label: "Embarazo / Maternidad / Paternidad", icon: "👶" },
            { id: "alerta_posible_dependencia_sustancias", label: "Posible dependencia sustancias", icon: "💊" },
            { id: "alerta_vulneracion_derechos", label: "Vulneración de Derechos", icon: "🚨" },
            { id: "alerta_otros", label: "Otros motivos", icon: "📌" },
          ].map((item) => {
            const isChecked = initialData ? Boolean((initialData as any)[item.id]) : item.id === "alerta_riesgo_psicosocial";
            return (
              <label
                key={item.id}
                className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 cursor-pointer transition shadow-2xs"
              >
                <input
                  type="checkbox"
                  name={item.id}
                  defaultChecked={isChecked}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
                />
                <div className="text-xs">
                  <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </div>
                </div>
              </label>
            );
          })}
        </div>

        <div className="pt-2">
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-semibold text-slate-700">
              Especificar detalles de la alerta seleccionada:
            </label>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleAiDraft("especificar", setEspecificarAlerta, especificarAlerta)}
                disabled={aiLoading === "especificar"}
                className="text-[11px] font-semibold text-indigo-700 hover:text-indigo-900 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 transition flex items-center gap-1 disabled:opacity-50"
              >
                {aiLoading === "especificar" ? "⏳ Redactando..." : "✨ Sugerir con IA"}
              </button>
              <VoiceDictationButton targetId="especificar_alerta" onResult={(txt) => setEspecificarAlerta(prev => prev ? `${prev} ${txt}` : txt)} />
            </div>
          </div>
          <input
            id="especificar_alerta"
            name="especificar_alerta"
            value={especificarAlerta}
            onChange={(e) => setEspecificarAlerta(e.target.value)}
            className="input text-xs w-full"
            placeholder="Ej. Se observa desmotivación, cambios abruptos de conducta y dificultades emocionales manifestadas en el aula..."
          />
        </div>
      </div>

      {/* SECCIÓN 3: LUGAR Y FECHA / HECHOS Y ANTECEDENTES */}
      <div className="card p-5 space-y-4">
        <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
          <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
            <span>📍</span> 3. Lugar y Fecha / Hechos y Antecedentes
          </h3>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleAiDraft("hechos", setLugarFechaHechos, lugarFechaHechos)}
              disabled={aiLoading === "hechos"}
              className="text-[11px] font-semibold text-indigo-700 hover:text-indigo-900 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 transition flex items-center gap-1 disabled:opacity-50"
            >
              {aiLoading === "hechos" ? "⏳ Redactando..." : "✨ Redactar con IA"}
            </button>
            <VoiceDictationButton targetId="lugar_fecha_hechos" onResult={(txt) => setLugarFechaHechos(prev => prev ? `${prev} ${txt}` : txt)} />
          </div>
        </div>

        <div>
          <textarea
            id="lugar_fecha_hechos"
            name="lugar_fecha_hechos"
            rows={3}
            value={lugarFechaHechos}
            onChange={(e) => setLugarFechaHechos(e.target.value)}
            className="textarea text-xs w-full leading-relaxed"
            placeholder="Indica la ciudad, fecha y la narración fáctica y objetiva de los hechos observados..."
          />
        </div>
      </div>

      {/* SECCIÓN 4: INTERVENCIÓN DOCENTE / PREGUNTAS TÉCNICAS (5 PREGUNTAS) */}
      <div className="card p-5 space-y-5">
        <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <span>📝</span> 4. Intervención Docente (Preguntas Técnicas)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Cuestionario oficial del Ministerio para evaluar la pertinencia y el abordaje de la alerta.
            </p>
          </div>
          <span className="text-[11px] text-brand-700 bg-brand-50 px-2.5 py-1 rounded font-bold border border-brand-200">
            5 Preguntas
          </span>
        </div>

        {/* Pregunta 1 */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-slate-800">
              1. ¿Por qué considera que el caso amerita la intervención del DECE? *
            </label>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleAiDraft("pregunta_1", setPregunta1, pregunta1)}
                disabled={aiLoading === "pregunta_1"}
                className="text-[10px] font-semibold text-indigo-700 hover:text-indigo-900 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 transition flex items-center gap-1 disabled:opacity-50"
              >
                {aiLoading === "pregunta_1" ? "⏳" : "✨ IA"}
              </button>
              <VoiceDictationButton targetId="intervencion_pregunta_1" onResult={(txt) => setPregunta1(prev => prev ? `${prev} ${txt}` : txt)} />
            </div>
          </div>
          <textarea
            id="intervencion_pregunta_1"
            name="intervencion_pregunta_1"
            rows={2}
            value={pregunta1}
            onChange={(e) => setPregunta1(e.target.value)}
            className="textarea text-xs w-full"
            required
          />
        </div>

        {/* Pregunta 2 */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-slate-800">
              2. ¿Cuáles son las dificultades o problemas en el ámbito psicosocial, pedagógico y/o familiar que se presentan en el o la estudiante? *
            </label>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleAiDraft("pregunta_2", setPregunta2, pregunta2)}
                disabled={aiLoading === "pregunta_2"}
                className="text-[10px] font-semibold text-indigo-700 hover:text-indigo-900 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 transition flex items-center gap-1 disabled:opacity-50"
              >
                {aiLoading === "pregunta_2" ? "⏳" : "✨ IA"}
              </button>
              <VoiceDictationButton targetId="intervencion_pregunta_2" onResult={(txt) => setPregunta2(prev => prev ? `${prev} ${txt}` : txt)} />
            </div>
          </div>
          <textarea
            id="intervencion_pregunta_2"
            name="intervencion_pregunta_2"
            rows={2}
            value={pregunta2}
            onChange={(e) => setPregunta2(e.target.value)}
            className="textarea text-xs w-full"
            required
          />
        </div>

        {/* Pregunta 3 */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-slate-800">
              3. ¿Cuáles cree que son las causas para que se estén presentando las dificultades antes señaladas? *
            </label>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleAiDraft("pregunta_3", setPregunta3, pregunta3)}
                disabled={aiLoading === "pregunta_3"}
                className="text-[10px] font-semibold text-indigo-700 hover:text-indigo-900 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 transition flex items-center gap-1 disabled:opacity-50"
              >
                {aiLoading === "pregunta_3" ? "⏳" : "✨ IA"}
              </button>
              <VoiceDictationButton targetId="intervencion_pregunta_3" onResult={(txt) => setPregunta3(prev => prev ? `${prev} ${txt}` : txt)} />
            </div>
          </div>
          <textarea
            id="intervencion_pregunta_3"
            name="intervencion_pregunta_3"
            rows={2}
            value={pregunta3}
            onChange={(e) => setPregunta3(e.target.value)}
            className="textarea text-xs w-full"
            required
          />
        </div>

        {/* Pregunta 4 */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-slate-800">
              4. ¿Qué se ha venido haciendo para superar la situación de dificultad detectada en el o la estudiante? *
            </label>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleAiDraft("pregunta_4", setPregunta4, pregunta4)}
                disabled={aiLoading === "pregunta_4"}
                className="text-[10px] font-semibold text-indigo-700 hover:text-indigo-900 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 transition flex items-center gap-1 disabled:opacity-50"
              >
                {aiLoading === "pregunta_4" ? "⏳" : "✨ IA"}
              </button>
              <VoiceDictationButton targetId="intervencion_pregunta_4" onResult={(txt) => setPregunta4(prev => prev ? `${prev} ${txt}` : txt)} />
            </div>
          </div>
          <textarea
            id="intervencion_pregunta_4"
            name="intervencion_pregunta_4"
            rows={2}
            value={pregunta4}
            onChange={(e) => setPregunta4(e.target.value)}
            className="textarea text-xs w-full"
            required
          />
        </div>

        {/* Pregunta 5 */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-slate-800">
              5. Otras acciones emprendidas o datos relevantes adicionales *
            </label>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleAiDraft("pregunta_5", setPregunta5, pregunta5)}
                disabled={aiLoading === "pregunta_5"}
                className="text-[10px] font-semibold text-indigo-700 hover:text-indigo-900 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 transition flex items-center gap-1 disabled:opacity-50"
              >
                {aiLoading === "pregunta_5" ? "⏳" : "✨ IA"}
              </button>
              <VoiceDictationButton targetId="intervencion_pregunta_5" onResult={(txt) => setPregunta5(prev => prev ? `${prev} ${txt}` : txt)} />
            </div>
          </div>
          <textarea
            id="intervencion_pregunta_5"
            name="intervencion_pregunta_5"
            rows={2}
            value={pregunta5}
            onChange={(e) => setPregunta5(e.target.value)}
            className="textarea text-xs w-full"
            required
          />
        </div>
      </div>

      {/* SECCIÓN 5: INFORMACIÓN DE QUIEN NOTIFICA Y FECHA DE ENTREGA */}
      <div className="card p-5 space-y-4">
        <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
          <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
            <span>✍️</span> 5. Información de quien notifica la alerta
          </h3>
          <span className="text-[11px] text-slate-400 font-normal">Bloque de firma institucional</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nombre y Apellido *
            </label>
            <input
              name="notificador_nombre"
              defaultValue={initialData?.notificador_nombre || defaultNotificadorNombre}
              required
              className="input text-xs w-full font-bold"
              placeholder="Ej. Lcda. Cecilia Naranjo / Analista DECE"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Cargo *
            </label>
            <input
              name="notificador_cargo"
              defaultValue={initialData?.notificador_cargo || defaultNotificadorCargo}
              required
              className="input text-xs w-full"
              placeholder="Analista DECE"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Contacto Telefónico
            </label>
            <input
              name="notificador_contacto"
              defaultValue={initialData?.notificador_contacto || defaultNotificadorContacto}
              className="input text-xs w-full font-mono"
              placeholder="0995590239"
            />
          </div>
        </div>

        <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="w-full sm:w-64">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Fecha de entrega al Dpto. DECE *
            </label>
            <input
              type="date"
              name="fecha_entrega_dece"
              defaultValue={initialData?.fecha_entrega_dece || new Date().toISOString().slice(0, 10)}
              required
              className="input text-xs w-full font-mono font-bold"
            />
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <Link
              href={isEditing && alertId ? `/casos/${caseId}/alertas/${alertId}` : `/casos/${caseId}`}
              className="btn-secondary text-xs"
            >
              Cancelar
            </Link>
            <SubmitButton isEditing={isEditing} />
          </div>
        </div>
      </div>
    </form>
  );
}
