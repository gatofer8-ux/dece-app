"use client";

import { useEffect, useRef, useState } from "react";

export interface SignaturePadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (signatureDataUrl: string) => void;
  signatoryName?: string;
  title?: string;
}

/**
 * Modal táctil de Firma Digital en Pantalla (HTML5 Canvas).
 * Compatible con tablets, stylus pens, celulares y mouse de escritorio.
 * Genera una imagen PNG nítida con fondo transparente.
 */
export default function SignaturePadModal({
  isOpen,
  onClose,
  onSave,
  signatoryName,
  title = "Firma Digital en Pantalla",
}: SignaturePadModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Resetear al abrir
    setHasDrawn(false);
    lastPointRef.current = null;

    const timer = setTimeout(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Adaptar resolución para pantallas Retina/HiDPI
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);

      ctx.strokeStyle = "#0f172a"; // Tinta azul oscuro/negro formal
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
    }, 50);

    return () => clearTimeout(timer);
  }, [isOpen]);

  if (!isOpen) return null;

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

    // Dibujar trazo suave
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
    lastPointRef.current = null;
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasDrawn) return;
    const dataUrl = canvas.toDataURL("image/png");
    onSave(dataUrl);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-toast-in">
      <div className="card w-full max-w-lg bg-white p-5 shadow-xl border border-slate-200">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900">{title}</h3>
            {signatoryName && (
              <p className="text-xs text-slate-500 mt-0.5">
                Firmante: <span className="font-semibold text-slate-800">{signatoryName}</span>
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-sm p-1 rounded hover:bg-slate-100"
          >
            ✕
          </button>
        </div>

        <p className="text-xs text-slate-500 mb-2">
          Dibuja tu firma con el dedo en pantalla táctil, lápiz digital o con el mouse.
        </p>

        {/* Contenedor del Canvas de Firma */}
        <div className="relative rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/50 overflow-hidden select-none touch-none">
          <canvas
            ref={canvasRef}
            className="w-full h-44 cursor-crosshair block"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          />
          {/* Línea base para la firma */}
          <div className="absolute bottom-7 left-8 right-8 border-b border-slate-300/80 pointer-events-none flex justify-end">
            <span className="text-[10px] text-slate-400 font-mono select-none">Firma aquí ✕</span>
          </div>
        </div>

        {/* Acciones */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={handleClear}
            disabled={!hasDrawn}
            className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5 disabled:opacity-40"
          >
            <span>🧹</span> Limpiar Lienzo
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary text-xs px-3 py-1.5"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!hasDrawn}
              className={`btn-primary text-xs px-4 py-1.5 flex items-center gap-1.5 ${
                !hasDrawn ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              <span>💾</span> Aplicar Firma
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
