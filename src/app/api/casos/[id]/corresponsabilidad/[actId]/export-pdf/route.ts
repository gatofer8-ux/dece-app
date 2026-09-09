import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { generateCorresponsibilityDocxBuffer } from "@/lib/corresponsibilityDocx";
import { convertDocxBufferToPdf } from "@/lib/docxToPdf";
import type { CaseCorresponsibilityActRow, StudentRow, CaseFileRow } from "@/lib/types";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string; actId: string } }
) {
  const session = await getSession();
  if (!session || !session.user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const institutionId = session.user.institution_id;
  const act = db
    .prepare("SELECT * FROM case_corresponsibility_acts WHERE id = ? AND institution_id = ?")
    .get(params.actId, institutionId) as CaseCorresponsibilityActRow | undefined;

  if (!act) {
    return NextResponse.json({ error: "Acta de corresponsabilidad no encontrada" }, { status: 404 });
  }

  const caseFile = db
    .prepare("SELECT student_id FROM case_files WHERE id = ?")
    .get(act.case_file_id) as Pick<CaseFileRow, "student_id"> | undefined;

  if (!caseFile) {
    return NextResponse.json({ error: "Caso no encontrado" }, { status: 404 });
  }

  const student = db
    .prepare("SELECT * FROM students WHERE id = ?")
    .get(caseFile.student_id) as StudentRow | undefined;

  if (!student) {
    return NextResponse.json({ error: "Estudiante no encontrado" }, { status: 404 });
  }

  try {
    const docBuffer = await generateCorresponsibilityDocxBuffer(act, student);
    const pdfBuffer = await convertDocxBufferToPdf(docBuffer);

    const fileName = `Acta_Corresponsabilidad_${student.full_name.replace(/[^a-zA-Z0-9-_]/g, "_")}.pdf`;

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${fileName}"`,
      },
    });
  } catch (err: any) {
    console.error("[export-pdf]", err);
    return NextResponse.json({ error: "Error al generar el PDF: " + err?.message }, { status: 500 });
  }
}
