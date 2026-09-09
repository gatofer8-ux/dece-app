import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { generateSituationalReportDocx } from "@/lib/docxExport";
import type { SituationalReportRow, StudentRow, InstitutionRow, CaseFileRow, SchoolYearRow } from "@/lib/types";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string; reportId: string } }
) {
  const session = await getSession();
  if (!session || !session.user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const institutionId = session.user.institution_id;
  const report = db
    .prepare("SELECT * FROM situational_reports WHERE id = ? AND institution_id = ?")
    .get(params.reportId, institutionId) as SituationalReportRow | undefined;

  if (!report) {
    return NextResponse.json({ error: "Informe situacional no encontrado" }, { status: 404 });
  }

  const caseFile = db
    .prepare("SELECT * FROM case_files WHERE id = ?")
    .get(report.case_file_id) as CaseFileRow | undefined;

  if (!caseFile) {
    return NextResponse.json({ error: "Caso no encontrado" }, { status: 404 });
  }

  const student = db
    .prepare("SELECT * FROM students WHERE id = ?")
    .get(caseFile.student_id) as StudentRow | undefined;

  if (!student) {
    return NextResponse.json({ error: "Estudiante no encontrado" }, { status: 404 });
  }

  const institution = institutionId
    ? (db.prepare("SELECT * FROM institutions WHERE id = ?").get(institutionId) as
        | InstitutionRow
        | undefined)
    : null;

  const activeYear = institutionId
    ? (db.prepare("SELECT * FROM school_years WHERE institution_id = ? AND is_active = 1").get(institutionId) as
        | SchoolYearRow
        | undefined)
    : null;

  const docBuffer = await generateSituationalReportDocx({
    report,
    caseFile,
    student,
    institution,
    activeYear,
  });

  const fileName = `Informe_Tecnico_Situacional_${student.full_name.replace(/[^a-zA-Z0-9-_]/g, "_")}.docx`;

  return new NextResponse(docBuffer as unknown as BodyInit, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
