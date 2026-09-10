import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { formatDate, formatDateTime } from "@/components/ui";
import type { CaseFileRow, StudentRow, ReferralRow, InstitutionRow } from "@/lib/types";
import { DESTINATION_OPTIONS, type DestinationOption } from "@/lib/referral";
import PrintButton from "@/components/PrintButton";
import DocumentHeader from "@/components/DocumentHeader";
import DocumentFooter from "@/components/DocumentFooter";

// Sublista de un grupo de destino: cada entrada se marca con ☑/☐ según el
// destino elegido, y va acompañada de una línea en blanco para anotar quién
// recibe — igual que en la plantilla oficial (FICHA DE DERIVACIÓN.xlsx).
function DestinationList({ group, selected }: { group: DestinationOption["group"]; selected: string | null }) {
  return (
    <ul className="space-y-1">
      {DESTINATION_OPTIONS.filter((o) => o.group === group).map((o) => (
        <li key={o.value} className="flex items-start gap-1">
          <span className="w-3 shrink-0">{selected === o.value ? "☑" : "☐"}</span>
          <span className={selected === o.value ? "font-medium" : ""}>{o.label}:</span>
        </li>
      ))}
    </ul>
  );
}

// Esta ficha reproduce, celda por celda, la posición exacta de la plantilla
// oficial "FICHA DE DERIVACIÓN.xlsx" (hoja horizontal, una sola página):
// DATOS INSTITUCIONALES → INTERNA (2 columnas) → EXTERNA (2 columnas) →
// DATOS PERSONALES DEL/LA ESTUDIANTE → MOTIVO DE REFERENCIA → firmas.
export default async function ImprimirDerivacionPage({ params }: { params: { id: string; referralId: string } }) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  const caseFile = db
    .prepare("SELECT * FROM case_files WHERE id = ? AND institution_id = ?")
    .get(params.id, institutionId) as CaseFileRow | undefined;
  if (!caseFile) notFound();

  const referral = db
    .prepare("SELECT * FROM referrals WHERE id = ? AND case_file_id = ?")
    .get(params.referralId, caseFile.id) as ReferralRow | undefined;
  if (!referral) notFound();

  const student = db.prepare("SELECT * FROM students WHERE id = ?").get(caseFile.student_id) as StudentRow;
  const institution = db.prepare("SELECT * FROM institutions WHERE id = ?").get(institutionId) as InstitutionRow;

  const sel = referral.destination_detail;
  const cell = "border border-[#8EAADB] px-1.5 py-1 align-top text-black";
  const labelCell = `${cell} font-bold text-black`;
  const barBlue = "border border-[#8EAADB] bg-[#D9E2F3] text-black font-bold text-center px-1.5 py-1 uppercase tracking-wide";
  const barOrange = "border border-[#8EAADB] bg-[#FBE5D6] text-black font-bold text-center px-1.5 py-1 uppercase tracking-wide";

  return (
    <div className="w-[27.7cm] max-w-full mx-auto bg-white">
      {/* Orientación horizontal oficial A4 apaisada */}
      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 1.5cm; }
        }
      `}</style>
      {/* Barra superior de impresión */}
      <div className="no-print p-3 bg-slate-100 border-b border-slate-200 flex items-center justify-between mb-4 rounded-lg">
        <Link
          href={`/casos/${caseFile.id}`}
          className="text-xs text-slate-600 hover:text-slate-900 font-semibold"
        >
          ← Volver al caso
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href={`/casos/${caseFile.id}/derivaciones/${referral.id}/editar`}
            className="text-xs bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors"
          >
            ✏️ Editar
          </Link>
          <a
            href={`/api/casos/${caseFile.id}/derivaciones/${referral.id}/export-word`}
            className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold px-3 py-1.5 rounded-md flex items-center gap-1.5 shadow-xs transition-colors"
          >
            📥 Descargar Word (.docx)
          </a>
          <PrintButton hideWordButton={true} className="p-0 bg-transparent border-none" />
        </div>
      </div>
      <div id="printable-content" className="p-6 print:p-0 text-[9px] leading-tight text-black">
        <DocumentHeader
          title="Ficha de Derivación"
          subtitle="Departamento de Consejería Estudiantil — DECE"
          institutionName={institution.name}
          sealImage={institution.seal_image}
          compact
        />

        <table className="w-full border-collapse mt-2 border border-[#8EAADB]">
          <tbody>
            <tr>
              <td colSpan={6} className={barBlue}>FICHA DE DERIVACIÓN</td>
            </tr>
            <tr>
              <td colSpan={6} className={barBlue}>Datos institucionales</td>
            </tr>
            <tr>
              <td className={labelCell} colSpan={2}>Nombre de la institución educativa</td>
              <td className={cell} colSpan={2}>{institution.name}</td>
              <td className={labelCell} colSpan={1}>Dirección distrital</td>
              <td className={cell} colSpan={1}>{referral.district_office_label || institution.district || "—"}</td>
            </tr>
            <tr>
              <td className={labelCell} colSpan={2}>Dirección de la institución</td>
              <td className={cell} colSpan={2}>{institution.address || "—"}</td>
              <td className={labelCell}>Teléfono</td>
              <td className={cell}>—</td>
            </tr>
            <tr>
              <td className={labelCell} colSpan={2}>Fecha de derivación</td>
              <td className={cell} colSpan={4}>{formatDate(referral.referral_date)}</td>
            </tr>

            <tr>
              <td colSpan={6} className={barBlue}>Interna — marque con una X</td>
            </tr>
            <tr>
              <td className={barBlue} colSpan={3}>Interna a la institución educativa</td>
              <td className={barBlue} colSpan={3}>Interna al Ministerio de Educación</td>
            </tr>
            <tr>
              <td className={cell} colSpan={3}>
                <DestinationList group="INTERNA_IE" selected={sel} />
              </td>
              <td className={cell} colSpan={3}>
                <DestinationList group="INTERNA_MINEDUC" selected={sel} />
              </td>
            </tr>

            <tr>
              <td colSpan={6} className={barBlue}>Externa — marque con una X</td>
            </tr>
            <tr>
              <td colSpan={6} className={barBlue}>Externa al Ministerio de Educación</td>
            </tr>
            <tr>
              <td className={cell} colSpan={3}>
                <ul className="space-y-1">
                  {DESTINATION_OPTIONS.filter((o) => ["POLICIA_ESPECIALIZADA", "SALUD_PUBLICA", "SALUD_PRIVADA"].includes(o.value)).map((o) => (
                    <li key={o.value} className="flex items-start gap-1">
                      <span className="w-3 shrink-0">{sel === o.value ? "☑" : "☐"}</span>
                      <span className={sel === o.value ? "font-medium" : ""}>{o.label}:</span>
                    </li>
                  ))}
                </ul>
              </td>
              <td className={cell} colSpan={3}>
                <ul className="space-y-1">
                  {DESTINATION_OPTIONS.filter((o) => ["MIES", "MINISTERIO_MUJER_DDHH", "OTRO_EXTERNA"].includes(o.value)).map((o) => (
                    <li key={o.value} className="flex items-start gap-1">
                      <span className="w-3 shrink-0">{sel === o.value ? "☑" : "☐"}</span>
                      <span className={sel === o.value ? "font-medium" : ""}>{o.label}:</span>
                    </li>
                  ))}
                </ul>
              </td>
            </tr>
            <tr>
              <td className={labelCell} colSpan={1}>Entidad específica</td>
              <td className={cell} colSpan={5}>{referral.institution}</td>
            </tr>

            <tr>
              <td colSpan={6} className={barOrange}>Datos personales del o la estudiante que se deriva</td>
            </tr>
            <tr>
              <td className={labelCell} colSpan={1}>Apellidos y nombres completos</td>
              <td className={cell} colSpan={5}>{student.full_name}</td>
            </tr>
            <tr>
              <td className={labelCell}>Edad</td>
              <td className={cell}>{referral.student_age || "—"}</td>
              <td className={labelCell}>Fecha de nacimiento</td>
              <td className={cell}>{student.birth_date ? formatDate(student.birth_date) : "—"}</td>
              <td className={labelCell}>Grado/curso</td>
              <td className={cell}>{student.course} {student.parallel || ""}</td>
            </tr>
            <tr>
              <td className={labelCell}>Género</td>
              <td className={cell}>{student.gender || "—"}</td>
              <td className={labelCell}>N° documento identidad</td>
              <td className={cell}>{student.document_id || "—"}</td>
              <td className={labelCell}>Discapacidad</td>
              <td className={cell}>{referral.student_disability || "—"}</td>
            </tr>
            <tr>
              <td className={labelCell} colSpan={1}>Dirección domiciliaria</td>
              <td className={cell} colSpan={5}>{student.address || "—"}</td>
            </tr>
            <tr>
              <td className={labelCell}>Nacionalidad</td>
              <td className={cell}>{referral.student_nationality || "—"}</td>
              <td className={labelCell}>N° contacto telefónico</td>
              <td className={cell} colSpan={3}>{student.rep_phone || "—"}</td>
            </tr>
            <tr>
              <td className={labelCell}>Nombre de representante</td>
              <td className={cell}>{student.representative || "—"}</td>
              <td className={labelCell}>N° documento identidad</td>
              <td className={cell} colSpan={3}>{referral.representative_document_id || "—"}</td>
            </tr>

            <tr>
              <td colSpan={6} className={barOrange}>Motivo de referencia</td>
            </tr>
            <tr>
              <td className={labelCell} colSpan={1}>Historia de la situación actual</td>
              <td className={cell} colSpan={5}><p className="whitespace-pre-wrap font-normal">{referral.background_summary || referral.reason || "—"}</p></td>
            </tr>
            <tr>
              <td className={labelCell} colSpan={1}>Acciones desarrolladas</td>
              <td className={cell} colSpan={5}>
                <div className="whitespace-pre-wrap font-normal">
                  {referral.actions_taken
                    ? referral.actions_taken
                        .split("\n")
                        .map((line) => line.trim())
                        .filter(Boolean)
                        .map((line, idx) => (
                          <div key={idx}>{line.startsWith("-") ? line : `- ${line.replace(/^(\d+[\.\)]|[•\*\+])\s*/, "")}`}</div>
                        ))
                    : "—"}
                </div>
              </td>
            </tr>
            <tr>
              <td className={labelCell} colSpan={1}>Tipo de atención que se requiere</td>
              <td className={cell} colSpan={5}><p className="whitespace-pre-wrap font-normal">{referral.care_type_required || "—"}</p></td>
            </tr>
            <tr>
              <td className={labelCell} colSpan={1}>Observaciones</td>
              <td className={cell} colSpan={5}><p className="whitespace-pre-wrap font-normal">{referral.observations || "—"}</p></td>
            </tr>
          </tbody>
        </table>

        <p className="text-[8px] text-slate-700 italic mt-2 border border-[#8EAADB] p-1.5">
          Es responsabilidad del representante legal agendar los turnos necesarios en el MSP 171, IESS u otro profesional
          en salud y/o salud mental. Tiene 15 días a partir de la fecha para presentar el certificado correspondiente o
          documento de respaldo en el Departamento de Consejería Estudiantil para seguimiento del caso.
        </p>

        <table className="w-full border-collapse mt-3 border border-[#8EAADB]">
          <tbody>
            <tr>
              <td className="border border-[#8EAADB] font-bold text-center px-1.5 py-1 text-black uppercase" colSpan={2}>Ficha elaborada por</td>
              <td className="border border-[#8EAADB] font-bold text-center px-1.5 py-1 text-black uppercase" colSpan={2}>Recibido por</td>
              <td className="border border-[#8EAADB] font-bold text-center px-1.5 py-1 text-black uppercase" colSpan={2}>Autoridad institucional</td>
            </tr>
            <tr className="text-center">
              <td className={cell} colSpan={2}>
                <div className="h-8" />
                <div className="border-t border-[#8EAADB] pt-1 font-bold">{referral.elaborated_by_name || "—"}<br /><span className="text-slate-500 font-normal">Coordinador/a DECE</span></div>
              </td>
              <td className={cell} colSpan={2}>
                <div className="h-8" />
                <div className="border-t border-[#8EAADB] pt-1 font-bold">{referral.received_by || "—"}<br /><span className="text-slate-500 font-normal">Representante legal</span></div>
              </td>
              <td className={cell} colSpan={2}>
                <div className="h-8" />
                <div className="border-t border-[#8EAADB] pt-1 font-bold">{referral.authority_name || "—"}<br /><span className="text-slate-500 font-normal">Rector/a</span></div>
              </td>
            </tr>
          </tbody>
        </table>

        <DocumentFooter institution={institution} />
      </div>
    </div>
  );
}
