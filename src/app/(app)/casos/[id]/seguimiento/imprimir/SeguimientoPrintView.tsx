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
  representative,
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
  // Opciones de optimización de hojas
  const [showPerRowSign, setShowPerRowSign] = useState(true);
  const [blankRowsCount, setBlankRowsCount] = useState<number>(3);
  const [includeStudentSignature, setIncludeStudentSignature] = useState(false);

  function downloadWord() {
    const content = document.getElementById("printable-content");
    if (!content) return;
    const title = `Bitacora_Seguimiento_${student.full_name.replace(/\s+/g, "_")}`;
    const html = buildWordDocument(content.innerHTML, title);
    const blob = new Blob(["\ufeff", html], { type: "application/msword" });
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
      {/* Barra de Controles para Ahorro de Hojas (Oculta al Imprimir) */}
      <div className="no-print p-4 bg-slate-50 border-b border-slate-200 rounded-t-lg space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="font-semibold text-xs text-slate-800 flex items-center gap-1.5">
              <span>🌱</span>
              <span>Herramientas de Optimización y Ahorro de Hojas</span>
            </span>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Configura cómo hacer firmar al representante para no reimprimir hojas en cada abordaje.
            </p>
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

        <div className="bg-white p-3 rounded border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showPerRowSign}
              onChange={(e) => setShowPerRowSign(e.target.checked)}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <div>
              <span className="font-medium text-slate-700">Firma por cada abordaje</span>
              <p className="text-[10px] text-slate-400">Columna de firma en la misma tabla</p>
            </div>
          </label>

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
            </select>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={includeStudentSignature}
              onChange={(e) => setIncludeStudentSignature(e.target.checked)}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <div>
              <span className="font-medium text-slate-700">Firma del estudiante</span>
              <p className="text-[10px] text-slate-400">Para adolescentes / bachillerato</p>
            </div>
          </label>
        </div>
      </div>

      {/* Contenido Imprimible */}
      <div id="printable-content" className="p-8 print:p-0 text-sm">
        <DocumentHeader
          title="Seguimiento de la Atención Psicosocial"
          subtitle="Bitácora Oficial — Departamento de Consejería Estudiantil (DECE)"
          institutionName={institution?.name}
          sealImage={institution?.seal_image}
        />

        <section className="grid grid-cols-2 gap-x-8 gap-y-1.5 mb-4 text-xs mt-3 border border-slate-300 p-2.5 rounded bg-slate-50/50">
          <div><strong>Estudiante:</strong> {student.full_name}</div>
          <div><strong>Código de caso:</strong> {caseFile.code}</div>
          <div><strong>C.I. Estudiante:</strong> {student.document_id || "s/n"}</div>
          <div><strong>Curso:</strong> {studentGrade}</div>
          <div><strong>Representante legal:</strong> {representative.name || student.representative || "No registra"}</div>
          <div><strong>Teléfono contacto:</strong> {representative.phone || student.rep_phone || "No registra"}</div>
          <div><strong>Profesional DECE responsable:</strong> {professional.name}</div>
          <div><strong>Institución:</strong> {institution?.name || "—"}</div>
        </section>

        <div className="flex items-center justify-between mb-1.5">
          <p className="font-bold text-xs uppercase text-slate-800">
            Acciones implementadas para la atención psicosocial
          </p>
          <span className="text-[10px] text-slate-500 no-print">
            {actions.length} acción(es) registrada(s) {blankRowsCount > 0 ? `+ ${blankRowsCount} filas en blanco` : ""}
          </span>
        </div>

        <table className="w-full text-xs border-collapse border border-slate-400 table-fixed">
          <thead>
            <tr className="bg-slate-100 text-slate-800">
              <th className="border border-slate-400 p-1.5 w-28 text-left">Tipo de intervención</th>
              <th className="border border-slate-400 p-1.5 text-left">Descripción de la atención psicosocial</th>
              <th className="border border-slate-400 p-1.5 w-28 text-left">Profesional DECE</th>
              <th className="border border-slate-400 p-1.5 w-20 text-center">Fecha</th>
              <th className="border border-slate-400 p-1.5 w-32 text-left">Observaciones / Acuerdos</th>
              {showPerRowSign && (
                <th className="border border-slate-400 p-1.5 w-32 text-center bg-blue-50/70 text-blue-950 font-bold">
                  Firma y C.I. del Representante
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {actions.map((a) => (
              <tr key={a.id} className="align-top">
                <td className="border border-slate-400 p-1.5 text-[11px]">
                  {a.intervention_type ? INTERVENTION_TYPE_LABELS[a.intervention_type] || a.intervention_type : a.type}
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
                <td className="border border-slate-400 p-1.5 text-[11px] leading-snug">
                  {a.observations || "—"}
                </td>
                {showPerRowSign && (
                  <td className="border border-slate-400 p-1.5 text-center align-bottom bg-blue-50/20">
                    <div className="h-10 border-b border-dotted border-slate-400 mb-1" />
                    <span className="text-[9px] text-slate-500 block">Firma / C.I.</span>
                  </td>
                )}
              </tr>
            ))}

            {actions.length === 0 && blankRowsCount === 0 && (
              <tr>
                <td colSpan={showPerRowSign ? 6 : 5} className="border border-slate-400 p-4 text-center text-slate-400 italic">
                  Sin acciones registradas en el expediente digital.
                </td>
              </tr>
            )}

            {/* Filas en blanco adicionales para registro manuscrito continuo en carpeta física */}
            {Array.from({ length: blankRowsCount }).map((_, idx) => (
              <tr key={`blank-${idx}`} className="align-top">
                <td className="border border-slate-400 p-1.5 h-16 text-[10px] text-slate-300">
                  <span className="no-print italic">Reg. físico #{actions.length + idx + 1}</span>
                </td>
                <td className="border border-slate-400 p-1.5 h-16" />
                <td className="border border-slate-400 p-1.5 h-16" />
                <td className="border border-slate-400 p-1.5 h-16" />
                <td className="border border-slate-400 p-1.5 h-16" />
                {showPerRowSign && (
                  <td className="border border-slate-400 p-1.5 text-center align-bottom bg-blue-50/10">
                    <div className="h-10 border-b border-dotted border-slate-400 mb-1" />
                    <span className="text-[9px] text-slate-400 block">Firma / C.I.</span>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>

        {/* Apartado de Firmas de Responsabilidad al Final */}
        <section className="mt-8 pt-4 border-t border-slate-300 page-break-inside-avoid" style={{ pageBreakInside: "avoid" }}>
          <p className="text-[11px] text-slate-600 mb-6 text-justify leading-relaxed">
            <strong>CONSTANCIA DE SEGUIMIENTO Y ACOMPAÑAMIENTO:</strong> Para debida constancia de las atenciones psicosociales ejecutadas, así como de las orientaciones, acuerdos y compromisos asumidos para garantizar el bienestar integral, desarrollo socioemocional y permanencia escolar del/la estudiante, suscriben los comparecientes:
          </p>

          <div
            className={`grid ${
              includeStudentSignature ? "grid-cols-3" : "grid-cols-2"
            } gap-8 text-xs text-center`}
          >
            {/* Firma Profesional DECE */}
            <div className="flex flex-col items-center">
              <div className="w-48 sm:w-60 border-t border-slate-800 pt-1.5 mt-12">
                <p className="font-bold text-slate-800 uppercase">{professional.name}</p>
                <p className="text-[11px] text-slate-600 uppercase font-medium">{professional.role || "PROFESIONAL DECE"}</p>
                {professional.documentId && (
                  <p className="text-[10px] text-slate-500">C.I.: {professional.documentId}</p>
                )}
              </div>
            </div>

            {/* Firma Representante Legal */}
            <div className="flex flex-col items-center">
              <div className="w-48 sm:w-60 border-t border-slate-800 pt-1.5 mt-12 text-left">
                <p className="font-bold text-slate-800 text-center uppercase">REPRESENTANTE LEGAL</p>
                <div className="mt-2 space-y-1 text-[11px] text-slate-700">
                  <p>
                    <span className="font-medium">Nombres:</span>{" "}
                    <span className="border-b border-dotted border-slate-500 inline-block min-w-[140px]">
                      {representative.name || " "}
                    </span>
                  </p>
                  <p>
                    <span className="font-medium">C.I.:</span>{" "}
                    <span className="border-b border-dotted border-slate-500 inline-block min-w-[100px]">
                      {representative.documentId || " "}
                    </span>
                  </p>
                  <p>
                    <span className="font-medium">Vínculo:</span>{" "}
                    <span className="border-b border-dotted border-slate-500 inline-block min-w-[100px]">
                      {representative.relationship || "Madre / Padre / Rep."}
                    </span>
                  </p>
                  <p>
                    <span className="font-medium">Fecha:</span>{" "}
                    <span className="border-b border-dotted border-slate-500 inline-block min-w-[100px]">
                      {new Date().toISOString().slice(0, 10)}
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {/* Firma Estudiante (Opcional) */}
            {includeStudentSignature && (
              <div className="flex flex-col items-center">
                <div className="w-48 sm:w-60 border-t border-slate-800 pt-1.5 mt-12">
                  <p className="font-bold text-slate-800 uppercase">{student.full_name}</p>
                  <p className="text-[11px] text-slate-600 uppercase font-medium">ESTUDIANTE</p>
                  {student.document_id && (
                    <p className="text-[10px] text-slate-500">C.I.: {student.document_id}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>

        <div className="mt-8">
          <DocumentFooter institution={institution} />
        </div>
      </div>
    </div>
  );
}
