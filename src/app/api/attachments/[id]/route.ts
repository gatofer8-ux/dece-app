import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { resolveAttachmentPath } from "@/lib/uploads";
import type { AttachmentRow } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session?.user || !session.user.institution_id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const attachment = db
    .prepare("SELECT * FROM attachments WHERE id = ? AND institution_id = ?")
    .get(params.id, session.user.institution_id) as AttachmentRow | undefined;
  if (!attachment) {
    return NextResponse.json({ error: "Archivo no encontrado" }, { status: 404 });
  }

  const fullPath = resolveAttachmentPath(attachment.path);
  if (!fullPath || !fs.existsSync(fullPath)) {
    return NextResponse.json({ error: "El archivo ya no está disponible en el servidor" }, { status: 404 });
  }

  const buffer = fs.readFileSync(fullPath);
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": attachment.mime_type || "application/octet-stream",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(attachment.filename)}"`,
      "Content-Length": String(buffer.length),
      "Cache-Control": "private, no-store",
    },
  });
}
