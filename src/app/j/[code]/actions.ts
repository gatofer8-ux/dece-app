"use server";

import { randomUUID } from "crypto";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { str } from "@/lib/formData";
import { getTapasSessionByCode, isTapasSessionOpen } from "@/lib/tapas/tapasSessions";
import { scoreTapas } from "@/lib/tapas/tapasScoring";
import { ARCHETYPE_MAP, type TapasChoice, type TalentGroup } from "@/lib/tapas/archetypes";
import { TAPAS_NIVELES, isTapasNivel, isProfileInstrument, type TapasNivel } from "@/lib/tapas/niveles";
import {
  sanitizePerfilData,
  validatePerfil,
  scorePerfil,
  sanitizeExperimento,
  validateExperimento,
  scoreExperimento,
} from "@/lib/tapas/instruments";
import { suggestTapasGroupName } from "@/lib/ai";
import { parsePlan, isMultiHoja, isHojaOpen } from "@/lib/tapas/plan";
import { isTapasInstrument } from "@/lib/tapas/niveles";
import type { TapasApplicationRow, TapasSessionRow } from "@/lib/types";

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
  }
  if (!name) throw new Error("Escribe tu nombre completo.");

  const plan = parsePlan(s);
  if (isMultiHoja(plan)) {
    // La misma persona retoma su proceso: por estudiante de la lista o por nombre escrito.
    const existing = (
      studentId
        ? db.prepare("SELECT participant_id FROM tapas_applications WHERE session_id = ? AND student_id = ? AND participant_id IS NOT NULL LIMIT 1").get(s.id, studentId)
        : db
            .prepare(
              "SELECT participant_id FROM tapas_applications WHERE session_id = ? AND student_id IS NULL AND participant_id IS NOT NULL AND LOWER(TRIM(student_name)) = LOWER(TRIM(?)) LIMIT 1"
            )
            .get(s.id, name)
    ) as { participant_id: string } | undefined;
    if (existing) redirect(`/j/${code}/h/${existing.participant_id}`);

    const participantId = randomUUID();
    const insert = db.prepare(
      `INSERT INTO tapas_applications (id, session_id, institution_id, student_id, student_name, course_snapshot, parallel_snapshot, status, instrument, participant_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'EN_PROGRESO', ?, ?)`
    );
    db.transaction(() => {
      for (const instrument of plan.instruments) {
        insert.run(randomUUID(), s.id, s.institution_id, studentId || null, name, course, parallel, instrument, participantId);
      }
    })();
    redirect(`/j/${code}/h/${participantId}`);
  }

  if (studentId) {
    const existing = db
      .prepare("SELECT id, status FROM tapas_applications WHERE session_id = ? AND student_id = ? ORDER BY started_at DESC LIMIT 1")
      .get(s.id, studentId) as { id: string; status: string } | undefined;
    if (existing) {
      redirect(existing.status === "FINALIZADA" ? `/j/${code}/${existing.id}/gracias` : `/j/${code}/${existing.id}`);
    }
  }

  const id = randomUUID();
  db.prepare(
    `INSERT INTO tapas_applications (id, session_id, institution_id, student_id, student_name, course_snapshot, parallel_snapshot, status, instrument)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'EN_PROGRESO', ?)`
  ).run(id, s.id, s.institution_id, studentId || null, name, course, parallel, s.instrument || "ARQUETIPOS");

  redirect(`/j/${code}/${id}`);
}

/** La hoja de esta aplicación está habilitada por el DECE (en procesos de varias hojas). */
function assertHojaOpen(s: TapasSessionRow, app: TapasApplicationRow) {
  const plan = parsePlan(s);
  const instrument = isTapasInstrument(app.instrument) ? app.instrument : "ARQUETIPOS";
  if (isMultiHoja(plan) && !isHojaOpen(plan, instrument)) {
    throw new Error("Esta hoja todavía no está habilitada. Espera a que el DECE la abra.");
  }
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
  assertHojaOpen(getTapasSessionByCode(code)!, app);

  const nivel = sessionNivel(code);
  const cfg = TAPAS_NIVELES[nivel];
  const identified = Object.values(payload.classification || {}).filter((v) => v === "SI").length;
  if (identified < cfg.minIdentified) {
    return { ok: false, error: `Necesitas al menos ${cfg.minIdentified} tarjetas con las que te identifiques.` };
  }
  const groups = (payload.groups || []).filter((g) => (g.archetypes || []).length > 0);
  if (groups.length < cfg.minGroups) {
    return {
      ok: false,
      error: cfg.arquetiposFlow === "FAVORITAS" ? "Elige al menos una tarjeta favorita." : `Arma al menos ${cfg.minGroups} grupos de talentos.`,
    };
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

function sessionNivel(code: string): TapasNivel {
  const s = getTapasSessionByCode(code);
  return s && isTapasNivel(s.nivel) ? s.nivel : "BACHILLERATO";
}

/** Guarda el avance del perfil de talentos o del experimento (se puede pausar y retomar). */
export async function saveTapasData(code: string, appId: string, data: unknown): Promise<{ ok: boolean }> {
  const app = loadApp(code, appId);
  if (app.status === "FINALIZADA") return { ok: true };
  const s = getTapasSessionByCode(code)!;
  assertHojaOpen(s, app);
  const clean = cleanForInstrument(app.instrument, data);
  if (!clean) return { ok: false };
  db.prepare("UPDATE tapas_applications SET data_json = ?, updated_at = datetime('now') WHERE id = ?").run(
    JSON.stringify(clean),
    appId
  );
  return { ok: true };
}

function cleanForInstrument(instrument: string, data: unknown) {
  if (instrument === "PERFIL_V1") return sanitizePerfilData(data, 1);
  if (instrument === "PERFIL_V2") return sanitizePerfilData(data, 2);
  if (instrument === "EXPERIMENTO") return sanitizeExperimento(data);
  return null;
}

/**
 * Cierra el perfil de talentos (envía) o una sesión del experimento.
 * Experimento: la sesión 1 solo guarda y deja la aplicación EN_PROGRESO; la sesión 2 la finaliza.
 */
export async function finalizeTapasInstrument(
  code: string,
  appId: string,
  data: unknown,
  extra?: { reflection?: string }
): Promise<{ ok: boolean; error?: string; sesion1Saved?: boolean }> {
  const app = loadApp(code, appId);
  if (app.status === "FINALIZADA") return { ok: true };
  const s = getTapasSessionByCode(code)!;
  assertHojaOpen(s, app);
  const nivel = sessionNivel(code);
  const reflection = (extra?.reflection || "").slice(0, 2000);

  if (isProfileInstrument(app.instrument as never)) {
    const clean = sanitizePerfilData(data, app.instrument === "PERFIL_V1" ? 1 : 2);
    const errors = validatePerfil(clean, nivel);
    if (errors.length) return { ok: false, error: errors[0] };
    const result = scorePerfil(clean);
    db.prepare(
      `UPDATE tapas_applications SET data_json = ?, reflection = ?, result_json = ?, status = 'FINALIZADA',
         finished_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`
    ).run(JSON.stringify(clean), reflection || clean.closing || "", JSON.stringify(result), appId);
    return { ok: true };
  }

  if (app.instrument === "EXPERIMENTO") {
    const clean = sanitizeExperimento(data);
    const sesion = clean.sesion;
    const errors = validateExperimento(clean, sesion, nivel);
    if (errors.length) return { ok: false, error: errors[0] };
    if (sesion === 1) {
      clean.sesion1At = clean.sesion1At || new Date().toISOString();
      db.prepare("UPDATE tapas_applications SET data_json = ?, updated_at = datetime('now') WHERE id = ?").run(
        JSON.stringify(clean),
        appId
      );
      return { ok: true, sesion1Saved: true };
    }
    const result = scoreExperimento(clean, nivel);
    db.prepare(
      `UPDATE tapas_applications SET data_json = ?, reflection = ?, result_json = ?, status = 'FINALIZADA',
         finished_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`
    ).run(JSON.stringify(clean), clean.p8, JSON.stringify(result), appId);
    return { ok: true };
  }

  return { ok: false, error: "Este instrumento no se envía por aquí." };
}
