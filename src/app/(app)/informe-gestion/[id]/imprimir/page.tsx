import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { getAnnualManagementReportById } from "@/lib/informeGestion";
import PrintButton from "@/components/PrintButton";
import type {
  InstitutionRow,
  ManagementReportRecipientItem,
  ManagementReportProfessionalItem,
  CounselingStatRow,
  CaseTypologyStatRow,
  ComparativeAnalysisRow,
  PreventionProjectRow,
  ManagementReportSignatureItem,
} from "@/lib/types";

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  try {
    const [year, month, day] = dateStr.split("-");
    const months = [
      "enero", "febrero", "marzo", "abril", "mayo", "junio",
      "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
    ];
    const mIdx = parseInt(month, 10) - 1;
    return `${day} de ${months[mIdx] || month} de ${year}`;
  } catch {
    return dateStr;
  }
}

export default async function PrintAnnualReportPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getSession();
  if (!session || !session.user) {
    redirect("/login");
  }

  const institutionId = session.user.institution_id;
  if (!institutionId) {
    redirect("/informe-gestion");
  }

  const report = getAnnualManagementReportById(params.id, institutionId);
  if (!report) {
    notFound();
  }

  const institution = db
    .prepare("SELECT * FROM institutions WHERE id = ?")
    .get(institutionId) as InstitutionRow | undefined;

  let recipients: ManagementReportRecipientItem[] = [];
  let professionals: ManagementReportProfessionalItem[] = [];
  let counselingStats: CounselingStatRow[] = [];
  let caseTypologies: CaseTypologyStatRow[] = [];
  let comparativeAnalysis: ComparativeAnalysisRow[] = [];
  let preventionProjects: PreventionProjectRow[] = [];
  let signatures: ManagementReportSignatureItem[] = [];

  try { recipients = JSON.parse(report.recipients_json || "[]"); } catch {}
  try { professionals = JSON.parse(report.professionals_json || "[]"); } catch {}
  try { counselingStats = JSON.parse(report.counseling_stats_json || "[]"); } catch {}
  try { caseTypologies = JSON.parse(report.case_typologies_json || "[]"); } catch {}
  try { comparativeAnalysis = JSON.parse(report.comparative_analysis_json || "[]"); } catch {}
  try { preventionProjects = JSON.parse(report.prevention_projects_json || "[]"); } catch {}
  try { signatures = JSON.parse(report.signatures_json || "[]"); } catch {}

  const professionalNames = professionals.map((p) => p.name);
  const desarrolloSignatures = signatures.filter((s) => s.type === "DESARROLLO");
  const aprobacionSignatures = signatures.filter((s) => s.type === "APROBACION");

  return (
    <div className="bg-slate-100 min-h-screen py-6 print:bg-white print:py-0 text-black">
      {/* Barra de Acciones Superior (Oculta al Imprimir) */}
      <div className="max-w-4xl mx-auto mb-6 px-4 flex flex-col sm:flex-row items-center justify-between gap-3 print:hidden">
        <Link
          href="/informe-gestion"
          className="text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors flex items-center gap-1"
        >
          <span>←</span> Volver a Informes de Gestión
        </Link>

        <div className="flex items-center gap-2">
          <Link
            href={`/informe-gestion/${report.id}/editar`}
            className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded text-xs font-semibold"
          >
            ✏️ Editar
          </Link>
          <a
            href={`/api/informe-gestion/${report.id}/export-word`}
            className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 rounded text-xs font-semibold transition-colors flex items-center gap-1.5"
          >
            <span>📥</span> Descargar Word (.docx)
          </a>
          <PrintButton hideWordButton={true} />
        </div>
      </div>

      {/* Contenedor del Documento Oficial (Plantilla Exacta) */}
      <div className="max-w-4xl mx-auto bg-white p-6 sm:p-10 shadow-lg print:shadow-none print:p-0 print:max-w-none text-black font-sans leading-normal">
        <table className="w-full">
          {/* Encabezado Repetitivo para Impresión Multi-página */}
          <thead className="table-header-group">
            <tr>
              <td>
                <div className="w-full pb-4">
                  <img
                    src="/header_4k.png"
                    alt="Ministerio de Educación, Deporte y Cultura"
                    className="w-full h-auto object-contain max-h-24"
                  />
                  <div className="text-center mt-3 mb-4">
                    <h1 className="text-sm sm:text-base font-bold text-[#1E3A8A] uppercase tracking-wide">
                      {report.title_topic}
                    </h1>
                  </div>
                </div>
              </td>
            </tr>
          </thead>

          {/* Cuerpo del Informe */}
          <tbody className="text-[10px] space-y-4">
            <tr>
              <td className="space-y-4">
                {/* 1. DATOS GENERALES */}
                <div className="border border-black">
                  <table className="w-full border-collapse text-[10px]">
                    <thead>
                      <tr className="bg-gray-200 border-b border-black">
                        <th colSpan={4} className="p-1.5 text-center font-bold text-[#1E3A8A] uppercase text-[11px]">
                          DATOS GENERALES
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-black">
                        <td className="w-1/4 p-1.5 bg-gray-100 font-bold border-r border-black">
                          Fecha de Informe
                        </td>
                        <td className="w-1/4 p-1.5 border-r border-black">
                          {formatDate(report.report_date)}
                        </td>
                        <td className="w-1/4 p-1.5 bg-gray-100 font-bold border-r border-black">
                          No. De Informe
                        </td>
                        <td className="w-1/4 p-1.5 font-bold">
                          {report.report_code}
                        </td>
                      </tr>
                      <tr className="border-b border-black bg-gray-50">
                        <td colSpan={4} className="p-1 font-bold text-[#1E3A8A] uppercase text-[10px]">
                          Funcionario Responsable de Informe
                        </td>
                      </tr>
                      <tr className="border-b border-black bg-gray-200 font-bold text-[9px]">
                        <td className="p-1 border-r border-black w-2/5">Nombre</td>
                        <td className="p-1 border-r border-black w-1/3">Contacto / Correo</td>
                        <td colSpan={2} className="p-1">Cargo</td>
                      </tr>
                      {professionals.map((p, idx) => (
                        <tr key={idx} className="border-b border-black last:border-b-0">
                          <td className="p-1 border-r border-black font-bold uppercase">{p.name}</td>
                          <td className="p-1 border-r border-black">{p.email || p.extension || "—"}</td>
                          <td colSpan={2} className="p-1 uppercase">{p.cargo}</td>
                        </tr>
                      ))}
                      <tr className="border-b border-black bg-gray-50">
                        <td colSpan={4} className="p-1 font-bold text-[#1E3A8A] uppercase text-[10px]">
                          Informe dirigido a
                        </td>
                      </tr>
                      <tr className="border-b border-black bg-gray-200 font-bold text-[9px]">
                        <td className="p-1 border-r border-black w-2/5">Nombre</td>
                        <td className="p-1 border-r border-black w-1/3">Contacto / Correo</td>
                        <td colSpan={2} className="p-1">Cargo</td>
                      </tr>
                      {recipients.map((r, idx) => (
                        <tr key={idx} className="border-b border-black last:border-b-0">
                          <td className="p-1 border-r border-black font-bold uppercase">{r.name || "—"}</td>
                          <td className="p-1 border-r border-black">{r.email || r.extension || "—"}</td>
                          <td colSpan={2} className="p-1 uppercase">{r.cargo}</td>
                        </tr>
                      ))}
                      <tr className="border-t border-black">
                        <td className="p-1.5 bg-gray-100 font-bold border-r border-black">TEMA:</td>
                        <td colSpan={3} className="p-1.5 font-bold uppercase">{report.title_topic}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* 2. ANTECEDENTES */}
                <div className="space-y-2 text-justify">
                  <h2 className="font-bold text-[11px] uppercase tracking-wide text-black border-b border-black pb-0.5">
                    ANTECEDENTES
                  </h2>
                  <h3 className="font-bold text-[10px] text-slate-900 mt-1">Base Legal</h3>
                  <div className="text-[9.5px] leading-relaxed whitespace-pre-line text-slate-800">
                    {report.antecedentes_legal}
                  </div>

                  <h3 className="font-bold text-[10px] text-slate-900 mt-2">
                    Diagnóstico situacional de la institución educativa.
                  </h3>
                  <div className="text-[9.5px] leading-relaxed whitespace-pre-line text-slate-800">
                    {report.situational_diagnosis || "—"}
                  </div>

                  <h3 className="font-bold text-[10px] text-slate-900 mt-2">Distributivo del DECE</h3>
                  <div className="border border-black mt-1">
                    <table className="w-full border-collapse text-[9px]">
                      <thead>
                        <tr className="bg-gray-100 border-b border-black">
                          <td colSpan={6} className="p-1 font-bold">
                            Institución Educativa Núcleo: <span className="font-normal uppercase">{institution?.name || "UNIDAD EDUCATIVA"}</span>
                          </td>
                        </tr>
                        <tr className="bg-gray-200 border-b border-black font-bold text-center">
                          <th className="p-1 border-r border-black w-8">No.</th>
                          <th className="p-1 border-r border-black w-1/3">Nombres y Apellidos / Cargo</th>
                          <th className="p-1 border-r border-black">Cobertura Estudiantes</th>
                          <th className="p-1 border-r border-black">Jornadas</th>
                          <th className="p-1 border-r border-black">Niveles Educativos</th>
                          <th className="p-1">Tiempo de labor en la IE</th>
                        </tr>
                      </thead>
                      <tbody>
                        {professionals.map((p, idx) => (
                          <tr key={idx} className="border-b border-black last:border-b-0 text-center">
                            <td className="p-1 border-r border-black font-bold">{idx + 1}</td>
                            <td className="p-1 border-r border-black text-left">
                              <span className="font-bold uppercase block">{p.name}</span>
                              <span className="text-slate-500 uppercase text-[8px]">{p.cargo}</span>
                            </td>
                            <td className="p-1 border-r border-black font-bold">{p.coverage_students || 0}</td>
                            <td className="p-1 border-r border-black">{p.coverage_jornadas || "Matutina"}</td>
                            <td className="p-1 border-r border-black">{p.coverage_levels || "Básica y Bachillerato"}</td>
                            <td className="p-1">{p.tenure_time || "1 año lectivo"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 3. ALCANCE */}
                <div className="space-y-1 text-justify">
                  <h2 className="font-bold text-[11px] uppercase tracking-wide text-black border-b border-black pb-0.5">
                    ALCANCE
                  </h2>
                  <div className="text-[9.5px] leading-relaxed text-slate-800">
                    {report.alcance}
                  </div>
                </div>

                {/* 4. OBJETIVOS */}
                <div className="space-y-1 text-justify">
                  <h2 className="font-bold text-[11px] uppercase tracking-wide text-black border-b border-black pb-0.5">
                    OBJETIVOS
                  </h2>
                  <div className="text-[9.5px] leading-relaxed text-slate-800">
                    {report.objetivos}
                  </div>
                </div>

                {/* 5. DESARROLLO O ANÁLISIS */}
                <div className="space-y-3">
                  <h2 className="font-bold text-[11px] uppercase tracking-wide text-black border-b border-black pb-0.5">
                    DESARROLLO O ANÁLISIS
                  </h2>

                  {/* 4.1 EJE DE CONSEJERÍA */}
                  <div>
                    <h3 className="font-bold text-[10.5px] uppercase text-black">
                      4.1 EJE DE CONSEJERÍA AEC 1, AEC 2, AEC 3.
                    </h3>
                    <p className="text-[9px] text-slate-600 italic">
                      Casos atendidos por el /la profesional del DECE a la comunidad educativa.<br />
                      Fuente: registros de atención y/o llamadas telefónicas
                    </p>

                    {/* Tabla 1 Atenciones */}
                    <div className="border border-black mt-1">
                      <table className="w-full border-collapse text-[9px]">
                        <thead>
                          <tr className="bg-gray-200 border-b border-black font-bold text-center">
                            <th className="p-1 border-r border-black text-left w-2/5">Datos estadísticos</th>
                            {professionalNames.map((pn, i) => (
                              <th key={i} className="p-1 border-r border-black">{pn}</th>
                            ))}
                            <th className="p-1 bg-gray-300">TOTAL</th>
                          </tr>
                        </thead>
                        <tbody>
                          {counselingStats.map((row, idx) => (
                            <tr key={idx} className="border-b border-black last:border-b-0">
                              <td className="p-1 border-r border-black font-medium">{row.category}</td>
                              {professionalNames.map((pn, pIdx) => (
                                <td key={pIdx} className="p-1 border-r border-black text-center">
                                  {row.values_by_professional[pn] ?? 0}
                                </td>
                              ))}
                              <td className="p-1 text-center font-bold bg-gray-100">{row.total}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Tabla 2 Tipologías */}
                    <p className="text-[9px] text-slate-600 italic mt-3">
                      Fuente: Matriz de tipología, embarazos y riesgos psicosociales del año lectivo {report.school_year_text}
                    </p>
                    <div className="border border-black mt-1">
                      <table className="w-full border-collapse text-[8.5px]">
                        <thead>
                          <tr className="bg-gray-200 border-b border-black font-bold text-center">
                            <th className="p-1 border-r border-black text-left w-2/5">Tipo de caso atendidos</th>
                            {professionalNames.map((pn, i) => (
                              <th key={i} className="p-1 border-r border-black">{pn}</th>
                            ))}
                            <th className="p-1 bg-gray-300">TOTAL</th>
                          </tr>
                        </thead>
                        <tbody>
                          {caseTypologies.map((row, idx) => (
                            <tr key={idx} className="border-b border-black last:border-b-0">
                              <td className="p-0.5 px-1 border-r border-black">
                                <span className="text-[7.5px] text-slate-400 mr-1">{idx + 1}.</span>
                                {row.typology}
                              </td>
                              {professionalNames.map((pn, pIdx) => (
                                <td key={pIdx} className="p-0.5 border-r border-black text-center">
                                  {row.values_by_professional[pn] ?? 0}
                                </td>
                              ))}
                              <td className="p-0.5 text-center font-bold bg-gray-50">{row.total}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="bg-gray-200 font-bold border-t-2 border-black text-center">
                            <td className="p-1 border-r border-black text-right uppercase">TOTAL:</td>
                            {professionalNames.map((pn, i) => (
                              <td key={i} className="p-1 border-r border-black">
                                {caseTypologies.reduce(
                                  (acc, r) => acc + (Number(r.values_by_professional[pn]) || 0),
                                  0
                                )}
                              </td>
                            ))}
                            <td className="p-1 bg-gray-300 font-bold text-[9.5px]">
                              {caseTypologies.reduce((acc, r) => acc + r.total, 0)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>

                    {/* Tabla 3 Análisis Comparativo */}
                    <p className="text-[9px] text-slate-600 italic mt-3">
                      Análisis comparativo de casos de vulnerabilidad del año lectivo anterior y actual NÚCLEO (en este apartado realizar una comparación de los 2 años lectivos y el análisis del porqué aumentó o disminuyó el número de casos):
                    </p>
                    <div className="border border-black mt-1">
                      <table className="w-full border-collapse text-[8.5px]">
                        <thead>
                          <tr className="bg-gray-200 border-b border-black font-bold text-center">
                            <th className="p-1 border-r border-black text-left w-1/4">Tipo de caso atendidos</th>
                            <th className="p-1 border-r border-black w-14">Año Anterior</th>
                            <th className="p-1 border-r border-black w-14">Año Actual</th>
                            <th className="p-1">Análisis comparativo de los 2 años lectivos</th>
                          </tr>
                        </thead>
                        <tbody>
                          {comparativeAnalysis.map((row, idx) => (
                            <tr key={idx} className="border-b border-black last:border-b-0">
                              <td className="p-0.5 px-1 border-r border-black font-medium">{row.typology}</td>
                              <td className="p-0.5 border-r border-black text-center">{row.previous_year_count}</td>
                              <td className="p-0.5 border-r border-black text-center font-bold">{row.current_year_count}</td>
                              <td className="p-0.5 px-1 text-justify leading-tight text-[8px]">{row.comparative_analysis}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* 4.2 EJE DE ATENCIÓN PSICOSOCIAL */}
                  <div className="pt-2">
                    <h3 className="font-bold text-[10.5px] uppercase text-black">
                      4.2 EJE DE ATENCIÓN PSICOSOCIAL AÑO LECTIVO {report.school_year_text}
                    </h3>
                    <p className="text-[9px] text-slate-700 italic text-justify mt-1">
                      {report.psychosocial_note}
                    </p>
                  </div>

                  {/* 4.3 EJE PROMOCIÓN Y PREVENCIÓN */}
                  <div className="pt-2">
                    <h3 className="font-bold text-[10.5px] uppercase text-black">
                      4.3 EJE PROMOCIÓN Y PREVENCIÓN
                    </h3>
                    <div className="border border-black mt-1">
                      <table className="w-full border-collapse text-[9px]">
                        <thead>
                          <tr className="bg-gray-200 border-b border-black font-bold text-center">
                            <th className="p-1 border-r border-black text-left w-1/3">Eje de prevención</th>
                            <th className="p-1 border-r border-black">No. Actividades</th>
                            <th className="p-1 border-r border-black">Beneficiarios Estudiantes</th>
                            <th className="p-1 border-r border-black">Beneficiarios Familias</th>
                            <th className="p-1 border-r border-black">Beneficiarios Directivos</th>
                            <th className="p-1">Beneficiarios Docentes</th>
                          </tr>
                        </thead>
                        <tbody>
                          {preventionProjects.map((row, idx) => (
                            <tr key={idx} className="border-b border-black last:border-b-0 text-center">
                              <td className="p-1 border-r border-black text-left font-medium">{row.theme}</td>
                              <td className="p-1 border-r border-black">{row.activities_count}</td>
                              <td className="p-1 border-r border-black">{row.students_beneficiaries}</td>
                              <td className="p-1 border-r border-black">{row.families_beneficiaries}</td>
                              <td className="p-1 border-r border-black">{row.authorities_beneficiaries}</td>
                              <td className="p-1">{row.teachers_beneficiaries}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="bg-gray-200 font-bold border-t-2 border-black text-center">
                            <td className="p-1 border-r border-black text-right uppercase">TOTALES:</td>
                            <td className="p-1 border-r border-black">
                              {preventionProjects.reduce((a, b) => a + b.activities_count, 0)}
                            </td>
                            <td className="p-1 border-r border-black font-bold text-[9.5px]">
                              {preventionProjects.reduce((a, b) => a + b.students_beneficiaries, 0)}
                            </td>
                            <td className="p-1 border-r border-black font-bold text-[9.5px]">
                              {preventionProjects.reduce((a, b) => a + b.families_beneficiaries, 0)}
                            </td>
                            <td className="p-1 border-r border-black">
                              {preventionProjects.reduce((a, b) => a + b.authorities_beneficiaries, 0)}
                            </td>
                            <td className="p-1">
                              {preventionProjects.reduce((a, b) => a + b.teachers_beneficiaries, 0)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>

                  {/* 4.4 PROCESOS PENDIENTES */}
                  <div className="pt-2 text-justify">
                    <h3 className="font-bold text-[10.5px] uppercase text-black">
                      4.4 PROCESOS PENDIENTES
                    </h3>
                    <div className="text-[9.5px] leading-relaxed whitespace-pre-line text-slate-800 mt-1">
                      {report.pending_processes || "Sin procesos pendientes."}
                    </div>
                  </div>

                  {/* 4.5 LOGROS Y NUDOS CRÍTICOS */}
                  <div className="pt-2 text-justify">
                    <h3 className="font-bold text-[10.5px] uppercase text-black">
                      4.5 LOGROS ALCANZADOS Y NUDOS CRÍTICOS (MÍNIMO 3)
                    </h3>
                    <h4 className="font-bold text-[9.5px] text-slate-900 mt-1">Logros alcanzados:</h4>
                    <div className="text-[9.5px] leading-relaxed whitespace-pre-line text-slate-800 mb-2">
                      {report.achievements || "—"}
                    </div>
                    <h4 className="font-bold text-[9.5px] text-slate-900">Nudos críticos (MÍNIMO 3):</h4>
                    <div className="text-[9.5px] leading-relaxed whitespace-pre-line text-slate-800">
                      {report.critical_knots || "—"}
                    </div>
                  </div>
                </div>

                {/* 6. CONCLUSIONES */}
                <div className="space-y-2 text-justify pt-2">
                  <h2 className="font-bold text-[11px] uppercase tracking-wide text-black border-b border-black pb-0.5">
                    CONCLUSIONES
                  </h2>
                  <div className="text-[9.5px] leading-relaxed whitespace-pre-line text-slate-800 space-y-2">
                    <p className="font-semibold">{report.conclusions_counseling}</p>
                    <p className="font-semibold">{report.conclusions_prevention}</p>
                    <p className="font-semibold">{report.conclusions_psychosocial}</p>
                    <p className="font-semibold">{report.conclusions_inclusion}</p>
                  </div>
                </div>

                {/* 7. RECOMENDACIONES */}
                <div className="space-y-2 text-justify pt-2">
                  <h2 className="font-bold text-[11px] uppercase tracking-wide text-black border-b border-black pb-0.5">
                    RECOMENDACIONES
                  </h2>
                  <div className="text-[9.5px] leading-relaxed whitespace-pre-line text-slate-800 space-y-2">
                    <div>
                      <span className="font-bold block">
                        1. Sugerencias a las autoridades institucionales, equipo docente y administrativos para mejorar el trabajo con el DECE:
                      </span>
                      {report.recommendations_institutional}
                    </div>
                    <div>
                      <span className="font-bold block">
                        2. Sugerencias a las autoridades distritales para mejorar el trabajo con el DECE institucional:
                      </span>
                      {report.recommendations_district}
                    </div>
                  </div>
                </div>

                {/* 8. ANEXOS */}
                <div className="space-y-1 text-justify pt-2">
                  <h2 className="font-bold text-[11px] uppercase tracking-wide text-black border-b border-black pb-0.5">
                    ANEXOS
                  </h2>
                  <p className="text-[9px] text-slate-700 italic">
                    REGISTRO FOTOGRÁFICO DE CADA PROYECTO EJECUTADO DEL PLAN DE ACCIÓN Y ACTIVIDADES RELEVANTES EXTERNAS AL PLAN DE ACCIÓN (4.3 EJE PROMOCIÓN Y PREVENCIÓN).<br />
                    Nota: Todo lo indicado en el presente informe debe estar sustentado en los archivos físicos o digitales que reposa en cada DECE.
                  </p>
                </div>

                {/* 9. FIRMAS DE LEGALIZACIÓN */}
                <div className="pt-6 break-inside-avoid space-y-4">
                  {/* Tabla Desarrollo */}
                  <table className="w-full border-collapse border border-black text-[9px]">
                    <thead>
                      <tr className="bg-gray-200 border-b border-black">
                        <th colSpan={3} className="p-1 text-center font-bold text-[#1E3A8A] uppercase text-[10px]">
                          DESARROLLO DEL DOCUMENTO
                        </th>
                      </tr>
                      <tr className="bg-gray-100 border-b border-black font-bold">
                        <th className="p-1 border-r border-black w-2/5 text-left">Nombre / Cargo</th>
                        <th className="p-1 border-r border-black w-1/3 text-center">Firma</th>
                        <th className="p-1 text-center">Fecha</th>
                      </tr>
                    </thead>
                    <tbody>
                      {desarrolloSignatures.map((s, idx) => (
                        <tr key={idx} className="border-b border-black last:border-b-0 h-16">
                          <td className="p-1.5 border-r border-black align-bottom">
                            <span className="font-bold uppercase block">{s.name}</span>
                            <span className="text-slate-600 uppercase text-[8px]">{s.cargo}</span>
                          </td>
                          <td className="p-1.5 border-r border-black align-bottom text-center">
                            <div className="w-32 mx-auto border-b border-black mb-1"></div>
                          </td>
                          <td className="p-1.5 align-bottom text-center">
                            {formatDate(s.date || report.report_date)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Tabla Aprobación */}
                  <table className="w-full border-collapse border border-black text-[9px]">
                    <thead>
                      <tr className="bg-gray-200 border-b border-black">
                        <th colSpan={3} className="p-1 text-center font-bold text-[#1E3A8A] uppercase text-[10px]">
                          APROBACIÓN DEL DOCUMENTO
                        </th>
                      </tr>
                      <tr className="bg-gray-100 border-b border-black font-bold">
                        <th className="p-1 border-r border-black w-2/5 text-left">Nombre / Cargo</th>
                        <th className="p-1 border-r border-black w-1/3 text-center">Firma</th>
                        <th className="p-1 text-center">Fecha</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(aprobacionSignatures.length > 0
                        ? aprobacionSignatures
                        : [{ name: "", cargo: "RECTOR / RECTORA DE LA IE", date: report.report_date }]
                      ).map((s, idx) => (
                        <tr key={idx} className="border-b border-black last:border-b-0 h-16">
                          <td className="p-1.5 border-r border-black align-bottom">
                            <span className="font-bold uppercase block">{s.name || "______________________"}</span>
                            <span className="text-slate-600 uppercase text-[8px]">{s.cargo}</span>
                          </td>
                          <td className="p-1.5 border-r border-black align-bottom text-center">
                            <div className="w-32 mx-auto border-b border-black mb-1"></div>
                          </td>
                          <td className="p-1.5 align-bottom text-center">
                            {formatDate(s.date || report.report_date)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </td>
            </tr>
          </tbody>

          {/* Pie Repetitivo para Impresión Multi-página */}
          <tfoot className="table-footer-group">
            <tr>
              <td>
                <div className="w-full pt-4">
                  <img
                    src="/footer_nuevo_ecuador.png"
                    alt="Ministerio de Educación - El Nuevo Ecuador"
                    className="w-full h-auto object-contain block"
                  />
                </div>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
