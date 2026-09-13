"use client";

import { useState } from "react";
import DocumentHeader from "@/components/DocumentHeader";
import DocumentFooter from "@/components/DocumentFooter";
import { formatDate } from "@/components/ui";
import { buildWordDocument } from "@/lib/wordExportStyles";
import { INTERVENTION_TYPE_LABELS } from "@/lib/types";
import type { CaseFileRow, StudentRow, CaseActionRow, InstitutionRow } from "@/lib/types";

interface ProfessionalData {
  name: string;
  role: string;
  documentId?: string;
}

interface RepresentativeData {
  name: string;
  documentId: string;
  phone: string;
  relationship?: string;
}

export default function SeguimientoPrintView({
  caseFile,
  student,
  studentGrade,
  actions,
  institution,
  professional,
  userMap,
}: {
  caseFile: CaseFileRow;
  student: StudentRow;
  studentGrade: string;
  actions: CaseActionRow[];
  institution: InstitutionRow;
  professional: ProfessionalData;
  userMap: Record<string, string>;
  representative: RepresentativeData;
}) {
  // Opciones de visualización y optimización
  const [blankRowsCount, setBlankRowsCount] = useState<number>(0);
  const [folioNumber, setFolioNumber] = useState<number>(1);

  // Selección de acciones a imprimir (para imprimir hojas de continuación si el padre regresa después de semanas)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(actions.map((a) => a.id))
  );

  const displayedActions = actions.filter((a) => selectedIds.has(a.id));

  function selectAll() {
    setSelectedIds(new Set(actions.map((a) => a.id)));
  }

  function selectOnlyLast() {
    if (actions.length > 0) {
      setSelectedIds(new Set([actions[actions.length - 1].id]));
    }
  }

  function toggleAction(id: string) {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  }

  function downloadWord() {
    const content = document.getElementById("printable-content");
    if (!content) return;
    const title = `Seguimiento_Atencion_Psicosocial_${student.full_name.replace(/\s+/g, "_")}${folioNumber > 1 ? `_Folio_${folioNumber}` : ""}`;
    const html = buildWordDocument(content.innerHTML, title);
    const blob = new Blob(["﻿", html], { type: "application/msword" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="max-w-4xl mx-auto bg-white">
      {/* Barra de Controles y Opciones (Oculta al Imprimir) */}
      <div className="no-print p-4 bg-slate-50 border-b border-slate-200 rounded-t-lg space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="font-semibold text-xs text-slate-800 flex items-center gap-1.5">
              <span>📄</span>
              <span>Ficha Oficial de Seguimiento de la Atención Psicosocial — Opciones de Impresión</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={downloadWord}
              className="btn-secondary text-xs !py-1.5"
              title="Descargar versión editable en Word"
            >
              ⬇️ Word editable
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="btn-primary text-xs !py-1.5"
              title="Imprimir o guardar como PDF"
            >
              🖨️ Imprimir / Guardar PDF
            </button>
          </div>
        </div>

        {/* Panel de Ajustes */}
        <div className="bg-white p-3 rounded border border-slate-200 space-y-2.5 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex items-center gap-2">
              <label className="text-slate-700 font-medium whitespace-nowrap">Folio / Hoja N°:</label>
              <select
                value={folioNumber}
                onChange={(e) => setFolioNumber(Number(e.target.value))}
                className="select !py-1 !px-2 text-xs flex-1 font-semibold text-blue-900"
              >
                <option value={1}>Hoja 1 (Apertura)</option>
                <option value={2}>Hoja 2 (Continuación)</option>
                <option value={3}>Hoja 3 (Continuación)</option>
                <option value={4}>Hoja 4 (Continuación)</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-slate-700 font-medium whitespace-nowrap">Filas en blanco:</label>
              <select
                value={blankRowsCount}
                onChange={(e) => setBlankRowsCount(Number(e.target.value))}
                className="select !py-1 !px-2 text-xs flex-1"
              >
                <option value={0}>0 (solo registradas)</option>
                <option value={3}>+3 filas para carpeta</option>
                <option value={5}>+5 filas para carpeta</option>
                <option value={8}>+8 filas (hoja completa)</option>
                <option value={42}>+42 filas (formato físico completo)</option>
              </select>
            </div>
          </div>

          {/* Filtro rápido de acciones si hay más de 1 acción */}
          {actions.length > 1 && (
            <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-medium text-slate-600">Acciones visibles:</span>
                <span className="bg-blue-100 text-blue-800 font-bold px-1.5 py-0.5 rounded text-[11px]">
                  {displayedActions.length} de {actions.length}
                </span>
                <span className="text-[10px] text-slate-400 no-print">
                  (Desmarca las acciones ya impresas si estás imprimiendo una hoja de continuación)
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={selectAll}
                  className="px-2 py-0.5 rounded border border-slate-300 text-[11px] text-slate-700 hover:bg-slate-100"
                >
                  Marcar todas
                </button>
                <button
                  type="button"
                  onClick={selectOnlyLast}
                  className="px-2 py-0.5 rounded border border-blue-300 bg-blue-50 text-[11px] text-blue-700 hover:bg-blue-100"
                  title="Imprime solo la última atención registrada hoy"
                >
                  Solo la última (hoy)
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Contenido Imprimible — calca fiel del formato oficial institucional */}
      <div id="printable-content" className="p-8 print:p-0 text-sm">
        <DocumentHeader
          title="Seguimiento de la Atención Psicosocial"
          institutionName={institution?.name}
          sealImage={institution?.seal_image}
        />

        <p className="text-center italic text-[11px] text-slate-600 mt-2 mb-3">
          *La información registrada en este documento es confidencial y de uso exclusivo del Departamento de Consejería Estudiantil
        </p>

        <div className="flex flex-wrap items-center gap-x-8 gap-y-1 mb-3 text-xs">
          <div>
            <strong>Nombre y Apellidos:</strong> {student.full_name}
          </div>
          <div>
            <strong>Curso y Paralelo:</strong> {studentGrade}
          </div>
        </div>

        <p className="text-center font-bold text-[13px] text-slate-900 mb-1.5">
          Acciones implementadas para la atención psicosocial{folioNumber > 1 ? ` (Continuación ${folioNumber})` : ""}
        </p>
        <div className="flex justify-end mb-1.5">
          <span className="text-[10px] text-slate-500 no-print">
            {displayedActions.length} acción(es) visible(s) {blankRowsCount > 0 ? `+ ${blankRowsCount} filas en blanco` : ""}
          </span>
        </div>

        <table className="w-full text-xs border-collapse border border-slate-400 table-fixed">
          <thead>
            <tr className="bg-[#D5DCE4] text-slate-900">
              <th className="border border-slate-400 p-1.5 w-[13%] text-center">
                Tipo de intervención realizada (individual, familiar o grupal, en crisis)
              </th>
              <th className="border border-slate-400 p-1.5 w-[24%] text-center">
                Descripción de la atención psicosocial realizada
              </th>
              <th className="border border-slate-400 p-1.5 w-[11%] text-center">
                Profesional que realiza la atención psicosocial
              </th>
              <th className="border border-slate-400 p-1.5 w-[9%] text-center">Fecha de atención</th>
              <th className="border border-slate-400 p-1.5 text-center">Observaciones</th>
            </tr>
          </thead>
          <tbody>
            {displayedActions.map((a) => (
              <tr key={a.id} className="align-top">
                <td className="border border-slate-400 p-1.5 text-[11px]">
                  <div className="flex items-start gap-1">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(a.id)}
                      onChange={() => toggleAction(a.id)}
                      title="Incluir/excluir de la impresión"
                      className="no-print mt-0.5 rounded text-blue-600 shrink-0"
                    />
                    <span>{a.intervention_type ? INTERVENTION_TYPE_LABELS[a.intervention_type] || a.intervention_type : a.type}</span>
                  </div>
                </td>
                <td className="border border-slate-400 p-1.5 text-[11px] whitespace-pre-wrap leading-snug">
                  {a.description}
                </td>
                <td className="border border-slate-400 p-1.5 text-[11px]">
                  {userMap[a.author_id] || professional.name}
                </td>
                <td className="border border-slate-400 p-1.5 text-[11px] text-center whitespace-nowrap">
                  {formatDate(a.date)}
                </td>
                <td className="border border-slate-400 p-1.5 text-[11px] whitespace-pre-wrap leading-snug">
                  {a.observations || "—"}
                </td>
              </tr>
            ))}

            {displayedActions.length === 0 && blankRowsCount === 0 && (
              <tr>
                <td colSpan={5} className="border border-slate-400 p-4 text-center text-slate-400 italic">
                  No hay acciones seleccionadas para imprimir. Marca las casillas de las acciones deseadas en el panel superior.
                </td>
              </tr>
            )}

            {/* Filas en blanco adicionales si se seleccionaron */}
            {Array.from({ length: blankRowsCount }).map((_, idx) => (
              <tr key={`blank-${idx}`} className="align-top">
                <td className="border border-slate-400 p-1.5 h-8 text-[10px] text-slate-300">
                  <span className="no-print italic">Reg. #{displayedActions.length + idx + 1}</span>
                </td>
                <td className="border border-slate-400 p-1.5 h-8" />
                <td className="border border-slate-400 p-1.5 h-8" />
                <td className="border border-slate-400 p-1.5 h-8" />
                <td className="border border-slate-400 p-1.5 h-8" />
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-8">
          <DocumentFooter institution={institution} />
        </div>
      </div>
    </div>
  );
}
