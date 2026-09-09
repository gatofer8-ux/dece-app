import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireRole, requireInstitutionId } from "@/lib/session";
import type {
  CaseFileRow,
  StudentRow,
  InstitutionRow,
  CaseClosureReportRow,
} from "@/lib/types";
import { type BimonthlyConsolidatedItem } from "@/lib/caseClosureReport";
import { getCaseBimonthlyReports } from "@/lib/caseClosureReportServer";
import PrintButton from "@/components/PrintButton";

export default async function ImprimirInformeCierrePage({
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
    .prepare(
      "SELECT * FROM case_closure_reports WHERE id = ? AND case_file_id = ? AND institution_id = ?"
    )
    .get(params.reportId, caseFile.id, institutionId) as CaseClosureReportRow | undefined;
  if (!report) notFound();

  const student = db
    .prepare("SELECT * FROM students WHERE id = ?")
    .get(caseFile.student_id) as StudentRow | undefined;
  if (!student) notFound();

  const institution = db
    .prepare("SELECT * FROM institutions WHERE id = ?")
    .get(institutionId) as InstitutionRow | undefined;

  // Seguimientos bimensuales consolidados (desde la base de datos o snapshot del informe)
  let bimonthlyList: BimonthlyConsolidatedItem[] = [];
  try {
    if (report.bimonthly_summary_json && report.bimonthly_summary_json !== "[]") {
      bimonthlyList = JSON.parse(report.bimonthly_summary_json);
    }
  } catch {
    // fallback a live
  }
  if (!bimonthlyList || bimonthlyList.length === 0) {
    bimonthlyList = getCaseBimonthlyReports(caseFile.id);
  }

  const exportWordUrl = `/api/casos/${caseFile.id}/informe-cierre/${report.id}/export-word`;

  return (
    <div className="min-h-screen bg-slate-100 py-8 print:py-0 print:bg-white text-slate-900 font-sans antialiased">
      {/* CSS para impresión profesional A4 al borde de la hoja (bleed 0) */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @page {
          size: A4 portrait;
          margin: 0 !important;
        }
        @media print {
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
          .print-sheet {
            box-shadow: none !important;
            border: none !important;
            max-width: none !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
          }
          .print-header-fixed {
            display: block !important;
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            right: 0 !important;
            width: 100% !important;
            z-index: 1000 !important;
            pointer-events: none !important;
          }
          .print-footer-fixed {
            display: block !important;
            position: fixed !important;
            bottom: 0 !important;
            left: 0 !important;
            right: 0 !important;
            width: 100% !important;
            z-index: 1000 !important;
            pointer-events: none !important;
          }
          .print-spacer-header {
            height: 32mm !important;
          }
          .print-spacer-footer {
            height: 35mm !important;
          }
          .page-break-inside-avoid {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          table {
            page-break-inside: auto;
          }
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
        }
      `,
        }}
      />

      {/* Membrete Oficial Fijo para Impresión (se repite en el borde exacto de cada página impresa) */}
      <div className="print-header-fixed hidden pointer-events-none">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/membrete_header.png"
          alt="Membrete Oficial Cabecera"
          className="w-full h-auto block"
        />
      </div>

      <div className="print-footer-fixed hidden pointer-events-none">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/membrete_footer.png"
          alt="Pie de Página Oficial"
          className="w-full h-auto block"
        />
      </div>

      {/* Barra superior de acciones para pantalla */}
      <div className="no-print max-w-[900px] mx-auto mb-6 px-4 flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-2">
          <Link
            href={`/casos/${caseFile.id}`}
            className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition"
          >
            ← Volver al Caso
          </Link>
          <Link
            href={`/casos/${caseFile.id}/informe-cierre/${report.id}/editar`}
            className="text-xs font-semibold text-blue-700 hover:text-blue-900 flex items-center gap-1 px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50/50 hover:bg-blue-100 transition"
          >
            ✏️ Editar Informe
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={exportWordUrl}
            download
            className="text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 px-4 py-2 rounded-lg shadow-sm flex items-center gap-1.5 transition"
          >
            <span>📄 Descargar Word (.docx)</span>
          </a>
          <PrintButton hideWordButton fileNamePrefix={`Informe_Cierre_${student.full_name}`} />
        </div>
      </div>

      {/* Contenedor principal de la hoja A4 con membrete oficial */}
      <div className="print-sheet relative max-w-[850px] mx-auto bg-white shadow-xl print:shadow-none border border-slate-200 print:border-none min-h-[1120px]">
        {/* Cabecera ministerial oficial para visualización en pantalla */}
        <div className="w-full print:hidden pointer-events-none">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/membrete_header.png"
            alt="Membrete Oficial Cabecera"
            className="w-full h-auto block"
          />
        </div>

        {/* Tabla contenedora para flujo de páginas con márgenes limpios en impresión */}
        <table className="w-full border-none border-collapse">
          <thead>
            <tr>
              <td className="print-spacer-header h-0 border-none p-0"></td>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border-none p-0">
                <div className="px-[50px] sm:px-[60px] print:px-[19mm] text-[11px] leading-[1.45] text-slate-900 pt-3 print:pt-0">
                  {/* ============================================================ */}
                  {/* TABLA 1: DATOS GENERALES (COLORES EXACTOS DEL MODELO: TEXTO AZUL, FONDO BLANCO) */}
                  {/* ============================================================ */}
                  <table className="w-full border-collapse border border-[#366092] mb-6 text-center text-[10px]">
                    <tbody>
                      {/* Fila 1: Título de sección */}
                      <tr>
                        <td
                          colSpan={5}
                          className="py-1 px-2 font-bold uppercase tracking-wider text-[11px] border border-[#366092] text-[#366092] text-center"
                        >
                          DATOS GENERALES
                        </td>
                      </tr>

                      {/* Fila 2: Fecha y N° Informe */}
                      <tr>
                        <td className="text-[#366092] font-bold py-1 px-1 border border-[#366092] w-[18%] text-center">
                          Fecha de Informe
                        </td>
                        <td className="py-1 px-2 border border-[#366092] font-semibold text-slate-800 w-[18%] text-center">
                          {report.report_date}
                        </td>
                        <td className="text-[#366092] font-bold py-1 px-1 border border-[#366092] w-[15%] text-center">
                          No. De Informe
                        </td>
                        <td
                          colSpan={2}
                          className="py-1 px-2 border border-[#366092] font-bold text-slate-800 text-center"
                        >
                          {report.report_number}
                        </td>
                      </tr>

                      {/* Fila 3: Cabecera Funcionario Responsable */}
                      <tr>
                        <td
                          rowSpan={3}
                          className="text-[#366092] font-bold py-2 px-1 border border-[#366092] align-middle text-center w-[20%]"
                        >
                          Funcionario Responsable de Informe
                        </td>
                        <td
                          rowSpan={2}
                          className="text-[#366092] font-bold py-1 px-1 border border-[#366092] align-middle text-center w-[22%]"
                        >
                          Nombre
                        </td>
                        <td
                          colSpan={2}
                          className="text-[#366092] font-bold py-0.5 px-1 border border-[#366092] text-center"
                        >
                          Contacto
                        </td>
                        <td
                          rowSpan={2}
                          className="text-[#366092] font-bold py-1 px-1 border border-[#366092] align-middle text-center w-[20%]"
                        >
                          Cargo
                        </td>
                      </tr>

                      {/* Fila 4: Subcabeceras contacto */}
                      <tr>
                        <td className="text-[#366092] font-bold py-0.5 px-1 border border-[#366092] w-[18%] text-center">
                          Extensión Telefónica
                        </td>
                        <td className="text-[#366092] font-bold py-0.5 px-1 border border-[#366092] text-center">
                          Correo Electrónico
                        </td>
                      </tr>

                      {/* Fila 5: Datos Funcionario Responsable */}
                      <tr className="text-slate-800">
                        <td className="py-1.5 px-1 border border-[#366092] font-semibold text-[9.5px] text-center">
                          {report.dece_name}
                        </td>
                        <td className="py-1.5 px-1 border border-[#366092] text-[9.5px] text-center">
                          {report.dece_phone_ext || "—"}
                        </td>
                        <td className="py-1.5 px-1 border border-[#366092] text-[9.5px] break-all text-center">
                          {report.dece_email || "—"}
                        </td>
                        <td className="py-1.5 px-1 border border-[#366092] font-semibold text-[9px] uppercase text-center">
                          {report.dece_role}
                        </td>
                      </tr>

                      {/* Fila 6: Cabecera Informe Dirigido A */}
                      <tr>
                        <td
                          rowSpan={3}
                          className="text-[#366092] font-bold py-2 px-1 border border-[#366092] align-middle text-center w-[20%]"
                        >
                          Informe dirigido a
                        </td>
                        <td
                          rowSpan={2}
                          className="text-[#366092] font-bold py-1 px-1 border border-[#366092] align-middle text-center w-[22%]"
                        >
                          Nombre
                        </td>
                        <td
                          colSpan={2}
                          className="text-[#366092] font-bold py-0.5 px-1 border border-[#366092] text-center"
                        >
                          Contacto
                        </td>
                        <td
                          rowSpan={2}
                          className="text-[#366092] font-bold py-1 px-1 border border-[#366092] align-middle text-center w-[20%]"
                        >
                          Cargo
                        </td>
                      </tr>

                      {/* Fila 7: Subcabeceras contacto autoridad */}
                      <tr>
                        <td className="text-[#366092] font-bold py-0.5 px-1 border border-[#366092] w-[18%] text-center">
                          Extensión Telefónica
                        </td>
                        <td className="text-[#366092] font-bold py-0.5 px-1 border border-[#366092] text-center">
                          Correo Electrónico
                        </td>
                      </tr>

                      {/* Fila 8: Datos Autoridad */}
                      <tr className="text-slate-800">
                        <td className="py-1.5 px-1 border border-[#366092] font-semibold text-[9.5px] text-center">
                          {report.authority_name}
                        </td>
                        <td className="py-1.5 px-1 border border-[#366092] text-[9.5px] text-center">
                          {report.authority_phone_ext || "—"}
                        </td>
                        <td className="py-1.5 px-1 border border-[#366092] text-[9.5px] break-all text-center">
                          {report.authority_email || "—"}
                        </td>
                        <td className="py-1.5 px-1 border border-[#366092] font-semibold text-[9px] uppercase text-center">
                          {report.authority_role}
                        </td>
                      </tr>

                      {/* Fila 9: TEMA */}
                      <tr>
                        <td className="text-[#366092] font-bold py-1.5 px-2 border border-[#366092] align-middle text-center">
                          TEMA:
                        </td>
                        <td
                          colSpan={4}
                          className="py-1.5 px-3 border border-[#366092] text-center font-bold text-slate-800 text-[10px] uppercase leading-snug"
                        >
                          {report.topic}
                        </td>
                      </tr>
                    </tbody>
                  </table>

          {/* ============================================================ */}
          {/* SECCIÓN: ANTECEDENTES (SIN RESALTADO AMARILLO) */}
          {/* ============================================================ */}
          <div className="mb-5">
            <h2 className="font-bold text-slate-900 uppercase tracking-wide mb-1 text-[11px]">
              ANTECEDENTES
            </h2>
            <div className="font-bold text-slate-800 uppercase mb-1.5 text-[10.5px]">
              RAZONES DEL CIERRE O TRASLADO DE CASO
            </div>
            <div className="text-justify whitespace-pre-wrap text-slate-800">
              {report.closure_reasons}
            </div>
          </div>

          {/* ============================================================ */}
          {/* SECCIÓN: BASE LEGAL */}
          {/* ============================================================ */}
          <div className="mb-5">
            <h2 className="font-bold text-slate-900 uppercase tracking-wide mb-1 text-[11px]">
              BASE LEGAL
            </h2>
            <div className="text-justify whitespace-pre-wrap space-y-2 text-slate-800">
              {report.legal_framework}
            </div>
            <div className="mt-2 text-[10px] font-semibold text-slate-700 italic">
              SUJETO A CAMBIOS DE SER NECESARIO.
            </div>
          </div>

          {/* ============================================================ */}
          {/* SECCIÓN: ALCANCE */}
          {/* ============================================================ */}
          <div className="mb-5">
            <h2 className="font-bold text-slate-900 uppercase tracking-wide mb-1 text-[11px]">
              ALCANCE
            </h2>
            <div className="text-justify whitespace-pre-wrap text-slate-800">
              {report.scope}
            </div>
          </div>

          {/* ============================================================ */}
          {/* SECCIÓN: OBJETIVO */}
          {/* ============================================================ */}
          <div className="mb-5">
            <h2 className="font-bold text-slate-900 uppercase tracking-wide mb-1 text-[11px]">
              OBJETIVO
            </h2>
            <div className="text-justify whitespace-pre-wrap text-slate-800">
              {report.objective}
            </div>
          </div>

          {/* ============================================================ */}
          {/* SECCIÓN: DESARROLLO O ANÁLISIS */}
          {/* ============================================================ */}
          <div className="mb-5">
            <h2 className="font-bold text-slate-900 uppercase tracking-wide mb-2 text-[11px]">
              DESARROLLO O ANÁLISIS
            </h2>

            {/* DATOS INFORMATIVOS */}
            <div className="mb-4 bg-slate-50/50 p-2.5 rounded border border-slate-300">
              <h3 className="font-bold text-slate-900 uppercase mb-2 text-[10.5px]">
                DATOS INFORMATIVOS
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-[10.5px]">
                <div>
                  <span className="font-bold">Apellidos y Nombres: </span>
                  <span className="uppercase">{report.student_name}</span>
                </div>
                <div>
                  <span className="font-bold">Cédula: </span>
                  <span>{report.student_id_num || "—"}</span>
                </div>
                <div>
                  <span className="font-bold">Edad: </span>
                  <span>{report.student_age ? `${report.student_age} años` : "—"}</span>
                </div>
                <div>
                  <span className="font-bold">Fecha de nacimiento: </span>
                  <span>{report.student_birth_date || "—"}</span>
                </div>
                <div>
                  <span className="font-bold">Grado / curso: </span>
                  <span className="uppercase">{report.student_grade}</span>
                </div>
                <div>
                  <span className="font-bold">Paralelo: </span>
                  <span className="uppercase">{report.student_parallel || "—"}</span>
                </div>
                <div>
                  <span className="font-bold">Sección: </span>
                  <span className="uppercase">{report.student_section || "MATUTINA"}</span>
                </div>
                <div>
                  <span className="font-bold">Dirección: </span>
                  <span>{report.student_address || "—"}</span>
                </div>
                <div className="sm:col-span-2">
                  <span className="font-bold">Referencia: </span>
                  <span>{report.student_address_ref || "—"}</span>
                </div>
                <div>
                  <span className="font-bold">Representante Legal: </span>
                  <span>{report.rep_name || "—"}</span>
                </div>
                <div>
                  <span className="font-bold">Cédula: </span>
                  <span>{report.rep_id_num || "—"}</span>
                </div>
                <div className="sm:col-span-2">
                  <span className="font-bold">Teléfono Representante: </span>
                  <span>{report.rep_phone || "—"}</span>
                </div>
              </div>
            </div>

            {/* ============================================================ */}
            {/* TABLA 2: ACTIVIDADES REALIZADAS (CALCA FIEL) */}
            {/* ============================================================ */}
            <h3 className="font-bold text-slate-900 uppercase mb-1.5 text-[11px]">
              ACTIVIDADES REALIZADAS:
            </h3>
            <table className="w-full border-collapse border border-slate-400 mb-6 text-[10px]">
              <tbody>
                {/* EJE 1: CONSEJERÍA */}
                <tr>
                  <td className="border border-slate-400 p-2 font-bold w-[22%] align-top bg-slate-50 uppercase text-slate-800">
                    CONSEJERÍA
                  </td>
                  <td className="border border-slate-400 p-2 align-top text-justify whitespace-pre-wrap text-slate-800">
                    {report.activities_counseling || "Capacitaciones institucionales y acompañamiento psicoeducativo continuo."}
                  </td>
                </tr>

                {/* EJE 2: PROMOCIÓN Y PREVENCIÓN */}
                <tr>
                  <td className="border border-slate-400 p-2 font-bold w-[22%] align-top bg-slate-50 uppercase text-slate-800">
                    PROMOCIÓN Y PREVENCIÓN
                  </td>
                  <td className="border border-slate-400 p-2 align-top text-justify whitespace-pre-wrap text-slate-800">
                    {report.activities_prevention || "Socialización de rutas y protocolos ministeriales de actuación frente a situaciones de violencia detectadas o cometidas en el sistema educativo."}
                  </td>
                </tr>

                {/* EJE 3: ATENCIÓN PSICOSOCIAL */}
                <tr>
                  <td className="border border-slate-400 p-2 font-bold w-[22%] align-top bg-slate-50 uppercase text-slate-800">
                    ATENCIÓN PSICOSOCIAL
                  </td>
                  <td className="border border-slate-400 p-2 align-top text-justify whitespace-pre-wrap text-slate-800 space-y-1.5">
                    {report.activities_psychosocial}
                  </td>
                </tr>

                {/* EJE 4: INCLUSIÓN SOCIOEDUCATIVA */}
                <tr>
                  <td className="border border-slate-400 p-2 font-bold w-[22%] align-top bg-slate-50 uppercase text-slate-800">
                    INCLUSION SOCIOEDUCATIVA
                  </td>
                  <td className="border border-slate-400 p-2 align-top text-justify whitespace-pre-wrap text-slate-800">
                    {report.activities_inclusion || "En calidad de profesional DECE responsable del acompañamiento en el presente año lectivo se ha brindado la atención psicosocial a favor de la estudiante y su familia con la finalidad de salvaguardar su permanencia en el Sistema Educativo."}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* ============================================================ */}
            {/* CONSOLIDACIÓN DE INFORMES BIMENSUALES DURANTE EL AÑO LECTIVO */}
            {/* ============================================================ */}
            <div className="mb-6 p-3 bg-blue-50/40 border border-blue-200 rounded-lg">
              <h4 className="font-bold text-[#366092] uppercase mb-2 text-[10.5px] flex items-center justify-between">
                <span>SEGUIMIENTO BIMENSUAL AL PLAN DE ACOMPAÑAMIENTO INSTITUCIONAL ({report.school_year_text})</span>
                <span className="text-[9px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-semibold lowercase">
                  {bimonthlyList.length} reporte(s) consolidado(s)
                </span>
              </h4>

              {bimonthlyList.length === 0 ? (
                <p className="text-[10px] text-slate-500 italic">
                  No se registran informes bimensuales previos en el sistema para este año lectivo.
                </p>
              ) : (
                <div className="space-y-4">
                  {bimonthlyList.map((bm, idx) => (
                    <div key={idx} className="border border-slate-300 rounded bg-white p-2.5 text-[9.5px]">
                      <div className="flex flex-wrap items-center justify-between gap-1 border-b border-slate-200 pb-1.5 mb-2 font-bold text-slate-800">
                        <span className="text-[#366092] uppercase">
                          Informe Bimensual #{idx + 1} — Período: {bm.period_months}
                        </span>
                        <span className="text-slate-600 font-normal">
                          Año Lectivo: <strong>{bm.school_year_text}</strong>
                        </span>
                        <span className="text-[8.5px] px-1.5 py-0.5 rounded bg-slate-100">
                          Fecha: {bm.created_at?.split("T")[0] || "—"}
                        </span>
                      </div>

                      {bm.processes && bm.processes.length > 0 ? (
                        <table className="w-full border-collapse border border-slate-200 text-left">
                          <thead>
                            <tr className="bg-slate-100 text-[8.5px] font-bold text-slate-700 uppercase">
                              <th className="border border-slate-200 p-1 w-[35%]">Proceso Ministerial</th>
                              <th className="border border-slate-200 p-1 w-[25%]">Ejecutado por</th>
                              <th className="border border-slate-200 p-1 w-[15%]">Beneficiarios</th>
                              <th className="border border-slate-200 p-1 w-[25%]">Fechas (Inicio - Fin)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {bm.processes.map((proc, pIdx) => (
                              <tr key={pIdx} className="hover:bg-slate-50/50">
                                <td className="border border-slate-200 p-1 align-top font-semibold text-slate-800">
                                  {proc.process_name}
                                </td>
                                <td className="border border-slate-200 p-1 align-top text-slate-700">
                                  {proc.executed_by || "DECE"}
                                </td>
                                <td className="border border-slate-200 p-1 align-top text-center text-slate-700">
                                  {proc.beneficiaries_count || "1"}
                                </td>
                                <td className="border border-slate-200 p-1 align-top text-slate-700">
                                  {proc.start_date || "—"} {proc.end_date ? `al ${proc.end_date}` : ""}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <p className="text-[9px] text-slate-500 italic">
                          Acciones bimensuales registradas en el expediente institucional.
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* METODOLOGÍA */}
            <div className="mb-5">
              <h3 className="font-bold text-slate-900 uppercase mb-1 text-[11px]">
                METODOLOGÍA
              </h3>
              <div className="text-justify whitespace-pre-wrap text-slate-800">
                {report.methodology}
              </div>
            </div>

            {/* CONCLUSIONES */}
            <div className="mb-5">
              <h3 className="font-bold text-slate-900 uppercase mb-1 text-[11px]">
                CONCLUSIONES
              </h3>
              <div className="text-justify whitespace-pre-wrap text-slate-800">
                {report.conclusions}
              </div>
            </div>

            {/* RECOMENDACIONES */}
            <div className="mb-6">
              <h3 className="font-bold text-slate-900 uppercase mb-1 text-[11px]">
                RECOMENDACIONES
              </h3>
              <div className="text-justify whitespace-pre-wrap text-slate-800">
                {report.recommendations}
              </div>
            </div>
          </div>

          {/* ============================================================ */}
          {/* TABLA 3: FIRMAS DE RESPONSABILIDAD (CALCA FIEL) */}
          {/* ============================================================ */}
          <div className="mb-6 break-inside-avoid">
            <table className="w-full border-collapse border border-slate-400 text-center text-[10px]">
              <tbody>
                {/* BLOQUE 1: DESARROLLO DEL DOCUMENTO */}
                <tr className="bg-slate-100 font-bold uppercase">
                  <td colSpan={3} className="py-1 px-2 border border-slate-400 text-slate-800">
                    DESARROLLO DEL DOCUMENTO
                  </td>
                </tr>
                <tr className="font-bold bg-slate-50 text-[9px] uppercase text-slate-700">
                  <td className="py-1 px-2 border border-slate-400 w-[45%]">Nombre y apellido</td>
                  <td className="py-1 px-2 border border-slate-400 w-[30%]">Firma</td>
                  <td className="py-1 px-2 border border-slate-400 w-[25%]">Fecha</td>
                </tr>
                <tr>
                  <td className="py-5 px-2 border border-slate-400 align-bottom font-bold text-slate-800 uppercase text-[9.5px]">
                    {report.elaborated_by_name || report.dece_name}
                    <span className="block font-normal text-[8.5px] text-slate-600 mt-0.5">
                      {report.elaborated_by_role || "ANALISTA DECE"}
                    </span>
                  </td>
                  <td className="py-5 px-2 border border-slate-400 align-bottom text-slate-400 text-[9px]">
                    ___________________________
                  </td>
                  <td className="py-5 px-2 border border-slate-400 align-bottom font-semibold text-slate-800 text-[9.5px]">
                    {report.elaborated_date || report.report_date}
                  </td>
                </tr>

                {/* BLOQUE 2: REVISIÓN DEL DOCUMENTO */}
                <tr className="bg-slate-100 font-bold uppercase">
                  <td colSpan={3} className="py-1 px-2 border border-slate-400 text-slate-800">
                    REVISION DEL DOCUMENTO
                  </td>
                </tr>
                <tr className="font-bold bg-slate-50 text-[9px] uppercase text-slate-700">
                  <td className="py-1 px-2 border border-slate-400">Nombre y apellido</td>
                  <td className="py-1 px-2 border border-slate-400">Firma</td>
                  <td className="py-1 px-2 border border-slate-400">Fecha</td>
                </tr>
                <tr>
                  <td className="py-5 px-2 border border-slate-400 align-bottom font-bold text-slate-800 uppercase text-[9.5px]">
                    {report.reviewed_by_name || "Coordinadora DECE"}
                    <span className="block font-normal text-[8.5px] text-slate-600 mt-0.5">
                      {report.reviewed_by_role || "COORDINADORA DECE INSTITUCIONAL"}
                    </span>
                  </td>
                  <td className="py-5 px-2 border border-slate-400 align-bottom text-slate-400 text-[9px]">
                    ___________________________
                  </td>
                  <td className="py-5 px-2 border border-slate-400 align-bottom font-semibold text-slate-800 text-[9.5px]">
                    {report.reviewed_date || report.report_date}
                  </td>
                </tr>

                {/* BLOQUE 3: APROBACIÓN DEL DOCUMENTO */}
                <tr className="bg-slate-100 font-bold uppercase">
                  <td colSpan={3} className="py-1 px-2 border border-slate-400 text-slate-800">
                    APROBACION DEL DOCUMENTO
                  </td>
                </tr>
                <tr className="font-bold bg-slate-50 text-[9px] uppercase text-slate-700">
                  <td className="py-1 px-2 border border-slate-400">Nombre y apellido</td>
                  <td className="py-1 px-2 border border-slate-400">Firma</td>
                  <td className="py-1 px-2 border border-slate-400">Fecha</td>
                </tr>
                <tr>
                  <td className="py-5 px-2 border border-slate-400 align-bottom font-bold text-slate-800 uppercase text-[9.5px]">
                    {report.approved_by_name || report.authority_name}
                    <span className="block font-normal text-[8.5px] text-slate-600 mt-0.5">
                      {report.approved_by_role || "RECTOR (E) DE LA UNIDAD EDUCATIVA"}
                    </span>
                  </td>
                  <td className="py-5 px-2 border border-slate-400 align-bottom text-slate-400 text-[9px]">
                    ___________________________
                  </td>
                  <td className="py-5 px-2 border border-slate-400 align-bottom font-semibold text-slate-800 text-[9.5px]">
                    {report.approved_date || report.report_date}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* ============================================================ */}
          {/* SECCIÓN 10: ANEXOS (CALCA FIEL) */}
          {/* ============================================================ */}
          <div className="pt-2 border-t border-slate-300 break-inside-avoid">
            <h3 className="font-bold text-slate-900 uppercase mb-2 text-[11px]">
              ANEXOS:
            </h3>
            <ul className="list-disc list-inside space-y-1 text-[10px] text-slate-800 font-medium uppercase">
              <li>MATRÍCULA EN CASO DE TRASLADO</li>
              <li>CERTIFICADO DE BACHILLER EN CASO DE HABER SALIDO DEL SISTEMA / GRADUACIÓN</li>
              <li>OFICIO DE MM/PP-FF Y/O REPRESENTANTE LEGAL DE DESISTIMIENTO</li>
            </ul>
            {report.annexes_notes && (
              <div className="mt-2 text-[9.5px] text-slate-700 whitespace-pre-wrap bg-slate-50 p-2 rounded border border-slate-200">
                <span className="font-bold">Observaciones de Anexos: </span>
                {report.annexes_notes}
              </div>
            )}
          </div>
                </div>
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td className="print-spacer-footer h-0 border-none p-0"></td>
            </tr>
          </tfoot>
        </table>

        {/* Pie de página oficial ministerial para visualización en pantalla */}
        <div className="w-full print:hidden pointer-events-none mt-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/membrete_footer.png"
            alt="Pie de Página Oficial"
            className="w-full h-auto block"
          />
        </div>
      </div>
    </div>
  );
}
