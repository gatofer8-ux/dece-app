"use server";

import { randomUUID } from "crypto";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { str } from "@/lib/formData";
import { getTapasSessionByCode, isTapasSessionOpen } from "@/lib/tapas/tapasSessions";
import { scoreTapas } from "@/lib/tapas/tapasScoring";
import { ARCHETYPE_MAP, MIN_IDENTIFIED, type TapasChoice, type TalentGroup } from "@/lib/tapas/archetypes";
import { suggestTapasGroupName } from "@/lib/ai";
import type { TapasApplicationRow } from "@/lib/types";

export async function startTapasApplication(code: string, formData: FormData) {
  const s = getTapasSessionByCode(code);
  if (!s || !isTapasSessionOpen(s)) throw new Error("Este juego no está disponible.");

  const studentId = str(formData, "student_id");
  let name = (str(formData, "student_name") || "").trim();
  let course = str(formData, "course") || s.course;
  let parallel = str(formData, "parallel") || s.parallel;

  if (studentId) {
    const st = db
      .prepare("SELECT full_name, course, parallel FROM students WHERE id = ? AND institution_id = ?")
      .get(studentId, s.institution_id) as { full_name: string; course: string | null; parallel: string | null } | undefined;
    if (!st) throw new Error("Estudiante no encontrado.");
    name = st.full_name;
    course = course || st.course;
    parallel = parallel || st.parallel;

    const existing = db
      .prepare("SELECT id, status FROM tapas_applications WHERE session_id = ? AND student_id = ? ORDER BY started_at DESC LIMIT 1")
      .get(s.id, studentId) as { id: string; status: string } | undefined;
    if (existing) {
      redirect(existing.status === "FINALIZADA" ? `/j/${code}/${existing.id}/gracias` : `/j/${code}/${existing.id}`);
    }
  }

  if (!name) throw new Error("Escribe tu nombre completo.");

  const id = randomUUID();
  db.prepare(
    `INSERT INTO tapas_applications (id, session_id, institution_id, student_id, student_name, course_snapshot, parallel_snapshot, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'EN_PROGRESO')`
  ).run(id, s.id, s.institution_id, studentId || null, name, course, parallel);

  redirect(`/j/${code}/${id}`);
}

function loadApp(code: string, appId: string): TapasApplicationRow {
  const s = getTapasSessionByCode(code);
  if (!s) throw new Error("Juego no encontrado.");
  const app = db
    .prepare("SELECT * FROM tapas_applications WHERE id = ? AND session_id = ?")
    .get(appId, s.id) as TapasApplicationRow | undefined;
  if (!app) throw new Error("Juego no encontrado.");
  return app;
}

export async function saveTapasProgress(
  code: string,
  appId: string,
  payload: {
    classification?: Record<string, TapasChoice>;
    groups?: TalentGroup[];
    reflection?: string;
    future_letter?: string;
  }
): Promise<{ ok: boolean }> {
  const app = loadApp(code, appId);
  if (app.status === "FINALIZADA") return { ok: true };
  db.prepare(
    `UPDATE tapas_applications SET classification_json = ?, groups_json = ?, reflection = ?, future_letter = ?, updated_at = datetime('now') WHERE id = ?`
  ).run(
    JSON.stringify(payload.classification ?? JSON.parse(app.classification_json || "{}")),
    JSON.stringify(payload.groups ?? JSON.parse(app.groups_json || "[]")),
    payload.reflection ?? app.reflection,
    payload.future_letter ?? app.future_letter,
    appId
  );
  return { ok: true };
}

export async function suggestGroupName(
  code: string,
  appId: string,
  archetypeKeys: string[]
): Promise<{ name?: string; error?: string }> {
  loadApp(code, appId); // valida pertenencia
  const names = archetypeKeys.map((k) => ARCHETYPE_MAP[k]?.name).filter(Boolean) as string[];
  return suggestTapasGroupName(names);
}

export async function finalizeTapasApplication(
  code: string,
  appId: string,
  payload: {
    classification: Record<string, TapasChoice>;
    groups: TalentGroup[];
    reflection: string;
    future_letter: string;
  }
): Promise<{ ok: boolean; error?: string }> {
  const app = loadApp(code, appId);
  if (app.status === "FINALIZADA") return { ok: true };

  const identified = Object.values(payload.classification || {}).filter((v) => v === "SI").length;
  if (identified < MIN_IDENTIFIED) {
    return { ok: false, error: `Necesitas al menos ${MIN_IDENTIFIED} tarjetas con las que te identifiques.` };
  }
  const groups = (payload.groups || []).filter((g) => (g.archetypes || []).length > 0);
  if (groups.length < 3) {
    return { ok: false, error: "Arma al menos 3 grupos de talentos." };
  }

  const result = scoreTapas(payload.classification, groups);
  db.prepare(
    `UPDATE tapas_applications SET classification_json = ?, groups_json = ?, reflection = ?, future_letter = ?,
       result_json = ?, status = 'FINALIZADA', finished_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`
  ).run(
    JSON.stringify(payload.classification),
    JSON.stringify(groups),
    payload.reflection || "",
    payload.future_letter || "",
    JSON.stringify(result),
    appId
  );

  return { ok: true };
}
