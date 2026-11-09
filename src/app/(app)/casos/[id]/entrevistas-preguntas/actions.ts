"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { requireOwnedCase } from "@/lib/scopedDb";
import { logAudit } from "@/lib/audit";
import { parseStructure } from "@/lib/entrevistaPreguntas";
import { getInterviewFormat } from "@/lib/entrevistaPreguntasFormat";

function text(fd: FormData, key: string, max = 200): string | null {
  const v = fd.get(key);
  if (typeof v !== "string") return null;
  const t = v.trim().slice(0, max);
  return t.length ? t : null;
}

/** Respuestas del formulario: campos `ans_<idPregunta>`, solo de preguntas que existen en la estructura. */
function collectAnswers(fd: FormData, structureJson: string): Record<string, string> {
  const structure = parseStructure(structureJson);
  const answers: Record<string, string> = {};
  for (const sec of structure.sections) {
    for (const qq of sec.questions) {
      const v = fd.get(`ans_${qq.id}`);
      if (typeof v === "string" && v.trim()) answers[qq.id] = v.trim().slice(0, 5000);
    }
  }
  return answers;
}

export async function createQuestionInterview(caseId: string, formData: FormData) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  requireOwnedCase(caseId, institutionId);

  // La estructura se "congela" con la que tiene la institución hoy.
  const structureJson = JSON.stringify(getInterviewFormat(institutionId).structure);
  const id = randomUUID();
  const name = text(formData, "interviewee_name") || "s/n";

  db.prepare(
    `INSERT INTO student_question_interviews
       (id, case_file_id, institution_id, professional_id, interviewee_name, course, application_date, structure_json, answers_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    caseId,
    institutionId,
    session.user.id,
    name,
    text(formData, "course"),
    text(formData, "application_date", 10),
    structureJson,
    JSON.stringify(collectAnswers(formData, structureJson))
  );

  db.prepare(
    `INSERT INTO case_actions (id, case_file_id, author_id, type, description) VALUES (?, ?, ?, 'Entrevista a estudiantes', ?)`
  ).run(randomUUID(), caseId, session.user.id, `Entrevista a estudiantes (formato por preguntas) realizada a ${name}.`);

  logAudit({ userId: session.user.id, action: "CREAR", entityType: "StudentQuestionInterview", entityId: id, details: caseId, institutionId });
  revalidatePath(`/casos/${caseId}`);
  redirect(`/casos/${caseId}`);
}

export async function updateQuestionInterview(caseId: string, interviewId: string, formData: FormData) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  requireOwnedCase(caseId, institutionId);

  const row = db
    .prepare("SELECT structure_json FROM student_question_interviews WHERE id = ? AND case_file_id = ? AND institution_id = ?")
    .get(interviewId, caseId, institutionId) as { structure_json: string } | undefined;
  if (!row) throw new Error("Entrevista no encontrada");

  db.prepare(
    `UPDATE student_question_interviews
        SET interviewee_name = ?, course = ?, application_date = ?, answers_json = ?, updated_at = datetime('now')
      WHERE id = ? AND case_file_id = ? AND institution_id = ?`
  ).run(
    text(formData, "interviewee_name") || "s/n",
    text(formData, "course"),
    text(formData, "application_date", 10),
    JSON.stringify(collectAnswers(formData, row.structure_json)),
    interviewId,
    caseId,
    institutionId
  );

  logAudit({ userId: session.user.id, action: "EDITAR", entityType: "StudentQuestionInterview", entityId: interviewId, details: caseId, institutionId });
  revalidatePath(`/casos/${caseId}`);
  redirect(`/casos/${caseId}`);
}

export async function deleteQuestionInterview(interviewId: string, caseId: string) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  requireOwnedCase(caseId, institutionId);
  db.prepare("DELETE FROM student_question_interviews WHERE id = ? AND case_file_id = ? AND institution_id = ?").run(
    interviewId,
    caseId,
    institutionId
  );
  logAudit({ userId: session.user.id, action: "BORRAR", entityType: "StudentQuestionInterview", entityId: interviewId, institutionId });
  revalidatePath(`/casos/${caseId}`);
}
