import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { formatDate, formatDateTime } from "@/components/ui";
import type { CaseFileRow, StudentRow, ReferralRow, InstitutionRow, UserRow } from "@/lib/types";
import PrintButton from "@/components/PrintButton";
import DocumentHeader from "@/components/DocumentHeader";
import DocumentFooter from "@/components/DocumentFooter";
import { estimateReferralOverflow, REFERRAL_OVERFLOW_MESSAGE } from "@/lib/referralOverflow";

function formatStudentAge(studentAge: string | null | undefined, birthDate: string | null | undefined, refDate?: string | null): string {
  if (studentAge && studentAge.trim()) {
    const trimmed = studentAge.trim();
    return trimmed.includes("año") ? trimmed : `${trimmed} años`;
  }
  if (birthDate) {
    const b = new Date(birthDate);
    const ref = refDate ? new Date(refDate) : new Date();
    if (!isNaN(b.getTime())) {
      let age = ref.getFullYear() - b.getFullYear();
      const m = ref.getMonth() - b.getMonth();
      if (m < 0 || (m === 0 && ref.getDate() < b.getDate())) age--;
      if (age >= 0) return `${age} años`;
    }
  }
  return "—";
}

function formatCourseForReferral(st: StudentRow): string {
  const parts: string[] = [];
  if (st.course) parts.push(st.course.trim());
  if (st.parallel) parts.push(`"${st.parallel.trim().toLowerCase()}"`);
  if (st.jornada) parts.push(st.jornada.trim().toLowerCase());
  return parts.join(" ") || "—";
}

function formatGender(gender: string | null | undefined): string {
  if (!gender) return "—";
  const g = gender.trim().toLowerCase();
  if (g === "f" || g === "femenino" || g === "femenina") return "femenina";
  if (g === "m" || g === "masculino") return "masculino";
  return g;
}

function formatDisability(referralDisability: string | null | undefined, st: StudentRow): string {
  if (referralDisability && referralDisability.trim()) return referralDisability.trim();
  if (st.disability_card_detail && st.disability_card_detail.trim()) return st.disability_card_detail.trim();
  return "Ninguna";
}

// Esta ficha reproduce exactamente, celda por celda en 14 columnas, la estructura
// de la plantilla oficial ministerial "FICHA DE DERIVACIÓN.xlsx" en orientación horizontal apaisada.
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

  const deceUser = referral.created_by_id
    ? (db.prepare("SELECT * FROM users WHERE id = ?").get(referral.created_by_id) as UserRow | undefined)
    : undefined;

  const sel = referral.destination_detail;
  const cell = "border border-[#8EAADB] px-1.5 py-0.5 align-top text-black text-[9pt]";
  const labelCell = `${cell} font-bold`;
  const barBlue = "border border-[#8EAADB] bg-[#D9E2F3] text-black font-bold text-center px-1.5 py-0.5 uppercase tracking-wide text-[9.5pt]";
  const barOrange = "border border-[#8EAADB] bg-[#FBE5D6] text-black font-bold text-center px-1.5 py-0.5 uppercase tracking-wide text-[9.5pt]";
  const checkCell = "border border-[#8EAADB] text-center font-bold text-black px-0.5 py-0.5 text-[9pt]";

  const studentAgeDisplay = formatStudentAge(referral.student_age, student.birth_date, referral.referral_date);
  const birthDateDisplay = student.birth_date ? formatDate(student.birth_date) : "—";
  const courseDisplay = formatCourseForReferral(student);
  const genderDisplay = formatGender(student.gender);
  const disabilityDisplay = formatDisability(referral.student_disability, student);
  const nationalityDisplay = referral.student_nationality || student.nationality || "ecuatoriana";
  const representativeDocId = referral.representative_document_id || student.representative_document_id || "—";

  const fichaNo = caseFile.code
    ? (caseFile.code.replace(/[^0-9]/g, "").slice(-3) || caseFile.code)
    : (referral.id.length > 5 ? referral.id.slice(0, 5).toUpperCase() : referral.id);

  const deceName = (deceUser?.title_prefix ? `${deceUser.title_prefix} ` : "") + (referral.elaborated_by_name || deceUser?.name || "—");
  const deceRole = deceUser?.job_title || "ANALISTA  DECE";
  const deceDoc = deceUser?.document_id ? `C.I. ${deceUser.document_id}` : "";

  const receivedName = referral.received_by || student.representative || "—";

  const authorityName = (institution?.rector_title ? `${institution.rector_title} ` : "") + (institution?.rector_name || referral.authority_name || "—");
  const authorityRole = institution?.rector_role || "RECTOR/A DE LA INSTITUCIÓN";

  const actionsLines = referral.actions_taken
    ? referral.actions_taken
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
        .map((l) => (l.startsWith("-") ? l : `- ${l.replace(/^(\d+[\.\)]|[•\*\+])\s*/, "")}`))
    : [];

  const obsLines = referral.observations
    ? referral.observations
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
        .map((l) => (l.startsWith("•") ? l : `• ${l.replace(/^(\d+[\.\)]|[\*\-\+])\s*/, "")}`))
    : [];

  const overflow = estimateReferralOverflow({
    current_situation_history: referral.current_situation_history,
    background_summary: referral.background_summary,
    actions_taken: referral.actions_taken,
    care_type_required: referral.care_type_required,
    observations: referral.observations,
    student_address: student.address,
  });

  return (
    <div className="w-[27.7cm] max-w-full mx-auto bg-white">
      {/* Orientación horizontal oficial A4 apaisada */}
      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 1.2cm; }
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

      {overflow.overflow && (
        <div className="no-print mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-xs text-amber-900 flex items-start gap-2">
          <span className="text-base leading-none">⚠️</span>
          <div>
            <p className="font-semibold">{REFERRAL_OVERFLOW_MESSAGE}</p>
            <p className="mt-0.5 text-amber-700">
              Estimado: ~{overflow.linesOver} línea(s) de más. Usa el botón ✏️ Editar para acortar los textos.
            </p>
          </div>
        </div>
      )}

      <div id="printable-content" className="p-4 print:p-0 text-[9pt] leading-tight text-black">
        <DocumentHeader
          title="Ficha de Derivación"
          subtitle="Departamento de Consejería Estudiantil — DECE"
          institutionName={institution.name}
          sealImage={institution.seal_image}
          compact
        />

        <table
          className="w-full border-collapse mt-2 border border-[#8EAADB] text-[9pt] leading-tight"
          style={{ tableLayout: "fixed", wordBreak: "break-word" }}
        >
          <colgroup>
            <col style={{ width: "6.27%" }} />
            <col style={{ width: "6.27%" }} />
            <col style={{ width: "6.27%" }} />
            <col style={{ width: "6.27%" }} />
            <col style={{ width: "0.63%" }} />
            <col style={{ width: "6.89%" }} />
            <col style={{ width: "3.34%" }} />
            <col style={{ width: "6.05%" }} />
            <col style={{ width: "8.56%" }} />
            <col style={{ width: "12.18%" }} />
            <col style={{ width: "7.16%" }} />
            <col style={{ width: "4.04%" }} />
            <col style={{ width: "6.27%" }} />
            <col style={{ width: "19.81%" }} />
          </colgroup>
          <tbody>
            {/* 1. Título */}
            <tr>
              <td colSpan={14} className={barBlue}>FICHA DE DERIVACIÓN</td>
            </tr>

            {/* 2. Datos institucionales */}
            <tr>
              <td colSpan={14} className={barBlue}>DATOS INSTITUCIONALES</td>
            </tr>
            <tr>
              <td colSpan={8} className={labelCell}>
                Nombre de la institución educativa:&nbsp;&nbsp;&nbsp;
                <span className="font-bold">{institution?.name || "—"}</span>
              </td>
              <td colSpan={6} className={labelCell}>
                &nbsp;{referral.district_office_label || institution?.district || "—"}
              </td>
            </tr>
            <tr>
              <td colSpan={14} className={cell}>
                <span className="font-bold">Dirección de la institución: </span>
                {institution?.address || "—"}
                <span className="inline-block w-20 print:w-28" />
                <span className="font-bold">Teléfono: </span>
                {institution?.institution_phone || "—"}
              </td>
            </tr>
            <tr>
              <td colSpan={8} className={cell}>
                <span className="font-bold">Fecha de derivación: </span>
                {formatDate(referral.referral_date)}
              </td>
              <td colSpan={6} className={`${cell} text-blue-600 font-bold`}>
                &nbsp;Ficha No.: {fichaNo}
              </td>
            </tr>

            {/* 3. INTERNA */}
            <tr>
              <td colSpan={14} className={barBlue}>INTERNA<br />Marque con una X</td>
            </tr>
            <tr>
              <td colSpan={6} className={barBlue}>INTERNA A LA INSTITUCIÓN EDUCATIVA</td>
              <td colSpan={8} className={barBlue}>INTERNA AL MINISTERIO DE EDUCACIÓN</td>
            </tr>
            <tr>
              <td colSpan={5} className={labelCell}>Departamento de Inclusión Educativa:</td>
              <td colSpan={1} className={checkCell}>{sel === "DEPARTAMENTO_INCLUSION" ? "X" : ""}</td>
              <td colSpan={5} rowSpan={2} className={labelCell}>Unidad Distrital de Apoyo a la Inclusión (UDAI):</td>
              <td colSpan={1} rowSpan={2} className={checkCell}>{sel === "UDAI" ? "X" : ""}</td>
              <td colSpan={2} rowSpan={2} className={cell}>{sel === "UDAI" ? (referral.institution || "") : ""}</td>
            </tr>
            <tr>
              <td colSpan={5} className={labelCell}>Docente de apoyo a la inclusión:</td>
              <td colSpan={1} className={checkCell}>{sel === "DOCENTE_APOYO_INCLUSION" ? "X" : ""}</td>
            </tr>
            <tr>
              <td colSpan={5} className={labelCell}>Rectorado / Vicerrectorado:</td>
              <td colSpan={1} className={checkCell}>{sel === "RECTORADO_VICERRECTORADO" ? "X" : ""}</td>
              <td colSpan={5} className={labelCell}>Dirección Distrital de Educación:</td>
              <td colSpan={1} className={checkCell}>{sel === "DIRECCION_DISTRITAL" ? "X" : ""}</td>
              <td colSpan={2} className={cell}>{sel === "DIRECCION_DISTRITAL" ? (referral.institution || "") : ""}</td>
            </tr>
            <tr>
              <td colSpan={5} className={labelCell}>Inspección:</td>
              <td colSpan={1} className={checkCell}>{sel === "INSPECCION" ? "X" : ""}</td>
              <td colSpan={5} rowSpan={2} className={labelCell}>Otro (indique):</td>
              <td colSpan={1} rowSpan={2} className={checkCell}>{sel === "OTRO_INTERNA_MINEDUC" ? "X" : ""}</td>
              <td colSpan={2} rowSpan={2} className={cell}>{sel === "OTRO_INTERNA_MINEDUC" ? (referral.institution || "") : ""}</td>
            </tr>
            <tr>
              <td colSpan={5} className={labelCell}>Otro (indique):</td>
              <td colSpan={1} className={checkCell}>{sel === "OTRO_INTERNA_IE" ? "X" : ""}</td>
            </tr>

            {/* 4. EXTERNA */}
            <tr>
              <td colSpan={14} className={barBlue}>EXTERNA<br />Marque con una X</td>
            </tr>
            <tr>
              <td colSpan={14} className={barBlue}>EXTERNA AL MINISTERIO DE EDUCACIÓN</td>
            </tr>
            <tr>
              <td colSpan={6} className={labelCell}>Unidades especializadas de la policía:</td>
              <td colSpan={1} className={checkCell}>{sel === "POLICIA_ESPECIALIZADA" ? "X" : ""}</td>
              <td colSpan={4} className={labelCell}>Ministerio de Inclusión Económica y Social:</td>
              <td colSpan={1} className={checkCell}>{sel === "MIES" ? "X" : ""}</td>
              <td colSpan={2} className={cell}>{sel === "MIES" ? (referral.institution || "") : ""}</td>
            </tr>
            <tr>
              <td colSpan={6} className={labelCell}>
                Establecimiento de salud pública: {sel === "SALUD_PUBLICA" && referral.institution ? `(${referral.institution})` : ""}
              </td>
              <td colSpan={1} className={checkCell}>{sel === "SALUD_PUBLICA" ? "X" : ""}</td>
              <td colSpan={4} className={labelCell}>Ministerio de la mujer y derechos humanos:</td>
              <td colSpan={1} className={checkCell}>{sel === "MINISTERIO_MUJER_DDHH" ? "X" : ""}</td>
              <td colSpan={2} className={cell}>{sel === "MINISTERIO_MUJER_DDHH" ? (referral.institution || "") : ""}</td>
            </tr>
            <tr>
              <td colSpan={6} className={labelCell}>
                Establecimiento de salud privada: {sel === "SALUD_PRIVADA" && referral.institution ? `(${referral.institution})` : ""}
              </td>
              <td colSpan={1} className={checkCell}>{sel === "SALUD_PRIVADA" ? "X" : ""}</td>
              <td colSpan={7} className={cell}>
                <span className="font-bold">Otro (indique): </span>
                {sel === "OTRO_EXTERNA" ? `[X] ${referral.institution || ""}` : ""}
              </td>
            </tr>

            {/* 5. DATOS PERSONALES DEL ESTUDIANTE */}
            <tr>
              <td colSpan={14} className={barOrange}>DATOS PERSONALES DEL O LA ESTUDIANTE QUE SE DERIVA</td>
            </tr>
            <tr>
              <td colSpan={14} className={cell}>
                <span className="font-bold">Apellidos y Nombres completos: </span>
                <span className="font-bold uppercase">{student.full_name}</span>
              </td>
            </tr>
            <tr>
              <td colSpan={1} className={labelCell}>Edad:</td>
              <td colSpan={1} className={cell}>{studentAgeDisplay}</td>
              <td colSpan={3} className={labelCell}>Fecha de nacimiento:</td>
              <td colSpan={3} className={cell}>{birthDateDisplay}</td>
              <td colSpan={1} className={labelCell}>Grado/curso:</td>
              <td colSpan={2} className={cell}>{courseDisplay}</td>
              <td colSpan={2} className={labelCell}>Género:</td>
              <td colSpan={1} className={cell}>{genderDisplay}</td>
            </tr>
            <tr>
              <td colSpan={3} className={labelCell}>N° documento identidad:</td>
              <td colSpan={8} className={cell}>{student.document_id || "—"}</td>
              <td colSpan={2} className={labelCell}>Discapacidad:</td>
              <td colSpan={1} className={cell}>{disabilityDisplay}</td>
            </tr>
            <tr>
              <td colSpan={14} className={cell}>
                <span className="font-bold">Dirección domiciliaria: </span>
                {student.address || "—"}
              </td>
            </tr>
            <tr>
              <td colSpan={10} className={cell}>
                <span className="font-bold">Nacionalidad: </span>
                {nationalityDisplay}
              </td>
              <td colSpan={3} className={labelCell}>N° contacto telefónico</td>
              <td colSpan={1} className={cell}>{student.rep_phone || "—"}</td>
            </tr>
            <tr>
              <td colSpan={10} className={cell}>
                <span className="font-bold">Nombre de representante: </span>
                {student.representative || "—"}
              </td>
              <td colSpan={3} className={labelCell}>N° documento identidad:</td>
              <td colSpan={1} className={cell}>{representativeDocId}</td>
            </tr>

            {/* 6. MOTIVO DE REFERENCIA */}
            <tr>
              <td colSpan={14} className={barOrange}>MOTIVO DE REFERENCIA</td>
            </tr>
            <tr>
              <td colSpan={14} className={cell}>
                <span className="font-bold">Historia de la situación actual: </span>
                <span className="font-normal whitespace-pre-wrap">{referral.current_situation_history || referral.background_summary || referral.reason || "—"}</span>
              </td>
            </tr>
            <tr>
              <td colSpan={14} className={cell}>
                <span className="font-bold">Acciones desarrolladas: </span>
                {/* En línea seguida (no una debajo de otra) para ahorrar alto */}
                <span className="font-normal whitespace-pre-wrap">
                  {actionsLines.length > 0 ? actionsLines.join("   ") : "—"}
                </span>
              </td>
            </tr>
            <tr>
              <td colSpan={14} className={cell}>
                <span className="font-bold">Tipo de atención que se requiere de parte de la entidad interna/externa:&nbsp;&nbsp;&nbsp;</span>
                <span className="font-normal whitespace-pre-wrap">{referral.care_type_required || "—"}</span>
              </td>
            </tr>
            <tr>
              <td colSpan={14} className={cell}>
                <span className="font-bold">Observaciones: </span>
                {/* En línea seguida (no una debajo de otra) para ahorrar alto */}
                <span className="font-normal whitespace-pre-wrap">
                  {obsLines.length > 0 ? obsLines.join("     ") : "—"}
                </span>
              </td>
            </tr>

            {/* 7. FIRMAS */}
            <tr>
              <td colSpan={5} className="border border-[#8EAADB] font-bold text-center px-1.5 py-1 text-black uppercase text-[9pt]">FICHA ELABORADA POR:</td>
              <td colSpan={5} className="border border-[#8EAADB] font-bold text-center px-1.5 py-1 text-black uppercase text-[9pt]">RECIBIDO POR</td>
              <td colSpan={4} className="border border-[#8EAADB] font-bold text-center px-1.5 py-1 text-black uppercase text-[9pt]">AUTORIDAD INSTITUCIONAL</td>
            </tr>
            <tr className="text-center">
              <td colSpan={5} className={cell}>
                <div className="h-10 print:h-12" />
                <div className="font-bold text-[9.5pt]">{deceName}</div>
                <div className="text-[8pt] uppercase text-slate-700">{deceRole}</div>
                {deceDoc && <div className="text-[7.5pt] text-slate-600">{deceDoc}</div>}
              </td>
              <td colSpan={5} className={cell}>
                <div className="h-10 print:h-12" />
                <div className="text-slate-400 text-xs">..............................................................</div>
                <div className="font-bold text-[9.5pt]">{receivedName}</div>
                <div className="text-[8pt] text-slate-700">Representante legal</div>
              </td>
              <td colSpan={4} className={cell}>
                <div className="h-10 print:h-12" />
                <div className="font-bold text-[9.5pt]">{authorityName}</div>
                <div className="text-[8pt] uppercase text-slate-700">{authorityRole}</div>
              </td>
            </tr>
            <tr>
              <td colSpan={5} className={`${cell} font-bold text-[8.5pt]`}>Fecha: …......................................................</td>
              <td colSpan={5} className={`${cell} font-bold text-[8.5pt]`}>Fecha: …......................................................</td>
              <td colSpan={4} className={`${cell} font-bold text-[8.5pt]`}>Fecha: …......................................................</td>
            </tr>

            {/* 8. Nota legal */}
            <tr>
              <td colSpan={14} className="border border-[#8EAADB] p-1.5 text-[7.5pt] font-bold text-black text-center leading-tight uppercase">
                ES RESPONSABILIDAD DEL REPRESENTANTE LEGAL AGENDAR LOS TURNOS NECESARIOS EN EL MSP 171 O IESS U OTRO PROFESIONAL EN SALUD Y/O SALUD MENTAL<br />
                TIENE 15 DIAS A PARTIR DE LA FECHA PARA PRESENTAR EL CERTIFICADO CORRESPONDIENTE O DOCUMENTO DE RESPALDO EN EL DEPARTAMENTO DE CONSEJERÍA ESTUDIANTIL PARA SEGUIMIENTO DEL CASO
              </td>
            </tr>
          </tbody>
        </table>

        <DocumentFooter institution={institution} />
      </div>
    </div>
  );
}
