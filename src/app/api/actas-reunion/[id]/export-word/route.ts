import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { generateMeetingMinutesDocx } from "@/lib/meetingMinutesDocx";
import type { MeetingMinutesRow } from "@/lib/types";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const institutionId = session.user.institution_id;

  const m = db
    .prepare("SELECT * FROM meeting_minutes WHERE id = ? AND institution_id = ?")
    .get(params.id, institutionId) as MeetingMinutesRow | undefined;
  if (!m) return NextResponse.json({ error: "Acta no encontrada" }, { status: 404 });

  const buffer = await generateMeetingMinutesDocx(m);
  const safe = (m.meeting_code || "Acta_de_Reunion").replace(/[^a-zA-Z0-9-_]/g, "_").slice(0, 80);
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${safe}.docx"`,
    },
  });
}
