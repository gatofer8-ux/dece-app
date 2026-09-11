import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { getInterviewSchedule, parseEntries } from "@/lib/ovp/interviewSchedule";
import { generateInterviewScheduleDocx } from "@/lib/ovp/interviewScheduleDocx";
import type { InstitutionRow } from "@/lib/types";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const institutionId = session.user.institution_id;
  if (!institutionId) return NextResponse.json({ error: "Sin institución" }, { status: 400 });

  const sched = getInterviewSchedule(params.id, institutionId);
  if (!sched) return NextResponse.json({ error: "Cronograma no encontrado" }, { status: 404 });

  const institution = db.prepare("SELECT * FROM institutions WHERE id = ?").get(institutionId) as
    | InstitutionRow
    | undefined;

  const buffer = await generateInterviewScheduleDocx({
    institutionName: institution?.name || "",
    title: sched.title,
    course: sched.course,
    interviewDate: sched.interview_date,
    startTime: sched.start_time,
    slotMinutes: sched.slot_minutes,
    studentsPerSlot: sched.students_per_slot,
    location: sched.location,
    entries: parseEntries(sched.entries_json),
  });

  const safe = (sched.title || "Cronograma_citas_OVP").replace(/[^a-zA-Z0-9-_]/g, "_").slice(0, 80);
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${safe}.docx"`,
    },
  });
}
