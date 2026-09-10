import type Database from "better-sqlite3";
import { institutionAcronym, documentToken, buildCaseCode } from "./codesShared";

/**
 * Recodifica de una sola vez los casos que aún tienen el formato antiguo
 * (`DECE-AAAA-NNNN`) al nuevo `SIGLAS-DOCUMENTO-AÑO-NN`. Guarda el código previo
 * en `case_files.legacy_code`.
 *
 * Idempotente: un caso ya recodificado (legacy_code != NULL) se ignora, así que
 * es seguro llamarlo en cada arranque, después de aplicar las migraciones.
 */
export function recodifyExistingCases(conn: Database.Database): void {
  type Row = {
    id: string;
    institution_id: string;
    student_id: string;
    code: string;
    created_at: string;
    detection_date: string | null;
    document_id: string | null;
    acronym: string | null;
    inst_name: string | null;
  };

  let pending: Row[];
  try {
    pending = conn
      .prepare(
        `SELECT cf.id, cf.institution_id, cf.student_id, cf.code, cf.created_at,
                cf.detection_date, s.document_id, i.acronym, i.name AS inst_name
           FROM case_files cf
           JOIN students s ON s.id = cf.student_id
           JOIN institutions i ON i.id = cf.institution_id
          WHERE cf.legacy_code IS NULL AND cf.code LIKE 'DECE-%'
          ORDER BY cf.institution_id, cf.student_id, cf.created_at ASC`
      )
      .all() as Row[];
  } catch {
    // Columnas nuevas aún inexistentes (base sin migrar) — nada que hacer.
    return;
  }

  if (pending.length === 0) return;

  const taken = new Set(
    (
      conn.prepare("SELECT institution_id, code FROM case_files").all() as Array<{
        institution_id: string;
        code: string;
      }>
    ).map((r) => `${r.institution_id}::${r.code}`)
  );
  const seqByStudent = new Map<string, number>();
  const update = conn.prepare("UPDATE case_files SET code = ?, legacy_code = ? WHERE id = ?");

  const tx = conn.transaction(() => {
    for (const row of pending) {
      const acronym = institutionAcronym({ acronym: row.acronym, name: row.inst_name });
      const docToken = documentToken(row.document_id, row.student_id);
      const year =
        new Date(row.detection_date || row.created_at || Date.now()).getFullYear() ||
        new Date().getFullYear();

      let seq = (seqByStudent.get(row.student_id) || 0) + 1;
      let code = buildCaseCode(acronym, docToken, year, seq);
      while (taken.has(`${row.institution_id}::${code}`)) {
        seq += 1;
        code = buildCaseCode(acronym, docToken, year, seq);
      }
      seqByStudent.set(row.student_id, seq);
      taken.add(`${row.institution_id}::${code}`);
      taken.delete(`${row.institution_id}::${row.code}`);
      update.run(code, row.code, row.id);
    }
  });
  tx();
  console.log(
    `[codigos] ${pending.length} caso(s) recodificado(s) al nuevo formato SIGLAS-DOCUMENTO-AÑO-NN`
  );
}
