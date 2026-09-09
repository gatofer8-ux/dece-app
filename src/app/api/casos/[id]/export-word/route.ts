import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { generateCaseDocx } from "@/lib/docxExport";
import type {
  CaseFileRow,
  StudentRow,
  InstitutionRow,
  CaseActionRow,
  InterventionPlanRow,
  ReferralRow,
} from "@/lib/types";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session || !session.user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const role = session.user.role;
  if (role !== "ADMIN" && role !== "DECE") {
    return NextResponse.json(
      { error: "No tienes permiso para exportar el expediente completo." },
      { status: 403 }
    );
  }

  const institutionId = session.user.institution_id;
  const caseFile = db
    .prepare("SELECT * FROM case_files WHERE id = ? AND institution_id = ?")
    .get(params.id, institutionId) as CaseFileRow | undefined;

  if (!caseFile) {
    return NextResponse.json({ error: "Caso no encontrado" }, { status: 404 });
  }

  const student = db
    .prepare("SELECT * FROM students WHERE id = ? AND institution_id = ?")
    .get(caseFile.student_id, institutionId) as StudentRow | undefined;

  if (!student) {
    return NextResponse.json({ error: "Estudiante no encontrado" }, { status: 404 });
  }

  const institution = institutionId
    ? (db.prepare("SELECT * FROM institutions WHERE id = ?").get(institutionId) as
        | InstitutionRow
        | undefined)
    : null;

  const actions = db
    .prepare("SELECT * FROM case_actions WHERE case_file_id = ? ORDER BY date ASC")
    .all(caseFile.id) as CaseActionRow[];

  const plans = db
    .prepare("SELECT * FROM intervention_plans WHERE case_file_id = ?")
    .all(caseFile.id) as InterventionPlanRow[];

  const referrals = db
    .prepare("SELECT * FROM referrals WHERE case_file_id = ?")
    .all(caseFile.id) as ReferralRow[];

  const docBuffer = await generateCaseDocx({
    caseFile,
    student,
    institution,
    actions,
    plans,
    referrals,
  });

  const fileName = `Expediente_DECE_${caseFile.code.replace(/[^a-zA-Z0-9-_]/g, "_")}.docx`;

  return new NextResponse(docBuffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
