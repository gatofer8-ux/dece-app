import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { getAnnualManagementReportById } from "@/lib/informeGestion";
import { generateAnnualManagementReportDocx } from "@/lib/docxInformeGestion";
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

  const report = getAnnualManagementReportById(params.id, institutionId);
  if (!report) {
    return NextResponse.json({ error: "Informe no encontrado" }, { status: 404 });
  }

  const institution = db
    .prepare("SELECT * FROM institutions WHERE id = ?")
    .get(institutionId) as InstitutionRow | undefined;

  const docBuffer = await generateAnnualManagementReportDocx({
    report,
    institution,
  });

  const cleanCode = (report.report_code || "INF-GESTION-DECE").replace(/[^a-zA-Z0-9-_]/g, "_");
  const filename = `${cleanCode}.docx`;

  return new NextResponse(docBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
