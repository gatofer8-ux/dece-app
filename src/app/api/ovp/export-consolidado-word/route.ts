import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getStudentVocationalSynthesis } from "@/lib/ovp/consolidatedVocationalReport";
import { generateConsolidatedVocationalReportDocx } from "@/lib/ovp/consolidatedVocationalDocx";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const institutionId = session.user.institution_id;
  if (!institutionId) {
    return NextResponse.json({ error: "Institución requerida" }, { status: 400 });
  }
  const studentId = req.nextUrl.searchParams.get("studentId");
  if (!studentId) {
    return NextResponse.json({ error: "studentId es requerido" }, { status: 400 });
  }

  const data = getStudentVocationalSynthesis(studentId, institutionId);
  if (!data) {
    return NextResponse.json({ error: "Estudiante no encontrado" }, { status: 404 });
  }

  const buffer = await generateConsolidatedVocationalReportDocx(data);
  const cleanName = data.student.full_name.replace(/[^a-zA-Z0-9-_]/g, "_").slice(0, 60);

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="Informe_Vocacional_Consolidado_${cleanName}.docx"`,
    },
  });
}
