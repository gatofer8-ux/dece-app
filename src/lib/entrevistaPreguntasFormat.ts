import { db } from "./db";
import {
  DOC_TYPE_ENTREVISTA_PREGUNTAS as DOC_TYPE,
  parseLetterhead,
  parseStructure,
  type InterviewStructure,
  type Letterhead,
} from "./entrevistaPreguntas";

export interface InterviewFormat {
  letterhead: Letterhead;
  structure: InterviewStructure;
  templateName: string | null;
}

interface FormatRow {
  letterhead_json: string | null;
  structure_json: string | null;
  template_name: string | null;
}

export function getInterviewFormat(institutionId: string): InterviewFormat {
  const inst = db.prepare("SELECT name FROM institutions WHERE id = ?").get(institutionId) as { name: string } | undefined;
  const row = db
    .prepare(
      "SELECT letterhead_json, structure_json, template_name FROM institution_document_formats WHERE institution_id = ? AND doc_type = ?"
    )
    .get(institutionId, DOC_TYPE) as FormatRow | undefined;
  return {
    letterhead: parseLetterhead(row?.letterhead_json, inst?.name || ""),
    structure: parseStructure(row?.structure_json),
    templateName: row?.template_name || null,
  };
}

export function getInterviewTemplate(institutionId: string): { name: string; data: Buffer } | null {
  const row = db
    .prepare(
      "SELECT template_docx, template_name FROM institution_document_formats WHERE institution_id = ? AND doc_type = ? AND template_docx IS NOT NULL"
    )
    .get(institutionId, DOC_TYPE) as { template_docx: Buffer; template_name: string | null } | undefined;
  if (!row) return null;
  return { name: row.template_name || "plantilla.docx", data: Buffer.from(row.template_docx) };
}

function ensureRow(institutionId: string, userId: string) {
  db.prepare(
    `INSERT INTO institution_document_formats (institution_id, doc_type, updated_by)
     VALUES (?, ?, ?)
     ON CONFLICT(institution_id, doc_type) DO NOTHING`
  ).run(institutionId, DOC_TYPE, userId);
}

export function saveInterviewFormat(
  institutionId: string,
  userId: string,
  letterhead: Letterhead,
  structure: InterviewStructure
) {
  ensureRow(institutionId, userId);
  db.prepare(
    `UPDATE institution_document_formats
        SET letterhead_json = ?, structure_json = ?, updated_by = ?, updated_at = datetime('now')
      WHERE institution_id = ? AND doc_type = ?`
  ).run(JSON.stringify(letterhead), JSON.stringify(structure), userId, institutionId, DOC_TYPE);
}

export function saveInterviewTemplate(institutionId: string, userId: string, name: string, data: Buffer) {
  ensureRow(institutionId, userId);
  db.prepare(
    `UPDATE institution_document_formats
        SET template_docx = ?, template_name = ?, updated_by = ?, updated_at = datetime('now')
      WHERE institution_id = ? AND doc_type = ?`
  ).run(data, name, userId, institutionId, DOC_TYPE);
}

export function removeInterviewTemplate(institutionId: string, userId: string) {
  db.prepare(
    `UPDATE institution_document_formats
        SET template_docx = NULL, template_name = NULL, updated_by = ?, updated_at = datetime('now')
      WHERE institution_id = ? AND doc_type = ?`
  ).run(userId, institutionId, DOC_TYPE);
}
