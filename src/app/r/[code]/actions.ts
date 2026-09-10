"use server";

import { randomUUID } from "crypto";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { str, int } from "@/lib/formData";
import { getOvpSessionByCode, isSessionOpen, normalizeGender } from "@/lib/ovp/ovpSessions";
import { scoreIppj } from "@/lib/ovp/ippjScoring";
import { IPPJ_ITEMS } from "@/lib/ovp/ippjInstrument";
import type { OvpApplicationRow } from "@/lib/types";

export async function startOvpApplication(code: string, formData: FormData) {
  const s = getOvpSessionByCode(code);
  if (!s || !isSessionOpen(s)) throw new Error("Esta evaluación no está disponible.");

  const studentId = str(formData, "student_id");
  let name = (str(formData, "student_name") || "").trim();
  let gender = str(formData, "gender") || "OTRO";
  let course = str(formData, "course") || s.course;
  let parallel = str(formData, "parallel") || s.parallel;

  if (studentId) {
    const st = db
      .prepare("SELECT full_name, gender, course, parallel FROM students WHERE id = ? AND institution_id = ?")
      .get(studentId, s.institution_id) as
      | { full_name: string; gender: string | null; course: string | null; parallel: string | null }
      | undefined;
    if (!st) throw new Error("Estudiante no encontrado.");
    name = st.full_name;
    if (!formData.get("gender")) gender = st.gender || "OTRO";
    course = course || st.course;
    parallel = parallel || st.parallel;

    // Reusar aplicación existente de este estudiante en la sesión.
    const existing = db
      .prepare("SELECT id, status FROM ovp_applications WHERE session_id = ? AND student_id = ? ORDER BY started_at DESC LIMIT 1")
      .get(s.id, studentId) as { id: string; status: string } | undefined;
    if (existing) {
      redirect(existing.status === "FINALIZADA" ? `/r/${code}/${existing.id}/gracias` : `/r/${code}/${existing.id}`);
    }
  }

  if (!name) throw new Error("Escribe tu nombre completo.");

  const age = int(formData, "age");
  const id = randomUUID();
  db.prepare(
    `INSERT INTO ovp_applications (id, session_id, institution_id, student_id, student_name, course_snapshot, parallel_snapshot, gender, age, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'EN_PROGRESO')`
  ).run(
    id,
    s.id,
    s.institution_id,
    studentId || null,
    name,
    course,
    parallel,
    normalizeGender(gender),
    age && age > 0 ? age : null
  );

  redirect(`/r/${code}/${id}`);
}

function loadApp(code: string, appId: string): { app: OvpApplicationRow } {
  const s = getOvpSessionByCode(code);
  if (!s) throw new Error("Evaluación no encontrada.");
  const app = db
    .prepare("SELECT * FROM ovp_applications WHERE id = ? AND session_id = ?")
    .get(appId, s.id) as OvpApplicationRow | undefined;
  if (!app) throw new Error("Aplicación no encontrada.");
  return { app };
}

export async function saveOvpProgress(
  code: string,
  appId: string,
  payload: { survey?: Record<string, unknown>; answers?: Record<string, number> }
): Promise<{ ok: boolean }> {
  const { app } = loadApp(code, appId);
  if (app.status === "FINALIZADA") return { ok: true };
  db.prepare(
    "UPDATE ovp_applications SET survey_json = ?, answers_json = ?, updated_at = datetime('now') WHERE id = ?"
  ).run(
    JSON.stringify(payload.survey ?? JSON.parse(app.survey_json || "{}")),
    JSON.stringify(payload.answers ?? JSON.parse(app.answers_json || "{}")),
    appId
  );
  return { ok: true };
}

export async function finalizeOvpApplication(
  code: string,
  appId: string,
  payload: { survey: Record<string, unknown>; answers: Record<string, number> }
): Promise<{ ok: boolean; error?: string }> {
  const { app } = loadApp(code, appId);
  if (app.status === "FINALIZADA") return { ok: true };

  const answers: Record<number, number> = {};
  for (const [k, v] of Object.entries(payload.answers || {})) {
    const n = Number(k);
    const val = Number(v);
    if (n >= 1 && n <= IPPJ_ITEMS.length && val >= 1 && val <= 5) answers[n] = val;
  }
  if (Object.keys(answers).length < IPPJ_ITEMS.length) {
    return { ok: false, error: "Faltan preguntas por responder." };
  }

  const result = scoreIppj(answers, app.gender);
  db.prepare(
    `UPDATE ovp_applications SET survey_json = ?, answers_json = ?, result_json = ?, status = 'FINALIZADA',
       finished_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`
  ).run(JSON.stringify(payload.survey || {}), JSON.stringify(answers), JSON.stringify(result), appId);

  return { ok: true };
}
