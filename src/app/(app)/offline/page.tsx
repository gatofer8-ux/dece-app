"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  getCachedStudents,
  saveCachedStudents,
  getOutboxItems,
  enqueueOutbox,
  removeOutboxItems,
  getMetadata,
  saveMetadata,
  type CachedStudent,
  type OutboxItem,
} from "@/lib/offline/db";
import { syncOutboxToServer, preloadInstitutionData } from "@/lib/offline/syncEngine";
import { ATTENDEE_TYPE_OPTIONS, actionAxisOptionsFor, type AttendeeType } from "@/lib/dailyAttention";

export default function OfflineHubPage() {
  const [activeTab, setActiveTab] = useState<"attention" | "students" | "interviews" | "alerts" | "outbox">("attention");
  const [isOnline, setIsOnline] = useState(true);
  const [cachedStudents, setCachedStudents] = useState<CachedStudent[]>([]);
  const [outboxItems, setOutboxItems] = useState<OutboxItem[]>([]);
  const [lastPreload, setLastPreload] = useState<string | null>(null);
  const [isPreloading, setIsPreloading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);

  // Student search
  const [studentSearch, setStudentSearch] = useState("");

  // New Student modal/collapse
  const [showNewStudentForm, setShowNewStudentForm] = useState(false);
  const [newStudent, setNewStudent] = useState({
    full_name: "",
    document_type: "CEDULA",
    document_id: "",
    course: "",
    parallel: "",
    jornada: "MATUTINA",
    representative: "",
    rep_phone: "",
    rep_email: "",
    medical_condition: "",
    notes: "",
  });

  // Attention Form
  const [attentionData, setAttentionData] = useState({
    attendee_type: "ESTUDIANTE" as AttendeeType,
    attention_date: new Date().toISOString().slice(0, 10),
    jornada: "MATUTINA",
    student_id: "",
    student_name: "",
    student_grade: "",
    representative_name: "",
    attendee_name: "",
    duration: "40 min",
    reason: "",
    action_axis: "INTERVENCION_INDIVIDUAL",
    observations: "",
  });

  // Interview Form
  const [interviewData, setInterviewData] = useState({
    student_id: "",
    interviewee_full_name: "",
    interviewee_cedula: "",
    course: "",
    family_relation: "Estudiante",
    application_date: new Date().toISOString().slice(0, 10),
    emotional_state: "Tranquilo / Colaborador",
    summary: "",
    commitment: "",
    recommendations: "",
  });

  // Alert Form
  const [alertData, setAlertData] = useState({
    student_id: "",
    student_name: "",
    description: "",
  });

  // Refresh all local data
  const refreshLocalData = async () => {
    try {
      const students = await getCachedStudents();
      setCachedStudents(students);
      const outbox = await getOutboxItems();
      setOutboxItems(outbox);
      const preloadMeta = await getMetadata<string>("last_preload");
      setLastPreload(preloadMeta);
    } catch (err) {
      console.warn("Error leyendo IndexedDB:", err);
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;

    setIsOnline(navigator.onLine);
    refreshLocalData();

    const handleOnline = () => {
      setIsOnline(true);
      setFeedback({ type: "success", message: "Conexión a internet restablecida." });
      refreshLocalData();
    };

    const handleOffline = () => {
      setIsOnline(false);
      setFeedback({ type: "info", message: "Modo sin conexión activado. Los registros se guardarán localmente." });
      refreshLocalData();
    };

    const handleOutboxUpdate = () => {
      refreshLocalData();
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("dece:outbox-updated", handleOutboxUpdate);
    window.addEventListener("dece:sync-completed", handleOutboxUpdate);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("dece:outbox-updated", handleOutboxUpdate);
      window.removeEventListener("dece:sync-completed", handleOutboxUpdate);
    };
  }, []);

  const showNotification = (type: "success" | "error" | "info", message: string) => {
    setFeedback({ type, message });
    setTimeout(() => {
      setFeedback((prev) => (prev?.message === message ? null : prev));
    }, 4500);
  };

  // Preload handler
  const handlePreload = async () => {
    if (!navigator.onLine) {
      showNotification("error", "Necesitas estar conectado a internet para descargar los datos de la institución.");
      return;
    }

    setIsPreloading(true);
    try {
      const res = await preloadInstitutionData();
      await saveMetadata("last_preload", new Date().toISOString());
      await refreshLocalData();
      showNotification("success", `¡Listo! Se precargaron ${res.studentCount} estudiantes en tu dispositivo para uso sin internet.`);
    } catch (err: any) {
      showNotification("error", err?.message || "Error al precargar datos.");
    } finally {
      setIsPreloading(false);
    }
  };

  // Sync handler
  const handleSync = async () => {
    if (!navigator.onLine) {
      showNotification("error", "No hay conexión a internet para sincronizar en este momento.");
      return;
    }

    setIsSyncing(true);
    try {
      const res = await syncOutboxToServer();
      await refreshLocalData();
      if (res.synced > 0) {
        showNotification("success", `¡Sincronización exitosa! Se consolidaron ${res.synced} registros en el DECE.`);
      } else if (res.total === 0) {
        showNotification("info", "No hay registros pendientes por sincronizar.");
      } else {
        showNotification("error", `Hubo errores al sincronizar: ${res.errors.join(", ")}`);
      }
    } catch (err: any) {
      showNotification("error", err?.message || "Error durante la sincronización.");
    } finally {
      setIsSyncing(false);
    }
  };

  // Submit Daily Attention
  const handleSubmitAttention = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!attentionData.reason.trim()) {
      showNotification("error", "El motivo de la atención es obligatorio.");
      return;
    }

    const targetName =
      attentionData.attendee_type === "ESTUDIANTE"
        ? attentionData.student_name || "Estudiante no identificado"
        : attentionData.attendee_type === "REPRESENTANTE"
        ? attentionData.representative_name || attentionData.student_name || "Representante"
        : attentionData.attendee_name || "Docente / Autoridad";

    try {
      await enqueueOutbox({
        action: "CREATE_DAILY_ATTENTION",
        payload: {
          attendee_type: attentionData.attendee_type,
          attention_date: attentionData.attention_date,
          jornada: attentionData.jornada,
          student_name: attentionData.student_name,
          student_grade: attentionData.student_grade,
          representative_name: attentionData.representative_name,
          attendee_name: attentionData.attendee_name,
          duration: attentionData.duration,
          reason: attentionData.reason,
          action_axis: [attentionData.action_axis],
          observations: attentionData.observations,
        },
        summary: `Atención diaria (${attentionData.attendee_type}): ${targetName}`,
      });

      showNotification("success", `Atención para "${targetName}" guardada en la cola offline.`);
      setAttentionData((prev) => ({
        ...prev,
        student_id: "",
        student_name: "",
        student_grade: "",
        representative_name: "",
        attendee_name: "",
        reason: "",
        observations: "",
      }));
      await refreshLocalData();
    } catch (err: any) {
      showNotification("error", err?.message || "Error al guardar atención en cola offline.");
    }
  };

  // Submit New Student Offline
  const handleSubmitStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudent.full_name.trim()) {
      showNotification("error", "El nombre completo del estudiante es obligatorio.");
      return;
    }

    try {
      const studentId = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `offline-st-${Date.now()}`;
      const studentRecord: CachedStudent = {
        id: studentId,
        full_name: newStudent.full_name.trim(),
        document_type: newStudent.document_type,
        document_id: newStudent.document_id.trim() || undefined,
        course: newStudent.course.trim() || undefined,
        parallel: newStudent.parallel.trim().toUpperCase() || undefined,
        jornada: newStudent.jornada,
        representative: newStudent.representative.trim() || undefined,
        rep_phone: newStudent.rep_phone.trim() || undefined,
        rep_email: newStudent.rep_email.trim() || undefined,
        medical_condition: newStudent.medical_condition.trim() || undefined,
        notes: newStudent.notes.trim() || undefined,
      };

      // Guardar en Outbox para enviar al servidor
      await enqueueOutbox({
        action: "CREATE_STUDENT",
        entityId: studentId,
        payload: studentRecord,
        summary: `Nuevo estudiante: ${studentRecord.full_name} (${studentRecord.course || "Sin curso"})`,
      });

      // Añadir inmediatamente a los estudiantes locales de IndexedDB
      const currentList = await getCachedStudents();
      await saveCachedStudents([studentRecord, ...currentList]);

      showNotification("success", `Estudiante "${studentRecord.full_name}" registrado localmente.`);
      setNewStudent({
        full_name: "",
        document_type: "CEDULA",
        document_id: "",
        course: "",
        parallel: "",
        jornada: "MATUTINA",
        representative: "",
        rep_phone: "",
        rep_email: "",
        medical_condition: "",
        notes: "",
      });
      setShowNewStudentForm(false);
      await refreshLocalData();
    } catch (err: any) {
      showNotification("error", err?.message || "Error al registrar estudiante.");
    }
  };

  // Submit Case Interview Offline
  const handleSubmitInterview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!interviewData.interviewee_full_name.trim()) {
      showNotification("error", "El nombre del entrevistado es obligatorio.");
      return;
    }

    try {
      await enqueueOutbox({
        action: "CREATE_INTERVIEW",
        payload: {
          interviewee_full_name: interviewData.interviewee_full_name.trim(),
          interviewee_cedula: interviewData.interviewee_cedula.trim(),
          course: interviewData.course.trim(),
          family_relation: interviewData.family_relation,
          application_date: interviewData.application_date,
          emotional_state: interviewData.emotional_state,
          summary: interviewData.summary.trim(),
          commitment: interviewData.commitment.trim(),
          recommendations: interviewData.recommendations.trim(),
        },
        summary: `Entrevista: ${interviewData.interviewee_full_name} (${interviewData.family_relation})`,
      });

      showNotification("success", `Entrevista a "${interviewData.interviewee_full_name}" guardada offline.`);
      setInterviewData({
        student_id: "",
        interviewee_full_name: "",
        interviewee_cedula: "",
        course: "",
        family_relation: "Estudiante",
        application_date: new Date().toISOString().slice(0, 10),
        emotional_state: "Tranquilo / Colaborador",
        summary: "",
        commitment: "",
        recommendations: "",
      });
      await refreshLocalData();
    } catch (err: any) {
      showNotification("error", err?.message || "Error al guardar entrevista.");
    }
  };

  // Submit Alert Offline
  const handleSubmitAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alertData.description.trim()) {
      showNotification("error", "La descripción de la situación detectada es obligatoria.");
      return;
    }

    try {
      await enqueueOutbox({
        action: "CREATE_ALERT",
        payload: {
          student_id: alertData.student_id || null,
          student_name: alertData.student_name,
          description: alertData.description.trim(),
        },
        summary: `Alerta rápida: ${alertData.student_name || "Sin estudiante especificado"}`,
      });

      showNotification("success", "Alerta temprana guardada en la cola offline.");
      setAlertData({
        student_id: "",
        student_name: "",
        description: "",
      });
      await refreshLocalData();
    } catch (err: any) {
      showNotification("error", err?.message || "Error al guardar alerta.");
    }
  };

  // Delete an item from outbox
  const handleDeleteOutboxItem = async (id: string) => {
    if (!confirm("¿Deseas descartar este registro pendiente de la cola?")) return;
    try {
      await removeOutboxItems([id]);
      showNotification("info", "Registro descartado de la cola.");
      await refreshLocalData();
    } catch (err: any) {
      showNotification("error", "Error al descartar registro.");
    }
  };

  // Filter cached students
  const filteredStudents = useMemo(() => {
    if (!studentSearch.trim()) return cachedStudents;
    const q = studentSearch.toLowerCase().trim();
    return cachedStudents.filter((s) => {
      return (
        (s.full_name && s.full_name.toLowerCase().includes(q)) ||
        (s.document_id && s.document_id.includes(q)) ||
        (s.course && s.course.toLowerCase().includes(q)) ||
        (s.representative && s.representative.toLowerCase().includes(q))
      );
    });
  }, [cachedStudents, studentSearch]);

  // Select student into forms
  const selectStudentForAttention = (student: CachedStudent) => {
    setAttentionData((prev) => ({
      ...prev,
      student_id: student.id,
      student_name: student.full_name,
      student_grade: [student.course, student.parallel].filter(Boolean).join(" - "),
      representative_name: student.representative || "",
      jornada: student.jornada || prev.jornada,
    }));
    setActiveTab("attention");
    showNotification("info", `Estudiante ${student.full_name} cargado en el formulario de atención.`);
  };

  const selectStudentForInterview = (student: CachedStudent) => {
    setInterviewData((prev) => ({
      ...prev,
      student_id: student.id,
      interviewee_full_name: student.full_name,
      interviewee_cedula: student.document_id || "",
      course: [student.course, student.parallel].filter(Boolean).join(" - "),
      family_relation: "Estudiante",
    }));
    setActiveTab("interviews");
    showNotification("info", `Estudiante ${student.full_name} cargado en la entrevista.`);
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">📡</span>
            <h1 className="text-2xl font-bold text-slate-900">Centro de Operaciones Offline (PWA)</h1>
          </div>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl">
            Herramienta para trabajo en territorio e instituciones rurales sin internet. Registra atenciones, estudiantes,
            entrevistas y alertas de forma 100% autónoma. Todo se sincroniza con el DECE central al recuperar cobertura.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handlePreload}
            disabled={isPreloading || !isOnline}
            className={`btn-secondary text-xs flex items-center gap-2 ${!isOnline ? "opacity-50 cursor-not-allowed" : ""}`}
            title={isOnline ? "Descargar catálogo y nómina al dispositivo" : "Requiere conexión a internet"}
          >
            {isPreloading ? (
              <>
                <span className="animate-spin text-sm">⏳</span> Descargando...
              </>
            ) : (
              <>
                <span>📥</span> Precargar Datos del DECE
              </>
            )}
          </button>

          <button
            onClick={handleSync}
            disabled={isSyncing || outboxItems.length === 0 || !isOnline}
            className={`btn-primary text-xs flex items-center gap-2 ${
              !isOnline || outboxItems.length === 0 ? "opacity-60 cursor-not-allowed" : ""
            }`}
            title={!isOnline ? "Sin conexión a internet" : "Consolidar registros en la base central"}
          >
            {isSyncing ? (
              <>
                <span className="animate-spin text-sm">🔄</span> Sincronizando...
              </>
            ) : (
              <>
                <span>🔄</span> Sincronizar Cola ({outboxItems.length})
              </>
            )}
          </button>
        </div>
      </div>

      {/* Notification Toast */}
      {feedback && (
        <div
          className={`p-3.5 rounded-lg text-sm flex items-center justify-between border transition-all ${
            feedback.type === "success"
              ? "bg-emerald-50 text-emerald-900 border-emerald-300"
              : feedback.type === "error"
              ? "bg-rose-50 text-rose-900 border-rose-300"
              : "bg-sky-50 text-sky-900 border-sky-300"
          }`}
        >
          <div className="flex items-center gap-2">
            <span>{feedback.type === "success" ? "✅" : feedback.type === "error" ? "⚠️" : "ℹ️"}</span>
            <span className="font-medium">{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-xs opacity-70 hover:opacity-100">
            ✕
          </button>
        </div>
      )}

      {/* Status & KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card p-4 bg-white border border-slate-200">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Conexión de Red</div>
          <div className="mt-1 flex items-center gap-2">
            <span className={`h-3 w-3 rounded-full ${isOnline ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
            <span className="text-base font-bold text-slate-900">{isOnline ? "En Línea" : "Sin Conexión"}</span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            {isOnline ? "Sincronización activa" : "Guardado en dispositivo"}
          </p>
        </div>

        <div className="card p-4 bg-white border border-slate-200">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Estudiantes en Caché</div>
          <div className="mt-1 text-2xl font-bold text-slate-900">{cachedStudents.length}</div>
          <p className="text-xs text-slate-400 mt-0.5">Disponibles sin internet</p>
        </div>

        <div className="card p-4 bg-white border border-slate-200">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Cola de Envío (Outbox)</div>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-2xl font-bold text-amber-600">{outboxItems.length}</span>
            {outboxItems.length > 0 && <span className="text-xs badge bg-amber-100 text-amber-800">Pendientes</span>}
          </div>
          <p className="text-xs text-slate-400 mt-0.5">Por consolidar con el servidor</p>
        </div>

        <div className="card p-4 bg-white border border-slate-200">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Última Precarga</div>
          <div className="mt-1 text-xs font-semibold text-slate-800 truncate">
            {lastPreload ? new Date(lastPreload).toLocaleString("es-EC") : "Nunca descargado"}
          </div>
          <p className="text-xs text-slate-400 mt-0.5">Nómina y configuración</p>
        </div>
      </div>

      {/* Main Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-2 sm:space-x-4 overflow-x-auto pb-1" aria-label="Tabs">
          <button
            onClick={() => setActiveTab("attention")}
            className={`px-3 py-2 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
              activeTab === "attention"
                ? "border-brand-600 text-brand-700"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            📋 Atención Diaria
          </button>
          <button
            onClick={() => setActiveTab("students")}
            className={`px-3 py-2 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
              activeTab === "students"
                ? "border-brand-600 text-brand-700"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            🎓 Estudiantes ({cachedStudents.length})
          </button>
          <button
            onClick={() => setActiveTab("interviews")}
            className={`px-3 py-2 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
              activeTab === "interviews"
                ? "border-brand-600 text-brand-700"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            📝 Entrevistas
          </button>
          <button
            onClick={() => setActiveTab("alerts")}
            className={`px-3 py-2 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
              activeTab === "alerts"
                ? "border-brand-600 text-brand-700"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            🚩 Alertas
          </button>
          <button
            onClick={() => setActiveTab("outbox")}
            className={`px-3 py-2 text-sm font-medium border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === "outbox"
                ? "border-brand-600 text-brand-700"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <span>📤 Cola de Sincronización</span>
            {outboxItems.length > 0 && (
              <span className="bg-amber-100 text-amber-800 text-xs px-1.5 py-0.5 rounded-full font-bold">
                {outboxItems.length}
              </span>
            )}
          </button>
        </nav>
      </div>

      {/* TAB 1: ATENCIÓN DIARIA OFFLINE */}
      {activeTab === "attention" && (
        <div className="card p-5 bg-white border border-slate-200">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-slate-900">Registro de Atención Diaria Offline</h2>
            <p className="text-xs text-slate-500">
              Registra atenciones en el territorio. Se guardan inmediatamente en tu dispositivo sin necesidad de señal.
            </p>
          </div>

          <form onSubmit={handleSubmitAttention} className="space-y-4">
            {/* Tipo de atendido */}
            <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
              {ATTENDEE_TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setAttentionData((prev) => ({ ...prev, attendee_type: opt.value }))}
                  className={`px-3 py-1.5 text-xs rounded-md font-medium transition-colors ${
                    attentionData.attendee_type === opt.value
                      ? "bg-brand-600 text-white shadow-sm"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Fecha, Duración, Jornada */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Fecha de Atención</label>
                <input
                  type="date"
                  value={attentionData.attention_date}
                  onChange={(e) => setAttentionData({ ...attentionData, attention_date: e.target.value })}
                  className="input text-sm w-full"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Duración</label>
                <input
                  type="text"
                  placeholder="ej. 45 min"
                  value={attentionData.duration}
                  onChange={(e) => setAttentionData({ ...attentionData, duration: e.target.value })}
                  className="input text-sm w-full"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Jornada</label>
                <select
                  value={attentionData.jornada}
                  onChange={(e) => setAttentionData({ ...attentionData, jornada: e.target.value })}
                  className="select text-sm w-full"
                >
                  <option value="MATUTINA">Matutina</option>
                  <option value="VESPERTINA">Vespertina</option>
                  <option value="NOCTURNA">Nocturna</option>
                </select>
              </div>
            </div>

            {/* Campos condicionales por tipo */}
            {attentionData.attendee_type === "ESTUDIANTE" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700">Estudiante *</label>
                    <button
                      type="button"
                      onClick={() => setActiveTab("students")}
                      className="text-xs text-brand-600 hover:underline"
                    >
                      🔍 Buscar en caché
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="Escribe o selecciona estudiante"
                    value={attentionData.student_name}
                    onChange={(e) => setAttentionData({ ...attentionData, student_name: e.target.value })}
                    className="input text-sm w-full"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Grado / Paralelo</label>
                  <input
                    type="text"
                    placeholder="ej. 8vo EGB - A"
                    value={attentionData.student_grade}
                    onChange={(e) => setAttentionData({ ...attentionData, student_grade: e.target.value })}
                    className="input text-sm w-full"
                  />
                </div>
              </div>
            )}

            {attentionData.attendee_type === "REPRESENTANTE" && (
              <div className="space-y-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Nombre del Representante *</label>
                    <input
                      type="text"
                      placeholder="ej. María Morales"
                      value={attentionData.representative_name}
                      onChange={(e) => setAttentionData({ ...attentionData, representative_name: e.target.value })}
                      className="input text-sm w-full"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Estudiante Relacionado</label>
                    <input
                      type="text"
                      placeholder="Nombre del estudiante"
                      value={attentionData.student_name}
                      onChange={(e) => setAttentionData({ ...attentionData, student_name: e.target.value })}
                      className="input text-sm w-full"
                    />
                  </div>
                </div>
              </div>
            )}

            {attentionData.attendee_type === "DOCENTE_AUTORIDAD" && (
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nombre del Docente o Autoridad *</label>
                <input
                  type="text"
                  placeholder="ej. Lic. Carlos Mendoza (Tutor 9no B)"
                  value={attentionData.attendee_name}
                  onChange={(e) => setAttentionData({ ...attentionData, attendee_name: e.target.value })}
                  className="input text-sm w-full"
                  required
                />
              </div>
            )}

            {/* Eje de acción */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Eje de Acción</label>
              <select
                value={attentionData.action_axis}
                onChange={(e) => setAttentionData({ ...attentionData, action_axis: e.target.value })}
                className="select text-sm w-full"
              >
                {actionAxisOptionsFor(attentionData.attendee_type).map((axis) => (
                  <option key={axis.value} value={axis.value}>
                    {axis.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Motivo */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Motivo de la Atención *</label>
              <textarea
                rows={3}
                placeholder="Describe el motivo principal de la consulta o intervención..."
                value={attentionData.reason}
                onChange={(e) => setAttentionData({ ...attentionData, reason: e.target.value })}
                className="input text-sm w-full"
                required
              />
            </div>

            {/* Observaciones y acuerdos */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Observaciones / Acuerdos</label>
              <textarea
                rows={2}
                placeholder="Acuerdos establecidos, seguimiento necesario o recomendaciones dadas..."
                value={attentionData.observations}
                onChange={(e) => setAttentionData({ ...attentionData, observations: e.target.value })}
                className="input text-sm w-full"
              />
            </div>

            <div className="flex justify-end pt-2">
              <button type="submit" className="btn-primary text-sm flex items-center gap-2">
                <span>💾</span> Guardar Atención Offline
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 2: ESTUDIANTES Y REGISTRO LOCAL */}
      {activeTab === "students" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Buscar estudiante por nombre, cédula o curso..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                className="input text-sm w-full pl-9"
              />
              <span className="absolute left-3 top-2.5 text-slate-400">🔍</span>
              {studentSearch && (
                <button
                  onClick={() => setStudentSearch("")}
                  className="absolute right-3 top-2 text-xs text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              )}
            </div>

            <button
              onClick={() => setShowNewStudentForm(!showNewStudentForm)}
              className="btn-primary text-xs flex items-center gap-1.5 self-start sm:self-auto"
            >
              <span>{showNewStudentForm ? "✕ Cerrar Formulario" : "➕ Registrar Nuevo Estudiante"}</span>
            </button>
          </div>

          {/* Collapsible New Student Form */}
          {showNewStudentForm && (
            <div className="card p-5 bg-sky-50/50 border border-sky-200">
              <div className="mb-4">
                <h3 className="text-base font-bold text-slate-900">Registrar Nuevo Estudiante (Offline)</h3>
                <p className="text-xs text-slate-600">
                  El estudiante se guardará inmediatamente en la base local del dispositivo para usarlo en atenciones y se
                  sincronizará con el DECE central al tener internet.
                </p>
              </div>

              <form onSubmit={handleSubmitStudent} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Nombres y Apellidos Completos *</label>
                    <input
                      type="text"
                      placeholder="ej. Pérez Gómez Carlos Andrés"
                      value={newStudent.full_name}
                      onChange={(e) => setNewStudent({ ...newStudent, full_name: e.target.value })}
                      className="input text-sm w-full"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Cédula / Documento</label>
                    <input
                      type="text"
                      placeholder="ej. 0701234567"
                      value={newStudent.document_id}
                      onChange={(e) => setNewStudent({ ...newStudent, document_id: e.target.value })}
                      className="input text-sm w-full"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Grado / Curso</label>
                    <input
                      type="text"
                      placeholder="ej. 1ro BGU"
                      value={newStudent.course}
                      onChange={(e) => setNewStudent({ ...newStudent, course: e.target.value })}
                      className="input text-sm w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Paralelo</label>
                    <input
                      type="text"
                      placeholder="ej. A"
                      value={newStudent.parallel}
                      onChange={(e) => setNewStudent({ ...newStudent, parallel: e.target.value })}
                      className="input text-sm w-full uppercase"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Jornada</label>
                    <select
                      value={newStudent.jornada}
                      onChange={(e) => setNewStudent({ ...newStudent, jornada: e.target.value })}
                      className="select text-sm w-full"
                    >
                      <option value="MATUTINA">Matutina</option>
                      <option value="VESPERTINA">Vespertina</option>
                      <option value="NOCTURNA">Nocturna</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Representante Legal</label>
                    <input
                      type="text"
                      placeholder="ej. Laura Gómez"
                      value={newStudent.representative}
                      onChange={(e) => setNewStudent({ ...newStudent, representative: e.target.value })}
                      className="input text-sm w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Teléfono Representante</label>
                    <input
                      type="text"
                      placeholder="ej. 0991234567"
                      value={newStudent.rep_phone}
                      onChange={(e) => setNewStudent({ ...newStudent, rep_phone: e.target.value })}
                      className="input text-sm w-full"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Condición Médica o NEE</label>
                  <input
                    type="text"
                    placeholder="ej. Asma, discapacidad visual leve..."
                    value={newStudent.medical_condition}
                    onChange={(e) => setNewStudent({ ...newStudent, medical_condition: e.target.value })}
                    className="input text-sm w-full"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setShowNewStudentForm(false)} className="btn-secondary text-xs">
                    Cancelar
                  </button>
                  <button type="submit" className="btn-primary text-xs flex items-center gap-1.5">
                    <span>💾</span> Guardar Estudiante Offline
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Student list */}
          {cachedStudents.length === 0 ? (
            <div className="card p-8 text-center bg-white border border-slate-200">
              <div className="text-4xl mb-2">📥</div>
              <h3 className="font-semibold text-slate-800">No hay estudiantes precargados en este dispositivo</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                Conéctate a internet y presiona &quot;Precargar Datos del DECE&quot; para descargar la nómina de estudiantes, o registra uno
                nuevo con el botón superior.
              </p>
              {isOnline && (
                <button onClick={handlePreload} className="btn-primary text-xs mt-4 inline-flex items-center gap-1.5">
                  <span>📥</span> Descargar Nómina Ahora
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-xs text-slate-500 font-medium px-1">
                Mostrando {filteredStudents.length} de {cachedStudents.length} estudiantes disponibles en este equipo
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {filteredStudents.map((s) => (
                  <div
                    key={s.id}
                    className="card p-3.5 bg-white border border-slate-200 hover:border-brand-300 transition-colors flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-semibold text-slate-900 text-sm leading-tight">{s.full_name}</span>
                        {s.jornada && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                            {s.jornada}
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-slate-500 mt-1 space-y-0.5">
                        {s.document_id && <div>Cédula: <span className="font-mono text-slate-700">{s.document_id}</span></div>}
                        <div>Curso: <span className="font-medium text-slate-700">{s.course || "No asignado"} {s.parallel ? `(${s.parallel})` : ""}</span></div>
                        {s.representative && (
                          <div className="truncate">Rep: <span className="text-slate-700">{s.representative}</span> {s.rep_phone && `(${s.rep_phone})`}</div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-3 pt-2 border-t border-slate-100">
                      <button
                        onClick={() => selectStudentForAttention(s)}
                        className="text-xs text-brand-600 hover:bg-brand-50 px-2 py-1 rounded font-medium transition-colors"
                      >
                        📋 Atender
                      </button>
                      <button
                        onClick={() => selectStudentForInterview(s)}
                        className="text-xs text-slate-600 hover:bg-slate-100 px-2 py-1 rounded font-medium transition-colors"
                      >
                        📝 Entrevistar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: ENTREVISTAS OFFLINE */}
      {activeTab === "interviews" && (
        <div className="card p-5 bg-white border border-slate-200">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-slate-900">Registro de Entrevista / Compromiso Offline</h2>
            <p className="text-xs text-slate-500">
              Registra entrevistas con estudiantes, madres, padres o docentes. Los acuerdos se guardarán en tu equipo.
            </p>
          </div>

          <form onSubmit={handleSubmitInterview} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nombre Completo del Entrevistado *</label>
                <input
                  type="text"
                  placeholder="ej. Juan Carlos Zambrano"
                  value={interviewData.interviewee_full_name}
                  onChange={(e) => setInterviewData({ ...interviewData, interviewee_full_name: e.target.value })}
                  className="input text-sm w-full"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Cédula del Entrevistado</label>
                <input
                  type="text"
                  placeholder="ej. 0709876543"
                  value={interviewData.interviewee_cedula}
                  onChange={(e) => setInterviewData({ ...interviewData, interviewee_cedula: e.target.value })}
                  className="input text-sm w-full"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Parentesco / Rol</label>
                <select
                  value={interviewData.family_relation}
                  onChange={(e) => setInterviewData({ ...interviewData, family_relation: e.target.value })}
                  className="select text-sm w-full"
                >
                  <option value="Estudiante">Estudiante</option>
                  <option value="Madre">Madre</option>
                  <option value="Padre">Padre</option>
                  <option value="Representante Legal">Representante Legal</option>
                  <option value="Docente">Docente</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Curso / Grado</label>
                <input
                  type="text"
                  placeholder="ej. 10mo EGB"
                  value={interviewData.course}
                  onChange={(e) => setInterviewData({ ...interviewData, course: e.target.value })}
                  className="input text-sm w-full"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Fecha</label>
                <input
                  type="date"
                  value={interviewData.application_date}
                  onChange={(e) => setInterviewData({ ...interviewData, application_date: e.target.value })}
                  className="input text-sm w-full"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Estado Emocional / Actitud</label>
              <input
                type="text"
                placeholder="ej. Angustiado, colaborador, receptivo..."
                value={interviewData.emotional_state}
                onChange={(e) => setInterviewData({ ...interviewData, emotional_state: e.target.value })}
                className="input text-sm w-full"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Resumen de lo Tratado *</label>
              <textarea
                rows={3}
                placeholder="Detalle de los puntos expuestos durante la entrevista..."
                value={interviewData.summary}
                onChange={(e) => setInterviewData({ ...interviewData, summary: e.target.value })}
                className="input text-sm w-full"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Compromisos Asumidos</label>
                <textarea
                  rows={2}
                  placeholder="Compromisos adquiridos por el entrevistado o representante..."
                  value={interviewData.commitment}
                  onChange={(e) => setInterviewData({ ...interviewData, commitment: e.target.value })}
                  className="input text-sm w-full"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Recomendaciones del DECE</label>
                <textarea
                  rows={2}
                  placeholder="Pautas brindadas, acuerdos de seguimiento o derivación sugerida..."
                  value={interviewData.recommendations}
                  onChange={(e) => setInterviewData({ ...interviewData, recommendations: e.target.value })}
                  className="input text-sm w-full"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button type="submit" className="btn-primary text-sm flex items-center gap-2">
                <span>💾</span> Guardar Entrevista Offline
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 4: ALERTAS OFFLINE */}
      {activeTab === "alerts" && (
        <div className="card p-5 bg-white border border-slate-200">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-slate-900">Registro Rápido de Alerta Temprana (Offline)</h2>
            <p className="text-xs text-slate-500">
              Registra señales de riesgo, vulneración de derechos o alertas pedagógicas detectadas en territorio.
            </p>
          </div>

          <form onSubmit={handleSubmitAlert} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Estudiante Involucrado</label>
              <input
                type="text"
                placeholder="Nombre del estudiante (o identifícalo según el contexto)"
                value={alertData.student_name}
                onChange={(e) => setAlertData({ ...alertData, student_name: e.target.value })}
                className="input text-sm w-full"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Descripción de la Situación Detectada *</label>
              <textarea
                rows={4}
                placeholder="Describe la situación de alerta, factores de riesgo observados y medidas urgentes adoptadas..."
                value={alertData.description}
                onChange={(e) => setAlertData({ ...alertData, description: e.target.value })}
                className="input text-sm w-full"
                required
              />
            </div>

            <div className="flex justify-end pt-2">
              <button type="submit" className="btn-danger text-sm flex items-center gap-2">
                <span>🚩</span> Guardar Alerta Offline
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 5: COLA DE SINCRONIZACIÓN (OUTBOX) */}
      {activeTab === "outbox" && (
        <div className="space-y-4">
          <div className="card p-5 bg-white border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Cola de Transacciones Locales (Outbox)</h2>
              <p className="text-xs text-slate-600 mt-0.5">
                {outboxItems.length === 0
                  ? "No hay elementos pendientes. Tu dispositivo está al día con el servidor central."
                  : `${outboxItems.length} registros guardados en tu equipo esperando ser consolidados en el DECE.`}
              </p>
            </div>

            {outboxItems.length > 0 && (
              <button
                onClick={handleSync}
                disabled={isSyncing || !isOnline}
                className={`btn-primary text-xs flex items-center gap-2 self-start sm:self-auto ${
                  !isOnline ? "opacity-60 cursor-not-allowed" : ""
                }`}
              >
                {isSyncing ? (
                  <>
                    <span className="animate-spin">🔄</span> Sincronizando...
                  </>
                ) : (
                  <>
                    <span>🔄</span> Sincronizar Todo Ahora
                  </>
                )}
              </button>
            )}
          </div>

          {outboxItems.length === 0 ? (
            <div className="card p-8 text-center bg-white border border-slate-200">
              <div className="text-4xl mb-2">🎉</div>
              <h3 className="font-semibold text-slate-800">¡Todo está sincronizado!</h3>
              <p className="text-xs text-slate-500 mt-1">
                Cualquier registro que crees sin conexión a internet aparecerá aquí y se enviará automáticamente al recuperar señal.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {outboxItems.map((item) => (
                <div
                  key={item.id}
                  className="card p-3.5 bg-white border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                          item.action === "CREATE_STUDENT"
                            ? "bg-blue-100 text-blue-800"
                            : item.action === "CREATE_DAILY_ATTENTION"
                            ? "bg-emerald-100 text-emerald-800"
                            : item.action === "CREATE_INTERVIEW"
                            ? "bg-purple-100 text-purple-800"
                            : "bg-rose-100 text-rose-800"
                        }`}
                      >
                        {item.action === "CREATE_STUDENT"
                          ? "Estudiante"
                          : item.action === "CREATE_DAILY_ATTENTION"
                          ? "Atención Diaria"
                          : item.action === "CREATE_INTERVIEW"
                          ? "Entrevista"
                          : "Alerta"}
                      </span>

                      <span
                        className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                          item.status === "pending"
                            ? "bg-amber-100 text-amber-800"
                            : item.status === "syncing"
                            ? "bg-sky-100 text-sky-800 animate-pulse"
                            : "bg-rose-100 text-rose-800"
                        }`}
                      >
                        {item.status === "pending" ? "Pendiente" : item.status === "syncing" ? "Sincronizando..." : "Error"}
                      </span>

                      <span className="text-xs text-slate-400 font-mono">
                        {new Date(item.createdAt).toLocaleTimeString("es-EC")}
                      </span>
                    </div>

                    <p className="text-sm font-semibold text-slate-800">{item.summary}</p>
                    {item.errorMessage && (
                      <p className="text-xs text-rose-600 font-medium">Motivo: {item.errorMessage}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                      onClick={() => handleDeleteOutboxItem(item.id)}
                      className="text-xs text-rose-600 hover:bg-rose-50 px-2.5 py-1.5 rounded transition-colors"
                      title="Descartar de la cola local"
                    >
                      🗑️ Descartar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
