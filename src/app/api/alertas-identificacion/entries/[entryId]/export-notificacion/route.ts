import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getEntry, getSession as getAlertSession } from "@/lib/alertIdentificationSessions";
import { generateAlertNotificationFormDocx } from "@/lib/alertNotificationFormDocx";

export async function GET(_req: NextRequest, { params }: { params: { entryId: string } }) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const institutionId = session.user.institution_id;
  if (!institutionId) return NextResponse.json({ error: "Sin institución" }, { status: 400 });

  const entry = getEntry(params.entryId, institutionId);
  if (!entry) return NextResponse.json({ error: "Registro no encontrado" }, { status: 404 });
  const alertSession = getAlertSession(entry.session_id, institutionId);
  if (!alertSession) return NextResponse.json({ error: "Acta no encontrada" }, { status: 404 });

  const buffer = await generateAlertNotificationFormDocx(entry, alertSession);
  const safe = `Ficha_Notificacion_Alerta_${entry.student_name}`.replace(/[^a-zA-Z0-9-_]/g, "_").slice(0, 90);
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${safe}.docx"`,
    },
  });
}
