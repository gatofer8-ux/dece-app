import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { generateOficioDocx } from "@/lib/oficioDocx";
import type { InstitutionRow, OficioRow } from "@/lib/types";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session || !session.user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const institutionId = session.user.institution_id;
  const isSuperAdmin = session.user.role === "SUPERADMIN";

  const oficio = db
    .prepare(
      isSuperAdmin
        ? "SELECT * FROM oficios WHERE id = ?"
        : "SELECT * FROM oficios WHERE id = ? AND institution_id = ?"
    )
    .get(...(isSuperAdmin ? [params.id] : [params.id, institutionId])) as OficioRow | undefined;

  if (!oficio) {
    return NextResponse.json({ error: "Oficio no encontrado" }, { status: 404 });
  }

  const institution = db
    .prepare("SELECT * FROM institutions WHERE id = ?")
    .get(oficio.institution_id) as InstitutionRow | undefined;

  const docBuffer = await generateOficioDocx({
    oficio,
    institution,
  });

  const cleanNumber = (oficio.oficio_number || "Oficio").replace(/[^a-zA-Z0-9-_]/g, "_");
  const fileName = `Oficio_${cleanNumber}.docx`;

  return new NextResponse(docBuffer as unknown as BodyInit, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
