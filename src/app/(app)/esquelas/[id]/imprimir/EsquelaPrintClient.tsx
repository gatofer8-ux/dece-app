"use client";

import { useState } from "react";
import Link from "next/link";
import type { DeceEsquelaRow, InstitutionRow } from "@/lib/types";
import { formatDate } from "@/components/ui";

export default function EsquelaPrintClient({
  esquela,
  institution,
}: {
  esquela: DeceEsquelaRow;
  institution: InstitutionRow | undefined;
}) {
  const [layoutMode, setLayoutMode] = useState<"2in1" | "single">("2in1");

  const institutionName = institution?.name || "UNIDAD EDUCATIVA";
  const zoneText = institution?.zona || institution?.zone_code || "Coordinación Zonal 3";
  const districtText = institution?.district || institution?.district_code || "Distrito Educativo";
  const logoUrl = institution?.seal_image || null;

  const renderSingleEsquela = (copyIndex = 1) => (
    <div
      key={copyIndex}
      className="esquela-ticket bg-white p-5 sm:p-6 border border-slate-300 print:border-none relative flex flex-col justify-between"
      style={{
        boxSizing: "border-box",
        minHeight: layoutMode === "2in1" ? "138mm" : "auto",
        maxHeight: layoutMode === "2in1" ? "142mm" : "none",
        fontSize: "11px",
        lineHeight: "1.3",
      }}
    >
      {/* SECCIÓN SUPERIOR: CONVOCATORIA FORMAL */}
      <div className="space-y-2.5">
        {/* Membrete */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-2 gap-3">
          <div className="flex items-center gap-2.5">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="Logo" className="h-10 w-10 object-contain" />
            ) : (
              <div className="h-10 w-10 border border-slate-400 rounded flex items-center justify-center font-bold text-xs bg-slate-50">
                DECE
              </div>
            )}
            <div>
              <div className="font-extrabold uppercase text-[12px] tracking-wide text-slate-900 leading-tight">
                {institutionName}
              </div>
              <div className="text-[10px] text-slate-600 font-medium">
                {zoneText} · {districtText} · DECE
              </div>
            </div>
          </div>

          <div className="text-right">
            <div className="font-mono text-[11px] font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-300">
              {esquela.citation_number}
            </div>
            <div className="text-[9px] text-slate-500 uppercase mt-0.5 font-semibold">
              {esquela.urgency_level === "URGENTE" ? "⚠️ CITACIÓN URGENTE" : "CITACIÓN ORDINARIA"}
            </div>
          </div>
        </div>

        {/* Título de la Esquela */}
        <div className="text-center font-bold text-[12px] uppercase tracking-wider text-slate-900 bg-slate-100 py-1 rounded border border-slate-200">
          CONVOCATORIA DE ASISTENCIA AL DEPARTAMENTO DE CONSEJERÍA ESTUDIANTIL (DECE)
        </div>

        {/* Datos del Estudiante y Representante */}
        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10.5px] bg-slate-50/70 p-2 rounded border border-slate-200">
          <div>
            <span className="font-bold text-slate-700">Estudiante: </span>
            <span className="font-semibold text-slate-900 uppercase">{esquela.student_name}</span>
          </div>
          <div>
            <span className="font-bold text-slate-700">Curso y Paralelo: </span>
            <span>{esquela.course} {esquela.parallel ? `"${esquela.parallel}"` : ""} ({esquela.jornada || "Matutina"})</span>
          </div>
          <div className="col-span-2">
            <span className="font-bold text-slate-700">Sr.(a) Representante: </span>
            <span className="font-semibold text-slate-900 uppercase">{esquela.representative_name}</span>
            {esquela.representative_phone && (
              <span className="text-slate-600 ml-2">(Telf: {esquela.representative_phone})</span>
            )}
          </div>
        </div>

        {/* Texto de la Convocatoria */}
        <div className="text-[10.5px] text-justify leading-relaxed text-slate-800">
          De manera atenta y cordial, el Departamento de Consejería Estudiantil (DECE) solicita su
          comparecencia a una reunión de carácter institucional:
        </div>

        {/* Cita destacada */}
        <div className="bg-slate-100 p-2 rounded border border-slate-300 flex items-center justify-around text-center text-[11px]">
          <div>
            <div className="text-[9px] font-bold uppercase text-slate-500">Fecha de la Cita</div>
            <div className="font-bold text-slate-900">{formatDate(esquela.citation_date)}</div>
          </div>
          <div className="border-l border-slate-300 pl-3">
            <div className="text-[9px] font-bold uppercase text-slate-500">Hora Puntual</div>
            <div className="font-bold text-slate-900">{esquela.citation_time}</div>
          </div>
          <div className="border-l border-slate-300 pl-3">
            <div className="text-[9px] font-bold uppercase text-slate-500">Lugar</div>
            <div className="font-medium text-slate-800">{esquela.citation_place || "Oficina DECE"}</div>
          </div>
        </div>

        {/* Motivo */}
        <div className="text-[10.5px]">
          <span className="font-bold text-slate-700">Asunto a tratar: </span>
          <span className="text-slate-800">{esquela.citation_reason}</span>
        </div>

        {esquela.observations && (
          <div className="text-[9.5px] text-slate-600 italic">
            * Nota: {esquela.observations}
          </div>
        )}

        {/* Firma Profesional */}
        <div className="pt-2 flex justify-between items-end text-[10px]">
          <div className="text-[9px] text-slate-400">
            Emitido: {formatDate(esquela.created_at)} · Año: {esquela.school_year_code}
          </div>
          <div className="text-center w-56">
            <div className="border-b border-slate-400 w-full mb-1"></div>
            <div className="font-bold text-slate-900 uppercase text-[10px]">{esquela.professional_name}</div>
            <div className="text-[9px] text-slate-600">{esquela.professional_role || "Profesional DECE"}</div>
          </div>
        </div>
      </div>

      {/* LÍNEA DE CORTE CON TIJERA (TALÓN DESPRENDIBLE) */}
      <div className="my-2 border-t-2 border-dashed border-slate-400 relative text-center">
        <span
          className="bg-white px-3 font-mono text-[9px] text-slate-500 tracking-wider inline-block -top-2 relative font-bold"
        >
          ✂ CORTAR AQUÍ (TALÓN DE ACUSE DE RECIBO PARA EL DECE) ✂
        </span>
      </div>

      {/* SECCIÓN INFERIOR: TALÓN DE ACUSE DE RECIBO */}
      <div className="bg-slate-50 p-2.5 rounded border border-slate-300 text-[9.5px] space-y-1.5">
        <div className="flex justify-between items-center border-b border-slate-200 pb-1">
          <span className="font-bold uppercase tracking-wider text-slate-800">
            TALÓN DE NOTIFICACIÓN Y RECEPCIÓN · {institutionName}
          </span>
          <span className="font-mono font-bold text-slate-700 text-[9px]">
            N° {esquela.citation_number}
          </span>
        </div>

        <div className="text-slate-700 leading-tight">
          Cita programada para el estudiante <strong className="text-slate-900">{esquela.student_name}</strong> ({esquela.course} {esquela.parallel || ""}) el día <strong className="text-slate-900">{formatDate(esquela.citation_date)}</strong> a las <strong className="text-slate-900">{esquela.citation_time}</strong>.
        </div>

        {/* Casillas de Quién Recibió */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-800 font-medium">
          <span className="font-bold text-slate-700">Convocatoria recibida por:</span>
          <span>[&nbsp;&nbsp;&nbsp;] Estudiante</span>
          <span>[&nbsp;&nbsp;&nbsp;] Representante Legal</span>
          <span>[&nbsp;&nbsp;&nbsp;] Familiar (Parentesco: __________________)</span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-[9px] pt-1">
          <div>
            Nombre de quien recibe: _________________________________
          </div>
          <div>
            C.I. N°: ___________________ Fecha entrega: ____/____/202___
          </div>
        </div>

        <div className="flex justify-between items-end pt-1 gap-4 text-[9px]">
          <div className="space-y-0.5">
            <div>[&nbsp;&nbsp;&nbsp;] Confirmo asistencia a la hora señalada.</div>
            <div>[&nbsp;&nbsp;&nbsp;] No podré asistir por motivo de fuerza mayor: _______________________</div>
          </div>

          <div className="text-center w-48">
            <div className="border-b border-slate-400 w-full mb-0.5"></div>
            <div className="font-semibold text-slate-800">Firma de Recepción / Representante</div>
            {esquela.physical_file_ref && (
              <div className="text-[8.5px] text-amber-800 mt-0.5">
                📁 Archivo físico: {esquela.physical_file_ref}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-100 py-4 px-2 sm:px-4 print:p-0 print:bg-white text-slate-900">
      {/* CSS de Impresión Calibrado para A4 y Optimización de Papel */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @page {
          size: A4 portrait;
          margin: 6mm 8mm;
        }
        @media print {
          html, body {
            background: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
          .print-container {
            width: 100% !important;
            max-width: none !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
          }
          .esquela-ticket {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            margin-bottom: 3mm !important;
          }
          .break-before-page {
            page-break-before: always;
            break-before: page;
          }
        }
      `,
        }}
      />

      {/* Barra Superior de Control de Impresión */}
      <div className="no-print max-w-[210mm] mx-auto bg-white p-3 rounded-lg shadow-sm border border-slate-200 mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link
            href={`/esquelas/${esquela.id}`}
            className="btn-secondary text-xs flex items-center gap-1 font-medium"
          >
            ← Volver a la Esquela
          </Link>
          <span className="text-slate-300">|</span>
          <span className="text-xs text-slate-500 font-mono font-bold">
            {esquela.citation_number}
          </span>
        </div>

        {/* Conmutador de Optimización de Papel */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
          <span className="text-[11px] font-semibold text-slate-600 px-2">Optimización:</span>
          <button
            type="button"
            onClick={() => setLayoutMode("2in1")}
            className={`px-3 py-1 rounded font-bold transition-all ${
              layoutMode === "2in1"
                ? "bg-white text-brand-900 shadow-sm border border-slate-200"
                : "text-slate-600 hover:text-slate-900"
            }`}
            title="Imprime 2 esquelas idénticas en 1 sola hoja A4 para ahorrar 50% de papel"
          >
            📄 2 en 1 (Hoja A4 completa)
          </button>

          <button
            type="button"
            onClick={() => setLayoutMode("single")}
            className={`px-3 py-1 rounded font-bold transition-all ${
              layoutMode === "single"
                ? "bg-white text-brand-900 shadow-sm border border-slate-200"
                : "text-slate-600 hover:text-slate-900"
            }`}
            title="Imprime 1 sola esquela en formato de media página"
          >
            📑 1 por página (A5)
          </button>
        </div>

        {/* Botón de Impresión */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="btn-primary text-xs px-4 py-1.5 flex items-center gap-1.5 font-bold shadow-sm"
          >
            <span>🖨️</span> Imprimir Documento
          </button>
        </div>
      </div>

      {/* Contenedor Imprimible */}
      <div className="print-container max-w-[210mm] mx-auto bg-white shadow-xl print:shadow-none border border-slate-200 print:border-none p-2 sm:p-4 print:p-0">
        {layoutMode === "2in1" ? (
          <div className="space-y-4 print:space-y-2">
            {renderSingleEsquela(1)}
            <div className="hidden print:block border-t-2 border-slate-300 my-1"></div>
            {renderSingleEsquela(2)}
          </div>
        ) : (
          renderSingleEsquela(1)
        )}

        {/* Anexo de Auditoría Distrital: Talón Firmado Digitalizado */}
        {esquela.physical_evidence_url && (
          <div className="mt-8 pt-6 border-t-2 border-dashed border-slate-300 break-before-page print:pt-4">
            <div className="bg-slate-100 p-3 rounded-t border border-slate-300 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase text-slate-800 tracking-wider">
                  ANEXO DE AUDITORÍA DISTRITAL: TALÓN DE NOTIFICACIÓN FIRMADO Y DIGITALIZADO
                </h3>
                <p className="text-[11px] text-slate-500">
                  Comprobante físico de recepción y firma del representante legal digitalizado para auditoría ministerial.
                </p>
              </div>
              {esquela.physical_file_ref && (
                <span className="text-xs text-amber-800 font-semibold bg-amber-50 border border-amber-300 px-2.5 py-1 rounded">
                  📁 {esquela.physical_file_ref}
                </span>
              )}
            </div>
            <div className="border border-t-0 border-slate-300 p-4 bg-white flex flex-col items-center justify-center min-h-[250px]">
              {esquela.physical_evidence_url.startsWith("data:application/pdf") ? (
                <div className="w-full text-center py-6">
                  <p className="text-xs font-medium text-slate-700 mb-2">
                    📄 Documento PDF con el talón firmado adjunto.
                  </p>
                  <a
                    href={esquela.physical_evidence_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="no-print inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md"
                  >
                    Ver PDF del talón firmado ↗
                  </a>
                </div>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={esquela.physical_evidence_url}
                  alt="Talón Firmado Digitalizado"
                  className="max-h-[750px] w-auto object-contain border border-slate-200 rounded shadow-xs"
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
