"use client";

import React, { useEffect, useRef, useState } from "react";

export interface DualSignatureData {
  tipo: "digital" | "fisica";
  firma_data_url?: string;
  referencia_fisica?: string;
  fecha_firma?: string;
  respaldo_archivo_url?: string;
  respaldo_nombre?: string;
  observacion_firma?: string;
  signer_id?: string;
  role?: string;
  signer_name?: string;
}

export interface DualSignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: DualSignatureData) => void;
  initialData?: Partial<DualSignatureData> | null;
  signatoryName?: string;
  signatoryRole?: string;
  title?: string;
}

/**
 * Modal Universal de Firma y Respaldo Institucional DECE:
 * - Pestaña 1: Firma Digital en Pantalla (Canvas HTML5 táctil de alta definición).
 * - Pestaña 2: Firma Física / Manuscrita en Papel (registro de archivo en carpeta y adjunto fotográfico/PDF con sellos).
 */
export default function DualSignatureModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  signatoryName,
  signatoryRole,
  title = "Registro de Firma y Respaldo Institucional",
}: DualSignatureModalProps) {
  const [mode, setMode] = useState<"digital" | "fisica">("digital");

  // Estado para Firma Digital
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [existingDataUrl, setExistingDataUrl] = useState<string | undefined>(undefined);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  // Estado para Firma Física
  const [referenciaFisica, setReferenciaFisica] = useState("");
  const [fechaFirma, setFechaFirma] = useState("");
  const [observacionFirma, setObservacionFirma] = useState("");
  const [respaldoUrl, setRespaldoUrl] = useState<string | undefined>(undefined);
  const [respaldoNombre, setRespaldoNombre] = useState<string | undefined>(undefined);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Inicializar al abrir
  useEffect(() => {
    if (!isOpen) return;

    const initialTipo = initialData?.tipo || (initialData?.firma_data_url ? "digital" : "digital");
    setMode(initialTipo);

    // Cargar datos existentes si los hay
    setExistingDataUrl(initialData?.firma_data_url);
    setHasDrawn(Boolean(initialData?.firma_data_url));

    setReferenciaFisica(initialData?.referencia_fisica || "");
    setFechaFirma(initialData?.fecha_firma || new Date().toISOString().split("T")[0]);
    setObservacionFirma(initialData?.observacion_firma || "");
    setRespaldoUrl(initialData?.respaldo_archivo_url);
    setRespaldoNombre(initialData?.respaldo_nombre);

    if (initialTipo === "digital" && !initialData?.firma_data_url) {
      const timer = setTimeout(() => {
        initCanvas();
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [isOpen, initialData]);

  const initCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    ctx.strokeStyle = "#0f172a"; // Azul oscuro formal
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  };

  // Re-inicializar canvas al cambiar a pestaña digital
  useEffect(() => {
    if (isOpen && mode === "digital" && !existingDataUrl) {
      const timer = setTimeout(initCanvas, 50);
      return () => clearTimeout(timer);
    }
  }, [mode, isOpen, existingDataUrl]);

  if (!isOpen) return null;

  // Manejo de eventos del Canvas
  const getCoordinates = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);

    const point = getCoordinates(e);
    lastPointRef.current = point;
    setIsDrawing(true);

    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(point.x, point.y);
      ctx.lineTo(point.x, point.y);
      ctx.stroke();
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const currentPoint = getCoordinates(e);
    const lastPoint = lastPointRef.current || currentPoint;

    ctx.beginPath();
    ctx.moveTo(lastPoint.x, lastPoint.y);
    ctx.lineTo(currentPoint.x, currentPoint.y);
    ctx.stroke();

    lastPointRef.current = currentPoint;
    setHasDrawn(true);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (canvas && canvas.hasPointerCapture(e.pointerId)) {
      canvas.releasePointerCapture(e.pointerId);
    }
    setIsDrawing(false);
    lastPointRef.current = null;
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
    setExistingDataUrl(undefined);
    lastPointRef.current = null;
  };

  // Manejo de carga de archivo físico escaneado o fotografiado
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert("El archivo no debe exceder los 10 MB.");
      return;
    }

    setRespaldoNombre(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setRespaldoUrl(result);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    if (mode === "digital") {
      let finalDataUrl = existingDataUrl;
      if (!finalDataUrl && canvasRef.current && hasDrawn) {
        finalDataUrl = canvasRef.current.toDataURL("image/png");
      }

      if (!finalDataUrl) {
        alert("Por favor dibuja tu firma antes de aplicar.");
        return;
      }

      onSave({
        tipo: "digital",
        firma_data_url: finalDataUrl,
        fecha_firma: new Date().toISOString().split("T")[0],
      });
    } else {
      onSave({
        tipo: "fisica",
        referencia_fisica: referenciaFisica.trim() || undefined,
        fecha_firma: fechaFirma || new Date().toISOString().split("T")[0],
        observacion_firma: observacionFirma.trim() || undefined,
        respaldo_archivo_url: respaldoUrl,
        respaldo_nombre: respaldoNombre,
      });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-fade-in no-print">
      <div
        className="card w-full max-w-lg bg-white dark:bg-slate-900 p-5 shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Encabezado */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 mb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <span>✍️</span>
              <span>{title}</span>
            </h3>
            {signatoryName && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Firmante: <span className="font-semibold text-slate-800 dark:text-slate-200">{signatoryName}</span>
                {signatoryRole && <span className="text-slate-400 dark:text-slate-500"> ({signatoryRole})</span>}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal"
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Selector de Modalidad: Digital vs Física */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl mb-4 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setMode("digital")}
            className={`py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              mode === "digital"
                ? "bg-white dark:bg-slate-900 text-brand-700 dark:text-cyan-400 shadow-xs font-bold"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            <span>✍️</span>
            <span>Firma Digital en Pantalla</span>
          </button>
          <button
            type="button"
            onClick={() => setMode("fisica")}
            className={`py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              mode === "fisica"
                ? "bg-white dark:bg-slate-900 text-brand-700 dark:text-cyan-400 shadow-xs font-bold"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            <span>📄</span>
            <span>Firma Física (Respaldo en Papel)</span>
          </button>
        </div>

        {/* PESTAÑA 1: FIRMA DIGITAL */}
        {mode === "digital" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <p>Dibuja el trazo con el dedo en pantalla táctil, lápiz stylus o mouse:</p>
              {existingDataUrl && (
                <button
                  type="button"
                  onClick={() => {
                    setExistingDataUrl(undefined);
                    setHasDrawn(false);
                    setTimeout(initCanvas, 50);
                  }}
                  className="text-xs text-brand-600 dark:text-cyan-400 hover:underline font-medium cursor-pointer"
                >
                  Volver a firmar
                </button>
              )}
            </div>

            {existingDataUrl ? (
              <div className="rounded-xl border-2 border-emerald-300 dark:border-emerald-700/60 bg-emerald-50/40 dark:bg-emerald-950/20 p-4 text-center">
                <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 block mb-2">
                  ✓ Firma digital capturada y registrada
                </span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={existingDataUrl}
                  alt="Firma actual"
                  className="max-h-28 mx-auto object-contain border border-emerald-200 dark:border-emerald-800 rounded bg-white dark:bg-slate-800 px-3 py-1"
                />
              </div>
            ) : (
              <div className="relative rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/50 overflow-hidden select-none touch-none">
                <canvas
                  ref={canvasRef}
                  className="w-full h-44 cursor-crosshair block"
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                />
                <div className="absolute bottom-7 left-8 right-8 border-b border-slate-300 dark:border-slate-700 pointer-events-none flex justify-end">
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono select-none">
                    Firma aquí ✕
                  </span>
                </div>
              </div>
            )}

            {!existingDataUrl && (
              <div className="flex justify-start">
                <button
                  type="button"
                  onClick={handleClear}
                  disabled={!hasDrawn}
                  className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5 disabled:opacity-40"
                >
                  <span>🧹</span> Limpiar Lienzo
                </button>
              </div>
            )}

            <div className="p-2.5 rounded-lg bg-cyan-50/80 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-800/50 text-[11px] text-cyan-800 dark:text-cyan-300">
              💡 La firma digital se almacenará con estampa de tiempo oficial y se incluirá en las impresiones y descargas en Word/PDF.
            </div>
          </div>
        )}

        {/* PESTAÑA 2: FIRMA FÍSICA Y RESPALDO EN PAPEL */}
        {mode === "fisica" && (
          <div className="space-y-3.5">
            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-xl text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
              <span className="font-bold block mb-1">📋 Constancia de Firma Física / Manuscrita:</span>
              Esta opción deja constancia de que el documento fue suscrito de forma presencial con esfero y sello institucional. Se generarán las líneas de firma reglamentarias para archivo físico en el expediente del DECE.
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label text-xs font-semibold">Fecha de firma física:</label>
                <input
                  type="date"
                  value={fechaFirma}
                  onChange={(e) => setFechaFirma(e.target.value)}
                  className="input text-xs"
                />
              </div>

              <div>
                <label className="label text-xs font-semibold">Ubicación / Carpeta de Archivo Físico:</label>
                <input
                  type="text"
                  placeholder="Ej. Carpeta DECE 2026 / Ficha #14"
                  value={referenciaFisica}
                  onChange={(e) => setReferenciaFisica(e.target.value)}
                  className="input text-xs"
                />
              </div>
            </div>

            <div>
              <label className="label text-xs font-semibold">Observación de la firma (Opcional):</label>
              <input
                type="text"
                placeholder="Ej. Firmado en tinta azul con huella dactilar del representante"
                value={observacionFirma}
                onChange={(e) => setObservacionFirma(e.target.value)}
                className="input text-xs"
              />
            </div>

            {/* Zona de Carga de Respaldo Físico (Foto / PDF escaneado) */}
            <div className="border-t border-slate-200 dark:border-slate-800 pt-3">
              <label className="label text-xs font-semibold flex items-center justify-between">
                <span>📎 Adjuntar foto o escaneo del documento físico firmado:</span>
                <span className="text-[10px] text-slate-400 font-normal">JPG, PNG o PDF</span>
              </label>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/jpeg,image/png,image/webp,application/pdf"
                className="hidden"
              />

              {respaldoUrl ? (
                <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60">
                  <div className="flex items-center gap-3 min-w-0">
                    {respaldoUrl.startsWith("data:image") ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={respaldoUrl}
                        alt="Vista previa del respaldo"
                        className="h-12 w-12 rounded object-cover border border-slate-300 dark:border-slate-600 shrink-0"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded bg-red-100 text-red-700 flex items-center justify-center font-bold text-sm shrink-0">
                        PDF
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">
                        {respaldoNombre || "Respaldo físico adjunto"}
                      </p>
                      <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                        ✓ Respaldo digitalizado listo para auditorías
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs text-brand-600 hover:underline cursor-pointer"
                    >
                      Cambiar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRespaldoUrl(undefined);
                        setRespaldoNombre(undefined);
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                      className="text-xs text-rose-600 hover:underline cursor-pointer"
                    >
                      Quitar
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-4 px-3 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-brand-500 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 flex flex-col items-center justify-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-brand-600 cursor-pointer transition-colors"
                >
                  <span className="text-xl">📷</span>
                  <span className="font-semibold">Tomar foto o subir escaneado de la hoja física</span>
                  <span className="text-[10px] text-slate-400">
                    Permite adjuntar la prueba física firmada a mano para respaldo permanente
                  </span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Acciones del pie */}
        <div className="flex items-center justify-between mt-5 pt-3 border-t border-slate-200 dark:border-slate-800 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary text-xs px-3.5 py-1.5 cursor-pointer"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="btn-primary text-xs px-4 py-1.5 flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <span>💾</span>
            <span>{mode === "digital" ? "Aplicar Firma Digital" : "Registrar Firma Física"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
