import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { generateInterviewDocx } from "@/lib/docxExport";
import type { CaseInterviewRow, StudentRow, InstitutionRow, CaseFileRow, UserRow } from "@/lib/types";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string; interviewId: string } }
) {
  const session = await getSession();
  if (!session || !session.user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const institutionId = session.user.role === "DISTRITO" ? null : session.user.institution_id;
  const interview = institutionId
    ? (db.prepare("SELECT * FROM case_interviews WHERE id = ? AND institution_id = ?").get(params.interviewId, institutionId) as CaseInterviewRow | undefined)
    : (db.prepare("SELECT * FROM case_interviews WHERE id = ?").get(params.interviewId) as CaseInterviewRow | undefined);

  if (!interview) {
    return NextResponse.json({ error: "Entrevista no encontrada" }, { status: 404 });
  }

  const caseFile = db
    .prepare("SELECT student_id FROM case_files WHERE id = ?")
    .get(interview.case_file_id) as Pick<CaseFileRow, "student_id"> | undefined;

  if (!caseFile) {
    return NextResponse.json({ error: "Caso no encontrado" }, { status: 404 });
  }

  const student = db
    .prepare("SELECT * FROM students WHERE id = ?")
    .get(caseFile.student_id) as StudentRow | undefined;

  if (!student) {
    return NextResponse.json({ error: "Estudiante no encontrado" }, { status: 404 });
  }

  const targetInstId = institutionId || interview.institution_id;
  const institution = targetInstId
    ? (db.prepare("SELECT * FROM institutions WHERE id = ?").get(targetInstId) as InstitutionRow | undefined)
    : null;

  let analystRole = "ANALISTA DECE";
  let professionalName = session.user.name || "";

  if (interview.professional_id) {
    const prof = db.prepare("SELECT name, role, job_title FROM users WHERE id = ?").get(interview.professional_id) as UserRow | undefined;
    if (prof) {
      professionalName = prof.name;
      analystRole = prof.role === "ADMIN" || /coord/i.test(prof.job_title || "") ? "COORDINADOR/A DECE" : (prof.job_title || "ANALISTA DECE");
    }
  } else if (session.user.role === "ADMIN" || /coord/i.test((session.user as any).job_title || "")) {
    analystRole = "COORDINADOR/A DECE";
  }

  const docBuffer = await generateInterviewDocx({
    interview,
    student,
    institution,
    analystRole,
    professionalName,
  });

  const fileName = `Entrevista_Semiestructurada_${student.full_name.replace(/[^a-zA-Z0-9-_]/g, "_")}.docx`;

  return new NextResponse(docBuffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
