import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { resolveAttachmentPath } from "@/lib/uploads";
import { generateActivityReportDocx, type ActivityReportPhoto } from "@/lib/activityReportDocx";
import type { ActivityReportRow, InstitutionRow } from "@/lib/types";

export async function GET(_req: NextRequest, { params }: { params: { id: string; reportId: string } }) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const institutionId = session.user.institution_id;

  const report = db
    .prepare("SELECT * FROM activity_reports WHERE id = ? AND institution_id = ?")
    .get(params.reportId, institutionId) as ActivityReportRow | undefined;
  if (!report) return NextResponse.json({ error: "Informe no encontrado" }, { status: 404 });

  const institution = institutionId
    ? (db.prepare("SELECT * FROM institutions WHERE id = ?").get(institutionId) as InstitutionRow | undefined)
    : null;

  const photoRows = db
    .prepare("SELECT path, mime_type, caption FROM attachments WHERE activity_report_id = ? ORDER BY uploaded_at ASC")
    .all(params.reportId) as { path: string; mime_type: string | null; caption: string | null }[];

  const photos: ActivityReportPhoto[] = [];
  for (const r of photoRows.slice(0, 12)) {
    const abs = resolveAttachmentPath(r.path);
    if (abs && fs.existsSync(abs)) {
      photos.push({ buffer: fs.readFileSync(abs), mime: r.mime_type, caption: r.caption });
    }
  }

  const buffer = await generateActivityReportDocx({ report, institution, photos });
  const safe = (report.tema || report.activity_name || "Informe_de_Taller").replace(/[^a-zA-Z0-9-_]/g, "_").slice(0, 80);
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="Informe_Taller_${safe}.docx"`,
    },
  });
}
