import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { getSession as getAlertSession, listEntriesForSession } from "@/lib/alertIdentificationSessions";
import { generateAlertIdentificationDocx } from "@/lib/alertIdentificationDocx";
import type { InstitutionRow } from "@/lib/types";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const institutionId = session.user.institution_id;
  if (!institutionId) return NextResponse.json({ error: "Sin institución" }, { status: 400 });

  const s = getAlertSession(params.id, institutionId);
  if (!s) return NextResponse.json({ error: "Acta no encontrada" }, { status: 404 });
  const institution = db.prepare("SELECT * FROM institutions WHERE id = ?").get(institutionId) as InstitutionRow;
  const entries = listEntriesForSession(s.id);

  const buffer = await generateAlertIdentificationDocx(s, entries, institution.name);
  const safe = `Acta_Identificacion_Alertas_${s.curso || ""}_${s.fecha || ""}`.replace(/[^a-zA-Z0-9-_]/g, "_").slice(0, 90);
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${safe}.docx"`,
    },
  });
}
