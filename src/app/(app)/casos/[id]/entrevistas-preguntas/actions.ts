"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { requireOwnedCase } from "@/lib/scopedDb";
import { logAudit } from "@/lib/audit";
import { MAX_NARRATIVE, parseDistribution, parseStructure } from "@/lib/entrevistaPreguntas";
import { generateWithFallback, isAiConfigured, sanitizeAiText } from "@/lib/ai";
import { isHeightenedConfidentiality, pseudonymize } from "@/lib/aiPrivacy";
import { caseEntities } from "@/lib/caseContext";
import type { CaseFileRow, StudentRow } from "@/lib/types";
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

/**
 * Reparte un relato libre (escrito o dictado) en las preguntas de la entrevista.
 * - Solo usa lo que dice el relato: lo que no se mencionó queda vacío.
 * - El relato sale seudonimizado (nombres, cédulas, teléfonos) y los casos de
 *   confidencialidad reforzada no se envían a la IA.
 */
export async function distributeNarrativeAi(
  caseId: string,
  narrative: string,
  questions: { id: string; text: string }[]
): Promise<{ answers?: Record<string, string>; error?: string }> {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);

  if (!isAiConfigured()) return { error: "La ayuda de IA todavía no está configurada en este sistema." };

  try {
    requireOwnedCase(caseId, institutionId);
  } catch (err: any) {
    return { error: err?.message || "Caso no encontrado." };
  }

  const text = (narrative || "").trim();
  if (text.length < 20) return { error: "Escribe o dicta un relato más completo antes de repartirlo." };
  if (text.length > MAX_NARRATIVE) return { error: "El relato es demasiado largo (máximo 8000 caracteres)." };

  const qs = (Array.isArray(questions) ? questions : [])
    .slice(0, 60)
    .filter((q) => q && typeof q.id === "string" && typeof q.text === "string" && /^[A-Za-z0-9_]{1,20}$/.test(q.id))
    .map((q) => ({ id: q.id, text: q.text.slice(0, 600) }));
  if (qs.length === 0) return { error: "No hay preguntas para completar." };

  const caseFile = db.prepare("SELECT * FROM case_files WHERE id = ?").get(caseId) as CaseFileRow | undefined;
  if (!caseFile) return { error: "Caso no encontrado." };
  if (isHeightenedConfidentiality(caseFile.risk_type)) {
    return { error: "Este caso es de confidencialidad reforzada: por protección, la IA no recibe el relato. Completa las respuestas a mano." };
  }
  const student = db.prepare("SELECT * FROM students WHERE id = ?").get(caseFile.student_id) as StudentRow | undefined;

  const safeNarrative = pseudonymize(text, caseEntities(caseFile, student));
  const list = qs.map((q) => `- "${q.id}": ${q.text}`).join("\n");

  const prompt = `Eres un profesional del Departamento de Consejería Estudiantil (DECE) del Ministerio de Educación del Ecuador. Tienes el relato de una entrevista con un estudiante y debes ubicar lo dicho en las preguntas del formato institucional.

RELATO DE LA ENTREVISTA:
"""
${safeNarrative}
"""

PREGUNTAS (identificador: pregunta):
${list}

REGLAS ESTRICTAS:
1. Usa ÚNICAMENTE información que esté en el relato. No inventes, no supongas, no agregues diagnósticos ni recomendaciones.
2. Si el relato no dice nada sobre una pregunta, devuelve "" (cadena vacía) para ella.
3. Redacta cada respuesta en tercera persona, con lenguaje formal, claro y neutro (por ejemplo "Refiere que...", "Manifiesta que..."). Conserva el sentido y los hechos tal como se dijeron.
4. Cada idea del relato va en la pregunta más relacionada y no se repite en varias. Si una idea no corresponde claramente a ninguna pregunta, omítela en lugar de forzarla.
5. Mantén los marcadores entre corchetes como [estudiante] sin modificarlos.
6. Responde ÚNICAMENTE con un objeto JSON válido, sin markdown, con exactamente estas claves: ${qs.map((q) => `"${q.id}"`).join(", ")}.`;

  const res = await generateWithFallback({ prompt, temperature: 0.2, maxOutputTokens: 3000 });
  if ("error" in res) return { error: res.error };

  const parsed = parseDistribution(res.text, qs.map((q) => q.id));
  const answers: Record<string, string> = {};
  for (const [id, value] of Object.entries(parsed)) {
    const clean = sanitizeAiText(value);
    if (clean) answers[id] = clean;
  }
  if (Object.keys(answers).length === 0) {
    return { error: "La IA no encontró información para las preguntas. Revisa el relato o complétalas a mano." };
  }
  return { answers };
}
