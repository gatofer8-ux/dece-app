"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";

interface AlertNotificationViewerClientProps {
  caseId: string;
  alertId: string;
  previewBaseUrl: string;
  pdfUrl: string;
  wordUrl: string;
  editUrl: string;
  printUrl: string;
  studentName: string;
}

export default function AlertNotificationViewerClient({
  caseId,
  alertId,
  previewBaseUrl,
  pdfUrl,
  wordUrl,
  editUrl,
  printUrl,
  studentName,
}: AlertNotificationViewerClientProps) {
  const [viewMode, setViewMode] = useState<"image" | "pdf">("image");
  const [activePage, setActivePage] = useState<number>(1);
  const [cacheBuster, setCacheBuster] = useState<number>(Date.now());
  const [imgLoading, setImgLoading] = useState<boolean>(true);
  const [imgError, setImgError] = useState<boolean>(false);

  useEffect(() => {
    setCacheBuster(Date.now());
    setImgLoading(true);
    setImgError(false);
  }, [previewBaseUrl]);

  const getPageUrl = (page: number) => {
    return `${previewBaseUrl}?page=${page}&t=${cacheBuster}`;
  };

  const handleReload = () => {
    setImgLoading(true);
    setImgError(false);
    setCacheBuster(Date.now());
  };

  return (
    <div className="space-y-4">
      {/* Barra de Acciones del Documento */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">⚠️</span>
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              Ficha de Notificación de Alerta
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                Oficial Ministerio
              </span>
            </h2>
            <p className="text-xs text-slate-500">
              Estudiante: <span className="font-semibold text-slate-700">{studentName}</span> · Tipografía 100% Agency FB
            </p>
          </div>
        </div>

        {/* Botonera de Exportación y Edición */}
        <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
          {/* Botón Editar Obligatorio con regeneración garantizada */}
          <Link
            href={editUrl}
            className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
          >
            <span>✏️</span> Editar Ficha
          </Link>

          <a
            href={wordUrl}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition flex items-center gap-1.5 shadow-xs"
            title="Descargar documento Word (.docx) canónico"
          >
            <span>📥</span> Word (.docx)
          </a>

          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold transition flex items-center gap-1.5 shadow-xs"
            title="Abrir o descargar archivo PDF"
          >
            <span>📄</span> PDF
          </a>

          <Link
            href={printUrl}
            target="_blank"
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 border border-slate-300"
            title="Vista de impresión directa"
          >
            <span>🖨️</span> Imprimir
          </Link>

          <button
            type="button"
            onClick={handleReload}
            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-semibold transition border border-slate-300"
            title="Regenerar vista previa al instante"
          >
            🔄
          </button>
        </div>
      </div>

      {/* Visor Oficial del Documento */}
      <div className="bg-slate-900/95 backdrop-blur-xs p-4 sm:p-6 rounded-2xl shadow-2xl border border-slate-800 flex flex-col items-center">
        {/* Controles del Visor */}
        <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-3 pb-3 mb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="font-semibold text-xs text-slate-200">
              Vista Canónica del Documento (2 Páginas Exactas)
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Selector de modo Imagen vs PDF */}
            <div className="inline-flex rounded-lg bg-slate-800 p-0.5 border border-slate-700">
              <button
                type="button"
                onClick={() => setViewMode("image")}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                  viewMode === "image"
                    ? "bg-brand-600 text-white shadow-xs"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                🖼️ Imagen PNG
              </button>
              <button
                type="button"
                onClick={() => setViewMode("pdf")}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                  viewMode === "pdf"
                    ? "bg-brand-600 text-white shadow-xs"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                📄 PDF Embebido
              </button>
            </div>

            {/* Paginador para Modo Imagen */}
            {viewMode === "image" && (
              <div className="flex items-center gap-1 bg-slate-800 p-0.5 rounded-lg border border-slate-700 text-xs">
                <button
                  type="button"
                  onClick={() => setActivePage(1)}
                  className={`px-2.5 py-1 rounded font-bold transition ${
                    activePage === 1
                      ? "bg-brand-600 text-white"
                      : "text-slate-300 hover:text-white"
                  }`}
                >
                  Pág. 1
                </button>
                <button
                  type="button"
                  onClick={() => setActivePage(2)}
                  className={`px-2.5 py-1 rounded font-bold transition ${
                    activePage === 2
                      ? "bg-brand-600 text-white"
                      : "text-slate-300 hover:text-white"
                  }`}
                >
                  Pág. 2
                </button>
                <button
                  type="button"
                  onClick={() => setActivePage(0)}
                  className={`px-2.5 py-1 rounded font-bold transition ${
                    activePage === 0
                      ? "bg-brand-600 text-white"
                      : "text-slate-300 hover:text-white"
                  }`}
                  title="Mostrar ambas páginas juntas"
                >
                  Ambas
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Contenedor Visual */}
        <div className="w-full flex justify-center py-2">
          {viewMode === "image" ? (
            <div className="space-y-6 max-w-4xl w-full flex flex-col items-center">
              {imgLoading && (
                <div className="py-12 flex flex-col items-center gap-2 text-slate-400 text-xs">
                  <span className="animate-spin text-2xl">⏳</span>
                  <span>Renderizando página con tipografía oficial...</span>
                </div>
              )}

              {imgError && (
                <div className="p-4 bg-red-950/80 border border-red-800 text-red-200 rounded-xl text-xs text-center max-w-md">
                  <p className="font-bold mb-1">No se pudo cargar la imagen previa.</p>
                  <p className="text-slate-400 mb-3">Puedes visualizar o descargar el PDF generado directamente:</p>
                  <button
                    onClick={() => setViewMode("pdf")}
                    className="px-3 py-1.5 bg-red-800 hover:bg-red-700 text-white rounded-lg text-xs font-semibold"
                  >
                    Ver en Visor PDF
                  </button>
                </div>
              )}

              {/* Página 1 */}
              {(activePage === 1 || activePage === 0) && (
                <div className="relative bg-white shadow-2xl rounded-xs overflow-hidden border border-slate-300 max-w-[800px] w-full">
                  <img
                    src={getPageUrl(1)}
                    alt="Página 1 - Ficha de Notificación de Alerta"
                    className="w-full h-auto object-contain block"
                    onLoad={() => setImgLoading(false)}
                    onError={() => {
                      setImgLoading(false);
                      setImgError(true);
                    }}
                  />
                  <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/60 text-white text-[10px] font-mono rounded">
                    Página 1 de 2
                  </div>
                </div>
              )}

              {/* Página 2 */}
              {(activePage === 2 || activePage === 0) && (
                <div className="relative bg-white shadow-2xl rounded-xs overflow-hidden border border-slate-300 max-w-[800px] w-full">
                  <img
                    src={getPageUrl(2)}
                    alt="Página 2 - Ficha de Notificación de Alerta"
                    className="w-full h-auto object-contain block"
                    onLoad={() => setImgLoading(false)}
                    onError={() => {
                      setImgLoading(false);
                      setImgError(true);
                    }}
                  />
                  <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/60 text-white text-[10px] font-mono rounded">
                    Página 2 de 2
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="w-full max-w-4xl h-[850px] bg-slate-800 rounded-xl overflow-hidden border border-slate-700 shadow-2xl">
              <iframe
                src={pdfUrl}
                title="Visor PDF de la Ficha de Notificación de Alerta"
                className="w-full h-full border-none"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
