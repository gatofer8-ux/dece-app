import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { generateAlertDocxBuffer } from "@/lib/alertDocx";
import type { CaseAlertNotificationRow } from "@/lib/types";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string; alertId: string } }
) {
  const session = await getSession();
  if (!session || !session.user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const institutionId = session.user.institution_id;
  const alert = db
    .prepare("SELECT * FROM case_alert_notifications WHERE id = ? AND institution_id = ?")
    .get(params.alertId, institutionId) as CaseAlertNotificationRow | undefined;

  if (!alert) {
    return NextResponse.json({ error: "Ficha de notificación de alerta no encontrada" }, { status: 404 });
  }

  const docBuffer = await generateAlertDocxBuffer(alert);
  const cleanName = alert.student_name.replace(/[^a-zA-Z0-9-_]/g, "_");
  const fileName = `Notificacion_de_Alerta_${cleanName}.docx`;

  return new NextResponse(docBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
