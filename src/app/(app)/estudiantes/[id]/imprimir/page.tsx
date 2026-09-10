import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole, requireInstitutionId } from "@/lib/session";
import type { StudentRow, InstitutionRow } from "@/lib/types";
import {
  LIVES_WITH_OPTIONS,
  LEGAL_GUARDIAN_OPTIONS,
  NEE_TYPE_OPTIONS,
  EDUCATION_LEVEL_LABELS,
  parseJsonArray,
  computeAge,
  currentSchoolYearLabel,
} from "@/lib/student";
import PrintButton from "@/components/PrintButton";
import DocumentHeader from "@/components/DocumentHeader";
import DocumentFooter from "@/components/DocumentFooter";

function chk(active: boolean) {
  return active ? "☑" : "☐";
}

function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

// Esta ficha reproduce, campo por campo, la plantilla oficial de la
// institución "FICHA PERSONAL DEL ESTUDIANTE" (FICHA ESTUDIANTE-2025.docx):
// 1. Datos del estudiante → 2. Datos familiares → 3. Necesidad educativa
// específica → 4. Datos médicos → Autorización de salida sola/o.
export default async function ImprimirFichaEstudiantePage({ params }: { params: { id: string } }) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);

  const student = db
    .prepare("SELECT * FROM students WHERE id = ? AND institution_id = ?")
    .get(params.id, institutionId) as StudentRow | undefined;
  if (!student) notFound();

  const institution = db.prepare("SELECT * FROM institutions WHERE id = ?").get(institutionId) as InstitutionRow;

  const neeTypes = parseJsonArray<string>(student.nee_types);
  const age = computeAge(student.birth_date);

  let day = "",
    month = "",
    year = "";
  if (student.birth_date) {
    const d = new Date(student.birth_date);
    if (!Number.isNaN(d.getTime())) {
      day = String(d.getDate()).padStart(2, "0");
      month = String(d.getMonth() + 1).padStart(2, "0");
      year = String(d.getFullYear());
    }
  }

  const nat = student.nationality ? normalize(student.nationality) : "";
  const natEcuatoriana = nat === "" ? false : nat.includes("ecuator");
  const natColombiana = nat.includes("colomb");
  const natVenezolana = nat.includes("venezol");
  const natEstadounidense = nat.includes("estadounidense") || nat.includes("eeuu") || nat.includes("unidos");
  const natOtra = Boolean(student.nationality) && !natEcuatoriana && !natColombiana && !natVenezolana && !natEstadounidense;

  // Quién firma como padre/madre/representante legal en la autorización de salida,
  // según quién quedó marcado como representante legal (ver sección "Datos familiares").
  let authName = student.representative || "";
  let authDoc = student.representative_document_id || "";
  if (student.legal_guardian === "PADRE" && student.father_name) {
    authName = student.father_name;
    authDoc = student.father_document_id || "";
  } else if (student.legal_guardian === "MADRE" && student.mother_name) {
    authName = student.mother_name;
    authDoc = student.mother_document_id || "";
  }

  const cell = "border border-[#2F5496]/50 px-2 py-1.5 align-top";
  const labelCell = `${cell} font-semibold bg-[#F0F4F8] text-slate-800`;
  const barCell = "border border-[#2F5496] bg-[#2F5496] text-white uppercase font-bold px-2 py-1.5 tracking-wide";

  const familyRows: { label: string; father: string; mother: string; rep: string }[] = [
    { label: "Nombres y apellidos", father: student.father_name || "", mother: student.mother_name || "", rep: student.representative || "" },
    { label: "Cédula de identidad", father: student.father_document_id || "", mother: student.mother_document_id || "", rep: student.representative_document_id || "" },
    { label: "Instrucción", father: student.father_education || "", mother: student.mother_education || "", rep: student.representative_education || "" },
    { label: "Domicilio", father: student.father_address || "", mother: student.mother_address || "", rep: student.representative_address || "" },
    { label: "Teléfono / celular", father: student.father_phone || "", mother: student.mother_phone || "", rep: student.rep_phone || "" },
    { label: "Profesión u ocupación", father: student.father_occupation || "", mother: student.mother_occupation || "", rep: student.representative_occupation || "" },
    { label: "Lugar del trabajo", father: student.father_workplace || "", mother: student.mother_workplace || "", rep: student.representative_workplace || "" },
  ];

  return (
    <div className="max-w-[900px] mx-auto bg-white">
      <PrintButton fileNamePrefix={`ficha-estudiante-${student.full_name.replace(/\s+/g, "-").toLowerCase()}`} />
      <div id="printable-content" className="p-6 print:p-0 text-[11px] leading-snug">
        <DocumentHeader
          title="Ficha personal del estudiante"
          subtitle="Departamento de Consejería Estudiantil — DECE"
          institutionName={institution.name}
          sealImage={institution.seal_image}
        />

        <table className="w-full border-collapse mt-2">
          <tbody>
            <tr>
              <td colSpan={4} className={barCell}>1.- Datos del estudiante</td>
            </tr>
            <tr>
              <td className={labelCell}>Apellidos y nombres</td>
              <td className={cell} colSpan={3}>{student.full_name}</td>
            </tr>
            <tr>
              <td className={labelCell}>Grado / curso</td>
              <td className={cell}>{student.course}</td>
              <td className={labelCell}>Paralelo</td>
              <td className={cell}>{student.parallel || "—"}</td>
            </tr>
            <tr>
              <td className={labelCell}>Jornada</td>
              <td className={cell}>{student.jornada ? student.jornada.charAt(0) + student.jornada.slice(1).toLowerCase() : "—"}</td>
              <td className={labelCell}>Año lectivo</td>
              <td className={cell}>{currentSchoolYearLabel()}</td>
            </tr>
            <tr>
              <td className={labelCell}>Nivel educativo</td>
              <td className={cell}>{student.education_level ? EDUCATION_LEVEL_LABELS[student.education_level] || student.education_level : "—"}</td>
              <td className={labelCell}>Especialidad de bachillerato</td>
              <td className={cell}>{student.bachillerato_specialty || (student.education_level === "BACHILLERATO" ? "—" : "N/A")}</td>
            </tr>
            <tr>
              <td className={labelCell} colSpan={4}>Lugar de nacimiento</td>
            </tr>
            <tr>
              <td className={labelCell}>País</td>
              <td className={cell}>{student.birth_country || "—"}</td>
              <td className={labelCell}>Provincia</td>
              <td className={cell}>{student.birth_province || "—"}</td>
            </tr>
            <tr>
              <td className={labelCell}>Cantón</td>
              <td className={cell}>{student.birth_canton || "—"}</td>
              <td className={labelCell}>Parroquia</td>
              <td className={cell}>{student.birth_parish || "—"}</td>
            </tr>
            <tr>
              <td className={labelCell}>Fecha de nacimiento</td>
              <td className={cell}>{day && month && year ? `${day}/${month}/${year}` : "—"}</td>
              <td className={labelCell}>
                {student.document_type === "PASAPORTE"
                  ? "N° de pasaporte"
                  : student.document_type === "OTRO"
                  ? "N° de documento"
                  : "N° de cédula"}
              </td>
              <td className={cell}>{student.document_id || "—"}</td>
            </tr>
            <tr>
              <td className={labelCell}>Años cumplidos</td>
              <td className={cell}>{age ?? "—"}</td>
              <td className={labelCell}>Género</td>
              <td className={cell}>{student.gender || "—"}</td>
            </tr>
            <tr>
              <td className={labelCell} colSpan={4}>Nacionalidad</td>
            </tr>
            <tr>
              <td className={cell} colSpan={4}>
                {chk(natEcuatoriana)} Ecuatoriana&nbsp;&nbsp;&nbsp;
                {chk(natColombiana)} Extranjera colombiana&nbsp;&nbsp;&nbsp;
                {chk(natVenezolana)} Extranjera venezolana&nbsp;&nbsp;&nbsp;
                {chk(natEstadounidense)} Extranjera estadounidense&nbsp;&nbsp;&nbsp;
                {chk(natOtra)} Otra: {natOtra ? student.nationality : "____________________"}
              </td>
            </tr>
            <tr>
              <td className={labelCell}>Dirección</td>
              <td className={cell} colSpan={3}>{student.address || "—"}</td>
            </tr>
            <tr>
              <td className={labelCell}>Barrio o caserío</td>
              <td className={cell} colSpan={3}>{student.neighborhood || "—"}</td>
            </tr>
            <tr>
              <td className={labelCell} colSpan={4}>El estudiante vive con</td>
            </tr>
            <tr>
              <td className={cell} colSpan={4}>
                {LIVES_WITH_OPTIONS.map((o) => (
                  <span key={o.value} className="mr-4 inline-block">
                    {chk(student.lives_with === o.value)} {o.label}
                  </span>
                ))}
                <span className="inline-block">
                  {student.lives_with === "OTRO" ? `— ${student.lives_with_other || ""}` : ""}
                </span>
              </td>
            </tr>

            <tr>
              <td colSpan={4} className={barCell}>2.- Datos familiares del estudiante</td>
            </tr>
            <tr>
              <td className={`${cell} text-slate-500`} colSpan={4}>
                Marcado con X quién es el representante legal del estudiante. Si no es papá ni mamá, se completa además la
                columna "Representante".
              </td>
            </tr>
            <tr>
              <td className={labelCell}>Datos</td>
              <td className={`${labelCell} text-center`}>{chk(student.legal_guardian === "PADRE")} Padre</td>
              <td className={`${labelCell} text-center`}>{chk(student.legal_guardian === "MADRE")} Madre</td>
              <td className={`${labelCell} text-center`}>{chk(student.legal_guardian === "REPRESENTANTE")} Representante</td>
            </tr>
            {familyRows.map((r) => (
              <tr key={r.label}>
                <td className={labelCell}>{r.label}</td>
                <td className={cell}>{r.father || "—"}</td>
                <td className={cell}>{r.mother || "—"}</td>
                <td className={cell}>{r.rep || "—"}</td>
              </tr>
            ))}

            <tr>
              <td colSpan={4} className={barCell}>3.- Necesidad educativa específica del estudiante</td>
            </tr>
            <tr>
              <td className={cell} colSpan={4}>
                {NEE_TYPE_OPTIONS.map((o) => (
                  <span key={o.value} className="mr-4 inline-block">
                    {chk(neeTypes.includes(o.value))} {o.label}
                  </span>
                ))}
              </td>
            </tr>
            <tr>
              <td className={labelCell} colSpan={4}>En caso de poseer carnet de discapacidad, detallar aquí</td>
            </tr>
            <tr>
              <td className={cell} colSpan={4}>{student.disability_card_detail || "—"}</td>
            </tr>

            <tr>
              <td colSpan={4} className={barCell}>4.- Datos médicos del estudiante</td>
            </tr>
            <tr>
              <td className={labelCell}>Enfermedad</td>
              <td className={cell} colSpan={3}>{student.medical_condition || "—"}</td>
            </tr>
            <tr>
              <td className={labelCell}>Alergias</td>
              <td className={cell} colSpan={3}>{student.medical_allergies || "—"}</td>
            </tr>
            <tr>
              <td className={labelCell}>Intolerancia a medicamentos</td>
              <td className={cell} colSpan={3}>{student.medical_medication_intolerance || "—"}</td>
            </tr>
            <tr>
              <td className={labelCell}>Intolerancia a alimentos</td>
              <td className={cell} colSpan={3}>{student.medical_food_intolerance || "—"}</td>
            </tr>
          </tbody>
        </table>

        <div className="mt-4 border border-slate-400 p-3">
          <p className="font-semibold uppercase text-center mb-2">Autorización</p>
          <p className="text-justify">
            Por medio de la presente yo, <strong>{authName || "________________________________"}</strong>, con N°
            C.I. <strong>{authDoc || "________________"}</strong>, padre/madre de familia o representante legal del
            estudiante <strong>{student.full_name}</strong>, estudiante de <strong>{student.course}</strong>
            {student.parallel ? (
              <>
                {" "}
                paralelo &ldquo;<strong>{student.parallel}</strong>&rdquo;
              </>
            ) : (
              ""
            )}
            , jornada <strong>{student.jornada ? student.jornada.charAt(0) + student.jornada.slice(1).toLowerCase() : "____________"}</strong>.
          </p>
          <p className="mt-2">
            {chk(student.leaves_alone_authorized === 1)} SI &nbsp;&nbsp; {chk(student.leaves_alone_authorized === 0)} NO
            &nbsp;&nbsp; AUTORIZO que mi representado/a salga solo/a de la institución educativa al domicilio.
          </p>
          <div className="mt-8 text-center">
            <div className="inline-block border-t border-slate-800 px-10 pt-1">FIRMA</div>
          </div>
        </div>

        <DocumentFooter institution={institution} />
      </div>
    </div>
  );
}
