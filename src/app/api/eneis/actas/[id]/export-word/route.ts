import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { generateEneisActaDocx } from "@/lib/eneis/eneisActaDocx";
import { getEneisActaHeaderInfo } from "@/lib/eneis/eneisActaHeader";
import type { EneisActaRow, InstitutionRow } from "@/lib/types";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const institutionId = session.user.institution_id;

  const a = db
    .prepare("SELECT * FROM eneis_actas WHERE id = ? AND institution_id = ?")
    .get(params.id, institutionId) as EneisActaRow | undefined;
  if (!a) return NextResponse.json({ error: "Acta no encontrada" }, { status: 404 });
  const institution = db.prepare("SELECT * FROM institutions WHERE id = ?").get(institutionId) as InstitutionRow;
  const header = getEneisActaHeaderInfo(institution, a.id);

  const buffer = await generateEneisActaDocx(a, header);
  const safe = `Acta_ENEIS_N${header.actaNumero}`.replace(/[^a-zA-Z0-9-_]/g, "_").slice(0, 80);
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${safe}.docx"`,
    },
  });
}
