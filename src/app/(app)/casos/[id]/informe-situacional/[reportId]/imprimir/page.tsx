import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { formatDate } from "@/components/ui";
import type { CaseFileRow, StudentRow, SituationalReportRow, InstitutionRow } from "@/lib/types";
import { LEGAL_BASIS_TEXT, parseStringList } from "@/lib/situationalReport";
import { currentSchoolYearText } from "@/lib/schoolYearText";
import { formatStudentCourseFull } from "@/lib/studentCourse";
import PrintButton from "@/components/PrintButton";

function computeAge(birthDate?: string | null) {
  if (!birthDate) return "";
  const diff = Date.now() - new Date(birthDate).getTime();
  const ageDate = new Date(diff);
  const years = Math.abs(ageDate.getUTCFullYear() - 1970);
  return isNaN(years) ? "" : `${years} años`;
}

export default async function ImprimirInformeSituacionalPage({
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
    .prepare("SELECT * FROM situational_reports WHERE id = ? AND case_file_id = ? AND institution_id = ?")
    .get(params.reportId, caseFile.id, institutionId) as SituationalReportRow | undefined;
  if (!report) notFound();

  const student = db.prepare("SELECT * FROM students WHERE id = ?").get(caseFile.student_id) as StudentRow;
  const studentCourseFormatted = formatStudentCourseFull(student);

  let analystRole = report.responsible_role || "ANALISTA DECE";
  if (session.user.role === "ADMIN" || /coord/i.test((session.user as any).job_title || "")) {
    analystRole = "COORDINADOR/A DECE";
  }

  const methodologyList = parseStringList(report.methodology || "[]");

  return (
    <div className="bg-white min-h-screen py-6 px-4 sm:px-8 text-black text-sm print:py-0 print:px-0 relative font-serif">
      {/* CSS para impresión profesional A4 */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @page {
          size: A4 portrait;
          margin: 1.5cm 1.5cm;
        }
        @media print {
          html, body {
            background: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `,
        }}
      />

      <div className="max-w-4xl mx-auto space-y-6">
        {/* Barra superior de impresión */}
        <div className="no-print flex items-center justify-between bg-slate-100 border-b border-slate-200 p-2 font-sans">
          <div className="flex items-center gap-3 px-2">
            <Link
              href={`/casos/${caseFile.id}`}
              className="text-xs text-slate-600 hover:text-slate-900 font-semibold"
            >
              ← Volver al caso
            </Link>
            <span className="text-slate-300">|</span>
            <Link
              href={`/casos/${caseFile.id}/informe-situacional/${report.id}/editar`}
              className="text-xs text-blue-700 hover:text-blue-900 font-semibold flex items-center gap-1"
            >
              ✏️ Editar Informe
            </Link>
            <span className="text-xs text-gray-500 font-mono hidden md:inline ml-2">
              Caso: {caseFile.code} - Informe N° {report.report_number || "S/N"}
            </span>
          </div>
          <div className="flex gap-2 items-center">
            <a
              href={`/api/casos/${caseFile.id}/informe-situacional/${report.id}/export-word`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded text-sm font-semibold transition-colors"
            >
              Descargar Word (.docx)
            </a>
            <PrintButton hideWordButton={true} />
          </div>
        </div>

        <table className="w-full">
          <thead className="table-header-group">
            <tr>
              <td>
                <div className="w-full mb-6 mt-2 pb-4">
                  <img src="/header_4k.png" alt="Ministerio de Educación, Deporte y Cultura" className="w-full h-auto object-contain" />
                  <div className="text-center mt-6">
                    <h1 className="text-xl font-bold text-[#1E3A8A] font-serif">INFORME TÉCNICO SITUACIONAL</h1>
                    <p className="text-sm text-gray-500 font-serif">Informe General</p>
                  </div>
                </div>
              </td>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <table className="w-full border-collapse border-2 border-black text-[8px] text-center font-serif mb-6">
                  <thead>
                    <tr className="bg-gray-300">
                      <th colSpan={5} className="border border-black p-0.5 text-[#1b2d73] font-bold uppercase tracking-wide text-[10px]">
                        DATOS GENERALES
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-black p-[2px] font-bold text-[#1b2d73] w-[12%] bg-gray-100">Fecha de<br/>Informe</td>
                      <td className="border border-black p-[2px] w-[20%] bg-white">{formatDate(report.report_date)}</td>
                      <td className="border border-black p-[2px] font-bold text-[#1b2d73] w-[15%] bg-gray-100">No. De Informe</td>
                      <td colSpan={2} className="border border-black p-[2px] font-bold bg-white w-[53%] text-[8px]">
                        {report.report_number || `Mineduc-CZ3-18D02-UESR-DECE-${currentSchoolYearText()}-${report.id.substring(0,4).toUpperCase()}`}
                      </td>
                    </tr>
                    <tr className="bg-gray-100">
                      <td rowSpan={2} className="border border-black p-[2px] font-bold text-[#1b2d73] align-middle">Funcionario<br/>Responsable<br/>de Informe</td>
                      <td className="border border-black p-[2px] font-bold text-[#1b2d73]">Nombres y Apellidos</td>
                      <td className="border border-black p-[2px] font-bold text-[#1b2d73]">Cédula/ID</td>
                      <td className="border border-black p-[2px] font-bold text-[#1b2d73]">Correo</td>
                      <td className="border border-black p-[2px] font-bold text-[#1b2d73]">Cargo</td>
                    </tr>
                    <tr className="bg-white">
                      <td className="border border-black p-[2px]">{report.responsible_name || "Lic. Psicólogo/a DECE"}</td>
                      <td className="border border-black p-[2px]">0999999999</td>
                      <td className="border border-black p-[2px] text-blue-600 underline">correo_institucional@educacion.gob.ec</td>
                      <td className="border border-black p-[2px] uppercase">{analystRole}</td>
                    </tr>
                    <tr className="bg-gray-100">
                      <td rowSpan={2} className="border border-black p-[2px] font-bold text-[#1b2d73] align-middle">Dirigido A:</td>
                      <td className="border border-black p-[2px] font-bold text-[#1b2d73]">Nombres y Apellidos</td>
                      <td className="border border-black p-[2px] font-bold text-[#1b2d73]">Cédula/ID</td>
                      <td className="border border-black p-[2px] font-bold text-[#1b2d73]">Correo</td>
                      <td className="border border-black p-[2px] font-bold text-[#1b2d73]">Cargo</td>
                    </tr>
                    <tr className="bg-white">
                      <td className="border border-black p-[2px]">{report.addressed_to_name || "Msc. Máxima Autoridad"}</td>
                      <td className="border border-black p-[2px]">0999999999</td>
                      <td className="border border-black p-[2px] text-blue-600 underline">autoridad@educacion.gob.ec</td>
                      <td className="border border-black p-[2px] uppercase">{report.addressed_to_role || "RECTOR/A U.E."}</td>
                    </tr>
                    <tr className="bg-white">
                      <td className="border border-black p-[2px] font-bold text-[#1b2d73] bg-gray-100">TEMA:</td>
                      <td colSpan={4} className="border border-black p-[2px] font-bold uppercase text-[8px]">
                        {report.tema || report.situation_type || `INFORME TÉCNICO SITUACIONAL SOBRE PRESUNTO INTENTO AUTOLÍTICO E IDEACIÓN SUICIDA - ${student.full_name}`}
                      </td>
                    </tr>
                  </tbody>
                </table>
                {/* 2. ANTECEDENTES Y MARCO LEGAL */}
                <div className="space-y-4 mb-4">
                  {/* 1. ANTECEDENTES */}
                  <div className="space-y-2">
                    <h2 className="font-bold text-sm uppercase text-blue-950 border-b border-gray-300 pb-1">
                      1. ANTECEDENTES
                    </h2>
                    <div className="text-xs font-semibold text-blue-900 mt-2">1.1 ÁMBITO LEGAL:</div>
                    <div className="text-xs font-bold text-gray-800">BASE LEGAL:</div>
                    <div className="text-xs text-justify text-gray-700 whitespace-pre-line leading-relaxed bg-gray-50 p-3 rounded border border-gray-200">
                      {report.legal_basis || LEGAL_BASIS_TEXT}
                    </div>
                    {report.scope_text && (
                      <>
                        <div className="text-xs font-semibold text-blue-900 mt-2">1.2 ÁMBITO ADMINISTRATIVO:</div>
                        <p className="text-xs text-justify text-gray-700">{report.scope_text}</p>
                      </>
                    )}
                  </div>

                  {/* 2. ALCANCE */}
                  <div className="space-y-1">
                    <h2 className="font-bold text-sm uppercase text-blue-950 border-b border-gray-300 pb-1">
                      2. ALCANCE
                    </h2>
                    <p className="text-xs text-justify text-gray-700 leading-relaxed">
                      {report.scope_text || "Del Departamento de Consejería Estudiantil hacia la máxima autoridad institucional."}
                    </p>
                  </div>

                  {/* 3. OBJETIVOS */}
                  <div className="space-y-1">
                    <h2 className="font-bold text-sm uppercase text-blue-950 border-b border-gray-300 pb-1">
                      3. OBJETIVOS
                    </h2>
                    <p className="text-xs text-justify text-gray-700 leading-relaxed">
                      {report.objective_text || `Informar a la máxima autoridad institucional sobre las actuaciones y medidas psicosociales orientadas al bienestar integral y restitución de derechos de el/la estudiante ${student.full_name}.`}
                    </p>
                  </div>

                  {/* 4. DESARROLLO O ANÁLISIS */}
                  <div className="space-y-3">
                    <h2 className="font-bold text-sm uppercase text-blue-950 border-b border-gray-300 pb-1">
                      4. DESARROLLO O ANÁLISIS
                    </h2>

                    {/* 4.1 DATOS INFORMATIVOS (PRESUNTA VÍCTIMA / ESTUDIANTE) */}
                    <div className="bg-slate-50 border border-slate-300 rounded p-3 text-xs space-y-2">
                      <div className="font-bold text-blue-950 uppercase text-[11px] border-b border-slate-200 pb-1">
                        4.1 DATOS INFORMATIVOS — PRESUNTA VÍCTIMA / ESTUDIANTE
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                        <div><span className="font-bold">Nombre de la/el Estudiante:</span> {student.full_name}</div>
                        <div><span className="font-bold">Cédula / C.I.:</span> {student.document_id || "No registra"}</div>
                        <div><span className="font-bold">Fecha de nacimiento:</span> {student.birth_date ? formatDate(student.birth_date) : "No registra"}</div>
                        <div><span className="font-bold">Edad:</span> {computeAge(student.birth_date) || "No registra"}</div>
                        <div><span className="font-bold">Grado o Curso:</span> {studentCourseFormatted}</div>
                        <div><span className="font-bold">Jornada:</span> {student.jornada || "Matutina"}</div>
                        <div><span className="font-bold">Teléfono de contacto:</span> {student.rep_phone || "No registra"}</div>
                        <div><span className="font-bold">Dirección domiciliaria:</span> {student.address || "No registra"}</div>
                      </div>

                      <div className="font-bold text-slate-800 text-[10.5px] pt-2 border-t border-slate-200">
                        DATOS DEL REPRESENTANTE LEGAL:
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                        <div><span className="font-bold">Nombres y apellidos:</span> {student.representative || "No registra"}</div>
                        <div><span className="font-bold">Cédula:</span> {student.representative_document_id || "No registra"}</div>
                        <div><span className="font-bold">Parentesco:</span> {student.lives_with || "Representante legal"}</div>
                        <div><span className="font-bold">Teléfono:</span> {student.rep_phone || "No registra"}</div>
                      </div>
                    </div>

                    {/* 4.2 EJES DE ACCIÓN */}
                    <div className="space-y-3 pt-1">
                      <div className="font-bold text-xs uppercase text-blue-900">
                        4.2 EJES DE ACCIÓN Y ATENCIÓN PSICOSOCIAL:
                      </div>

                      {report.eje_deteccion && (
                        <div className="text-xs text-justify">
                          <div className="font-bold text-gray-900">4.2.1 Eje de Detección:</div>
                          <p className="whitespace-pre-line mt-0.5 text-gray-700">{report.eje_deteccion}</p>
                        </div>
                      )}
                      {report.eje_diagnostico_individual && (
                        <div className="text-xs text-justify">
                          <div className="font-bold text-gray-900">4.2.2 Valoración Psicosocial Individual:</div>
                          <p className="whitespace-pre-line mt-0.5 text-gray-700">{report.eje_diagnostico_individual}</p>
                        </div>
                      )}
                      {report.eje_diagnostico_familiar && (
                        <div className="text-xs text-justify">
                          <div className="font-bold text-gray-900">4.2.3 Abordaje Familiar:</div>
                          <p className="whitespace-pre-line mt-0.5 text-gray-700">{report.eje_diagnostico_familiar}</p>
                        </div>
                      )}
                      {report.eje_atencion_psicosocial && (
                        <div className="text-xs text-justify">
                          <div className="font-bold text-gray-900">4.2.4 Eje de Intervención Psicosocial:</div>
                          <p className="whitespace-pre-line mt-0.5 text-gray-700">{report.eje_atencion_psicosocial}</p>
                        </div>
                      )}
                      {report.eje_derivacion && (
                        <div className="text-xs text-justify">
                          <div className="font-bold text-gray-900">4.2.5 Eje de Derivación:</div>
                          <p className="whitespace-pre-line mt-0.5 text-gray-700">{report.eje_derivacion}</p>
                        </div>
                      )}
                      {report.eje_seguimiento && (
                        <div className="text-xs text-justify">
                          <div className="font-bold text-gray-900">4.2.6 Eje de Seguimiento:</div>
                          <p className="whitespace-pre-line mt-0.5 text-gray-700">{report.eje_seguimiento}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 5. METODOLOGÍA */}
                  <div className="space-y-2">
                    <h2 className="font-bold text-sm uppercase text-blue-950 border-b border-gray-300 pb-1">
                      5. METODOLOGÍA EMPLEADA
                    </h2>
                    <ul className="list-disc list-inside text-xs space-y-1 text-gray-700">
                      {methodologyList.length > 0 ? (
                        methodologyList.map((m, i) => <li key={i}>{m}</li>)
                      ) : (
                        <li>Entrevista psicológica y acompañamiento psicosocial individual</li>
                      )}
                    </ul>
                  </div>

                  {/* 6. CONCLUSIONES */}
                  <div className="space-y-2">
                    <h2 className="font-bold text-sm uppercase text-blue-950 border-b border-gray-300 pb-1">
                      6. CONCLUSIONES
                    </h2>
                    <p className="text-xs text-justify text-gray-700 whitespace-pre-line leading-relaxed">
                      {report.conclusions || "Se cumplieron las acciones psicosociales correspondientes."}
                    </p>
                  </div>

                  {/* 7. RECOMENDACIONES */}
                  <div className="space-y-2 mb-6">
                    <h2 className="font-bold text-sm uppercase text-blue-950 border-b border-gray-300 pb-1">
                      7. RECOMENDACIONES
                    </h2>
                    <p className="text-xs text-justify text-gray-700 whitespace-pre-line leading-relaxed">
                      {report.recommendations || "Continuar con el seguimiento y apoyo psicopedagógico en el aula."}
                    </p>
                  </div>
                </div>

                {/* 7. FIRMAS DE RESPONSABILIDAD */}
                <div className="mt-8">
                  <table className="w-full border-collapse border border-gray-400 text-xs text-center break-inside-avoid mb-8">
                    <thead>
                      <tr className="bg-gray-200">
                        <th colSpan={3} className="border border-gray-400 py-1 font-bold text-blue-900 uppercase">Desarrollo del Documento</th>
                      </tr>
                      <tr className="bg-gray-100">
                        <th className="border border-gray-400 py-1 w-[30%]">Nombre</th>
                        <th className="border border-gray-400 py-1 w-[45%]">Firma</th>
                        <th className="border border-gray-400 py-1 w-[25%]">Fecha</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="h-16">
                        <td className="border border-gray-400 p-1 align-middle">
                          <div className="font-bold">{report.preparer_name || report.responsible_name || "Lic. Elaborador"}</div>
                          <div>{analystRole}</div>
                        </td>
                        <td className="border border-gray-400 p-1"></td>
                        <td className="border border-gray-400 p-1 align-middle">{formatDate(report.report_date)}</td>
                      </tr>
                    </tbody>
                    <thead>
                      <tr className="bg-gray-200">
                        <th colSpan={3} className="border border-gray-400 py-1 font-bold text-blue-900 uppercase">Revisión del Documento</th>
                      </tr>
                      <tr className="bg-gray-100">
                        <th className="border border-gray-400 py-1 w-[30%]">Nombre</th>
                        <th className="border border-gray-400 py-1 w-[45%]">Firma</th>
                        <th className="border border-gray-400 py-1 w-[25%]">Fecha</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="h-16">
                        <td className="border border-gray-400 p-1 align-middle">
                          <div className="font-bold">{(report as any).reviewer_name || "Msc. Coordinador/a"}</div>
                          <div>{(report as any).reviewer_role || "COORDINADORA DECE"}</div>
                        </td>
                        <td className="border border-gray-400 p-1"></td>
                        <td className="border border-gray-400 p-1 align-middle">{formatDate(report.report_date)}</td>
                      </tr>
                    </tbody>
                    <thead>
                      <tr className="bg-gray-200">
                        <th colSpan={3} className="border border-gray-400 py-1 font-bold text-blue-900 uppercase">Aprobación del Documento</th>
                      </tr>
                      <tr className="bg-gray-100">
                        <th className="border border-gray-400 py-1 w-[30%]">Nombre</th>
                        <th className="border border-gray-400 py-1 w-[45%]">Firma</th>
                        <th className="border border-gray-400 py-1 w-[25%]">Fecha</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="h-16">
                        <td className="border border-gray-400 p-1 align-middle">
                          <div className="font-bold">{report.approver_name || report.addressed_to_name || "Msc. Autoridad"}</div>
                          <div>{report.approver_role || "RECTOR/A INSTITUCIONAL"}</div>
                        </td>
                        <td className="border border-gray-400 p-1"></td>
                        <td className="border border-gray-400 p-1 align-middle">{formatDate(report.report_date)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </td>
            </tr>
          </tbody>
          <tfoot className="table-footer-group">
            <tr>
              <td>
                <div className="w-full mt-4">
                  <img src="/footer_nuevo_ecuador.png" alt="El Nuevo Ecuador" className="w-full h-auto object-contain" />
                </div>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
