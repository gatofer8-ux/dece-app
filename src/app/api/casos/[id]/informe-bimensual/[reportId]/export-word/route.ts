import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { generateBimonthlyReportDocx } from "@/lib/docxExport";
import type { BimonthlyReportRow, StudentRow, CaseFileRow } from "@/lib/types";

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
    .prepare("SELECT * FROM bimonthly_reports WHERE id = ? AND institution_id = ?")
    .get(params.reportId, institutionId) as BimonthlyReportRow | undefined;

  if (!report) {
    return NextResponse.json({ error: "Informe bimensual no encontrado" }, { status: 404 });
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

  const docBuffer = await generateBimonthlyReportDocx(report);

  const studentClean = student?.full_name ? student.full_name.replace(/[^a-zA-Z0-9]/g, "_") : report.victim_initials;
  const periodClean = report.period_months.replace(/[^a-zA-Z0-9]/g, "_");
  const fileName = `${caseFile.code}_INFORME_BIMENSUAL_${periodClean}_${studentClean}.docx`;

  return new NextResponse(docBuffer as unknown as BodyInit, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}

