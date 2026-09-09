"use client";

import { useState, useTransition } from "react";
import {
  TemplateInspectionResult,
  TemplateSheetInfo,
  TemplateFieldMapping,
  DeceFieldDefinition,
} from "@/lib/templateReports/types";
import VoiceDictationButton from "@/components/VoiceDictationButton";

interface HistoryItem {
  id: string;
  template_name: string;
  file_type: string;
  records_count: number;
  generated_at: string;
  filters_json: string;
}

export default function TemplateReportGenerator({
  initialHistory = [],
}: {
  initialHistory?: HistoryItem[];
}) {
  const [activeTab, setActiveTab] = useState<"generador" | "historial">("generador");

  // Archivo y análisis
  const [file, setFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [inspection, setInspection] = useState<TemplateInspectionResult | null>(null);
  const [catalog, setCatalog] = useState<DeceFieldDefinition[]>([]);
  const [selectedSheetIndex, setSelectedSheetIndex] = useState<number>(0);
  const [isKnownTemplate, setIsKnownTemplate] = useState(false);

  // Mapeo
  const [mapping, setMapping] = useState<TemplateFieldMapping>({});

  // Filtros
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedRiskTypes, setSelectedRiskTypes] = useState<string[]>([]);
  const [naturalLanguagePrompt, setNaturalLanguagePrompt] = useState<string>("");
  const [translatingFilter, setTranslatingFilter] = useState(false);
  const [filterMessage, setFilterMessage] = useState<string | null>(null);

  // Previsualización y Generación
  const [previewing, setPreviewing] = useState(false);
  const [previewData, setPreviewData] = useState<{ totalCases: number; previewRows: any[] } | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generationMessage, setGenerationMessage] = useState<string | null>(null);

  const currentSheet: TemplateSheetInfo | undefined = inspection?.sheets[selectedSheetIndex];

  // Agrupar catálogo por categoría para los selectores
  const categories = Array.from(new Set(catalog.map((c) => c.category)));

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setAnalyzing(true);
    setAnalysisError(null);
    setInspection(null);
    setPreviewData(null);
    setIsKnownTemplate(false);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const res = await fetch("/api/reportes/plantilla/analizar", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Error al analizar la plantilla.");
      }

      setInspection(data.inspection);
      setCatalog(data.catalog || []);
      setSelectedSheetIndex(data.inspection.suggestedSheetIndex || 0);

      if (data.savedMapping && Object.keys(data.savedMapping).length > 0) {
        setMapping(data.savedMapping);
        setIsKnownTemplate(true);
      } else {
        setMapping(data.autoMapping || {});
        setIsKnownTemplate(false);
      }
    } catch (err: any) {
      setAnalysisError(err.message || "Error al procesar el archivo.");
    } finally {
      setAnalyzing(false);
    }
  }

  function handleMappingChange(colLetter: string, fieldKey: string) {
    setMapping((prev) => ({
      ...prev,
      [colLetter]: fieldKey,
    }));
  }

  async function handleTranslateFilter() {
    if (!naturalLanguagePrompt.trim()) return;
    setTranslatingFilter(true);
    setFilterMessage(null);

    try {
      const res = await fetch("/api/reportes/plantilla/traducir-filtro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: naturalLanguagePrompt }),
      });
      const data = await res.json();
      if (data.success && data.filters) {
        const f = data.filters;
        if (f.dateFrom) setDateFrom(f.dateFrom);
        if (f.dateTo) setDateTo(f.dateTo);
        if (f.statuses) setSelectedStatuses(f.statuses);
        if (f.riskTypes) setSelectedRiskTypes(f.riskTypes);
        setFilterMessage("Filtros aplicados con éxito desde la descripción en lenguaje natural.");
      }
    } catch {
      setFilterMessage("No se pudo traducir la frase. Puedes ajustar los filtros manualmente.");
    } finally {
      setTranslatingFilter(false);
    }
  }

  function buildFiltersObject() {
    return {
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      statuses: selectedStatuses.length ? selectedStatuses : undefined,
      riskTypes: selectedRiskTypes.length ? selectedRiskTypes : undefined,
    };
  }

  async function handlePreview() {
    if (!file || !currentSheet) return;
    setPreviewing(true);
    setGenerationMessage(null);

    try {
      const res = await fetch("/api/reportes/plantilla/previsualizar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mapping,
          filters: buildFiltersObject(),
          columns: currentSheet.columns,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Error al previsualizar.");
      }

      setPreviewData(data);
    } catch (err: any) {
      setGenerationMessage(`Error en vista previa: ${err.message}`);
    } finally {
      setPreviewing(false);
    }
  }

  async function handleGenerateReport() {
    if (!file || !currentSheet) return;
    setGenerating(true);
    setGenerationMessage(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("mapping", JSON.stringify(mapping));
      formData.append("filters", JSON.stringify(buildFiltersObject()));
      formData.append("sheetName", currentSheet.name);
      formData.append("headerRowIndex", String(currentSheet.headerRowIndex));
      formData.append("dataStartRow", String(currentSheet.dataStartRowIndex));

      const res = await fetch("/api/reportes/plantilla/generar", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Error al generar el reporte.");
      }

      const recordsCount = res.headers.get("X-Report-Records") || "0";
      const warningsCount = res.headers.get("X-Report-Warnings") || "0";

      // Descargar archivo blob
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const contentDisposition = res.headers.get("Content-Disposition");
      let fileName = file.name;
      if (contentDisposition && contentDisposition.includes("filename=")) {
        const match = contentDisposition.match(/filename="?([^";]+)"?/);
        if (match?.[1]) fileName = decodeURIComponent(match[1]);
      }
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      setGenerationMessage(
        `¡Reporte generado y descargado exitosamente! Se inyectaron ${recordsCount} casos fieles al formato original.${
          parseInt(warningsCount, 10) > 0 ? ` (Se encontraron ${warningsCount} advertencias leves de listas desplegables)` : ""
        }`
      );
    } catch (err: any) {
      setGenerationMessage(`Error: ${err.message}`);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Pestañas superiores */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab("generador")}
          className={`py-2.5 px-4 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === "generador"
              ? "border-brand-600 text-brand-700 bg-brand-50/50"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          🚀 Generar Reporte desde Plantilla
        </button>
        <button
          onClick={() => setActiveTab("historial")}
          className={`py-2.5 px-4 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === "historial"
              ? "border-brand-600 text-brand-700 bg-brand-50/50"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          📜 Historial de Reportes Generados ({initialHistory.length})
        </button>
      </div>

      {activeTab === "historial" ? (
        <div className="card p-6">
          <h3 className="text-sm font-bold text-slate-800 mb-3">Historial de Reportes Generados</h3>
          {initialHistory.length === 0 ? (
            <p className="text-xs text-slate-400">Aún no se han generado reportes desde plantillas.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-3">Fecha y Hora</th>
                    <th className="py-2 px-3">Plantilla Utilizada</th>
                    <th className="py-2 px-3">Formato</th>
                    <th className="py-2 px-3 text-center">Casos Incluidos</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {initialHistory.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/60">
                      <td className="py-2.5 px-3 text-slate-600">{item.generated_at}</td>
                      <td className="py-2.5 px-3 font-medium text-slate-800">{item.template_name}</td>
                      <td className="py-2.5 px-3">
                        <span className="badge-blue text-[10px] font-mono">{item.file_type}</span>
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-slate-700">{item.records_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* PASO 1: Subir Plantilla */}
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">1</span>
              <h3 className="text-sm font-bold text-slate-800">Cargar Plantilla del Distrito (.xlsx, .xls, .docx)</h3>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Sube la matriz en Excel o documento en Word enviado por el Distrito. El sistema detectará automáticamente sus columnas, fórmulas, celdas combinadas y listas desplegables.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-4 p-4 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50 hover:bg-slate-50 transition-colors">
              <input
                type="file"
                accept=".xlsx,.xls,.docx"
                onChange={handleFileSelected}
                className="text-xs file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer"
              />
              {analyzing && <span className="text-xs text-blue-600 font-medium animate-pulse">Inspeccionando archivo...</span>}
            </div>

            {analysisError && (
              <div className="mt-3 p-3 bg-red-50 text-red-700 text-xs rounded-lg border border-red-200">
                {analysisError}
              </div>
            )}

            {isKnownTemplate && (
              <div className="mt-3 p-3 bg-emerald-50 text-emerald-800 text-xs rounded-lg border border-emerald-200 flex items-center gap-2">
                <span>✨</span>
                <span><strong>¡Plantilla reconocida!</strong> Se cargó automáticamente la configuración y mapeo guardados previamente para este formato.</span>
              </div>
            )}
          </div>

          {/* PASO 2: Mapeo de Columnas */}
          {inspection && currentSheet && (
            <div className="card p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">2</span>
                  <h3 className="text-sm font-bold text-slate-800">Asociar (Mapear) Columnas de la Plantilla con Datos DECE</h3>
                </div>
                {inspection.sheets.length > 1 && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-500">Hoja activa:</span>
                    <select
                      value={selectedSheetIndex}
                      onChange={(e) => setSelectedSheetIndex(Number(e.target.value))}
                      className="select py-1 text-xs"
                    >
                      {inspection.sheets.map((sh, idx) => (
                        <option key={sh.id} value={idx}>{sh.name} ({sh.columns.length} columnas)</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              <p className="text-xs text-slate-500 mb-4">
                El sistema intentó asociar cada columna automáticamente por similitud. Puedes ajustar manualmente qué campo del expediente DECE corresponde a cada columna de la plantilla.
              </p>

              <div className="border border-slate-200 rounded-lg overflow-hidden max-h-96 overflow-y-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-700 font-semibold sticky top-0 border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-3 w-16 text-center">Col</th>
                      <th className="py-2 px-3">Encabezado en Plantilla</th>
                      <th className="py-2 px-3 w-32">Propiedades</th>
                      <th className="py-2 px-3">Campo Correspondiente en DECE</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {currentSheet.columns.map((col) => {
                      const selectedVal = mapping[col.letter] || "";
                      return (
                        <tr key={col.letter} className="hover:bg-slate-50/80">
                          <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-600 bg-slate-50/50">
                            {col.letter}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="font-semibold text-slate-800">{col.header}</span>
                            {col.sampleValue && (
                              <p className="text-[10px] text-slate-400 truncate max-w-xs">Ej: {col.sampleValue}</p>
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex flex-wrap gap-1">
                              {col.hasFormula && (
                                <span className="px-1.5 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded text-[10px] font-mono">
                                  fx Fórmula
                                </span>
                              )}
                              {col.validation && (
                                <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded text-[10px]">
                                  ▼ Lista
                                </span>
                              )}
                              {col.isMerged && (
                                <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px]">
                                  ⬌ Combinada
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-3">
                            <select
                              value={selectedVal}
                              onChange={(e) => handleMappingChange(col.letter, e.target.value)}
                              className={`select py-1 text-xs w-full ${selectedVal ? "font-medium text-blue-900 bg-blue-50/30 border-blue-300" : "text-slate-400"}`}
                            >
                              <option value="">— No llenar / Omitir —</option>
                              {categories.map((cat) => (
                                <optgroup key={cat} label={`── ${cat} ──`}>
                                  {catalog
                                    .filter((c) => c.category === cat)
                                    .map((item) => (
                                      <option key={item.key} value={item.key}>
                                        {item.label}
                                      </option>
                                    ))}
                                </optgroup>
                              ))}
                            </select>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* PASO 3: Filtro de Casos */}
          {inspection && (
            <div className="card p-6 space-y-4">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">3</span>
                <h3 className="text-sm font-bold text-slate-800">Filtrar los Casos a Incluir en el Reporte</h3>
              </div>

              {/* Asistente en Lenguaje Natural */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                    <span>✨</span> Asistente Inteligente de Filtros (Lenguaje Natural)
                  </label>
                  <VoiceDictationButton targetId="natural-language-filter" />
                </div>
                <div className="flex gap-2">
                  <input
                    id="natural-language-filter"
                    type="text"
                    value={naturalLanguagePrompt}
                    onChange={(e) => setNaturalLanguagePrompt(e.target.value)}
                    placeholder="Ej. 'casos de violencia intrafamiliar abiertos durante este mes en bachillerato'..."
                    className="input text-xs flex-1 bg-white"
                  />
                  <button
                    type="button"
                    onClick={handleTranslateFilter}
                    disabled={translatingFilter}
                    className="btn-primary text-xs whitespace-nowrap"
                  >
                    {translatingFilter ? "Traduciendo..." : "Aplicar filtros con IA"}
                  </button>
                </div>
                {filterMessage && <p className="text-[11px] text-blue-700 font-medium">{filterMessage}</p>}
              </div>

              {/* Filtros Estructurados */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label text-xs font-semibold">Rango de fechas de detección</label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="input text-xs"
                    />
                    <span className="text-slate-400 text-xs">hasta</span>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="input text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="label text-xs font-semibold">Estado del Caso</label>
                  <div className="flex flex-wrap gap-2 text-xs mt-1">
                    {["ABIERTO", "EN_SEGUIMIENTO", "DERIVADO", "CERRADO"].map((st) => {
                      const isChecked = selectedStatuses.includes(st);
                      return (
                        <label key={st} className="flex items-center gap-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedStatuses([...selectedStatuses, st]);
                              else setSelectedStatuses(selectedStatuses.filter((s) => s !== st));
                            }}
                            className="rounded text-blue-600"
                          />
                          <span>{st}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* PASO 4: Previsualización y Generación */}
          {inspection && (
            <div className="card p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">4</span>
                  <h3 className="text-sm font-bold text-slate-800">Validación Previa y Descarga Final</h3>
                </div>
                <button
                  type="button"
                  onClick={handlePreview}
                  disabled={previewing}
                  className="btn-secondary text-xs"
                >
                  {previewing ? "Consultando casos..." : "👁️ Previsualizar Datos"}
                </button>
              </div>

              {previewData && (
                <div className="space-y-3">
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900 flex items-center justify-between">
                    <span>
                      Se encontraron <strong>{previewData.totalCases} casos</strong> coincidentes con los filtros seleccionados.
                    </span>
                    <span className="text-slate-500">Mostrando primeras filas de muestra</span>
                  </div>

                  {previewData.previewRows.length > 0 && currentSheet && (
                    <div className="border border-slate-200 rounded-lg overflow-x-auto max-h-60">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200 sticky top-0">
                          <tr>
                            <th className="py-2 px-2 text-center w-10">#</th>
                            {currentSheet.columns.map((c) => (
                              <th key={c.letter} className="py-2 px-3 whitespace-nowrap">
                                {c.header}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {previewData.previewRows.map((r, rIdx) => (
                            <tr key={rIdx} className="hover:bg-slate-50">
                              <td className="py-2 px-2 text-center text-slate-400 font-mono">{rIdx + 1}</td>
                              {currentSheet.columns.map((c) => (
                                <td key={c.letter} className="py-2 px-3 whitespace-nowrap text-slate-700">
                                  {r[c.letter] || "—"}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {generationMessage && (
                <div className="p-3 bg-emerald-50 text-emerald-900 border border-emerald-200 rounded-lg text-xs font-medium">
                  {generationMessage}
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={handleGenerateReport}
                  disabled={generating || !file}
                  className="btn-primary px-6 py-2.5 text-sm font-semibold flex items-center gap-2 shadow-sm"
                >
                  {generating ? "Generando documento in-situ..." : "📥 Generar y Descargar Reporte Llenado"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
