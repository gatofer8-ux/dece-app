import { randomBytes } from "crypto";
import { db } from "@/lib/db";
import type { OvpSessionRow } from "@/lib/types";

// Sin caracteres ambiguos (0/O, 1/I/L).
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
    const exists = db.prepare("SELECT 1 FROM ovp_sessions WHERE access_code = ?").get(code);
    if (!exists) return code;
  }
  return generateAccessCode(8);
}

export function getOvpSessionByCode(code: string): OvpSessionRow | null {
  const row = db
    .prepare("SELECT * FROM ovp_sessions WHERE access_code = ?")
    .get(code.trim().toUpperCase()) as OvpSessionRow | undefined;
  return row || null;
}

/** Una sesión está disponible para responder si está ABIERTA y dentro de fechas (si las tiene). */
export function isSessionOpen(s: OvpSessionRow): boolean {
  if (s.status !== "ABIERTA") return false;
  const now = new Date().toISOString().slice(0, 10);
  if (s.opens_at && now < s.opens_at.slice(0, 10)) return false;
  if (s.closes_at && now > s.closes_at.slice(0, 10)) return false;
  return true;
}

export interface RosterStudent {
  id: string;
  full_name: string;
  gender: string | null;
  course: string | null;
  parallel: string | null;
}

/** Estudiantes candidatos para la sesión (por curso/paralelo si están definidos). */
export function getSessionRoster(s: OvpSessionRow): RosterStudent[] {
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
    .prepare(`SELECT id, full_name, gender, course, parallel FROM students WHERE ${where} ORDER BY full_name ASC`)
    .all(...params) as RosterStudent[];
}

export function normalizeGender(raw: string | null | undefined): "FEMENINO" | "MASCULINO" | "OTRO" {
  const g = (raw || "").toUpperCase().trim();
  if (g.startsWith("F") || g.includes("MUJER")) return "FEMENINO";
  if (g.startsWith("M") || g.includes("HOMBRE") || g.includes("VARON") || g.includes("VARÓN")) return "MASCULINO";
  return "OTRO";
}
