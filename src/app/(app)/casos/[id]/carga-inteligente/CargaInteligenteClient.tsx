"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  type PresenterRole,
  PRESENTER_ROLE_LABELS,
  type CaseFileRow,
  type StudentRow,
} from "@/lib/types";
import {
  analyzeScannedDocumentAction,
  confirmAndSaveOcrDocumentAction,
} from "./actions";

export default function CargaInteligenteClient({
  caseFile,
  student,
  currentUser,
}: {
  caseFile: CaseFileRow;
  student: StudentRow;
  currentUser: { id: string; name: string };
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Estados del flujo
  const [step, setStep] = useState<"UPLOAD" | "REVIEW">("UPLOAD");
  const [error, setError] = useState<string | null>(null);

  // Datos del paso 1 (Carga y Trazabilidad)
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [presentedByRole, setPresentedByRole] = useState<PresenterRole>("DOCENTE_TUTOR");
  const [presentedByName, setPresentedByName] = useState<string>("");
  const [documentTypeFilter, setDocumentTypeFilter] = useState<string>("AUTO");

  // Resultados del OCR
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [activeDocType, setActiveDocType] = useState<"ACTA_CORRESPONSABILIDAD" | "FICHA_ALERTA" | "OTRO">("ACTA_CORRESPONSABILIDAD");
  const [currentPageIndex, setCurrentPageIndex] = useState<number>(0);

  // Controles del visor de imagen
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [rotation, setRotation] = useState<number>(0);

  // Formulario editable para revisión humana
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [updateCentralStudent, setUpdateCentralStudent] = useState<boolean>(true);

  // Manejo de envío para análisis OCR
  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setError("Por favor selecciona un archivo (foto o PDF).");
      return;
    }

    setError(null);
    const fd = new FormData();
    fd.set("file", selectedFile);
    fd.set("document_type", documentTypeFilter);
    fd.set("presented_by_role", presentedByRole);
    fd.set("presented_by_name", presentedByName);

    startTransition(async () => {
      const res = await analyzeScannedDocumentAction(caseFile.id, fd);
      if (res?.error) {
        setError(res.error);
      } else if (res?.success) {
        setAnalysisResult(res);
        const docType = res.effectiveType || "ACTA_CORRESPONSABILIDAD";
        setActiveDocType(docType);

        // Prellenar formulario editable con los datos extraídos
        const initialForm: Record<string, any> = {};
        if (res.extractedData) {
          Object.entries(res.extractedData).forEach(([key, val]: [string, any]) => {
            if (typeof val === "boolean") {
              initialForm[key] = val;
            } else if (val && typeof val === "object" && "value" in val) {
              initialForm[key] = val.value;
            } else {
              initialForm[key] = val || "";
            }
          });
        }
        setFormData(initialForm);
        setStep("REVIEW");
      }
    });
  };

  // Manejo de confirmación y guardado
  const handleConfirmSave = async () => {
    if (!analysisResult) return;
    setError(null);

    startTransition(async () => {
      const res = await confirmAndSaveOcrDocumentAction({
        caseId: caseFile.id,
        documentType: activeDocType,
        presentedByRole,
        presentedByName,
        filename: analysisResult.filename,
        rawBase64File: analysisResult.rawBase64File,
        updateCentralStudent,
        data: formData,
      });

      if (res?.error) {
        setError(res.error);
      } else if (res?.success) {
        router.push(`/casos/${caseFile.id}`);
        router.refresh();
      }
    });
  };

  const handleFieldChange = (key: string, value: any) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-6">
      {/* Cabecera del Módulo */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-md border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">📷</span>
              <h1 className="text-xl font-bold tracking-tight">Carga Inteligente de Documento Físico</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                OCR 100% LOCAL & SEGURO
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl">
              Digitaliza actas o fichas físicas impresas o manuscritas para el estudiante{" "}
              <strong className="text-white">{student.full_name}</strong>. Extracción automática sin APIs externas,
              con revisión obligatoria y conservación del archivo original para trazabilidad legal.
            </p>
          </div>

          <Link
            href={`/casos/${caseFile.id}`}
            className="self-start md:self-center px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white transition"
          >
            ← Volver al Caso
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center gap-2">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PASO 1: FORMULARIO DE CARGA Y AUTORÍA DE ENTREGA                          */}
      {/* ========================================================================= */}
      {step === "UPLOAD" && (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 card p-6 space-y-6">
            <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <span>1️⃣</span> Subir Documento Físico & Trazabilidad de Entrega
            </h2>

            <form onSubmit={handleAnalyze} className="space-y-4">
              {/* Selector de Tipo de Documento */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tipo de Documento Físico *
                  </label>
                  <select
                    value={documentTypeFilter}
                    onChange={(e) => setDocumentTypeFilter(e.target.value)}
                    className="input text-xs w-full bg-white text-slate-900 border border-slate-300"
                  >
                    <option value="AUTO">⚡ Auto-detectar tipo automáticamente</option>
                    <option value="ACTA_CORRESPONSABILIDAD">Acta de Compromiso y Corresponsabilidad</option>
                    <option value="FICHA_ALERTA">Ficha de Notificación de Alerta</option>
                    <option value="OTRO">Otro documento institucional</option>
                  </select>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Si dejas auto-detección, el sistema leerá los encabezados para preseleccionar la plantilla.
                  </p>
                </div>

                {/* SELECTOR OBLIGATORIO DE QUIÉN PRESENTA EL DOCUMENTO */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    ¿Quién presenta o entrega el documento? *
                  </label>
                  <select
                    value={presentedByRole}
                    onChange={(e) => setPresentedByRole(e.target.value as PresenterRole)}
                    className="input text-xs w-full bg-white text-slate-900 border border-slate-300 font-medium"
                    required
                  >
                    {Object.entries(PRESENTER_ROLE_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Trazabilidad de la persona que entrega físicamente la hoja firmada.
                  </p>
                </div>
              </div>

              {/* Nombre de quien entrega */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nombre de quien entrega el documento (opcional)
                  </label>
                  <input
                    type="text"
                    value={presentedByName}
                    onChange={(e) => setPresentedByName(e.target.value)}
                    placeholder="Ej. Lic. Carlos Paredes / Sra. Rosa Cachimuel"
                    className="input text-xs w-full bg-white text-slate-900 placeholder:text-slate-400 border border-slate-300"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Profesional DECE que digitaliza (Sesión actual)
                  </label>
                  <input
                    type="text"
                    disabled
                    value={`${currentUser.name} (Tú)`}
                    className="input text-xs w-full bg-slate-50 text-slate-600 border border-slate-200 cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Zona de Arrastre / Carga de Archivo */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Foto o Escaneo del Documento *
                </label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-300 border-dashed rounded-xl hover:border-indigo-400 transition bg-slate-50/50">
                  <div className="space-y-2 text-center">
                    <div className="text-3xl">📄</div>
                    <div className="flex text-xs text-slate-600 justify-center">
                      <label
                        htmlFor="file-upload"
                        className="relative cursor-pointer bg-white rounded-md font-bold text-indigo-600 hover:text-indigo-500 focus-within:outline-hidden px-2 py-1 border border-indigo-200"
                      >
                        <span>Selecciona un archivo</span>
                        <input
                          id="file-upload"
                          name="file"
                          type="file"
                          accept="image/*,.pdf"
                          required
                          className="sr-only"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              setSelectedFile(e.target.files[0]);
                            }
                          }}
                        />
                      </label>
                      <p className="pl-2 pt-1">o arrástralo aquí</p>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Imágenes (JPG, PNG, WEBP) o PDF escaneado — hasta 15 MB
                    </p>
                    {selectedFile && (
                      <div className="mt-2 p-2 bg-indigo-50 border border-indigo-200 rounded-lg text-xs font-semibold text-indigo-900 flex items-center justify-center gap-2">
                        <span>📎 {selectedFile.name}</span>
                        <span className="text-[10px] text-slate-500">
                          ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="submit"
                  disabled={isPending || !selectedFile}
                  className="btn-primary text-xs py-2 px-4 flex items-center gap-2 disabled:opacity-60"
                >
                  {isPending ? (
                    <>
                      <span className="animate-spin">⏳</span>
                      <span>Procesando OCR Localmente...</span>
                    </>
                  ) : (
                    <>
                      <span>🔍</span>
                      <span>Escanear y Extraer Datos (OCR Local)</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Panel Lateral: Garantías y Arquitectura */}
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 space-y-2">
              <div className="flex items-center gap-2 font-bold text-xs text-emerald-900">
                <span className="text-base">🛡️</span>
                <span>Sin Envío a Terceros (Protección de Menores)</span>
              </div>
              <p className="text-[11px] leading-relaxed text-emerald-800">
                Este sistema utiliza <strong>Tesseract OCR</strong> y el modelo <strong>TrOCR de Microsoft</strong> autoalojados en el propio servidor. Ninguna foto ni dato se transmite a APIs comerciales en la nube.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-950 space-y-2">
              <div className="flex items-center gap-2 font-bold text-xs text-blue-900">
                <span className="text-base">⚖️</span>
                <span>Trazabilidad Legal & Evidencia Física</span>
              </div>
              <p className="text-[11px] leading-relaxed text-blue-800">
                El escaneo original se adjunta automáticamente a la sección de archivos del caso para respaldar cualquier firma manuscrita, fecha o sello físico ante auditorías distritales.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 space-y-2">
              <div className="flex items-center gap-2 font-bold text-xs text-amber-900">
                <span className="text-base">⚠️</span>
                <span>Revisión Humana Obligatoria</span>
              </div>
              <p className="text-[11px] leading-relaxed text-amber-800">
                La letra manuscrita tiene variabilidad natural. En el siguiente paso verás el documento escaneado al lado del formulario para que verifiques y corrijas cualquier dato antes de guardar.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PASO 2: REVISIÓN HUMANA OBLIGATORIA LADO A LADO                           */}
      {/* ========================================================================= */}
      {step === "REVIEW" && analysisResult && (
        <div className="space-y-4">
          {/* Banner de Aviso y Tipo Detectado */}
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-amber-500 text-white flex items-center justify-center text-lg font-bold shrink-0">
                ⚠️
              </div>
              <div>
                <h3 className="font-bold text-xs text-amber-950">
                  Revisión Humana Obligatoria: Verifica los datos antes de incorporar al caso
                </h3>
                <p className="text-[11px] text-amber-900 mt-0.5">
                  Compara la imagen original de la izquierda con los campos de la derecha. Corrige cualquier valor manuscrito que difiera.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-semibold text-slate-600">Tipo:</span>
              <select
                value={activeDocType}
                onChange={(e) => setActiveDocType(e.target.value as any)}
                className="input text-xs bg-white text-slate-900 font-bold border-amber-300 py-1"
              >
                <option value="ACTA_CORRESPONSABILIDAD">Acta de Corresponsabilidad</option>
                <option value="FICHA_ALERTA">Ficha de Notificación de Alerta</option>
                <option value="OTRO">Documento Institucional General</option>
              </select>
            </div>
          </div>

          {/* LADO A LADO: 50% IMAGEN - 50% FORMULARIO */}
          <div className="grid lg:grid-cols-2 gap-6 items-start">
            {/* ------------------------------------------------------------- */}
            {/* COLUMNA IZQUIERDA: VISOR DE DOCUMENTO ESCANEADO               */}
            {/* ------------------------------------------------------------- */}
            <div className="card p-4 space-y-3 sticky top-4 max-h-[85vh] flex flex-col">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-800">
                    🖼️ Documento Escaneado Original
                  </span>
                  {analysisResult.pages.length > 1 && (
                    <span className="text-[11px] text-slate-500 font-medium">
                      Pág. {currentPageIndex + 1} de {analysisResult.pages.length}
                    </span>
                  )}
                </div>

                {/* Herramientas de Zoom y Rotación */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setZoomLevel((z) => Math.max(50, z - 25))}
                    className="px-2 py-0.5 rounded text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
                    title="Alejar (-)"
                  >
                    -
                  </button>
                  <span className="text-[11px] font-mono text-slate-500 w-10 text-center">
                    {zoomLevel}%
                  </span>
                  <button
                    type="button"
                    onClick={() => setZoomLevel((z) => Math.min(250, z + 25))}
                    className="px-2 py-0.5 rounded text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
                    title="Acercar (+)"
                  >
                    +
                  </button>
                  <button
                    type="button"
                    onClick={() => setZoomLevel(100)}
                    className="px-2 py-0.5 rounded text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-600 ml-1"
                    title="Restablecer tamaño"
                  >
                    100%
                  </button>
                  <button
                    type="button"
                    onClick={() => setRotation((r) => (r + 90) % 360)}
                    className="px-2 py-0.5 rounded text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold ml-1"
                    title="Rotar 90° (⟳)"
                  >
                    ⟳
                  </button>
                </div>
              </div>

              {/* Selector de página en PDF multipágina */}
              {analysisResult.pages.length > 1 && (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                  {analysisResult.pages.map((p: any, idx: number) => (
                    <button
                      key={p.pageNumber}
                      type="button"
                      onClick={() => setCurrentPageIndex(idx)}
                      className={`px-2 py-1 rounded text-xs font-semibold transition ${
                        currentPageIndex === idx
                          ? "bg-indigo-600 text-white shadow-xs"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      Página {p.pageNumber}
                    </button>
                  ))}
                </div>
              )}

              {/* Contenedor con Scroll y Zoom */}
              <div className="flex-1 overflow-auto bg-slate-900/90 rounded-xl p-4 flex items-center justify-center min-h-[500px]">
                {analysisResult.pages[currentPageIndex]?.imagePreviewDataUrl ? (
                  <img
                    src={analysisResult.pages[currentPageIndex].imagePreviewDataUrl}
                    alt={`Página ${currentPageIndex + 1}`}
                    style={{
                      transform: `scale(${zoomLevel / 100}) rotate(${rotation}deg)`,
                      transformOrigin: "center center",
                      transition: "transform 0.15s ease-out",
                    }}
                    className="max-w-full shadow-2xl rounded object-contain"
                  />
                ) : (
                  <p className="text-xs text-slate-400">Vista previa no disponible.</p>
                )}
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                <span>Archivo: {analysisResult.filename}</span>
                <span>Confianza OCR: {analysisResult.averageConfidence}%</span>
              </div>
            </div>

            {/* ------------------------------------------------------------- */}
            {/* COLUMNA DERECHA: FORMULARIO EDITABLE PRELLENADO               */}
            {/* ------------------------------------------------------------- */}
            <div className="card p-6 space-y-6">
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    📝 Formulario Editable (Datos Extraídos)
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Modifica cualquier campo para corregir la lectura OCR antes de guardar.
                  </p>
                </div>
                <span className="text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-700 font-bold border border-blue-200">
                  {PRESENTER_ROLE_LABELS[presentedByRole]}
                </span>
              </div>

              {/* ========================================================= */}
              {/* VISTA SEGÚN TIPO: ACTA DE CORRESPONSABILIDAD             */}
              {/* ========================================================= */}
              {activeDocType === "ACTA_CORRESPONSABILIDAD" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Ciudad
                      </label>
                      <input
                        value={formData.city || "Ambato"}
                        onChange={(e) => handleFieldChange("city", e.target.value)}
                        className="input text-xs w-full bg-white text-slate-900 border border-slate-300"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Fecha del Acta *
                      </label>
                      <input
                        type="date"
                        value={formData.act_date || ""}
                        onChange={(e) => handleFieldChange("act_date", e.target.value)}
                        className="input text-xs w-full bg-white text-slate-900 border border-slate-300 font-mono"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Hora
                      </label>
                      <input
                        type="time"
                        value={formData.act_time || "10:00"}
                        onChange={(e) => handleFieldChange("act_time", e.target.value)}
                        className="input text-xs w-full bg-white text-slate-900 border border-slate-300 font-mono"
                      />
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                      Datos del Estudiante
                    </h3>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Nombre Completo del Estudiante *
                      </label>
                      <input
                        value={formData.student_name || ""}
                        onChange={(e) => handleFieldChange("student_name", e.target.value)}
                        className="input text-xs w-full bg-white text-slate-900 border border-slate-300 font-medium"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Grado / Curso *
                        </label>
                        <input
                          value={formData.student_grade || ""}
                          onChange={(e) => handleFieldChange("student_grade", e.target.value)}
                          className="input text-xs w-full bg-white text-slate-900 border border-slate-300"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Paralelo
                        </label>
                        <input
                          value={formData.student_parallel || ""}
                          onChange={(e) => handleFieldChange("student_parallel", e.target.value)}
                          className="input text-xs w-full bg-white text-slate-900 border border-slate-300 uppercase"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Jornada
                        </label>
                        <select
                          value={formData.jornada || "MATUTINA"}
                          onChange={(e) => handleFieldChange("jornada", e.target.value)}
                          className="input text-xs w-full bg-white text-slate-900 border border-slate-300"
                        >
                          <option value="MATUTINA">Matutina</option>
                          <option value="VESPERTINA">Vespertina</option>
                          <option value="NOCTURNA">Nocturna</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                      Datos del Representante Legal
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Nombre del Representante *
                        </label>
                        <input
                          value={formData.representative_name || ""}
                          onChange={(e) => handleFieldChange("representative_name", e.target.value)}
                          className="input text-xs w-full bg-white text-slate-900 border border-slate-300 font-medium"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Cédula de Identidad
                        </label>
                        <input
                          value={formData.representative_id_num || ""}
                          onChange={(e) => handleFieldChange("representative_id_num", e.target.value)}
                          placeholder="10 dígitos"
                          className="input text-xs w-full bg-white text-slate-900 border border-slate-300 font-mono"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Parentesco
                        </label>
                        <input
                          value={formData.representative_relationship || "Madre"}
                          onChange={(e) => handleFieldChange("representative_relationship", e.target.value)}
                          placeholder="Ej. Madre, Padre"
                          className="input text-xs w-full bg-white text-slate-900 border border-slate-300"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Teléfono
                        </label>
                        <input
                          value={formData.representative_phone || ""}
                          onChange={(e) => handleFieldChange("representative_phone", e.target.value)}
                          placeholder="0991234567"
                          className="input text-xs w-full bg-white text-slate-900 border border-slate-300 font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Dirección
                        </label>
                        <input
                          value={formData.representative_address || ""}
                          onChange={(e) => handleFieldChange("representative_address", e.target.value)}
                          className="input text-xs w-full bg-white text-slate-900 border border-slate-300"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Dificultad Detectada / Motivo *
                    </label>
                    <textarea
                      rows={2}
                      value={formData.detected_difficulty || ""}
                      onChange={(e) => handleFieldChange("detected_difficulty", e.target.value)}
                      className="input text-xs w-full bg-white text-slate-900 border border-slate-300"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Compromisos del Representante *
                    </label>
                    <textarea
                      rows={2}
                      value={formData.commitments_representative || ""}
                      onChange={(e) => handleFieldChange("commitments_representative", e.target.value)}
                      className="input text-xs w-full bg-white text-slate-900 border border-slate-300"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Compromisos del Estudiante
                    </label>
                    <textarea
                      rows={2}
                      value={formData.commitments_student || ""}
                      onChange={(e) => handleFieldChange("commitments_student", e.target.value)}
                      className="input text-xs w-full bg-white text-slate-900 border border-slate-300"
                    />
                  </div>
                </div>
              )}

              {/* ========================================================= */}
              {/* VISTA SEGÚN TIPO: FICHA DE NOTIFICACIÓN DE ALERTA        */}
              {/* ========================================================= */}
              {activeDocType === "FICHA_ALERTA" && (
                <div className="space-y-4">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                      Datos del Estudiante
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Estudiante *
                        </label>
                        <input
                          value={formData.student_name || ""}
                          onChange={(e) => handleFieldChange("student_name", e.target.value)}
                          className="input text-xs w-full bg-white text-slate-900 border border-slate-300 font-medium"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Cédula
                        </label>
                        <input
                          value={formData.student_id_num || ""}
                          onChange={(e) => handleFieldChange("student_id_num", e.target.value)}
                          className="input text-xs w-full bg-white text-slate-900 border border-slate-300 font-mono"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Grado / Curso
                        </label>
                        <input
                          value={formData.student_grade || ""}
                          onChange={(e) => handleFieldChange("student_grade", e.target.value)}
                          className="input text-xs w-full bg-white text-slate-900 border border-slate-300"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Paralelo
                        </label>
                        <input
                          value={formData.student_parallel || ""}
                          onChange={(e) => handleFieldChange("student_parallel", e.target.value)}
                          className="input text-xs w-full bg-white text-slate-900 border border-slate-300 uppercase"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Docente Tutor
                        </label>
                        <input
                          value={formData.docente_tutor || ""}
                          onChange={(e) => handleFieldChange("docente_tutor", e.target.value)}
                          className="input text-xs w-full bg-white text-slate-900 border border-slate-300"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 12 DIFICULTADES PSICOSOCIALES */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                      Aspectos de Dificultad Detectados (12 Categorías)
                    </h3>
                    <div className="grid sm:grid-cols-2 gap-2 text-xs">
                      {[
                        { k: "alerta_inestabilidad_emocional", label: "Inestabilidad emocional / Conducta" },
                        { k: "alerta_hijo_ppl", label: "Hijo/a de Persona Privada de Libertad" },
                        { k: "alerta_trabajo_infantil", label: "Trabajo infantil o mendicidad" },
                        { k: "alerta_riesgo_psicosocial", label: "Riesgo psicosocial general" },
                        { k: "alerta_movilidad_humana", label: "Movilidad humana (refugio/migración)" },
                        { k: "alerta_conflictos_intrafamiliares", label: "Conflictos intrafamiliares / Violencia" },
                        { k: "alerta_autolesiones_ideacion", label: "Autolesiones / Ideación suicida" },
                        { k: "alerta_hostigamiento_academico", label: "Hostigamiento académico / Bullying" },
                        { k: "alerta_embarazo_maternidad_paternidad", label: "Embarazo / Maternidad / Paternidad" },
                        { k: "alerta_posible_dependencia_sustancias", label: "Consumo de sustancias / Alcohol" },
                        { k: "alerta_vulneracion_derechos", label: "Vulneración de derechos / Negligencia" },
                        { k: "alerta_otros", label: "Otros aspectos" },
                      ].map((item) => (
                        <label
                          key={item.k}
                          className="flex items-center gap-2 p-1.5 rounded hover:bg-white transition cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={Boolean(formData[item.k])}
                            onChange={(e) => handleFieldChange(item.k, e.target.checked)}
                            className="rounded text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="text-slate-700">{item.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Lugar y Fecha / Hechos y Antecedentes *
                    </label>
                    <textarea
                      rows={3}
                      value={formData.lugar_fecha_hechos || ""}
                      onChange={(e) => handleFieldChange("lugar_fecha_hechos", e.target.value)}
                      className="input text-xs w-full bg-white text-slate-900 border border-slate-300"
                      required
                    />
                  </div>

                  {/* 5 PREGUNTAS TÉCNICAS */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                      Intervención del Docente que Detecta
                    </h3>
                    <div>
                      <label className="block text-xs text-slate-600 mb-1">
                        1. ¿Qué acciones pedagógicas se aplicaron?
                      </label>
                      <input
                        value={formData.intervencion_pregunta_1 || ""}
                        onChange={(e) => handleFieldChange("intervencion_pregunta_1", e.target.value)}
                        className="input text-xs w-full bg-white text-slate-900 border border-slate-300"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-600 mb-1">
                        2. ¿Qué estrategias de diálogo se mantuvieron con el estudiante?
                      </label>
                      <input
                        value={formData.intervencion_pregunta_2 || ""}
                        onChange={(e) => handleFieldChange("intervencion_pregunta_2", e.target.value)}
                        className="input text-xs w-full bg-white text-slate-900 border border-slate-300"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-600 mb-1">
                        3. ¿Se tomó contacto con la familia?
                      </label>
                      <input
                        value={formData.intervencion_pregunta_3 || ""}
                        onChange={(e) => handleFieldChange("intervencion_pregunta_3", e.target.value)}
                        className="input text-xs w-full bg-white text-slate-900 border border-slate-300"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-600 mb-1">
                        4. ¿Qué acuerdos previos se establecieron?
                      </label>
                      <input
                        value={formData.intervencion_pregunta_4 || ""}
                        onChange={(e) => handleFieldChange("intervencion_pregunta_4", e.target.value)}
                        className="input text-xs w-full bg-white text-slate-900 border border-slate-300"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-600 mb-1">
                        5. Sugerencias o apoyo solicitado al DECE
                      </label>
                      <input
                        value={formData.intervencion_pregunta_5 || ""}
                        onChange={(e) => handleFieldChange("intervencion_pregunta_5", e.target.value)}
                        className="input text-xs w-full bg-white text-slate-900 border border-slate-300"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* CHECKBOX DE INTEGRACIÓN A LA FICHA CENTRAL */}
              <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl space-y-1">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={updateCentralStudent}
                    onChange={(e) => setUpdateCentralStudent(e.target.checked)}
                    className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <div>
                    <span className="text-xs font-bold text-indigo-950 block">
                      Actualizar también la Ficha Central del Estudiante ({student.full_name})
                    </span>
                    <span className="text-[11px] text-indigo-800 leading-tight block mt-0.5">
                      Sincroniza los datos detectados (cédula, representante, teléfono, dirección, curso/paralelo) con la ficha central para que todos los demás documentos del caso utilicen la información actualizada.
                    </span>
                  </div>
                </label>
              </div>

              {/* Botones de Acción */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setStep("UPLOAD")}
                  disabled={isPending}
                  className="btn-secondary text-xs"
                >
                  ← Volver a subir otro archivo
                </button>

                <button
                  type="button"
                  onClick={handleConfirmSave}
                  disabled={isPending}
                  className="btn-primary text-xs py-2.5 px-5 flex items-center gap-2 shadow-sm"
                >
                  {isPending ? (
                    <>
                      <span className="animate-spin">⏳</span>
                      <span>Guardando en el Caso...</span>
                    </>
                  ) : (
                    <>
                      <span>💾</span>
                      <span>Confirmar y Guardar en el Caso</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
