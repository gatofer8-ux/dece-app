import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { generateAccompanimentReportDocx } from "@/lib/accompanimentReportDocx";
import type { CaseAccompanimentReportRow } from "@/lib/types";

export async function GET(_req: NextRequest, { params }: { params: { id: string; reportId: string } }) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const report = db
    .prepare("SELECT * FROM case_accompaniment_reports WHERE id = ? AND case_file_id = ? AND institution_id = ?")
    .get(params.reportId, params.id, session.user.institution_id) as CaseAccompanimentReportRow | undefined;
  if (!report) return NextResponse.json({ error: "Informe no encontrado" }, { status: 404 });

  const buffer = await generateAccompanimentReportDocx(report);
  const safe = (report.student_full_name || "Informe").replace(/[^a-zA-Z0-9-_]/g, "_").slice(0, 80);
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="Informe_Tecnico_Acompanamiento_${safe}.docx"`,
    },
  });
}
