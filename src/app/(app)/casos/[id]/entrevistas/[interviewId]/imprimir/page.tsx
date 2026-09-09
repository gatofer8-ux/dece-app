import { notFound } from "next/navigation";
import Link from "next/link";
import { formatStudentCourseFull } from "@/lib/studentCourse";
import { db } from "@/lib/db";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { formatDate } from "@/components/ui";
import type { CaseFileRow, StudentRow, CaseInterviewRow, UserRow, InstitutionRow } from "@/lib/types";
import PrintButton from "@/components/PrintButton";

export default async function ImprimirEntrevistaPage({ params }: { params: { id: string; interviewId: string } }) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  const caseFile = db
    .prepare("SELECT * FROM case_files WHERE id = ? AND institution_id = ?")
    .get(params.id, institutionId) as CaseFileRow | undefined;
  if (!caseFile) notFound();

  const interview = db
    .prepare("SELECT * FROM case_interviews WHERE id = ? AND case_file_id = ?")
    .get(params.interviewId, caseFile.id) as CaseInterviewRow | undefined;
  if (!interview) notFound();

  const student = db.prepare("SELECT * FROM students WHERE id = ?").get(caseFile.student_id) as StudentRow;
  const institution = db.prepare("SELECT * FROM institutions WHERE id = ?").get(institutionId) as InstitutionRow;
  const professional = interview.professional_id
    ? (db.prepare("SELECT * FROM users WHERE id = ?").get(interview.professional_id) as UserRow | undefined)
    : undefined;

  let analystRole = "ANALISTA DECE";
  if (professional) {
    analystRole = professional.role === "ADMIN" || /coord/i.test(professional.job_title || "") ? "COORDINADOR/A DECE" : (professional.job_title || "ANALISTA DECE");
  } else if (session.user.role === "ADMIN") {
    analystRole = "COORDINADOR/A DECE";
  }

  const studentCourseFormatted = formatStudentCourseFull(student);

  // Helper to render checkboxes like: Buena ( X )
  const renderCheck = (value: string | null | undefined, target: string) => {
    const isChecked = value?.includes(target);
    return (
      <span>
        {target} ({isChecked ? <span className="font-bold underline text-blue-800">X</span> : "  "})
      </span>
    );
  };

  return (
    <div className="max-w-[800px] mx-auto bg-white">
      <div className="no-print p-4 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href={`/casos/${caseFile.id}`}
            className="text-xs text-slate-600 hover:text-slate-900 font-semibold"
          >
            ← Volver al caso
          </Link>
          <span className="text-slate-300">|</span>
          <Link
            href={`/casos/${caseFile.id}/entrevistas/${interview.id}/editar`}
            className="text-xs text-blue-700 hover:text-blue-900 font-semibold flex items-center gap-1"
          >
            ✏️ Editar datos
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={`/api/casos/${caseFile.id}/entrevistas/${interview.id}/export-word`}
            className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold px-3 py-1.5 rounded-md flex items-center gap-1.5 shadow-xs transition-colors"
          >
            📥 Descargar Word (.docx)
          </a>
          <PrintButton hideWordButton={true} className="p-0 bg-transparent border-0" />
        </div>
      </div>
      <div id="printable-content" className="p-8 print:p-0 text-sm font-sans text-black">
        
        {/* Encabezado oficial copia fiel al formato ministerial DECE */}
        <div className="flex justify-end items-end mb-1">
          <div className="text-right pb-1">
            <h1 className="text-2xl text-gray-600 font-serif italic tracking-wide" style={{ fontFamily: "'Brush Script MT', cursive, Georgia, serif" }}>
              Departamento de Consejería Estudiantil - DECE
            </h1>
          </div>
        </div>
        {/* Barra divisoria tridimensional azul y plateada */}
        <div className="w-full h-1.5 bg-gradient-to-r from-blue-200 via-blue-400 to-slate-400 rounded-xs shadow-xs mb-5"></div>

        {/* Título de la tabla recuadrado */}
        <div className="border border-black font-bold text-center text-[12px] sm:text-[13px] py-1 mb-2 bg-white tracking-wide uppercase">
          ENTREVISTA SEMIESTRUCTURADA A ESTUDIANTES / REPRESENTANTES
        </div>

        {/* DATOS PERSONALES SIN CUADRO DE FOTO */}
        <div className="text-[11px] mb-4 space-y-2.5">
          <div className="italic text-gray-500 font-bold mb-1 uppercase" style={{ fontSize: "10.5px" }}>
            DATOS PERSONALES:
          </div>
          
          <div className="flex gap-2 items-end">
            <span className="font-bold whitespace-nowrap">NOMBRES:</span>
            <span className="flex-1 border-b border-dotted border-black px-2 pb-0.5 text-blue-950 font-medium">
              {interview.interviewee_full_name || student.full_name || " "}
            </span>
            <span className="font-bold ml-3 whitespace-nowrap">CI:</span>
            <span className="w-48 sm:w-64 border-b border-dotted border-black px-2 pb-0.5 text-blue-950 font-medium">
              {interview.interviewee_cedula || student.document_id || " "}
            </span>
          </div>

          <div className="flex gap-2 items-end">
            <span className="font-bold whitespace-nowrap">CURSO:</span>
            <span className="flex-1 border-b border-dotted border-black px-2 pb-0.5 text-blue-950 font-medium">
              {studentCourseFormatted || interview.course || `${student.course || ""} ${student.parallel || ""}`.trim()}
            </span>
          </div>

          <div className="flex gap-2 items-end">
            <span className="font-bold whitespace-nowrap">EDAD:</span>
            <span className="w-56 sm:w-72 border-b border-dotted border-black px-2 pb-0.5 text-blue-950 font-medium">
              {interview.age || " "}
            </span>
            <span className="font-bold ml-4 whitespace-nowrap">FECHA DE APLICACIÓN:</span>
            <span className="flex-1 border-b border-dotted border-black px-2 pb-0.5 text-blue-950 font-medium">
              {formatDate(interview.application_date)}
            </span>
          </div>
        </div>

        {/* TABLA PRINCIPAL DE 2 COLUMNAS */}
        <table className="w-full border-collapse border-2 border-black text-[10px] table-fixed">
          <tbody>
            <tr>
              {/* Columna Izquierda */}
              <td className="w-[45%] border-r-2 border-black align-top p-0">
                <div className="font-bold text-[11px] p-2 border-b border-black text-center">
                  1. RESUMEN DE LO TRATADO EN LA ENTREVISTA
                </div>
                <div className="p-2 min-h-[300px] whitespace-pre-wrap text-[10px] text-justify leading-relaxed">
                  {interview.summary || "\n\n\n\n\n\n\n"}
                </div>
              </td>

              {/* Columna Derecha */}
              <td className="w-[55%] align-top p-0">
                <div className="font-bold text-[11px] p-2 border-b border-black">
                  2. SITUACIÓN DEL ESTUDIANTE
                </div>
                
                <div className="font-bold p-1 pl-2 text-[10px] bg-white">Relación Familiar:</div>
                <div className="border-b border-black p-1 pl-2 pb-2 text-[9px] flex gap-4">
                  {renderCheck(interview.family_relation, "Buena")}
                  {renderCheck(interview.family_relation, "Regular")}
                  {renderCheck(interview.family_relation, "Mala")}
                  {renderCheck(interview.family_relation, "Ausentes")}
                </div>

                <div className="font-bold p-1 pl-2 text-[10px] bg-white">Estado emocional:</div>
                <div className="border-b border-black p-1 pl-2 pb-2 text-[9px] grid grid-cols-3 gap-y-1 gap-x-2">
                  {renderCheck(interview.emotional_state, "Estable")}
                  {renderCheck(interview.emotional_state, "Inestable")}
                  {renderCheck(interview.emotional_state, "Llanto fácil")}
                  {renderCheck(interview.emotional_state, "Triste")}
                  {renderCheck(interview.emotional_state, "Alegre")}
                  {renderCheck(interview.emotional_state, "Agresivo")}
                  {renderCheck(interview.emotional_state, "Evasivo")}
                </div>

                <div className="font-bold p-1 pl-2 text-[10px] bg-white">Relaciones sociales:</div>
                <div className="border-b border-black p-1 pl-2 pb-2 text-[9px] flex gap-6">
                  {renderCheck(interview.social_relations, "Sociable")}
                  {renderCheck(interview.social_relations, "Aislado")}
                </div>

                <div className="border-b border-black p-1 pl-2 pb-2 text-[10px] font-bold">
                  Antecedentes de acoso escolar ({interview.bullying_history ? <span className="text-blue-800 underline">X</span> : "  "})
                </div>

                <div className="font-bold p-1 pl-2 text-[10px] bg-white">Antecedentes académicos:</div>
                <div className="border-b border-black p-1 pl-2 pb-2 text-[9px] flex gap-6">
                  {renderCheck(interview.academic_history, "Bueno")}
                  {renderCheck(interview.academic_history, "Regular")}
                  {renderCheck(interview.academic_history, "Malo")}
                </div>

                <div className="font-bold text-[11px] p-2 border-b border-black">
                  3. RECOMENDACIONES
                </div>
                <div className="border-b border-black p-2 min-h-[100px] whitespace-pre-wrap text-[10px]">
                  {interview.recommendations || "\n\n"}
                </div>

                <div className="font-bold text-[11px] p-2 border-b border-black">
                  4. COMPROMISO
                </div>
                <div className="p-2 min-h-[100px] whitespace-pre-wrap text-[10px]">
                  {interview.commitment || "\n\n"}
                </div>

              </td>
            </tr>
          </tbody>
        </table>

        {/* Firmas */}
        <div className="mt-16 grid grid-cols-3 gap-6 text-[10px] font-bold text-center">
          <div className="flex flex-col items-center">
            <div className="w-full border-t border-black pt-1 mb-6"></div>
            <div className="w-full border-t border-black pt-1">{analystRole}</div>
            {professional?.name && <div className="text-[9px] text-gray-700 font-normal mt-0.5">{professional.name}</div>}
          </div>
          
          <div className="flex flex-col text-left">
            <div className="font-bold mb-1">REPRESENTANTE</div>
            <div className="flex mb-3">
              <span>NOMBRE:</span>
              <span className="flex-1 border-b border-black ml-1"></span>
            </div>
            <div className="flex mb-3">
              <span>CI:</span>
              <span className="flex-1 border-b border-black ml-1"></span>
            </div>
            <div className="flex mb-3">
              <span>TELÉFONO:</span>
              <span className="flex-1 border-b border-black ml-1"></span>
            </div>
            <div className="flex">
              <span>FIRMA:</span>
              <span className="flex-1 border-b border-black ml-1"></span>
            </div>
          </div>

          <div className="flex flex-col items-center pt-8">
            <div className="w-full border-t border-black pt-1">ESTUDIANTE</div>
          </div>
        </div>
      </div>
    </div>
  );
}
