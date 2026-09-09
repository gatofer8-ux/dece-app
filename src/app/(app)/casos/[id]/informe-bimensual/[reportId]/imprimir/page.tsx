import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireRole, requireInstitutionId } from "@/lib/session";
import type { CaseFileRow, StudentRow, BimonthlyReportRow } from "@/lib/types";
import { parseProcessesData } from "@/lib/bimonthlyReport";
import PrintButton from "@/components/PrintButton";

export default async function ImprimirInformeBimensualPage({
  params,
}: {
  params: { id: string; reportId: string };
}) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);

  const caseFile = db
    .prepare("SELECT * FROM case_files WHERE id = ? AND institution_id = ?")
    .get(params.id, institutionId) as CaseFileRow | undefined;
  if (!caseFile) notFound();

  const report = db
    .prepare("SELECT * FROM bimonthly_reports WHERE id = ? AND case_file_id = ? AND institution_id = ?")
    .get(params.reportId, caseFile.id, institutionId) as BimonthlyReportRow | undefined;
  if (!report) notFound();

  const student = db.prepare("SELECT * FROM students WHERE id = ?").get(caseFile.student_id) as StudentRow;
  const processes = parseProcessesData(report.processes_data);

  return (
    <div className="bg-white min-h-screen py-6 px-4 sm:px-8 text-black text-xs print:py-0 print:px-0">
      <style>{`
        @page {
          size: A4 landscape;
          margin: 10mm 15mm 12mm 15mm;
        }
        @media print {
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .no-print {
            display: none !important;
          }
          .break-inside-avoid {
            page-break-inside: avoid;
            break-inside: avoid;
          }
        }
      `}</style>

      {/* Barra superior de controles (no se imprime) */}
      <div className="no-print max-w-6xl mx-auto mb-6 flex items-center justify-between bg-slate-100 p-3 rounded-lg border border-slate-200">
        <div className="flex items-center gap-3">
          <Link
            href={`/casos/${caseFile.id}`}
            className="text-xs text-slate-600 hover:text-slate-900 font-medium flex items-center gap-1"
          >
            <span>&larr;</span> Volver al caso
          </Link>
          <span className="text-slate-300">|</span>
          <Link
            href={`/casos/${caseFile.id}/informe-bimensual/${report.id}/editar`}
            className="text-xs text-emerald-700 hover:text-emerald-900 font-semibold flex items-center gap-1"
          >
            ✏️ Editar Informe
          </Link>
          <span className="text-slate-300">|</span>
          <span className="text-xs text-slate-500 font-mono">
            Caso: {caseFile.code} • Víctima: {report.victim_initials}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={`/api/casos/${caseFile.id}/informe-bimensual/${report.id}/export-word`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white hover:bg-emerald-700 rounded text-xs font-semibold transition-colors"
          >
            <span>📥</span> Descargar Word (.docx)
          </a>
          <PrintButton hideWordButton={true} />
        </div>
      </div>

      {/* Contenedor del documento oficial en formato horizontal */}
      <div className="max-w-[270mm] mx-auto space-y-4 print:max-w-none print:m-0">
        {/* Encabezado Oficial */}
        <div className="w-full">
          <img
            src="/header_4k.png"
            alt="Ministerio de Educación, Deporte y Cultura - República del Ecuador"
            className="w-full h-auto object-contain max-h-[65px]"
          />
        </div>

        {/* Título Principal */}
        <div className="text-center space-y-1 my-3">
          <h1 className="text-sm sm:text-base font-bold text-slate-900 tracking-wide uppercase font-sans">
            SEGUIMIENTO AL PLAN DE ACOMPAÑAMIENTO INSTITUCIONAL
          </h1>
          <h2 className="text-xs sm:text-sm font-bold text-slate-800">
            Año lectivo {report.school_year_text} (Meses: {report.period_months})
          </h2>
        </div>

        {/* 1. Datos Informativos Institucionales */}
        <table className="w-full border-collapse border border-black text-xs">
          <tbody>
            <tr>
              <td className="w-1/3 bg-[#e5e7eb] font-bold p-1.5 border border-black text-slate-900">
                Nombre de la institución educativa:
              </td>
              <td className="w-2/3 p-1.5 border border-black font-medium text-slate-900">
                {report.institution_name}
              </td>
            </tr>
            <tr>
              <td className="bg-[#e5e7eb] font-bold p-1.5 border border-black text-slate-900">
                Código AMIE:
              </td>
              <td className="p-1.5 border border-black font-medium text-slate-900 font-mono">
                {report.amie_code}
              </td>
            </tr>
            <tr>
              <td className="bg-[#e5e7eb] font-bold p-1.5 border border-black text-slate-900">
                N° de presuntas víctimas:
              </td>
              <td className="p-1.5 border border-black font-semibold text-slate-900">
                {report.victim_initials}
              </td>
            </tr>
          </tbody>
        </table>

        {/* 2. Matriz de los Procesos Implementados */}
        <table className="w-full border-collapse border border-black text-[11px] leading-snug">
          <thead>
            <tr className="bg-[#d1d5db] text-slate-900 font-bold text-center uppercase">
              <th className="p-2 border border-black w-[22%] align-middle">PROCESO IMPLEMENTADO</th>
              <th className="p-2 border border-black w-[36%] align-middle">
                ¿QUIÉNES EJECUTARÁN?<br />
                <span className="text-[9.5px] font-normal lowercase">(institución que brindará el servicio)</span>
              </th>
              <th className="p-2 border border-black w-[14%] text-center align-middle">
                NÚMERO DE PERSONAS QUE RECIBIRÁN EL ACOMPAÑAMIENTO<br />
                <span className="text-[9.5px] font-normal lowercase">(N° de personas que recibirán el servicio)</span>
              </th>
              <th className="p-2 border border-black w-[14%] text-center align-middle">
                FECHA DE INICIO DEL ACOMPAÑAMIENTO<br />
                <span className="text-[9.5px] font-normal lowercase">(fecha de inicio del servicio)</span>
              </th>
              <th className="p-2 border border-black w-[14%] text-center align-middle">
                FECHA DE FINALIZACIÓN DEL ACOMPAÑAMIENTO<br />
                <span className="text-[9.5px] font-normal lowercase">(fecha de finalización del servicio)</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {processes.map((p, idx) => (
              <tr key={p.id || idx} className="align-top">
                <td className="p-2 border border-black font-semibold text-slate-900 bg-[#f9fafb]">
                  {p.process_name}
                </td>
                <td className="p-2 border border-black text-slate-800 whitespace-pre-line">
                  {p.executed_by || "—"}
                </td>
                <td className="p-2 border border-black text-center font-medium text-slate-900">
                  {p.beneficiaries_count || "—"}
                </td>
                <td className="p-2 border border-black text-center text-slate-800">
                  {p.start_date || "—"}
                </td>
                <td className="p-2 border border-black text-center text-slate-800">
                  {p.end_date || "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* 3. Firmas de Responsabilidad */}
        <div className="break-inside-avoid pt-2">
          <table className="w-full border-collapse border border-black text-xs">
            <tbody>
              <tr>
                <td className="w-1/4 bg-[#e5e7eb] font-bold p-2 border border-black text-slate-900 align-top">
                  Elaborado por:<br />
                  <span className="font-normal text-[11px] text-slate-700">{report.elaborated_by_role}</span>
                </td>
                <td className="w-1/2 p-2 border border-black text-slate-900 align-top">
                  <span className="font-bold">Nombre:</span><br />
                  <span className="font-medium">{report.elaborated_by_name || "—"}</span>
                </td>
                <td className="w-1/4 p-2 border border-black text-slate-900 align-top h-20">
                  <span className="font-bold">Firma:</span>
                </td>
              </tr>

              <tr>
                <td className="bg-[#e5e7eb] font-bold p-2 border border-black text-slate-900 align-top">
                  Revisado por:<br />
                  <span className="font-normal text-[11px] text-slate-700">{report.reviewed_by_role}</span>
                </td>
                <td className="p-2 border border-black text-slate-900 align-top">
                  <span className="font-bold">Nombre:</span><br />
                  <span className="font-medium">{report.reviewed_by_name || "—"}</span>
                </td>
                <td className="p-2 border border-black text-slate-900 align-top h-20">
                  <span className="font-bold">Firma:</span>
                </td>
              </tr>

              <tr>
                <td className="bg-[#e5e7eb] font-bold p-2 border border-black text-slate-900 align-top">
                  Aprobado por:<br />
                  <span className="font-normal text-[11px] text-slate-700">{report.approved_by_role}</span>
                </td>
                <td className="p-2 border border-black text-slate-900 align-top">
                  <span className="font-bold">Nombre:</span><br />
                  <span className="font-medium">{report.approved_by_name || "—"}</span>
                </td>
                <td className="p-2 border border-black text-slate-900 align-top h-20">
                  <span className="font-bold">Firma:</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Pie de Página Oficial */}
        <div className="w-full pt-4 break-inside-avoid">
          <img
            src="/footer_nuevo_ecuador.png"
            alt="Dirección Ministerio de Educación - El Nuevo Ecuador"
            className="w-full h-auto object-contain"
          />
        </div>
      </div>
    </div>
  );
}

