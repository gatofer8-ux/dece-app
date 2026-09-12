import { randomBytes, randomUUID } from "crypto";
import { db } from "@/lib/db";
import type { AlertIdentificationSessionRow, AlertIdentificationEntryRow } from "@/lib/types";

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
    const exists = db.prepare("SELECT 1 FROM alert_identification_sessions WHERE access_code = ?").get(code);
    if (!exists) return code;
  }
  return generateAccessCode(8);
}

export function getSessionByCode(code: string): AlertIdentificationSessionRow | null {
  const row = db
    .prepare("SELECT * FROM alert_identification_sessions WHERE access_code = ?")
    .get(code.trim().toUpperCase()) as AlertIdentificationSessionRow | undefined;
  return row || null;
}

export function getSession(id: string, institutionId: string): AlertIdentificationSessionRow | null {
  const row = db
    .prepare("SELECT * FROM alert_identification_sessions WHERE id = ? AND institution_id = ?")
    .get(id, institutionId) as AlertIdentificationSessionRow | undefined;
  return row || null;
}

export function listSessions(institutionId: string): AlertIdentificationSessionRow[] {
  return db
    .prepare("SELECT * FROM alert_identification_sessions WHERE institution_id = ? ORDER BY COALESCE(fecha, created_at) DESC, created_at DESC")
    .all(institutionId) as AlertIdentificationSessionRow[];
}

export function listEntriesForSession(sessionId: string): AlertIdentificationEntryRow[] {
  return db
    .prepare("SELECT * FROM alert_identification_entries WHERE session_id = ? ORDER BY created_at ASC")
    .all(sessionId) as AlertIdentificationEntryRow[];
}

export function getEntry(entryId: string, institutionId: string): AlertIdentificationEntryRow | null {
  const row = db
    .prepare("SELECT * FROM alert_identification_entries WHERE id = ? AND institution_id = ?")
    .get(entryId, institutionId) as AlertIdentificationEntryRow | undefined;
  return row || null;
}

export function createEntry(input: {
  sessionId: string;
  institutionId: string;
  studentName: string;
  riskType: string;
  teacherName: string;
  description?: string | null;
}): string {
  const id = randomUUID();
  db.prepare(
    `INSERT INTO alert_identification_entries (id, session_id, institution_id, student_name, risk_type, teacher_name, description)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(id, input.sessionId, input.institutionId, input.studentName, input.riskType, input.teacherName, input.description || null);
  return id;
}
