"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type CaseCustodyDocumentItem } from "@/lib/physicalCustodyAudit";
import { bulkAssignCasePhysicalFileRef } from "../actions";
import { useToast } from "@/components/Toast";

interface Props {
  caseId: string;
  caseCode: string;
  studentName: string;
  documents: CaseCustodyDocumentItem[];
}

export default function CasePhysicalCustodySemaphore({
  caseId,
  caseCode,
  studentName,
  documents,
}: Props) {
  const router = useRouter();
  const toast = useToast();
  const [isExpanded, setIsExpanded] = useState(false);
  const [filter, setFilter] = useState<"ALL" | "DIGITAL" | "FISICO" | "PENDIENTE">("ALL");
  const [search, setSearch] = useState("");

  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [bulkRef, setBulkRef] = useState(() => {
    const existing = documents.find((d) => d.physicalFileRef)?.physicalFileRef;
    return existing || "";
  });
  const [overwriteAll, setOverwriteAll] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const stats = useMemo(() => {
    const total = documents.length;
    const digital = documents.filter((d) => d.status === "DIGITAL").length;
    const fisico = documents.filter((d) => d.status === "FISICO").length;
    const pendiente = documents.filter((d) => d.status === "PENDIENTE").length;
    const archived = digital + fisico;
    const complianceRate = total > 0 ? Math.round((archived / total) * 100) : 100;
    const digitalRate = total > 0 ? Math.round((digital / total) * 100) : 0;
    const fisicoRate = total > 0 ? Math.round((fisico / total) * 100) : 0;
    const pendienteRate = total > 0 ? Math.round((pendiente / total) * 100) : 0;

    return {
      total,
      digital,
      fisico,
      pendiente,
      archived,
      complianceRate,
      digitalRate,
      fisicoRate,
      pendienteRate,
    };
  }, [documents]);

  const filteredDocs = useMemo(() => {
    return documents.filter((d) => {
      if (filter !== "ALL" && d.status !== filter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchTitle = d.docTitle.toLowerCase().includes(q);
        const matchModule = d.moduleName.toLowerCase().includes(q);
        const matchRef = (d.physicalFileRef || "").toLowerCase().includes(q);
        if (!matchTitle && !matchModule && !matchRef) return false;
      }
      return true;
    });
  }, [documents, filter, search]);

  // Overall status badge configuration
  const auditState = useMemo(() => {
    if (stats.total === 0) {
      return {
        label: "Sin Documentos Registrados",
        color: "bg-slate-100 text-slate-700 border-slate-200",
        barColor: "bg-slate-300",
        icon: "⚪",
      };
    }
    if (stats.complianceRate === 100) {
      return {
        label: stats.digital === stats.total ? "🟢 100% Custodiado y Digitalizado" : "🟢 100% en Carpeta Física",
        color: "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
        barColor: "bg-emerald-600",
        icon: "🟢",
      };
    }
    if (stats.complianceRate >= 60) {
      return {
        label: `🟡 En Proceso de Archivo (${stats.complianceRate}%)`,
        color: "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
        barColor: "bg-amber-500",
        icon: "🟡",
      };
    }
    return {
      label: `🔴 Alerta: ${stats.pendiente} Docs. Sin Archivar (${stats.complianceRate}%)`,
      color: "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800",
      barColor: "bg-rose-600",
      icon: "🔴",
    };
  }, [stats]);

  return (
    <div className="card overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm transition-all">
      {/* Header Widget */}
      <div className="p-4 bg-gradient-to-r from-slate-50 to-amber-50/40 dark:from-slate-900 dark:to-slate-800/60 border-b border-slate-200 dark:border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200 text-lg shrink-0">
              📁
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                  Custodia Física y Auditoría del Expediente
                </h3>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${auditState.color}`}>
                  {auditState.label}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Seguimiento de archivo físico y respaldo digitalizado para inspección distrital
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={() => setIsAssignOpen(!isAssignOpen)}
              className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 hover:bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200 flex items-center gap-1 transition-colors shadow-xs"
              title="Asignar referencia de archivador o carpeta física a los documentos del estudiante"
            >
              <span>📂</span> Asignar Carpeta
            </button>

            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-200 flex items-center justify-center gap-1.5 transition-colors shadow-sm"
            >
              <span>{isExpanded ? "▲ Ocultar Auditoría" : "▼ Auditar Documentos"}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-slate-700 font-mono">
                {stats.total}
              </span>
            </button>
          </div>
        </div>

        {/* Quick Bulk Folder Assign Box */}
        {isAssignOpen && (
          <div className="mt-3 p-3 bg-amber-50/90 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-lg text-xs space-y-2">
            <div className="font-semibold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
              <span>📂</span> Asignación Rápida de Archivador / Carpeta Física al Expediente
            </div>
            <p className="text-amber-800/80 dark:text-amber-300/80 text-[11px]">
              Ingresa el código o nombre de la carpeta física donde reposan los documentos de este estudiante (ej. <em>Carpeta Azul #04 - Archivador DECE</em>). Se asignará automáticamente a los documentos que aún no tienen ubicación registrada.
            </p>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
              <input
                type="text"
                value={bulkRef}
                onChange={(e) => setBulkRef(e.target.value)}
                placeholder="Ej. Carpeta Azul #04 - Estante 2..."
                className="input text-xs !py-1 flex-1 bg-white dark:bg-slate-900"
              />
              <label className="flex items-center gap-1.5 text-[11px] text-amber-950 dark:text-amber-200 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={overwriteAll}
                  onChange={(e) => setOverwriteAll(e.target.checked)}
                  className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                />
                <span>Sobrescribir existentes</span>
              </label>
              <button
                type="button"
                disabled={isSaving || !bulkRef.trim()}
                onClick={async () => {
                  if (!bulkRef.trim()) return;
                  setIsSaving(true);
                  try {
                    const res = await bulkAssignCasePhysicalFileRef(caseId, bulkRef.trim(), overwriteAll);
                    if (res.success) {
                      toast.success(`Se asignó la carpeta física a ${res.updatedCount} documento(s)`);
                      setIsAssignOpen(false);
                      router.refresh();
                    } else {
                      toast.error(res.error || "Error al asignar carpeta");
                    }
                  } catch {
                    toast.error("Error al procesar la solicitud");
                  } finally {
                    setIsSaving(false);
                  }
                }}
                className="btn-primary text-xs !py-1 px-3 bg-amber-700 hover:bg-amber-800 text-white font-semibold disabled:opacity-50"
              >
                {isSaving ? "Guardando..." : "Aplicar al Expediente"}
              </button>
            </div>
          </div>
        )}

        {/* Progress Bar & Semáforo Counters */}
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-3 text-[11px] font-medium flex-wrap">
              <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                Digitalizado: <strong className="font-bold font-mono">{stats.digital}</strong>
              </span>
              <span className="flex items-center gap-1 text-amber-700 dark:text-amber-400">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                En carpeta física: <strong className="font-bold font-mono">{stats.fisico}</strong>
              </span>
              <span className="flex items-center gap-1 text-rose-700 dark:text-rose-400">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                Pendiente: <strong className="font-bold font-mono">{stats.pendiente}</strong>
              </span>
            </div>
            <div className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
              {stats.complianceRate}% Custodiado
            </div>
          </div>

          {/* Tri-color composite progress bar */}
          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5 flex overflow-hidden shadow-inner">
            {stats.digitalRate > 0 && (
              <div
                className="bg-emerald-500 transition-all duration-500"
                style={{ width: `${stats.digitalRate}%` }}
                title={`Respaldo digitalizado: ${stats.digital} (${stats.digitalRate}%)`}
              />
            )}
            {stats.fisicoRate > 0 && (
              <div
                className="bg-amber-400 transition-all duration-500"
                style={{ width: `${stats.fisicoRate}%` }}
                title={`Archivado en carpeta física: ${stats.fisico} (${stats.fisicoRate}%)`}
              />
            )}
            {stats.pendienteRate > 0 && (
              <div
                className="bg-rose-400 transition-all duration-500"
                style={{ width: `${stats.pendienteRate}%` }}
                title={`Pendiente de archivo físico: ${stats.pendiente} (${stats.pendienteRate}%)`}
              />
            )}
          </div>
        </div>
      </div>

      {/* Expanded Document Audit Details */}
      {isExpanded && (
        <div className="p-4 space-y-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
          {/* Controls: Filter Pills & Search Input */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              <button
                onClick={() => setFilter("ALL")}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  filter === "ALL"
                    ? "bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900 font-bold"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                }`}
              >
                Todos ({stats.total})
              </button>
              <button
                onClick={() => setFilter("DIGITAL")}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors flex items-center gap-1 ${
                  filter === "DIGITAL"
                    ? "bg-emerald-700 text-white font-bold"
                    : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-300"
                }`}
              >
                <span>🟢</span> Digital ({stats.digital})
              </button>
              <button
                onClick={() => setFilter("FISICO")}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors flex items-center gap-1 ${
                  filter === "FISICO"
                    ? "bg-amber-600 text-white font-bold"
                    : "bg-amber-50 text-amber-800 hover:bg-amber-100 dark:bg-amber-950/50 dark:text-amber-300"
                }`}
              >
                <span>🟡</span> Físico ({stats.fisico})
              </button>
              <button
                onClick={() => setFilter("PENDIENTE")}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors flex items-center gap-1 ${
                  filter === "PENDIENTE"
                    ? "bg-rose-600 text-white font-bold"
                    : "bg-rose-50 text-rose-800 hover:bg-rose-100 dark:bg-rose-950/50 dark:text-rose-300"
                }`}
              >
                <span>🔴</span> Pendiente ({stats.pendiente})
              </button>
            </div>

            <div className="relative">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar documento o ubicación..."
                className="input text-xs !py-1 w-full sm:w-56"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-1.5 text-xs text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Documents Table */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-2 px-3">Documento</th>
                  <th className="py-2 px-3 w-24">Fecha</th>
                  <th className="py-2 px-3 w-28">Modalidad</th>
                  <th className="py-2 px-3">Ubicación Físico</th>
                  <th className="py-2 px-3 w-28 text-center">Estado Custodia</th>
                  <th className="py-2 px-3 w-28 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredDocs.map((doc) => (
                  <tr key={`${doc.moduleKey}-${doc.id}`} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-slate-900 dark:text-slate-100">
                        {doc.docTitle}
                      </div>
                      <div className="text-[11px] text-slate-400 dark:text-slate-500">
                        {doc.moduleName}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                      {doc.date || "—"}
                    </td>
                    <td className="py-2.5 px-3">
                      {doc.signatureType === "DIGITAL" ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          ✍️ Electrónica
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          🖋️ Física/Manuscrita
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      {doc.physicalFileRef ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-900 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                          📂 {doc.physicalFileRef}
                        </span>
                      ) : (
                        <span className="text-[11px] text-rose-600 dark:text-rose-400 italic">
                          ⚠️ No referenciado
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {doc.status === "DIGITAL" && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200">
                          🟢 Digitalizado
                        </span>
                      )}
                      {doc.status === "FISICO" && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200">
                          🟡 En Carpeta
                        </span>
                      )}
                      {doc.status === "PENDIENTE" && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200">
                          🔴 Pendiente
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {doc.physicalEvidenceUrl && (
                          <a
                            href={doc.physicalEvidenceUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1 rounded text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/40"
                            title="Ver archivo escaneado original"
                          >
                            📷
                          </a>
                        )}
                        {doc.printUrl && (
                          <Link
                            href={doc.printUrl}
                            className="p-1 rounded text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800"
                            title="Imprimir versión oficial para archivo"
                          >
                            🖨️
                          </Link>
                        )}
                        {doc.editUrl && (
                          <Link
                            href={doc.editUrl}
                            className="p-1 rounded text-brand-600 hover:text-brand-800 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-950/40"
                            title="Editar y registrar custodia física"
                          >
                            ✏️
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredDocs.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-slate-400">
                      No se encontraron documentos para el filtro seleccionado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Legal / Standard Reminder Banner */}
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-400 flex items-start gap-2">
            <span className="text-amber-600 text-sm mt-0.5">ℹ️</span>
            <div>
              <strong className="font-semibold text-slate-700 dark:text-slate-300">
                Directriz de Auditoría Distrital (MINEDUC):
              </strong>{" "}
              Todo informe, acta o ficha debe estar impreso, suscrito con firmas de responsabilidad y foliado en el expediente físico del estudiante dentro del archivador DECE. Para completar la custodia, ingrese a la opción <strong>Editar</strong> de cada documento y registre la referencia de carpeta física o cargue el respaldo escaneado.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}