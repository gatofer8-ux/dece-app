import { db } from "@/lib/db";
import { generateAccessCode } from "@/lib/ovp/ovpSessions";
import type { TapasSessionRow } from "@/lib/types";

export { generateAccessCode };

export function generateUniqueTapasCode(): string {
  for (let attempt = 0; attempt < 12; attempt++) {
    const code = generateAccessCode();
    const exists = db.prepare("SELECT 1 FROM tapas_sessions WHERE access_code = ?").get(code);
    if (!exists) return code;
  }
  return generateAccessCode(8);
}

export function getTapasSessionByCode(code: string): TapasSessionRow | null {
  const row = db
    .prepare("SELECT * FROM tapas_sessions WHERE access_code = ?")
    .get(code.trim().toUpperCase()) as TapasSessionRow | undefined;
  return row || null;
}

export function isTapasSessionOpen(s: TapasSessionRow): boolean {
  if (s.status !== "ABIERTA") return false;
  const now = new Date().toISOString().slice(0, 10);
  if (s.opens_at && now < s.opens_at.slice(0, 10)) return false;
  if (s.closes_at && now > s.closes_at.slice(0, 10)) return false;
  return true;
}

export interface TapasRosterStudent {
  id: string;
  full_name: string;
  course: string | null;
  parallel: string | null;
}

export function getTapasSessionRoster(s: TapasSessionRow): TapasRosterStudent[] {
  const params: unknown[] = [s.institution_id];
  let where = "institution_id = ? AND active = 1";
  if (s.course) {
    where += " AND course = ?";
    params.push(s.course);
  }
  if (s.parallel) {
    where += " AND parallel = ?";
    params.push(s.parallel);
  }
  return db
    .prepare(`SELECT id, full_name, course, parallel FROM students WHERE ${where} ORDER BY full_name ASC`)
    .all(...params) as TapasRosterStudent[];
}
