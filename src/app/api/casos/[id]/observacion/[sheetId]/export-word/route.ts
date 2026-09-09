import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { generateObservationSheetDocx } from "@/lib/docxExport";
import type { CaseObservationSheetRow, StudentRow, InstitutionRow, CaseFileRow } from "@/lib/types";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string; sheetId: string } }
) {
  const session = await getSession();
  if (!session || !session.user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const institutionId = session.user.institution_id;
  const sheet = db
    .prepare("SELECT * FROM case_observation_sheets WHERE id = ? AND institution_id = ?")
    .get(params.sheetId, institutionId) as CaseObservationSheetRow | undefined;

  if (!sheet) {
    return NextResponse.json({ error: "Ficha de observación no encontrada" }, { status: 404 });
  }

  const caseFile = db
    .prepare("SELECT student_id FROM case_files WHERE id = ?")
    .get(sheet.case_file_id) as Pick<CaseFileRow, "student_id"> | undefined;

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

  const docBuffer = await generateObservationSheetDocx({
    sheet,
    student,
    institution,
  });

  const fileName = `Ficha_Observacion_${student.full_name.replace(/[^a-zA-Z0-9-_]/g, "_")}.docx`;

  return new NextResponse(docBuffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
