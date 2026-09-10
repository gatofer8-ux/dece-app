import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { generateReferralDocx } from "@/lib/docxExport";
import type { ReferralRow, StudentRow, InstitutionRow, CaseFileRow, UserRow } from "@/lib/types";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string; referralId: string } }
) {
  const session = await getSession();
  if (!session || !session.user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const institutionId = session.user.institution_id;
  const referral = db
    .prepare("SELECT * FROM referrals WHERE id = ?")
    .get(params.referralId) as ReferralRow | undefined;

  if (!referral) {
    return NextResponse.json({ error: "Derivación no encontrada" }, { status: 404 });
  }

  const caseFile = db
    .prepare("SELECT * FROM case_files WHERE id = ? AND institution_id = ?")
    .get(referral.case_file_id, institutionId) as CaseFileRow | undefined;

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

  const user = referral.created_by_id
    ? (db.prepare("SELECT * FROM users WHERE id = ?").get(referral.created_by_id) as UserRow | undefined)
    : null;

  const docBuffer = await generateReferralDocx({
    referral,
    caseFile,
    student,
    institution,
    user,
  });

  const fileName = `Ficha_Derivacion_${referral.scope}_${student.full_name.replace(/[^a-zA-Z0-9-_]/g, "_")}.docx`;

  return new NextResponse(docBuffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
