import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { getEneisSession, listFichasForSession } from "@/lib/eneis/eneisSessions";
import { generateEneisFichasBatchDocx } from "@/lib/eneis/eneisFichaDocx";
import type { InstitutionRow } from "@/lib/types";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const institutionId = session.user.institution_id;
  if (!institutionId) return NextResponse.json({ error: "Sin institución" }, { status: 400 });

  const s = getEneisSession(params.id, institutionId);
  if (!s) return NextResponse.json({ error: "Convocatoria no encontrada" }, { status: 404 });

  const fichas = listFichasForSession(s.id);
  if (fichas.length === 0) return NextResponse.json({ error: "Esta convocatoria no tiene fichas." }, { status: 400 });

  const institution = db.prepare("SELECT * FROM institutions WHERE id = ?").get(institutionId) as
    | InstitutionRow
    | undefined;

  const buffer = await generateEneisFichasBatchDocx(fichas, institution?.name || "");
  const safe = (s.title || "Fichas_ENEIS").replace(/[^a-zA-Z0-9-_]/g, "_").slice(0, 80);
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${safe}_fichas.docx"`,
    },
  });
}
