import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { generateSocializationActDocx } from "@/lib/docxExport";
import type {
  SocializationActRow,
  StudentRow,
  InstitutionRow,
  CaseFileRow,
  UserRow,
} from "@/lib/types";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string; actId: string } }
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

  const act = db
    .prepare("SELECT * FROM socialization_acts WHERE id = ? AND case_file_id = ?")
    .get(params.actId, caseFile.id) as SocializationActRow | undefined;

  if (!act) {
    return NextResponse.json(
      { error: "Acta de socialización no encontrada" },
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

  const currentUser = db
    .prepare("SELECT * FROM users WHERE id = ?")
    .get(session.user.id) as UserRow | undefined;

  let analystRole = currentUser?.role === "ADMIN" || /coord/i.test(currentUser?.job_title || "")
    ? "COORDINADOR/A DECE"
    : (currentUser?.job_title || "ANALISTA DECE");

  const docBuffer = await generateSocializationActDocx({
    act,
    student,
    institution,
    analystRole,
  });

  const cleanName = student.full_name.replace(/[^a-zA-Z0-9-_]/g, "_");
  const fileName = `Acta_Socializacion_${cleanName}.docx`;

  return new NextResponse(docBuffer as unknown as BodyInit, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
