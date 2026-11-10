import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { currentSchoolYearSpaced } from "@/lib/schoolYearText";
import { isoToDmy, parseAnswers, parseStructure } from "@/lib/entrevistaPreguntas";
import { getInterviewFormat, getInterviewTemplate } from "@/lib/entrevistaPreguntasFormat";
import { fillCustomTemplate, generateDefaultInterviewDocx, type InterviewDocData } from "@/lib/entrevistaPreguntasDocx";
import { generateMineducInterviewDocx } from "@/lib/entrevistaPreguntasMineduc";

const DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export async function GET(_req: NextRequest, { params }: { params: { id: string; interviewId: string } }) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (!["ADMIN", "DECE"].includes(session.user.role) || !session.user.institution_id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  const institutionId = session.user.institution_id;

  const row = db
    .prepare(
      "SELECT * FROM student_question_interviews WHERE id = ? AND case_file_id = ? AND institution_id = ?"
    )
    .get(params.interviewId, params.id, institutionId) as
    | {
        interviewee_name: string | null;
        course: string | null;
        application_date: string | null;
        structure_json: string;
        answers_json: string;
        professional_id: string | null;
      }
    | undefined;
  if (!row) return NextResponse.json({ error: "Entrevista no encontrada" }, { status: 404 });

  const prof = db
    .prepare("SELECT name, title_prefix, job_title FROM users WHERE id = ?")
    .get(row.professional_id || session.user.id) as { name: string; title_prefix: string | null; job_title: string | null } | undefined;
  const inst = db.prepare("SELECT seal_image FROM institutions WHERE id = ?").get(institutionId) as
    | { seal_image: string | null }
    | undefined;

  const format = getInterviewFormat(institutionId);
  const data: InterviewDocData = {
    letterhead: format.letterhead,
    logoDataUri: inst?.seal_image || null,
    structure: parseStructure(row.structure_json),
    answers: parseAnswers(row.answers_json),
    student: row.interviewee_name || "",
    course: row.course || "",
    date: isoToDmy(row.application_date),
    professional: prof ? `${prof.title_prefix ? prof.title_prefix + " " : ""}${prof.name}` : session.user.name || "",
    professionalRole: prof?.job_title || "Profesional DECE",
    schoolYear: currentSchoolYearSpaced(),
  };

  const template = getInterviewTemplate(institutionId);
  let buffer: Buffer;
  try {
    buffer = template ? fillCustomTemplate(template.data, data) : generateMineducInterviewDocx(data);
  } catch (e) {
    console.error("[entrevista-preguntas] no se pudo generar con el formato institucional, se usa el formato básico:", e);
    buffer = await generateDefaultInterviewDocx(data);
  }

  logAudit({ userId: session.user.id, action: "EXPORTAR", entityType: "StudentQuestionInterview", entityId: params.interviewId, institutionId });
  const fileName = `Entrevista_a_estudiantes_${(row.interviewee_name || "estudiante").replace(/[^a-zA-Z0-9-_]/g, "_")}.docx`;
  return new NextResponse(buffer, {
    headers: { "Content-Type": DOCX, "Content-Disposition": `attachment; filename="${fileName}"` },
  });
}
