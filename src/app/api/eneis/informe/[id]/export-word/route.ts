import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { getInforme, parseTablas } from "@/lib/eneis/eneisInformes";
import { generateEneisInformeDocx } from "@/lib/eneis/eneisInformeDocx";
import type { InstitutionRow } from "@/lib/types";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const institutionId = session.user.institution_id;
  if (!institutionId) return NextResponse.json({ error: "Sin institución" }, { status: 400 });

  const informe = getInforme(params.id, institutionId);
  if (!informe) return NextResponse.json({ error: "Informe no encontrado" }, { status: 404 });

  const institution = db.prepare("SELECT * FROM institutions WHERE id = ?").get(institutionId) as
    | InstitutionRow
    | undefined;

  const tablas = parseTablas(informe.tablas_json);
  const buffer = await generateEneisInformeDocx(informe, tablas, institution?.name || "");

  const safe = (informe.titulo || "Informe_ENEIS").replace(/[^a-zA-Z0-9-_]/g, "_").slice(0, 80);
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${safe}.docx"`,
    },
  });
}
