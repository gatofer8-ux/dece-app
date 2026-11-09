import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { buildBaseTemplate } from "@/lib/entrevistaPreguntasDocx";

export async function GET() {
  const session = await getSession();
  if (!session?.user || !["ADMIN", "DECE"].includes(session.user.role)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const buffer = await buildBaseTemplate();
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": 'attachment; filename="Plantilla_base_Entrevista_a_estudiantes.docx"',
    },
  });
}
