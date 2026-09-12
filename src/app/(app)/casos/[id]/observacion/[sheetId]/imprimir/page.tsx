import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { formatDate } from "@/components/ui";
import type { CaseFileRow, StudentRow, CaseObservationSheetRow, UserRow, InstitutionRow } from "@/lib/types";
import { parseOfficialObservationData } from "@/lib/observationSheet";
import { formatStudentCourseFull } from "@/lib/studentCourse";
import PrintButton from "@/components/PrintButton";
import DocumentHeader from "@/components/DocumentHeader";
import DocumentFooter from "@/components/DocumentFooter";

export default async function ImprimirFichaObservacionPage({
  params,
}: {
  params: { id: string; sheetId: string };
}) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  const caseFile = db
    .prepare("SELECT * FROM case_files WHERE id = ? AND institution_id = ?")
    .get(params.id, institutionId) as CaseFileRow | undefined;
  if (!caseFile) notFound();

  const sheet = db
    .prepare("SELECT * FROM case_observation_sheets WHERE id = ? AND case_file_id = ? AND institution_id = ?")
    .get(params.sheetId, caseFile.id, institutionId) as CaseObservationSheetRow | undefined;
  if (!sheet) notFound();

  const student = db.prepare("SELECT * FROM students WHERE id = ?").get(caseFile.student_id) as StudentRow;
  const institution = db.prepare("SELECT * FROM institutions WHERE id = ?").get(institutionId) as InstitutionRow;
  const professional = sheet.professional_id
    ? (db.prepare("SELECT * FROM users WHERE id = ?").get(sheet.professional_id) as UserRow | undefined)
    : undefined;

  const official = parseOfficialObservationData(sheet.observation_data, professional?.name || session.user.name || undefined);
  let analystRole = "ANALISTA DECE";
  if (professional) {
    analystRole = professional.role === "ADMIN" || /coord/i.test(professional.job_title || "") ? "COORDINADOR/A DECE" : (professional.job_title || "ANALISTA DECE");
  } else if (session.user.role === "ADMIN") {
    analystRole = "COORDINADOR/A DECE";
  }
    const studentCourse = formatStudentCourseFull(student);

  // Firmas duales y respaldo físico
  let obsSignatures: any[] = [];
  try {
    if (sheet.signatures_json) {
      obsSignatures = JSON.parse(sheet.signatures_json);
    }
  } catch {}
  const deceSig = obsSignatures.find((s: any) => s.signer_id === "dece" || s.role?.toLowerCase().includes("dece") || s.tipo);

  return (
    <div className="max-w-4xl mx-auto bg-white my-4 print:my-0 font-['Arial',sans-serif]">
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

      {/* Barra de control en pantalla */}
      <div className="flex items-center justify-between gap-3 p-4 bg-slate-50 border-b border-slate-200 print:hidden font-sans">
        <div className="flex items-center gap-2">
          <Link
            href={`/casos/${caseFile.id}`}
            className="text-xs font-semibold text-slate-600 hover:text-slate-800 flex items-center gap-1"
          >
            ← Volver al caso
          </Link>
          <span className="text-slate-300">|</span>
          <Link
            href={`/casos/${caseFile.id}/observacion/${sheet.id}/editar`}
            className="text-xs font-semibold text-brand-700 hover:text-brand-900 flex items-center gap-1"
          >
            ✏️ Editar Ficha
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <a
            href={`/api/casos/${caseFile.id}/observacion/${sheet.id}/export-word`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 transition-colors"
          >
            📥 Descargar Word (.docx)
          </a>
          <PrintButton hideWordButton={true} className="p-0 bg-transparent border-none" />
        </div>
      </div>

      <div id="printable-content" className="p-8 print:p-2 text-xs font-['Arial',sans-serif] text-black leading-tight">
        <DocumentHeader
          title="Ficha de Observación"
          subtitle="Departamento de Consejería Estudiantil — DECE"
          institutionName={institution.name}
          sealImage={institution.seal_image}
          compact={true}
        />

        {/* Tabla Oficial de 35 filas fiel a la réplica ministerial */}
        <table className="w-full border-collapse border border-black text-[11px] mt-2 mb-4">
          <tbody>
            {/* Fila 1: Título de Ficha */}
            <tr style={{ backgroundColor: "#D9E2F3" }} className="bg-[#D9E2F3] text-center font-bold">
              <td colSpan={4} className="border border-black py-1.5 uppercase text-xs">
                FICHA DE OBSERVACIÓN
                <div className="text-[10px] font-semibold text-slate-800 normal-case">
                  Departamento de Consejería Estudiantil - DECE
                </div>
              </td>
            </tr>

            {/* Fila 2: Subtítulo Datos Informativos */}
            <tr style={{ backgroundColor: "#D9E2F3" }} className="bg-[#D9E2F3] text-center font-bold">
              <td colSpan={4} className="border border-black py-1 tracking-wider uppercase text-[10px]">
                DATOS INFORMATIVOS GENERALES
              </td>
            </tr>

            {/* Fila 3: Nombre Estudiante */}
            <tr>
              <td style={{ backgroundColor: "#D9E2F3" }} className="border border-black bg-[#D9E2F3] px-2 py-1 font-bold w-[30%]">
                Nombre de el/la estudiante:
              </td>
              <td colSpan={3} className="border border-black px-2 py-1 font-medium">
                {student.full_name}
              </td>
            </tr>

            {/* Fila 4: Grado o Curso */}
            <tr>
              <td style={{ backgroundColor: "#D9E2F3" }} className="border border-black bg-[#D9E2F3] px-2 py-1 font-bold">
                Grado o Curso:
              </td>
              <td colSpan={3} className="border border-black px-2 py-1">
                {studentCourse}
              </td>
            </tr>

            {/* Fila 5: Duración */}
            <tr>
              <td style={{ backgroundColor: "#D9E2F3" }} className="border border-black bg-[#D9E2F3] px-2 py-1 font-bold">
                Duración de la observación:
              </td>
              <td colSpan={3} className="border border-black px-2 py-1">
                {official.duration || "—"}
              </td>
            </tr>

            {/* Fila 6: Tipo de observación */}
            <tr>
              <td style={{ backgroundColor: "#D9E2F3" }} className="border border-black bg-[#D9E2F3] px-2 py-1 font-bold">
                Observación áulica
              </td>
              <td className="border border-black text-center font-bold text-sm w-[8%]">
                {official.is_aulica ? "X" : ""}
              </td>
              <td style={{ backgroundColor: "#D9E2F3" }} className="border border-black bg-[#D9E2F3] px-2 py-1 font-bold w-[54%]">
                Observación en otros espacios externos al aula
              </td>
              <td className="border border-black text-center font-bold text-sm w-[8%]">
                {official.is_externa ? "X" : ""}
              </td>
            </tr>

            {/* Fila 7: Cabecera de Sección 2 */}
            <tr style={{ backgroundColor: "#D9E2F3" }} className="bg-[#D9E2F3] text-center font-bold">
              <td colSpan={4} className="border border-black py-1 uppercase text-[10px]">
                Preguntas para responder durante la observación
              </td>
            </tr>

            {/* Fila 8: Cabecera Columnas Preguntas */}
            <tr style={{ backgroundColor: "#D9E2F3" }} className="bg-[#D9E2F3] text-center font-bold">
              <td className="border border-black py-1 text-left px-2">Preguntas</td>
              <td className="border border-black py-1 w-[6%]">Si</td>
              <td className="border border-black py-1 w-[6%]">No</td>
              <td className="border border-black py-1 w-[45%] text-left px-2">Comentario</td>
            </tr>

            {/* Filas 9 a 25: 17 Preguntas Oficiales */}
            {official.questions.map((q) => (
              <tr key={q.id}>
                <td style={{ backgroundColor: "#D9E2F3" }} className="border border-black bg-[#D9E2F3] px-2 py-1 font-medium text-[10.5px]">
                  {q.question}
                </td>
                <td className="border border-black text-center font-bold text-xs align-middle">
                  {q.answer === "SI" ? "X" : ""}
                </td>
                <td className="border border-black text-center font-bold text-xs align-middle">
                  {q.answer === "NO" ? "X" : ""}
                </td>
                <td className="border border-black px-2 py-1 text-justify text-[10px] leading-tight align-top whitespace-pre-wrap">
                  {q.comment || ""}
                </td>
              </tr>
            ))}

            {/* Fila 26: Cabecera Sección 3 */}
            <tr style={{ backgroundColor: "#D9E2F3" }} className="bg-[#D9E2F3] text-center font-bold">
              <td colSpan={4} className="border border-black py-1 uppercase text-[10px]">
                Preguntas para identificar los posibles tipos de atención requerida
              </td>
            </tr>

            {/* Fila 27: Cabecera Columnas Tipos de Atención */}
            <tr style={{ backgroundColor: "#D9E2F3" }} className="bg-[#D9E2F3] text-center font-bold">
              <td className="border border-black py-1 text-left px-2">Preguntas</td>
              <td className="border border-black py-1 w-[6%]">Sí</td>
              <td className="border border-black py-1 w-[6%]">No</td>
              <td className="border border-black py-1 w-[45%] text-left px-2">
                Detalle del tipo de intervención requerida si la respuesta es SÍ
              </td>
            </tr>

            {/* Fila 28: Atención DECE */}
            <tr>
              <td style={{ backgroundColor: "#D9E2F3" }} className="border border-black bg-[#D9E2F3] px-2 py-1 text-[10px] leading-snug">
                ¿A partir de la observación se identifica que él o la estudiante posiblemente requiere atención psicosocial de parte del Departamento de Consejería Estudiantil?
              </td>
              <td className="border border-black text-center font-bold text-xs align-middle">
                {official.care_types.requires_dece.answer === "SI" ? "X" : ""}
              </td>
              <td className="border border-black text-center font-bold text-xs align-middle">
                {official.care_types.requires_dece.answer === "NO" ? "X" : ""}
              </td>
              <td className="border border-black px-2 py-1 text-justify text-[10px] leading-tight align-top whitespace-pre-wrap">
                {official.care_types.requires_dece.detail || ""}
              </td>
            </tr>

            {/* Fila 29: Atención Distinta */}
            <tr>
              <td style={{ backgroundColor: "#D9E2F3" }} className="border border-black bg-[#D9E2F3] px-2 py-1 text-[10px] leading-snug">
                ¿A partir de la observación se identifica que él o la estudiante posiblemente requiere una atención distinta a la psicosocial?
                <div className="text-[9px] text-slate-700 italic mt-0.5">
                  Por ejemplo: evaluación psicopedagógica; valoración de lenguaje, valoración médica
                </div>
              </td>
              <td className="border border-black text-center font-bold text-xs align-middle">
                {official.care_types.requires_other.answer === "SI" ? "X" : ""}
              </td>
              <td className="border border-black text-center font-bold text-xs align-middle">
                {official.care_types.requires_other.answer === "NO" ? "X" : ""}
              </td>
              <td className="border border-black px-2 py-1 text-justify text-[10px] leading-tight align-top whitespace-pre-wrap">
                {official.care_types.requires_other.detail || ""}
              </td>
            </tr>

            {/* Fila 30: Cabecera Sección 4 */}
            <tr style={{ backgroundColor: "#D9E2F3" }} className="bg-[#D9E2F3] text-center font-bold">
              <td colSpan={4} className="border border-black py-1 uppercase text-[10px]">
                Preguntas que guían a identificar la necesidad de derivar estudiantes para la atención con otras instancias
              </td>
            </tr>

            {/* Fila 31: Cabecera Columnas Derivación */}
            <tr style={{ backgroundColor: "#D9E2F3" }} className="bg-[#D9E2F3] text-center font-bold">
              <td className="border border-black py-1 text-left px-2">Preguntas</td>
              <td className="border border-black py-1 w-[6%]">Sí</td>
              <td className="border border-black py-1 w-[6%]">No</td>
              <td className="border border-black py-1 w-[45%] text-left px-2">
                Seleccione solo cuando la respuesta sea SÍ
              </td>
            </tr>

            {/* Fila 32: Derivación Interna */}
            <tr>
              <td style={{ backgroundColor: "#D9E2F3" }} className="border border-black bg-[#D9E2F3] px-2 py-1 text-[10px] leading-snug">
                ¿Se requiere derivar al estudiante a un departamento o unidad interna a la institución educativa?
              </td>
              <td className="border border-black text-center font-bold text-xs align-middle">
                {official.referrals.internal.answer === "SI" ? "X" : ""}
              </td>
              <td className="border border-black text-center font-bold text-xs align-middle">
                {official.referrals.internal.answer === "NO" ? "X" : ""}
              </td>
              <td className="border border-black px-2 py-1 text-[10px] leading-relaxed align-top">
                <div className="flex flex-wrap gap-x-3 gap-y-1">
                  <span>Inspección ({official.referrals.internal.inspeccion ? "X" : " "})</span>
                  <span>Dpto. Inclusión ({official.referrals.internal.inclusion ? "X" : " "})</span>
                  <span>Dpto. médico ({official.referrals.internal.medico ? "X" : " "})</span>
                  <span>Otro ({official.referrals.internal.otro ? "X" : " "})</span>
                </div>
                {official.referrals.internal.otro && official.referrals.internal.otro_detail && (
                  <div className="mt-1 text-[9.5px]">
                    <span className="font-semibold">¿Cuál?: </span>
                    <span>{official.referrals.internal.otro_detail}</span>
                  </div>
                )}
              </td>
            </tr>

            {/* Fila 33: Derivación Externa */}
            <tr>
              <td style={{ backgroundColor: "#D9E2F3" }} className="border border-black bg-[#D9E2F3] px-2 py-1 text-[10px] leading-snug">
                ¿Se requiere derivar al estudiante a una entidad u organización externa a la institución educativa?
              </td>
              <td className="border border-black text-center font-bold text-xs align-middle">
                {official.referrals.external.answer === "SI" ? "X" : ""}
              </td>
              <td className="border border-black text-center font-bold text-xs align-middle">
                {official.referrals.external.answer === "NO" ? "X" : ""}
              </td>
              <td className="border border-black px-2 py-1 text-[10px] leading-relaxed align-top">
                <div className="flex flex-wrap gap-x-3 gap-y-1">
                  <span>Centro atención médica ({official.referrals.external.medica ? "X" : " "})</span>
                  <span>Centro atención psicológica ({official.referrals.external.psicologica ? "X" : " "})</span>
                  <span>UDAI ({official.referrals.external.udai ? "X" : " "})</span>
                  <span>Otro ({official.referrals.external.otro ? "X" : " "})</span>
                </div>
                {official.referrals.external.otro && official.referrals.external.otro_detail && (
                  <div className="mt-1 text-[9.5px]">
                    <span className="font-semibold">¿Cuál?: </span>
                    <span>{official.referrals.external.otro_detail}</span>
                  </div>
                )}
              </td>
            </tr>

            {/* Fila 34: Profesional y Firma */}
            <tr>
              <td colSpan={4} className="border border-black px-3 py-3 text-[10.5px]">
                <div className="mb-4">
                  <span className="font-bold">Nombre de la o el profesional DECE ({analystRole}) que realiza la observación: </span>
                  <span>{official.professional_name || professional?.name || "—"}</span>
                </div>

                <div className="flex items-end justify-between pt-4 pb-2">
                  <div>
                    <span className="font-bold">Firma de responsabilidad: </span>
                    {deceSig?.tipo === "digital" && deceSig?.firma_data_url ? (
                      <div className="inline-flex flex-col items-center align-middle ml-2">
                        <img src={deceSig.firma_data_url} alt="Firma Profesional" className="h-10 max-w-[150px] object-contain" />
                        <span className="text-[7.5px] text-slate-500 font-mono">Firma Digital Verificada</span>
                      </div>
                    ) : deceSig?.tipo === "fisica" ? (
                      <span className="inline-block border-b border-black px-2 ml-2 text-[8px] font-semibold text-amber-900">
                        [ FIRMA FÍSICA EN ARCHIVO INSTITUCIONAL ]
                      </span>
                    ) : (
                      <span className="inline-block border-b border-black w-48 ml-2"></span>
                    )}
                  </div>
                  <div>
                    <span className="font-bold">Fecha de aplicación: </span>
                    <span>{official.application_date ? formatDate(official.application_date) : formatDate(sheet.observation_date)}</span>
                  </div>
                </div>
              </td>
            </tr>

            {/* Fila 35: Confidencialidad */}
            <tr className="bg-slate-50">
              <td colSpan={4} className="border border-black px-2 py-1 text-[9px] italic text-center text-slate-700">
                *La información registrada en este documento es confidencial y de uso exclusivo del Departamento de Consejería Estudiantil.
              </td>
            </tr>
          </tbody>
        </table>

        {/* Banner de Custodia de Respaldo Físico */}
        {sheet.physical_file_ref && (
          <div className="my-3 p-2 bg-amber-50 border border-amber-300 rounded text-[9.5px] text-amber-900 flex items-center justify-between">
            <div>
              <span className="font-bold">📁 UBICACIÓN DE RESPALDO FÍSICO EN ARCHIVO INSTITUCIONAL: </span>
              <span>{sheet.physical_file_ref}</span>
            </div>
            <span className="text-[8.5px] bg-amber-200/70 border border-amber-400 px-1.5 py-0.5 rounded font-bold uppercase">
              Custodia DECE
            </span>
          </div>
        )}

        {/* Anexo de Auditoría Distrital: Respaldo Físico Escaneado */}
        {sheet.physical_evidence_url && (
          <div className="mt-4 pt-3 border-t border-dashed border-slate-300 page-break-inside-avoid">
            <div className="text-center font-bold text-[10px] text-slate-800 uppercase tracking-wide bg-slate-100 py-1 border border-slate-300 rounded mb-2">
              ANEXO DE AUDITORÍA DISTRITAL: RESPALDO FÍSICO DIGITALIZADO
            </div>
            <div className="text-[9px] text-slate-600 mb-2 italic text-center">
              Copia digitalizada de la ficha oficial de observación áulica con firma manuscrita y sellos institucionales archivados bajo custodia institucional.
            </div>
            <div className="flex justify-center border border-slate-200 p-2 bg-slate-50 rounded">
              {sheet.physical_evidence_url.startsWith("data:application/pdf") ? (
                <div className="text-center p-3 text-[10px] text-blue-700 font-semibold">
                  <span>📄 Documento PDF de Respaldo Físico Digitalizado Adjunto</span>
                </div>
              ) : (
                <img
                  src={sheet.physical_evidence_url}
                  alt="Respaldo Físico Digitalizado"
                  className="max-h-[350px] w-auto object-contain border border-slate-300 rounded shadow-xs"
                />
              )}
            </div>
          </div>
        )}

        <DocumentFooter institution={institution} />
      </div>
    </div>
  );
}
