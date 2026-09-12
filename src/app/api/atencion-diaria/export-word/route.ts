import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { generateDailyAttentionDocx } from "@/lib/dailyAttentionDocx";
import type { DailyAttentionRow, InstitutionRow, UserRow } from "@/lib/types";
import type { AttendeeType } from "@/lib/dailyAttention";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const institutionId = session.user.institution_id;
  if (!institutionId) return NextResponse.json({ error: "Sin institución" }, { status: 400 });

  const url = new URL(req.url);
  const tipoParam = url.searchParams.get("tipo") || "ESTUDIANTE";
  const tipo = (["ESTUDIANTE", "REPRESENTANTE", "DOCENTE_AUTORIDAD"].includes(tipoParam)
    ? tipoParam
    : "ESTUDIANTE") as AttendeeType;
  const mes = url.searchParams.get("mes") || undefined;

  const institution = db.prepare("SELECT * FROM institutions WHERE id = ?").get(institutionId) as InstitutionRow;
  if (!institution) return NextResponse.json({ error: "Institución no encontrada" }, { status: 404 });

  let where = "WHERE institution_id = ? AND attendee_type = ?";
  const params: (string | number)[] = [institutionId, tipo];
  if (mes && /^\d{4}-\d{2}$/.test(mes)) {
    where += " AND attention_date LIKE ?";
    params.push(`${mes}%`);
  }

  const entries = db
    .prepare(`SELECT * FROM daily_attentions ${where} ORDER BY attention_date ASC, created_at ASC LIMIT 1000`)
    .all(...params) as DailyAttentionRow[];

  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(session.user.id) as UserRow | undefined;

  const buffer = await generateDailyAttentionDocx({
    institution,
    tipo,
    entries,
    mes,
    professionalName: user?.name,
  });

  const safePeriod = mes ? mes : "General";
  const filename = `Registro_Atencion_${tipo}_${safePeriod}`.replace(/[^a-zA-Z0-9-_]/g, "_");

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${filename}.docx"`,
    },
  });
}
