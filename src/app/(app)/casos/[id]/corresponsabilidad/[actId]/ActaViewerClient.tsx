"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";

interface ActaViewerClientProps {
  previewUrl: string;
  pdfUrl: string;
  wordUrl: string;
  editUrl: string;
  title?: string;
}

export default function ActaViewerClient({
  previewUrl,
  pdfUrl,
  wordUrl,
  editUrl,
  title = "Acta de Corresponsabilidad con Representante Legal",
}: ActaViewerClientProps) {
  const [viewMode, setViewMode] = useState<"image" | "pdf">("image");
  const [imgLoading, setImgLoading] = useState(true);
  const [imgError, setImgError] = useState(false);
  const [currentPreviewUrl, setCurrentPreviewUrl] = useState(previewUrl);

  useEffect(() => {
    setCurrentPreviewUrl(previewUrl);
    setImgLoading(true);
    setImgError(false);
  }, [previewUrl]);

  const handleImageError = () => {
    console.warn("No se pudo cargar la imagen de preview. Conmutando automáticamente al visor PDF interactivo.");
    setImgError(true);
    setImgLoading(false);
    setViewMode("pdf");
  };

  const handleImageLoad = () => {
    setImgLoading(false);
    setImgError(false);
  };

  const reloadPreview = () => {
    setImgLoading(true);
    setImgError(false);
    const sep = previewUrl.includes("?") ? "&" : "?";
    setCurrentPreviewUrl(`${previewUrl}${sep}refresh=${Date.now()}`);
  };

  return (
    <div className="bg-slate-900/90 backdrop-blur-sm p-3 sm:p-6 rounded-2xl shadow-2xl border border-slate-700 flex flex-col items-center">
      {/* Barra de control del visor */}
      <div className="w-full flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 mb-4 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="font-semibold text-xs sm:text-sm text-slate-100">
            Vista Oficial del Documento Generado (A4)
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Selector de modo PNG vs PDF */}
          <div className="inline-flex rounded-lg bg-slate-800 p-0.5 border border-slate-700">
            <button
              type="button"
              onClick={() => setViewMode("image")}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                viewMode === "image"
                  ? "bg-brand-600 text-white shadow-sm"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              🖼️ Imagen (PNG)
            </button>
            <button
              type="button"
              onClick={() => setViewMode("pdf")}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                viewMode === "pdf"
                  ? "bg-brand-600 text-white shadow-sm"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              📄 Visor PDF
            </button>
          </div>

          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors"
            title="Abrir en pestaña completa"
          >
            <span>↗️</span>
            <span className="hidden sm:inline">Pantalla completa</span>
          </a>

          {viewMode === "image" && (
            <button
              type="button"
              onClick={reloadPreview}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors"
              title="Recargar vista previa"
            >
              🔄
            </button>
          )}
        </div>
      </div>

      {/* Alerta informativa si hubo error con la imagen y se conmutó a PDF */}
      {imgError && (
        <div className="w-full mb-4 p-3 bg-amber-500/15 border border-amber-500/30 rounded-xl text-amber-200 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span>ℹ️</span>
            <span>
              Se activó el visor interactivo PDF para garantizar la visualización inmediata del documento.
            </span>
          </div>
          <button
            onClick={() => {
              setViewMode("image");
              reloadPreview();
            }}
            className="underline font-semibold text-amber-300 hover:text-amber-100 text-xs shrink-0"
          >
            Reintentar imagen
          </button>
        </div>
      )}

      {/* Contenedor del documento */}
      {viewMode === "image" ? (
        <div className="relative bg-white shadow-2xl rounded border border-slate-300 max-w-2xl w-full min-h-[400px] overflow-hidden flex items-center justify-center transition-all">
          {imgLoading && (
            <div className="absolute inset-0 z-10 bg-slate-900/60 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center text-white">
              <div className="w-8 h-8 border-3 border-brand-400 border-t-transparent rounded-full animate-spin mb-3"></div>
              <p className="text-sm font-semibold">Generando vista previa del documento oficial...</p>
              <p className="text-xs text-slate-300 mt-1">
                Renderizando plantilla institucional exacta (.docx a imagen)
              </p>
            </div>
          )}

          <img
            src={currentPreviewUrl}
            alt={title}
            className={`w-full h-auto block select-none transition-opacity duration-300 ${
              imgLoading ? "opacity-0" : "opacity-100"
            }`}
            loading="eager"
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
        </div>
      ) : (
        <div className="w-full max-w-3xl bg-white shadow-2xl rounded-xl border border-slate-700 overflow-hidden">
          <iframe
            src={`${pdfUrl}#view=FitH&toolbar=1`}
            title={title}
            className="w-full h-[850px] border-0 block bg-slate-100"
          />
        </div>
      )}

      {/* Pie con sugerencia y enlace a edición */}
      <div className="mt-5 text-center text-xs text-slate-400">
        ¿Deseas realizar ajustes al contenido? Haz clic en{" "}
        <Link href={editUrl} className="text-blue-400 hover:text-blue-300 underline font-semibold">
          Editar Acta
        </Link>{" "}
        para modificar los acuerdos, dictar compromisos por voz o solicitar asistencia técnica a la IA.
      </div>
    </div>
  );
}
