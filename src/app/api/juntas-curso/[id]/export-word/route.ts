import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { getCourseBoardReportById } from "@/lib/juntasCurso";
import { generateCourseBoardReportDocx } from "@/lib/docxJuntasCurso";
import type { InstitutionRow } from "@/lib/types";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session || !session.user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const institutionId = session.user.institution_id;
  if (!institutionId) {
    return NextResponse.json({ error: "No tiene institución asignada" }, { status: 400 });
  }

  const report = getCourseBoardReportById(params.id, institutionId);
  if (!report) {
    return NextResponse.json({ error: "Informe no encontrado" }, { status: 404 });
  }

  const institution = db
    .prepare("SELECT * FROM institutions WHERE id = ?")
    .get(institutionId) as InstitutionRow | undefined;

  const docBuffer = await generateCourseBoardReportDocx({
    report,
    institution,
  });

  const filename = `Informe_Juntas_Curso_${report.trimester}_${report.course.replace(/\s+/g, "_")}_${report.parallel}.docx`;

  return new NextResponse(docBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
