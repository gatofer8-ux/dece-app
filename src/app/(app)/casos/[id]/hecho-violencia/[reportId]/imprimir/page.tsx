import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { formatDate } from "@/components/ui";
import type { CaseFileRow, StudentRow, ViolenceReportRow, InstitutionRow } from "@/lib/types";
import { parseJsonArray } from "@/lib/violenceReport";
import { formatStudentCourseFull } from "@/lib/studentCourse";
import PrintButton from "@/components/PrintButton";

function parseDateParts(dateStr?: string | null) {
  if (!dateStr) return { day: "", month: "", year: "" };
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return { day: "", month: "", year: "" };
  return {
    day: String(d.getUTCDate()).padStart(2, "0"),
    month: String(d.getUTCMonth() + 1).padStart(2, "0"),
    year: String(d.getUTCFullYear()),
  };
}

function computeAge(birthDate?: string | null) {
  if (!birthDate) return "";
  const diff = Date.now() - new Date(birthDate).getTime();
  const ageDate = new Date(diff);
  const years = Math.abs(ageDate.getUTCFullYear() - 1970);
  return isNaN(years) ? "" : `${years} años`;
}

export default async function ImprimirInformeHechoViolenciaPage({
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
    .prepare("SELECT * FROM violence_reports WHERE id = ? AND case_file_id = ? AND institution_id = ?")
    .get(params.reportId, caseFile.id, institutionId) as ViolenceReportRow | undefined;
  if (!report) notFound();

  let analystRole = report.analyst_role;
  if (!analystRole && report.created_by) {
    const creator = db.prepare("SELECT role, job_title FROM users WHERE id = ?").get(report.created_by) as any;
    if (creator) {
      analystRole = creator.role === "ADMIN" || /coord/i.test(creator.job_title || "") ? "COORDINADOR/A DECE" : (creator.job_title || "ANALISTA DECE");
    }
  }
  if (!analystRole) {
    analystRole = "ANALISTA DECE";
  }

  // Firmas duales y respaldo físico
  let violSignatures: any[] = [];
  try {
    if (report.signatures_json) {
      violSignatures = JSON.parse(report.signatures_json);
    }
  } catch {}
  const analystSig = violSignatures.find((s: any) => s.signer_id === "analyst" || s.role?.toLowerCase().includes("analista") || s.role?.toLowerCase().includes("dece"));
  const rectoraSig = violSignatures.find((s: any) => s.signer_id === "rectora" || s.role?.toLowerCase().includes("rector"));

  const student = db.prepare("SELECT * FROM students WHERE id = ?").get(caseFile.student_id) as StudentRow;
  const studentCourseFormatted = formatStudentCourseFull(student);
  const institution = db.prepare("SELECT * FROM institutions WHERE id = ?").get(institutionId) as InstitutionRow;

  const violenceTypes = parseJsonArray<string>(report.violence_types);
  const violenceModalities = parseJsonArray<string>(report.violence_modalities);

  const studentBirth = parseDateParts(student.birth_date);
  const incidentDate = parseDateParts(report.incident_date);

  const isFisica = violenceTypes.includes("FISICA");
  const isPsicologica = violenceTypes.includes("PSICOLOGICA");
  const isSexual = violenceTypes.includes("SEXUAL");
  const isNegligencia = violenceTypes.includes("NEGLIGENCIA") || violenceTypes.includes("OMISION");

  const isIntrafamiliar = violenceModalities.includes("INTRAFAMILIAR");
  const isInstitucional = violenceModalities.includes("INSTITUCIONAL");
  const isAcoso = violenceModalities.includes("ACOSO_ESCOLAR");
  const isAdulto = violenceModalities.includes("ESTUDIANTE_ADULTO");
  const isOtras = !!report.violence_modality_other || violenceModalities.includes("OTRA");

  return (
    <div className="max-w-[850px] mx-auto bg-white p-6 print:p-0 font-['Arial',sans-serif]">
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

      {/* Barra de Herramientas (Oculta al imprimir) */}
      <div className="no-print sticky top-0 z-30 bg-slate-900 text-white px-4 py-3 shadow-md flex items-center justify-between gap-4 mb-6 rounded-lg">
        <div className="flex items-center gap-3">
          <Link
            href={`/casos/${caseFile.id}`}
            className="text-xs text-slate-300 hover:text-white bg-slate-800 px-3 py-1.5 rounded-md transition-colors"
          >
            ← Volver al Caso
          </Link>
          <Link
            href={`/casos/${caseFile.id}/hecho-violencia/${report.id}/editar`}
            className="text-xs text-blue-300 hover:text-white bg-slate-800 px-3 py-1.5 rounded-md transition-colors flex items-center gap-1"
          >
            ✏️ Editar datos
          </Link>
          <span className="text-xs text-slate-400 font-mono hidden sm:inline">
            Reporte de Hecho de Violencia
          </span>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={`/api/casos/${caseFile.id}/hecho-violencia/${report.id}/export-word`}
            download
            className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold px-3 py-1.5 rounded-md flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <span>📝</span>
            <span>Descargar Word (.docx)</span>
          </a>

          <PrintButton
            hideWordButton={true}
            fileNamePrefix={`reporte-hecho-violencia-${student.full_name.replace(/\s+/g, "-").toLowerCase()}`}
            className="bg-transparent border-0 p-0"
          />
        </div>
      </div>
      
      <div id="printable-content" className="text-black leading-tight print:leading-tight font-['Arial',sans-serif]">
        {/* Encabezado Oficial Fiel: Centrado, 18pt / 12pt */}
        <div className="text-center mb-3">
          <h1 className="font-bold text-2xl uppercase tracking-wider text-black">
            {institution.name || "UNIDAD EDUCATIVA “SANTA ROSA”"}
          </h1>
          <h2 className="text-base uppercase tracking-wide text-black mt-0.5 font-normal">
            ANEXO 1. FORMATO: INFORME DE REPORTE DEL HECHO DE VIOLENCIA
          </h2>
        </div>

        {/* Tabla Inicial: Datos del Informe */}
        <table className="w-full border-collapse border border-[#808080] mb-2 bg-[#F6F6F6] text-sm">
          <tbody>
            <tr>
              <td colSpan={4} className="border border-[#808080] bg-[#CECDCD] font-bold uppercase text-sm px-2 py-1 text-black" style={{ backgroundColor: "#CECDCD", border: "1px solid #808080" }}>
                INFORME DE REPORTE DEL HECHO DE VIOLENCIA
              </td>
            </tr>
            <tr>
              <td colSpan={4} className="border border-[#808080] px-2 py-1" style={{ backgroundColor: "#F2F2F2", border: "1px solid #808080" }}>
                <span className="font-bold">Institución educativa:</span> {institution.name || "UNIDAD EDUCATIVA “SANTA ROSA”"}
              </td>
            </tr>
            <tr>
              <td className="border border-[#808080] px-2 py-1 w-1/2" colSpan={2} style={{ backgroundColor: "#F2F2F2", border: "1px solid #808080" }}>
                <span className="font-bold">Informe Nº:</span> {report.report_number || "001"}
              </td>
              <td className="border border-[#808080] px-2 py-1 w-1/2" colSpan={2} style={{ backgroundColor: "#F2F2F2", border: "1px solid #808080" }}>
                <span className="font-bold">Fecha:</span> {formatDate(report.report_date)}
              </td>
            </tr>
            <tr>
              <td colSpan={4} className="border border-[#808080] px-2 py-1" style={{ backgroundColor: "#F2F2F2", border: "1px solid #808080" }}>
                <span className="font-bold">Nombre de profesional DECE que maneja el caso:</span> {report.analyst_name || "MGTR. MARLON JACOME"} {analystRole ? `(${analystRole})` : ""}
              </td>
            </tr>
          </tbody>
        </table>

        {/* 1. DATOS GENERALES DE IDENTIFICACIÓN DEL ESTUDIANTE */}
        <table className="w-full border-collapse border border-[#808080] mb-2 bg-[#F6F6F6] text-sm">
          <tbody>
            <tr>
              <td colSpan={4} className="border border-[#808080] bg-[#CECDCD] font-bold uppercase text-sm px-2 py-1 text-black" style={{ backgroundColor: "#CECDCD", border: "1px solid #808080" }}>
                1. DATOS GENERALES DE IDENTIFICACIÓN DEL ESTUDIANTE O DE LA ESTUDIANTE
              </td>
            </tr>
            <tr>
              <td colSpan={3} className="border border-[#808080] px-2 py-1" style={{ backgroundColor: "#F2F2F2", border: "1px solid #808080" }}>
                <span className="font-bold">Apellidos y nombres:</span> {student.full_name}
              </td>
              <td className="border border-[#808080] px-2 py-1" style={{ backgroundColor: "#F2F2F2", border: "1px solid #808080" }}>
                <span className="font-bold">C.I.:</span> {student.document_id || ""}
              </td>
            </tr>
            <tr>
              <td className="border border-[#808080] px-2 py-1 w-1/4" style={{ backgroundColor: "#F2F2F2", border: "1px solid #808080" }}>
                <span className="font-bold">Fecha de nacimiento:</span>
              </td>
              <td className="border border-[#808080] px-2 py-1 w-1/4" style={{ backgroundColor: "#F2F2F2", border: "1px solid #808080" }}>
                <span className="font-bold">Día:</span> {studentBirth.day}
              </td>
              <td className="border border-[#808080] px-2 py-1 w-1/4" style={{ backgroundColor: "#F2F2F2", border: "1px solid #808080" }}>
                <span className="font-bold">Mes:</span> {studentBirth.month}
              </td>
              <td className="border border-[#808080] px-2 py-1 w-1/4" style={{ backgroundColor: "#F2F2F2", border: "1px solid #808080" }}>
                <span className="font-bold">Año:</span> {studentBirth.year}
              </td>
            </tr>
            <tr>
              <td colSpan={4} className="border border-[#808080] px-2 py-1" style={{ backgroundColor: "#F2F2F2", border: "1px solid #808080" }}>
                <span className="font-bold">Edad:</span> {computeAge(student.birth_date)}
              </td>
            </tr>
            <tr>
              <td colSpan={4} className="border border-[#808080] px-2 py-1" style={{ backgroundColor: "#F2F2F2", border: "1px solid #808080" }}>
                <span className="font-bold">Grado o curso:</span> {studentCourseFormatted}
              </td>
            </tr>
          </tbody>
        </table>

        {/* 2. DATOS GENERALES DE LA MADRE, PADRE Y/O REPRESENTANTE LEGAL */}
        <table className="w-full border-collapse border border-[#808080] mb-2 bg-[#F6F6F6] text-sm">
          <tbody>
            <tr>
              <td colSpan={4} className="border border-[#808080] bg-[#CECDCD] font-bold uppercase text-sm px-2 py-1 text-black" style={{ backgroundColor: "#CECDCD", border: "1px solid #808080" }}>
                2. DATOS GENERALES DE LA MADRE, PADRE Y/O REPRESENTANTE LEGAL
              </td>
            </tr>
            <tr>
              <td colSpan={4} className="border border-[#808080] px-2 py-1" style={{ backgroundColor: "#F2F2F2", border: "1px solid #808080" }}>
                <span className="font-bold">Nombres y apellidos:</span> {student.representative || ""}
              </td>
            </tr>
            <tr>
              <td colSpan={4} className="border border-[#808080] px-2 py-1" style={{ backgroundColor: "#F2F2F2", border: "1px solid #808080" }}>
                <span className="font-bold">Vínculo entre la persona y el/la estudiante:</span> {report.representative_relationship || "Representante"}
              </td>
            </tr>
            <tr>
              <td colSpan={4} className="border border-[#808080] px-2 py-1" style={{ backgroundColor: "#F2F2F2", border: "1px solid #808080" }}>
                <span className="font-bold">Dirección del domicilio:</span> {student.representative_address || student.address || ""}
              </td>
            </tr>
            <tr>
              <td colSpan={4} className="border border-[#808080] px-2 py-1" style={{ backgroundColor: "#F2F2F2", border: "1px solid #808080" }}>
                <span className="font-bold">Teléfono de contacto:</span> {student.rep_phone || ""}
              </td>
            </tr>
          </tbody>
        </table>

        {/* 3. DATOS SOBRE LA PRESUNTA SITUACIÓN DE VIOLENCIA */}
        <table className="w-full border-collapse border border-[#808080] mb-2 bg-[#F6F6F6] text-sm">
          <tbody>
            <tr>
              <td colSpan={4} className="border border-[#808080] bg-[#CECDCD] font-bold uppercase text-sm px-2 py-1 text-black" style={{ backgroundColor: "#CECDCD", border: "1px solid #808080" }}>
                3. DATOS SOBRE LA PRESUNTA SITUACIÓN DE VIOLENCIA
              </td>
            </tr>
            <tr>
              <td colSpan={4} className="border border-[#808080] px-2 py-1 font-bold" style={{ backgroundColor: "#F2F2F2", border: "1px solid #808080" }}>
                Fecha y lugar en el que ocurrió la situación de violencia:
              </td>
            </tr>
            <tr>
              <td colSpan={4} className="border border-[#808080] px-2 py-1" style={{ backgroundColor: "#F2F2F2", border: "1px solid #808080" }}>
                <span className="mr-6 font-bold">Día: {incidentDate.day || "—"}</span>
                <span className="mr-6 font-bold">mes: {incidentDate.month || "—"}</span>
                <span className="mr-6 font-bold">año: {incidentDate.year || "—"}</span>
                {!report.incident_date && <span className="italic text-gray-600">Se desconoce</span>}
              </td>
            </tr>
            <tr>
              <td colSpan={4} className="border border-[#808080] px-2 py-1" style={{ backgroundColor: "#F2F2F2", border: "1px solid #808080" }}>
                <span className="font-bold">Lugar:</span> {report.incident_place || "Domicilio del estudiante"}
              </td>
            </tr>
            <tr>
              <td colSpan={4} className="border border-[#808080] px-2 py-1" style={{ backgroundColor: "#F2F2F2", border: "1px solid #808080" }}>
                <span className="font-bold">Nombres y apellidos de la presunta persona responsable de la agresión:</span> {report.perpetrator_name || "Desconocido"}
              </td>
            </tr>
            <tr>
              <td colSpan={2} className="border border-[#808080] px-2 py-1 w-1/2" style={{ backgroundColor: "#F2F2F2", border: "1px solid #808080" }}>
                <span className="font-bold">Fecha de nacimiento:</span> {report.perpetrator_birth_date ? formatDate(report.perpetrator_birth_date) : ""}
              </td>
              <td colSpan={2} className="border border-[#808080] px-2 py-1 w-1/2" style={{ backgroundColor: "#F2F2F2", border: "1px solid #808080" }}>
                <span className="font-bold">Edad:</span> {report.perpetrator_age ? `${report.perpetrator_age} años` : "Se desconoce"}
              </td>
            </tr>
            <tr>
              <td colSpan={4} className="border border-[#808080] px-2 py-1" style={{ backgroundColor: "#F2F2F2", border: "1px solid #808080" }}>
                <span className="font-bold">Tipo de relación de quien realizó la agresión con la víctima:</span> {report.perpetrator_relationship || ""}
              </td>
            </tr>
            {/* 4. DATOS DE LA PERSONA QUE REFIERE EL CASO */}
            <tr>
              <td colSpan={4} className="border border-[#808080] bg-[#CECDCD] font-bold uppercase text-sm px-2 py-1 text-black" style={{ backgroundColor: "#CECDCD", border: "1px solid #808080" }}>
                4. DATOS DE LA PERSONA QUE REFIERE EL CASO
              </td>
            </tr>
            <tr>
              <td colSpan={4} className="border border-[#808080] px-2 py-1" style={{ backgroundColor: "#F2F2F2", border: "1px solid #808080" }}>
                <span className="font-bold">Nombres y apellidos:</span> {report.informant_name || ""}
              </td>
            </tr>
            <tr>
              <td colSpan={4} className="border border-[#808080] px-2 py-1" style={{ backgroundColor: "#F2F2F2", border: "1px solid #808080" }}>
                <span className="font-bold">Cédula de identidad:</span> {report.informant_id_number || ""}
              </td>
            </tr>
            <tr>
              <td colSpan={4} className="border border-[#808080] px-2 py-1" style={{ backgroundColor: "#F2F2F2", border: "1px solid #808080" }}>
                <span className="font-bold">Cargo:</span> {report.informant_role || ""}
              </td>
            </tr>
          </tbody>
        </table>

        {/* 5. TIPO DE VIOLENCIA IDENTIFICADA */}
        <table className="w-full border-collapse border border-[#808080] mb-2 bg-[#F6F6F6] text-sm" style={{ border: "1px solid #808080" }}>
          <tbody>
            <tr>
              <td colSpan={4} className="border border-[#808080] bg-[#CECDCD] font-bold uppercase text-sm px-2 py-1 text-black" style={{ backgroundColor: "#CECDCD", border: "1px solid #808080" }}>
                5. TIPO DE VIOLENCIA IDENTIFICADA
              </td>
            </tr>
            <tr>
              <td className="border border-[#808080] px-2 py-1.5 text-center w-1/4" style={{ width: "25%", border: "1px solid #808080" }}>
                Física ( <strong className={isFisica ? "underline font-black" : ""}>{isFisica ? "X" : "\u00A0\u00A0"}</strong> )
              </td>
              <td className="border border-[#808080] px-2 py-1.5 text-center w-1/4" style={{ width: "25%", border: "1px solid #808080" }}>
                Psicológica ( <strong className={isPsicologica ? "underline font-black" : ""}>{isPsicologica ? "X" : "\u00A0\u00A0"}</strong> )
              </td>
              <td className="border border-[#808080] px-2 py-1.5 text-center w-1/4" style={{ width: "25%", border: "1px solid #808080" }}>
                Sexual ( <strong className={isSexual ? "underline font-black" : ""}>{isSexual ? "X" : "\u00A0\u00A0"}</strong> )
              </td>
              <td className="border border-[#808080] px-2 py-1.5 text-center w-1/4" style={{ width: "25%", border: "1px solid #808080" }}>
                Negligencia ( <strong className={isNegligencia ? "underline font-black" : ""}>{isNegligencia ? "X" : "\u00A0\u00A0"}</strong> )
              </td>
            </tr>
          </tbody>
        </table>

        {/* 6. MODALIDAD DE VIOLENCIA IDENTIFICADA */}
        <table className="w-full border-collapse border border-[#808080] mb-2 bg-[#F6F6F6] text-sm" style={{ border: "1px solid #808080" }}>
          <tbody>
            <tr>
              <td colSpan={4} className="border border-[#808080] bg-[#CECDCD] font-bold uppercase text-sm px-2 py-1 text-black" style={{ backgroundColor: "#CECDCD", border: "1px solid #808080" }}>
                6. MODALIDAD DE VIOLENCIA IDENTIFICADA
              </td>
            </tr>
            <tr>
              <td className="border border-[#808080] px-2 py-1.5 text-center w-1/4" style={{ width: "25%", border: "1px solid #808080" }}>
                Intrafamiliar ( <strong className={isIntrafamiliar ? "underline font-black" : ""}>{isIntrafamiliar ? "X" : "\u00A0\u00A0"}</strong> )
              </td>
              <td className="border border-[#808080] px-2 py-1.5 text-center w-1/4" style={{ width: "25%", border: "1px solid #808080" }}>
                Institucional ( <strong className={isInstitucional ? "underline font-black" : ""}>{isInstitucional ? "X" : "\u00A0\u00A0"}</strong> )
              </td>
              <td className="border border-[#808080] px-2 py-1.5 text-center w-1/4" style={{ width: "25%", border: "1px solid #808080" }}>
                Acoso escolar ( <strong className={isAcoso ? "underline font-black" : ""}>{isAcoso ? "X" : "\u00A0\u00A0"}</strong> )
              </td>
              <td className="border border-[#808080] px-2 py-1.5 text-center w-1/4" style={{ width: "25%", border: "1px solid #808080" }}>
                Violencia estudiante-persona adulta ( <strong className={isAdulto ? "underline font-black" : ""}>{isAdulto ? "X" : "\u00A0\u00A0"}</strong> )
              </td>
            </tr>
            <tr>
              <td colSpan={4} className="border border-[#808080] px-2 py-1.5 text-left" style={{ border: "1px solid #808080" }}>
                Otras ( <strong className={isOtras ? "underline font-black" : ""}>{isOtras ? "X" : "\u00A0\u00A0"}</strong> ) : {report.violence_modality_other || "…………………………………………………………………………."}
              </td>
            </tr>
          </tbody>
        </table>

        {/* 7. RESUMEN DEL PRESUNTO HECHO DE VIOLENCIA */}
        <table className="w-full border-collapse border border-[#808080] mb-2 bg-[#F6F6F6] text-sm" style={{ border: "1px solid #808080" }}>
          <tbody>
            <tr>
              <td className="border border-[#808080] bg-[#CECDCD] font-bold uppercase text-sm px-2 py-1 text-black" style={{ backgroundColor: "#CECDCD", border: "1px solid #808080" }}>
                7. RESUMEN DEL PRESUNTO HECHO DE VIOLENCIA COMETIDO O DETECTADO{" "}
                <span className="font-normal normal-case italic">
                  (Transcriba detalladamente lo expresado por el/la estudiante o la persona que refiere la presunta situación, de manera objetiva)
                </span>
              </td>
            </tr>
            <tr>
              <td className="border border-[#808080] p-3 text-justify whitespace-pre-wrap leading-relaxed min-h-[140px] text-sm" style={{ border: "1px solid #808080" }}>
                {report.summary || "—"}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Observaciones */}
        {report.observations && (
          <table className="w-full border-collapse border border-[#808080] mb-3 bg-[#F6F6F6] text-sm" style={{ border: "1px solid #808080" }}>
            <tbody>
              <tr>
                <td className="border border-[#808080] p-2 text-justify text-sm" style={{ border: "1px solid #808080" }}>
                  <span className="font-bold">Observaciones:</span> {report.observations}
                </td>
              </tr>
            </tbody>
          </table>
        )}

        {/* Firmas de Responsabilidad */}
        <table className="w-full border-collapse mt-8 mb-4 text-center text-sm" style={{ border: "none", width: "100%" }}>
          <tbody>
            <tr>
              <td className="w-1/2 align-bottom text-center px-4" style={{ border: "none", width: "50%" }}>
                <div className="min-h-[50px] flex items-end justify-center mb-1">
                  {analystSig?.tipo === "digital" && analystSig?.firma_data_url ? (
                    <div className="flex flex-col items-center">
                      <img src={analystSig.firma_data_url} alt="Firma Analista" className="h-12 max-w-[170px] object-contain" />
                      <span className="text-[7.5px] text-slate-500 font-mono">Firma Digital Verificada</span>
                    </div>
                  ) : analystSig?.tipo === "fisica" ? (
                    <div className="text-center py-1">
                      <div className="w-48 border-b border-slate-700 mx-auto mb-1"></div>
                      <span className="text-[7.5px] text-amber-800 font-semibold uppercase block">[ Firma Física en Archivo Institucional ]</span>
                    </div>
                  ) : (
                    <div className="w-48 border-b border-slate-400 mx-auto mb-1"></div>
                  )}
                </div>
                <div style={{ display: "inline-block", width: "260px", borderTop: "1px solid #000000", paddingTop: "4px" }} className="font-bold">
                  {report.analyst_name || "Mgtr. Marlon Alberto Jácome Santana"}
                </div>
                <div className="font-bold uppercase text-xs tracking-wider mt-1">
                  {analystRole}
                </div>
              </td>
              <td className="w-1/2 align-bottom text-center px-4" style={{ border: "none", width: "50%" }}>
                <div className="min-h-[50px] flex items-end justify-center mb-1">
                  {rectoraSig?.tipo === "digital" && rectoraSig?.firma_data_url ? (
                    <div className="flex flex-col items-center">
                      <img src={rectoraSig.firma_data_url} alt="Firma Rectoral" className="h-12 max-w-[170px] object-contain" />
                      <span className="text-[7.5px] text-slate-500 font-mono">Firma Digital Verificada</span>
                    </div>
                  ) : rectoraSig?.tipo === "fisica" ? (
                    <div className="text-center py-1">
                      <div className="w-48 border-b border-slate-700 mx-auto mb-1"></div>
                      <span className="text-[7.5px] text-amber-800 font-semibold uppercase block">[ Firma Física en Archivo Institucional ]</span>
                    </div>
                  ) : (
                    <div className="w-48 border-b border-slate-400 mx-auto mb-1"></div>
                  )}
                </div>
                <div style={{ display: "inline-block", width: "260px", borderTop: "1px solid #000000", paddingTop: "4px" }} className="font-bold">
                  {report.rectora_name || "Msc. Diana Fernanda Manzano Villacís"}
                </div>
                <div className="font-bold uppercase text-xs tracking-wider mt-1">
                  RECTORA
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Banner de Custodia de Respaldo Físico */}
        {report.physical_file_ref && (
          <div className="my-3 p-2 bg-amber-50 border border-amber-300 rounded text-[9.5px] text-amber-900 flex items-center justify-between">
            <div>
              <span className="font-bold">📁 UBICACIÓN DE RESPALDO FÍSICO EN ARCHIVO INSTITUCIONAL: </span>
              <span>{report.physical_file_ref}</span>
            </div>
            <span className="text-[8.5px] bg-amber-200/70 border border-amber-400 px-1.5 py-0.5 rounded font-bold uppercase">
              Custodia DECE
            </span>
          </div>
        )}

        {/* Anexo de Auditoría Distrital: Respaldo Físico Escaneado */}
        {report.physical_evidence_url && (
          <div className="mt-4 pt-3 border-t border-dashed border-slate-300 page-break-inside-avoid">
            <div className="text-center font-bold text-[10px] text-slate-800 uppercase tracking-wide bg-slate-100 py-1 border border-slate-300 rounded mb-2">
              ANEXO DE AUDITORÍA DISTRITAL: RESPALDO FÍSICO DIGITALIZADO
            </div>
            <div className="text-[9px] text-slate-600 mb-2 italic text-center">
              Copia digitalizada del reporte físico del hecho de violencia con firmas manuscritas y sellos institucionales bajo custodia confidencial DECE.
            </div>
            <div className="flex justify-center border border-slate-200 p-2 bg-slate-50 rounded">
              {report.physical_evidence_url.startsWith("data:application/pdf") ? (
                <div className="text-center p-3 text-[10px] text-blue-700 font-semibold">
                  <span>📄 Documento PDF de Respaldo Físico Digitalizado Adjunto</span>
                </div>
              ) : (
                <img
                  src={report.physical_evidence_url}
                  alt="Respaldo Físico Digitalizado"
                  className="max-h-[350px] w-auto object-contain border border-slate-300 rounded shadow-xs"
                />
              )}
            </div>
          </div>
        )}

        {/* Nota Legal del COIP */}
        <div className="text-center text-xs italic text-slate-700 font-semibold pt-2">
          Recuerde el deber de denunciar según el artículo 422 del COIP.
        </div>
      </div>
    </div>
  );
}
