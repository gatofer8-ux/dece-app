import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { generateViolenceReportDocx } from "@/lib/docxExport";
import type { ViolenceReportRow, StudentRow, InstitutionRow, CaseFileRow } from "@/lib/types";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string; reportId: string } }
) {
  const session = await getSession();
  if (!session || !session.user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const institutionId = session.user.role === "DISTRITO" ? null : session.user.institution_id;
  const report = institutionId
    ? (db.prepare("SELECT * FROM violence_reports WHERE id = ? AND institution_id = ?").get(params.reportId, institutionId) as ViolenceReportRow | undefined)
    : (db.prepare("SELECT * FROM violence_reports WHERE id = ?").get(params.reportId) as ViolenceReportRow | undefined);

  if (!report) {
    return NextResponse.json({ error: "Informe de violencia no encontrado" }, { status: 404 });
  }

  const caseFile = db
    .prepare("SELECT student_id FROM case_files WHERE id = ?")
    .get(report.case_file_id) as Pick<CaseFileRow, "student_id"> | undefined;

  if (!caseFile) {
    return NextResponse.json({ error: "Caso no encontrado" }, { status: 404 });
  }

  const student = db
    .prepare("SELECT * FROM students WHERE id = ?")
    .get(caseFile.student_id) as StudentRow | undefined;

  if (!student) {
    return NextResponse.json({ error: "Estudiante no encontrado" }, { status: 404 });
  }

  const targetInstId = institutionId || report.institution_id;
  const institution = targetInstId
    ? (db.prepare("SELECT * FROM institutions WHERE id = ?").get(targetInstId) as
        | InstitutionRow
        | undefined)
    : null;

  const docBuffer = await generateViolenceReportDocx({
    report,
    student,
    institution,
  });

  const fileName = `Reporte_Hecho_Violencia_${student.full_name.replace(/[^a-zA-Z0-9-_]/g, "_")}.docx`;

  return new NextResponse(docBuffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
