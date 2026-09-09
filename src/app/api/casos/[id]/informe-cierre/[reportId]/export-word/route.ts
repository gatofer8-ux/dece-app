import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { generateCaseClosureReportDocx } from "@/lib/caseClosureDocxExport";
import { type BimonthlyConsolidatedItem } from "@/lib/caseClosureReport";
import { getCaseBimonthlyReports } from "@/lib/caseClosureReportServer";
import type {
  CaseClosureReportRow,
  StudentRow,
  InstitutionRow,
  CaseFileRow,
} from "@/lib/types";

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
    .prepare("SELECT * FROM case_closure_reports WHERE id = ? AND institution_id = ?")
    .get(params.reportId, institutionId) as CaseClosureReportRow | undefined;

  if (!report) {
    return NextResponse.json(
      { error: "Informe de cierre no encontrado" },
      { status: 404 }
    );
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

  let bimonthlyList: BimonthlyConsolidatedItem[] = [];
  try {
    if (report.bimonthly_summary_json && report.bimonthly_summary_json !== "[]") {
      bimonthlyList = JSON.parse(report.bimonthly_summary_json);
    }
  } catch {
    // fallback
  }
  if (!bimonthlyList || bimonthlyList.length === 0) {
    bimonthlyList = getCaseBimonthlyReports(caseFile.id);
  }

  const docBuffer = await generateCaseClosureReportDocx({
    report,
    caseFile,
    student,
    institution,
    bimonthlyList,
  });

  const cleanName = student.full_name.replace(/[^a-zA-Z0-9-_]/g, "_");
  const fileName = `Informe_Tecnico_Cierre_${cleanName}.docx`;

  return new NextResponse(docBuffer as unknown as BodyInit, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
