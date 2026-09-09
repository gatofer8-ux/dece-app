"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";

interface JuntaCursoViewerClientProps {
  reportId: string;
  reportCode: string;
  courseLabel: string;
  previewBaseUrl: string;
  pdfUrl: string;
  wordUrl: string;
  editUrl: string;
  initialTotalPages?: number;
  updatedAt?: string;
}

export default function JuntaCursoViewerClient({
  reportId,
  reportCode,
  courseLabel,
  previewBaseUrl,
  pdfUrl,
  wordUrl,
  editUrl,
  initialTotalPages = 4,
  updatedAt = "init",
}: JuntaCursoViewerClientProps) {
  const [viewMode, setViewMode] = useState<"image" | "pdf">("image");
  const [activePage, setActivePage] = useState<number | "all">(1);
  const [totalPages, setTotalPages] = useState<number>(initialTotalPages);
  const [cacheBuster, setCacheBuster] = useState<number>(Date.now());
  const [imgLoading, setImgLoading] = useState<boolean>(true);
  const [imgError, setImgError] = useState<boolean>(false);

  // Sync cache buster if updatedAt prop changes
  useEffect(() => {
    setCacheBuster(Date.now());
    setImgLoading(true);
    setImgError(false);
  }, [updatedAt]);

  const getPageUrl = (page: number) => {
    return `${previewBaseUrl}?page=${page}&t=${cacheBuster}`;
  };

  const handleReload = () => {
    setImgLoading(true);
    setImgError(false);
    setCacheBuster(Date.now());
  };

  const handleImageError = () => {
    console.warn("No se pudo cargar la vista previa en imagen. Conmutando automáticamente al visor interactivo PDF.");
    setImgError(true);
    setImgLoading(false);
    setViewMode("pdf");
  };

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    setImgLoading(false);
    setImgError(false);
  };

  const handlePrint = () => {
    if (viewMode === "pdf") {
      const iframe = document.getElementById("pdf-frame") as HTMLIFrameElement | null;
      if (iframe?.contentWindow) {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        return;
      }
    }
    const printWindow = window.open(pdfUrl, "_blank");
    if (printWindow) {
      printWindow.focus();
      printWindow.onload = () => printWindow.print();
    }
  };

  return (
    <div className="space-y-4 max-w-5xl mx-auto pb-12">
      {/* Barra de Acciones Principal */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/juntas-curso"
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
            title="Volver a lista de Juntas de Curso"
          >
            ←
          </Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-bold text-slate-900">
                Informe Técnico de Junta de Curso
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                Plantilla Oficial Ministerio (Canon .docx)
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              <span className="font-mono font-semibold text-indigo-700">{reportCode}</span> · {courseLabel}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
          {/* Botón Editar Obligatorio */}
          <Link
            href={editUrl}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold transition-all shadow-xs"
            title="Editar informe técnico"
          >
            <span>✏️</span>
            <span>Editar</span>
          </Link>

          {/* Botón Descargar Word */}
          <a
            href={wordUrl}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold transition-all shadow-xs"
            title="Descargar copia fiel oficial en formato Microsoft Word (.docx)"
          >
            <span>📥</span>
            <span>Word (.docx)</span>
          </a>

          {/* Botón Descargar PDF */}
          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-all shadow-xs"
            title="Descargar versión PDF oficial idéntica al documento impreso"
          >
            <span>📄</span>
            <span>PDF</span>
          </a>

          {/* Botón Imprimir */}
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
            title="Imprimir documento oficial"
          >
            <span>🖨️</span>
            <span>Imprimir</span>
          </button>
        </div>
      </div>

      {/* Selector de Modo y Páginas */}
      <div className="bg-slate-900 text-slate-100 p-3 sm:p-4 rounded-2xl shadow-xl border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="font-semibold text-xs text-slate-200">
            Renderizado Fiel desde Archivo Oficial LibreOffice / DOCX
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
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              🖼️ Vista Previa (PNG)
            </button>
            <button
              type="button"
              onClick={() => setViewMode("pdf")}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                viewMode === "pdf"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              📄 Visor PDF
            </button>
          </div>

          <button
            type="button"
            onClick={handleReload}
            className="p-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors"
            title="Recargar vista previa del servidor"
          >
            🔄 Recargar
          </button>
        </div>
      </div>

      {/* Paginador si está en modo imagen */}
      {viewMode === "image" && (
        <div className="flex items-center justify-between bg-white px-4 py-2.5 rounded-xl border border-slate-200 shadow-xs text-xs">
          <div className="text-slate-500 font-medium">
            Páginas del Informe ({totalPages} páginas):
          </div>
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => {
                  setActivePage(p);
                  setImgLoading(true);
                }}
                className={`px-3 py-1 rounded-lg font-bold text-xs transition-all ${
                  activePage === p
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                Pág {p}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setActivePage("all");
                setImgLoading(true);
              }}
              className={`px-3 py-1 rounded-lg font-bold text-xs transition-all ${
                activePage === "all"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              Todas
            </button>
          </div>
        </div>
      )}

      {/* Alerta de fallback a PDF si hubo error */}
      {imgError && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs flex items-center justify-between gap-2">
          <span>
            ℹ️ Se activó el visor interactivo PDF para garantizar la visualización inmediata del documento.
          </span>
          <button
            type="button"
            onClick={() => {
              setViewMode("image");
              handleReload();
            }}
            className="underline font-semibold text-amber-900 text-xs shrink-0"
          >
            Reintentar imagen
          </button>
        </div>
      )}

      {/* Área del Documento */}
      {viewMode === "image" ? (
        <div className="flex flex-col items-center gap-6">
          {activePage === "all" ? (
            // Vista continua de todas las páginas
            Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <div
                key={p}
                className="relative bg-white shadow-xl rounded-lg border border-slate-300 max-w-3xl w-full overflow-hidden"
              >
                <div className="bg-slate-100 px-4 py-1.5 border-b border-slate-200 flex justify-between items-center text-[11px] text-slate-500 font-mono">
                  <span>PÁGINA {p} DE {totalPages}</span>
                  <span>CANONICAL TEMPLATE · INFORME DE JUNTAS</span>
                </div>
                <img
                  src={getPageUrl(p)}
                  alt={`Página ${p} de ${reportCode}`}
                  className="w-full h-auto block select-none"
                  loading="lazy"
                />
              </div>
            ))
          ) : (
            // Vista de página individual con loader
            <div className="relative bg-white shadow-xl rounded-lg border border-slate-300 max-w-3xl w-full min-h-[500px] overflow-hidden flex flex-col items-center justify-center">
              {imgLoading && (
                <div className="absolute inset-0 z-10 bg-white/80 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center">
                  <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3"></div>
                  <p className="text-sm font-semibold text-slate-800">
                    Cargando vista previa oficial (Página {activePage})...
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Renderizando plantilla ministerial canónica (.docx $\rightarrow$ imagen)
                  </p>
                </div>
              )}

              <img
                key={`page-${activePage}-${cacheBuster}`}
                src={getPageUrl(activePage)}
                alt={`Página ${activePage} de ${reportCode}`}
                className={`w-full h-auto block select-none transition-opacity duration-300 ${
                  imgLoading ? "opacity-0" : "opacity-100"
                }`}
                loading="eager"
                onLoad={handleImageLoad}
                onError={handleImageError}
              />
            </div>
          )}
        </div>
      ) : (
        /* Modo Visor PDF */
        <div className="w-full bg-white shadow-xl rounded-2xl border border-slate-300 overflow-hidden">
          <iframe
            id="pdf-frame"
            src={`${pdfUrl}#view=FitH&toolbar=1`}
            title={`Informe ${reportCode}`}
            className="w-full h-[900px] border-0 block bg-slate-100"
          />
        </div>
      )}

      {/* Pie con sugerencia y enlace directo a edición */}
      <div className="text-center text-xs text-slate-500 mt-4">
        ¿Necesitas actualizar datos, estudiantes o acuerdos del informe? Haz clic en{" "}
        <Link href={editUrl} className="text-indigo-600 hover:text-indigo-800 underline font-bold">
          Editar Informe Técnico
        </Link>{" "}
        para modificar la información con dictado por voz o asistencia con IA.
      </div>
    </div>
  );
}
