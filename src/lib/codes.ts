import { db } from "./db";

/** Genera un código correlativo para un caso dentro de una institución, p.ej. DECE-2026-0001 */
export function nextCaseCode(institutionId: string): string {
  const year = new Date().getFullYear();
  const row = db
    .prepare(`SELECT COUNT(*) as n FROM case_files WHERE code LIKE ? AND institution_id = ?`)
    .get(`DECE-${year}-%`, institutionId) as { n: number };
  const next = (row?.n || 0) + 1;
  return `DECE-${year}-${String(next).padStart(4, "0")}`;
}
