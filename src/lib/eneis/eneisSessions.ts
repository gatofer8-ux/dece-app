import { randomBytes, randomUUID } from "crypto";
import { db } from "@/lib/db";

// Sin caracteres ambiguos (0/O, 1/I/L) — igual que OVP y TaPas.
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
    const exists = db.prepare("SELECT 1 FROM eneis_sessions WHERE access_code = ?").get(code);
    if (!exists) return code;
  }
  return generateAccessCode(8);
}

export interface EneisSessionRow {
  id: string;
  institution_id: string;
  title: string;
  access_code: string;
  status: "ABIERTA" | "CERRADA";
  opens_at: string | null;
  closes_at: string | null;
  created_by_id: string | null;
  created_at: string;
  updated_at: string;
}

export function getEneisSessionByCode(code: string): EneisSessionRow | null {
  const row = db
    .prepare("SELECT * FROM eneis_sessions WHERE access_code = ?")
    .get(code.trim().toUpperCase()) as EneisSessionRow | undefined;
  return row || null;
}

export function getEneisSession(id: string, institutionId: string): EneisSessionRow | null {
  const row = db
    .prepare("SELECT * FROM eneis_sessions WHERE id = ? AND institution_id = ?")
    .get(id, institutionId) as EneisSessionRow | undefined;
  return row || null;
}

/** Una convocatoria está disponible para recibir fichas si está ABIERTA y dentro de fechas (si las tiene). */
export function isSessionOpen(s: EneisSessionRow): boolean {
  if (s.status !== "ABIERTA") return false;
  const now = new Date().toISOString().slice(0, 10);
  if (s.opens_at && now < s.opens_at.slice(0, 10)) return false;
  if (s.closes_at && now > s.closes_at.slice(0, 10)) return false;
  return true;
}

export function listEneisSessions(institutionId: string): EneisSessionRow[] {
  return db
    .prepare("SELECT * FROM eneis_sessions WHERE institution_id = ? ORDER BY created_at DESC")
    .all(institutionId) as EneisSessionRow[];
}

export function createEneisSession(input: {
  institutionId: string;
  title: string;
  opensAt: string | null;
  closesAt: string | null;
  createdBy: string | null;
}): string {
  const id = randomUUID();
  const code = generateUniqueAccessCode();
  db.prepare(
    `INSERT INTO eneis_sessions (id, institution_id, title, access_code, status, opens_at, closes_at, created_by_id)
     VALUES (?, ?, ?, ?, 'ABIERTA', ?, ?, ?)`
  ).run(id, input.institutionId, input.title, code, input.opensAt, input.closesAt, input.createdBy);
  return id;
}

export function setEneisSessionStatus(id: string, institutionId: string, status: "ABIERTA" | "CERRADA"): void {
  db.prepare(
    "UPDATE eneis_sessions SET status = ?, updated_at = datetime('now') WHERE id = ? AND institution_id = ?"
  ).run(status, id, institutionId);
}

export function deleteEneisSession(id: string, institutionId: string): void {
  db.prepare("DELETE FROM eneis_fichas WHERE session_id = ? AND institution_id = ?").run(id, institutionId);
  db.prepare("DELETE FROM eneis_sessions WHERE id = ? AND institution_id = ?").run(id, institutionId);
}

export interface EneisFichaRow {
  id: string;
  session_id: string;
  institution_id: string;
  docente_nombre: string;
  asignatura: string;
  subnivel: string | null;
  curso: string | null;
  paralelo: string | null;
  fecha_desde: string | null;
  fecha_hasta: string | null;
  nombre_ficha: string | null;
  objetivo_curricular: string | null;
  objetivo_eis: string | null;
  destrezas: string | null;
  orientacion_conceptual: string | null;
  recursos: string | null;
  anticipacion: string | null;
  conceptualizacion: string | null;
  consolidacion: string | null;
  indicadores_evaluacion: string | null;
  num_estudiantes_capacitados: number | null;
  observaciones: string | null;
  created_at: string;
}

export function listFichasForSession(sessionId: string): EneisFichaRow[] {
  return db
    .prepare("SELECT * FROM eneis_fichas WHERE session_id = ? ORDER BY created_at ASC")
    .all(sessionId) as EneisFichaRow[];
}

export function getEneisFicha(id: string, institutionId: string): EneisFichaRow | null {
  const row = db
    .prepare("SELECT * FROM eneis_fichas WHERE id = ? AND institution_id = ?")
    .get(id, institutionId) as EneisFichaRow | undefined;
  return row || null;
}

export function deleteEneisFicha(id: string, sessionId: string, institutionId: string): void {
  db.prepare("DELETE FROM eneis_fichas WHERE id = ? AND session_id = ? AND institution_id = ?").run(
    id,
    sessionId,
    institutionId
  );
}

export function createEneisFicha(input: {
  sessionId: string;
  institutionId: string;
  docenteNombre: string;
  asignatura: string;
  subnivel: string | null;
  curso: string | null;
  paralelo: string | null;
  fechaDesde: string | null;
  fechaHasta: string | null;
  nombreFicha: string | null;
  objetivoCurricular: string | null;
  objetivoEis: string | null;
  destrezas: string | null;
  orientacionConceptual: string | null;
  recursos: string | null;
  anticipacion: string | null;
  conceptualizacion: string | null;
  consolidacion: string | null;
  indicadoresEvaluacion: string | null;
  numEstudiantesCapacitados: number | null;
  observaciones: string | null;
}): string {
  const id = randomUUID();
  db.prepare(
    `INSERT INTO eneis_fichas (
      id, session_id, institution_id, docente_nombre, asignatura, subnivel, curso, paralelo,
      fecha_desde, fecha_hasta, nombre_ficha, objetivo_curricular, objetivo_eis, destrezas,
      orientacion_conceptual, recursos, anticipacion, conceptualizacion, consolidacion,
      indicadores_evaluacion, num_estudiantes_capacitados, observaciones
    ) VALUES (
      @id, @sessionId, @institutionId, @docenteNombre, @asignatura, @subnivel, @curso, @paralelo,
      @fechaDesde, @fechaHasta, @nombreFicha, @objetivoCurricular, @objetivoEis, @destrezas,
      @orientacionConceptual, @recursos, @anticipacion, @conceptualizacion, @consolidacion,
      @indicadoresEvaluacion, @numEstudiantesCapacitados, @observaciones
    )`
  ).run({ id, ...input });
  return id;
}
