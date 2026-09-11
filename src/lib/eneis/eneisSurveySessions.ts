import { randomBytes, randomUUID } from "crypto";
import { db } from "@/lib/db";
import { getSurveyQuestions, type EneisSurveyInstrument } from "./eneisSurveyInstrument";

const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function generateAccessCode(len = 6): string {
  const bytes = randomBytes(len);
  let out = "";
  for (let i = 0; i < len; i++) out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  return out;
}

export function generateUniqueAccessCode(): string {
  for (let attempt = 0; attempt < 12; attempt++) {
    const code = generateAccessCode();
    const exists = db.prepare("SELECT 1 FROM eneis_survey_sessions WHERE access_code = ?").get(code);
    if (!exists) return code;
  }
  return generateAccessCode(8);
}

export interface EneisSurveySessionRow {
  id: string;
  institution_id: string;
  title: string;
  instrument: EneisSurveyInstrument;
  access_code: string;
  status: "ABIERTA" | "CERRADA";
  opens_at: string | null;
  closes_at: string | null;
  created_by_id: string | null;
  created_at: string;
  updated_at: string;
}

export function getSurveySessionByCode(code: string): EneisSurveySessionRow | null {
  const row = db
    .prepare("SELECT * FROM eneis_survey_sessions WHERE access_code = ?")
    .get(code.trim().toUpperCase()) as EneisSurveySessionRow | undefined;
  return row || null;
}

export function getSurveySession(id: string, institutionId: string): EneisSurveySessionRow | null {
  const row = db
    .prepare("SELECT * FROM eneis_survey_sessions WHERE id = ? AND institution_id = ?")
    .get(id, institutionId) as EneisSurveySessionRow | undefined;
  return row || null;
}

export function isSurveySessionOpen(s: EneisSurveySessionRow): boolean {
  if (s.status !== "ABIERTA") return false;
  const now = new Date().toISOString().slice(0, 10);
  if (s.opens_at && now < s.opens_at.slice(0, 10)) return false;
  if (s.closes_at && now > s.closes_at.slice(0, 10)) return false;
  return true;
}

export function listSurveySessions(institutionId: string): EneisSurveySessionRow[] {
  return db
    .prepare("SELECT * FROM eneis_survey_sessions WHERE institution_id = ? ORDER BY created_at DESC")
    .all(institutionId) as EneisSurveySessionRow[];
}

export function createSurveySession(input: {
  institutionId: string;
  title: string;
  instrument: EneisSurveyInstrument;
  opensAt: string | null;
  closesAt: string | null;
  createdBy: string | null;
}): string {
  const id = randomUUID();
  const code = generateUniqueAccessCode();
  db.prepare(
    `INSERT INTO eneis_survey_sessions (id, institution_id, title, instrument, access_code, status, opens_at, closes_at, created_by_id)
     VALUES (?, ?, ?, ?, ?, 'ABIERTA', ?, ?, ?)`
  ).run(id, input.institutionId, input.title, input.instrument, code, input.opensAt, input.closesAt, input.createdBy);
  return id;
}

export function setSurveySessionStatus(id: string, institutionId: string, status: "ABIERTA" | "CERRADA"): void {
  db.prepare(
    "UPDATE eneis_survey_sessions SET status = ?, updated_at = datetime('now') WHERE id = ? AND institution_id = ?"
  ).run(status, id, institutionId);
}

export function deleteSurveySession(id: string, institutionId: string): void {
  db.prepare("DELETE FROM eneis_survey_responses WHERE session_id = ? AND institution_id = ?").run(id, institutionId);
  db.prepare("DELETE FROM eneis_survey_sessions WHERE id = ? AND institution_id = ?").run(id, institutionId);
}

export function createSurveyResponse(input: { sessionId: string; institutionId: string; answers: number[] }): string {
  const id = randomUUID();
  db.prepare(
    "INSERT INTO eneis_survey_responses (id, session_id, institution_id, answers_json) VALUES (?, ?, ?, ?)"
  ).run(id, input.sessionId, input.institutionId, JSON.stringify(input.answers));
  return id;
}

export function countSurveyResponses(sessionId: string): number {
  const row = db.prepare("SELECT COUNT(*) AS n FROM eneis_survey_responses WHERE session_id = ?").get(sessionId) as {
    n: number;
  };
  return row.n;
}

export interface QuestionTabulation {
  text: string;
  options: { label: string; count: number; pct: number }[];
  totalAnswered: number;
}

/** Cuenta cuántas veces se eligió cada opción, por pregunta, sobre todas las respuestas de la sesión. */
export function tabulateSurveySession(session: EneisSurveySessionRow): QuestionTabulation[] {
  const questions = getSurveyQuestions(session.instrument);
  const rows = db
    .prepare("SELECT answers_json FROM eneis_survey_responses WHERE session_id = ?")
    .all(session.id) as { answers_json: string }[];

  const counts: number[][] = questions.map((q) => new Array(q.options.length).fill(0));

  for (const row of rows) {
    let answers: unknown;
    try {
      answers = JSON.parse(row.answers_json);
    } catch {
      continue;
    }
    if (!Array.isArray(answers)) continue;
    answers.forEach((raw, qi) => {
      const idx = Number(raw);
      if (questions[qi] && Number.isInteger(idx) && idx >= 0 && idx < questions[qi].options.length) {
        counts[qi][idx]++;
      }
    });
  }

  return questions.map((q, qi) => {
    const totalAnswered = counts[qi].reduce((a, b) => a + b, 0);
    return {
      text: q.text,
      totalAnswered,
      options: q.options.map((label, oi) => ({
        label,
        count: counts[qi][oi],
        pct: totalAnswered > 0 ? Math.round((counts[qi][oi] / totalAnswered) * 100) : 0,
      })),
    };
  });
}
