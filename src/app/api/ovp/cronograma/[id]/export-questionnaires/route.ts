import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { getInterviewSchedule, parseEntries } from "@/lib/ovp/interviewSchedule";
import { generateDecisionQuestionnaireDocx, type QuestionnaireStudentInput } from "@/lib/ovp/decisionQuestionnaireDocx";
import type { InstitutionRow } from "@/lib/types";

interface StudentDetailRow {
  id: string;
  full_name: string;
  document_id: string | null;
  course: string;
  parallel: string | null;
  jornada: string | null;
  birth_date: string | null;
  representative: string | null;
  representative_document_id: string | null;
  rep_phone: string | null;
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const institutionId = session.user.institution_id;
  if (!institutionId) return NextResponse.json({ error: "Sin institución" }, { status: 400 });

  const sched = getInterviewSchedule(params.id, institutionId);
  if (!sched) return NextResponse.json({ error: "Cronograma no encontrado" }, { status: 404 });

  const entries = parseEntries(sched.entries_json);
  if (entries.length === 0) {
    return NextResponse.json({ error: "Este cronograma no tiene estudiantes." }, { status: 400 });
  }

  const ids = entries.map((e) => e.student_id);
  const placeholders = ids.map(() => "?").join(", ");
  const rows = db
    .prepare(
      `SELECT id, full_name, document_id, course, parallel, jornada, birth_date, representative, representative_document_id, rep_phone
       FROM students WHERE institution_id = ? AND id IN (${placeholders})`
    )
    .all(institutionId, ...ids) as StudentDetailRow[];
  const byId = new Map(rows.map((r) => [r.id, r]));

  const institution = db.prepare("SELECT * FROM institutions WHERE id = ?").get(institutionId) as
    | InstitutionRow
    | undefined;

  // Se respeta el orden del cronograma (mismo orden en que se entrevistará a cada estudiante).
  const students: QuestionnaireStudentInput[] = entries.map((e) => {
    const s = byId.get(e.student_id);
    return {
      full_name: e.full_name,
      document_id: s?.document_id ?? e.document_id,
      course: sched.course,
      parallel: e.parallel,
      jornada: s?.jornada ?? null,
      birth_date: s?.birth_date ?? null,
      representative: s?.representative ?? null,
      representative_document_id: s?.representative_document_id ?? null,
      rep_phone: s?.rep_phone ?? null,
    };
  });

  const buffer = await generateDecisionQuestionnaireDocx({
    institutionName: institution?.name || "",
    interviewDate: sched.interview_date,
    students,
  });

  const safe = (sched.title || "Cuestionario_toma_decisiones").replace(/[^a-zA-Z0-9-_]/g, "_").slice(0, 80);
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${safe}_cuestionarios.docx"`,
    },
  });
}
