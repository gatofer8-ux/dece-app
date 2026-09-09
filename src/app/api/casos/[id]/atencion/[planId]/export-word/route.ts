import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { generateCarePlanDocx } from "@/lib/docxExport";
import type {
  CaseCarePlanRow,
  StudentRow,
  InstitutionRow,
  CaseFileRow,
  UserRow,
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
    .prepare("SELECT * FROM case_care_plans WHERE id = ? AND case_file_id = ?")
    .get(params.planId, caseFile.id) as CaseCarePlanRow | undefined;

  if (!plan) {
    return NextResponse.json(
      { error: "Plan de atención no encontrado" },
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
    : undefined;

  const professional = plan.professional_id
    ? (db.prepare("SELECT * FROM users WHERE id = ?").get(plan.professional_id) as UserRow | undefined)
    : undefined;

  let analystRole = "ANALISTA DECE";
  if (professional) {
    analystRole =
      professional.role === "ADMIN" || /coord/i.test(professional.job_title || "")
        ? "COORDINADOR/A DECE"
        : (professional.job_title || "ANALISTA DECE");
  } else if (session.user.role === "ADMIN") {
    analystRole = "COORDINADOR/A DECE";
  }

  const docBuffer = await generateCarePlanDocx({
    plan,
    student,
    institution,
    professional,
    analystRole,
  });

  const cleanName = student.full_name.replace(/[^a-zA-Z0-9-_]/g, "_");
  const fileName = `Plan_Atencion_${cleanName}.docx`;

  return new NextResponse(docBuffer as unknown as BodyInit, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
