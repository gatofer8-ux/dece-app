import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getInterviewTemplate } from "@/lib/entrevistaPreguntasFormat";

export async function GET() {
  const session = await getSession();
  if (!session?.user || !["ADMIN", "DECE"].includes(session.user.role) || !session.user.institution_id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const tpl = getInterviewTemplate(session.user.institution_id);
  if (!tpl) return NextResponse.json({ error: "Tu institución no tiene plantilla propia." }, { status: 404 });
  return new NextResponse(tpl.data, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${tpl.name.replace(/"/g, "")}"`,
    },
  });
}
