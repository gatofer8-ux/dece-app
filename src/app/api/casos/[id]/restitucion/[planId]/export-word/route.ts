import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { generateRestitutionPlanDocx } from "@/lib/restitutionDocxExport";
import { ensureDefaultSchoolYear } from "@/lib/schoolYear";
import type {
  CaseRestitutionPlanRow,
  StudentRow,
  InstitutionRow,
  CaseFileRow,
  SchoolYearRow,
} from "@/lib/types";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string; planId: string } }
) {
  const session = await getSession();
  if (!session || !session.user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const institutionId = session.user.institution_id;
  const caseFile = db
    .prepare("SELECT * FROM case_files WHERE id = ? AND institution_id = ?")
    .get(params.id, institutionId) as CaseFileRow | undefined;

  if (!caseFile) {
    return NextResponse.json({ error: "Caso no encontrado" }, { status: 404 });
  }

  const plan = db
    .prepare("SELECT * FROM case_restitution_plans WHERE id = ? AND case_file_id = ?")
    .get(params.planId, caseFile.id) as CaseRestitutionPlanRow | undefined;

  if (!plan) {
    return NextResponse.json(
      { error: "Plan de restitución no encontrado" },
      { status: 404 }
    );
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

  const activeYear = institutionId ? ensureDefaultSchoolYear(institutionId) : null;

  const docBuffer = await generateRestitutionPlanDocx({
    plan,
    caseFile,
    student,
    institution,
    activeYear,
  });

  const cleanName = student.full_name.replace(/[^a-zA-Z0-9-_]/g, "_");
  const fileName = `Plan_Acompanamiento_Restitucion_${cleanName}.docx`;

  return new NextResponse(docBuffer as unknown as BodyInit, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
