import { db } from "./db";
import { institutionAcronym, documentToken, buildCaseCode } from "./codesShared";

export { deriveAcronym, institutionAcronym, documentToken, buildCaseCode } from "./codesShared";

/**
 * Genera el código para un caso NUEVO del estudiante indicado, garantizando
 * que sea único dentro de la institución.
 *
 * Formato: `SIGLAS-DOCUMENTO-AÑO-NN` (ej. `UESR-1805123456-2026-01`).
 * NN es el número de caso de ese estudiante (puede tener varios).
 */
export function nextCaseCode(institutionId: string, studentId: string): string {
  const inst = db
    .prepare("SELECT acronym, name FROM institutions WHERE id = ?")
    .get(institutionId) as { acronym: string | null; name: string | null } | undefined;
  const student = db
    .prepare("SELECT document_id FROM students WHERE id = ?")
    .get(studentId) as { document_id: string | null } | undefined;

  const acronym = institutionAcronym(inst);
  const docToken = documentToken(student?.document_id, studentId);
  const year = new Date().getFullYear();

  const existingForStudent = db
    .prepare("SELECT COUNT(*) as n FROM case_files WHERE student_id = ?")
    .get(studentId) as { n: number };

  let seq = (existingForStudent?.n || 0) + 1;
  const exists = db.prepare(
    "SELECT 1 FROM case_files WHERE institution_id = ? AND code = ? LIMIT 1"
  );
  let code = buildCaseCode(acronym, docToken, year, seq);
  while (exists.get(institutionId, code)) {
    seq += 1;
    code = buildCaseCode(acronym, docToken, year, seq);
  }
  return code;
}
