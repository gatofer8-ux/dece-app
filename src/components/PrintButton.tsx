"use client";

import { buildWordDocument } from "@/lib/wordExportStyles";

/**
 * Descarga el contenido imprimible (id="printable-content", presente en
 * todas las vistas de impresión) como un documento .doc editable en Word.
 * Usa el truco clásico y ampliamente compatible de servir HTML con
 * extensión .doc: Word lo abre e interpreta como un documento normal, con
 * tablas, negritas y bordes editables — no es una réplica exacta del PDF,
 * pero conserva todo el contenido y el formato básico, listo para ajustar.
 */
function downloadAsWord(fileNamePrefix: string) {
  const content = document.getElementById("printable-content");
  if (!content) return;
  const title = document.title || fileNamePrefix;
  const html = buildWordDocument(content.innerHTML, title);
  const blob = new Blob(["﻿", html], { type: "application/msword" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${fileNamePrefix}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function PrintButton({
  fileNamePrefix = "documento",
  hideWordButton = false,
  className,
}: {
  fileNamePrefix?: string;
  hideWordButton?: boolean;
  className?: string;
}) {
  return (
    <div className={`no-print flex justify-end gap-2 ${className !== undefined ? className : "p-4 bg-slate-100 border-b border-slate-200"}`}>
      {!hideWordButton && (
        <button onClick={() => downloadAsWord(fileNamePrefix)} className="btn-secondary">
          ⬇️ Descargar en Word (editable)
        </button>
      )}
      <button onClick={() => window.print()} className="btn-primary">
        🖨️ Imprimir / Guardar como PDF
      </button>
    </div>
  );
}
