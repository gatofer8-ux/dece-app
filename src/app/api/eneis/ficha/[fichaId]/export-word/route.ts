import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { getEneisFicha } from "@/lib/eneis/eneisSessions";
import { generateEneisFichaDocx } from "@/lib/eneis/eneisFichaDocx";
import type { InstitutionRow } from "@/lib/types";

export async function GET(_req: NextRequest, { params }: { params: { fichaId: string } }) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const institutionId = session.user.institution_id;
  if (!institutionId) return NextResponse.json({ error: "Sin institución" }, { status: 400 });

  const ficha = getEneisFicha(params.fichaId, institutionId);
  if (!ficha) return NextResponse.json({ error: "Ficha no encontrada" }, { status: 404 });

  const institution = db.prepare("SELECT * FROM institutions WHERE id = ?").get(institutionId) as
    | InstitutionRow
    | undefined;

  const buffer = await generateEneisFichaDocx(ficha, institution?.name || "");
  const safe = `Ficha_ENEIS_${ficha.docente_nombre}_${ficha.asignatura}`.replace(/[^a-zA-Z0-9-_]/g, "_").slice(0, 80);
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${safe}.docx"`,
    },
  });
}
