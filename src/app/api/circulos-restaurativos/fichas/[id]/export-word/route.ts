import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { generateRestorativeCircleFichaDocx } from "@/lib/restorativeCircleFichaDocx";
import type { RestorativeCircleFichaRow } from "@/lib/types";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const institutionId = session.user.institution_id;

  const ficha = db
    .prepare("SELECT * FROM restorative_circle_fichas WHERE id = ? AND institution_id = ?")
    .get(params.id, institutionId) as RestorativeCircleFichaRow | undefined;
  if (!ficha) return NextResponse.json({ error: "Ficha no encontrada" }, { status: 404 });

  const buffer = await generateRestorativeCircleFichaDocx(ficha);
  const safe = (ficha.ficha_code || "Ficha_Circulo_Restaurativo")
    .replace(/[^a-zA-Z0-9-_]/g, "_")
    .slice(0, 80);
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${safe}.docx"`,
    },
  });
}
