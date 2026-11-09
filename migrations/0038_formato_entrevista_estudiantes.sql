-- Migracion 0038: Formato configurable por institucion (membrete, secciones/preguntas
-- y plantilla Word propia) y entrevista a estudiantes por preguntas.

CREATE TABLE IF NOT EXISTS institution_document_formats (
  institution_id  TEXT NOT NULL REFERENCES institutions(id),
  doc_type        TEXT NOT NULL,
  letterhead_json TEXT,
  structure_json  TEXT,
  template_docx   BLOB,
  template_name   TEXT,
  updated_by      TEXT REFERENCES users(id),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (institution_id, doc_type)
);

CREATE TABLE IF NOT EXISTS student_question_interviews (
  id               TEXT PRIMARY KEY,
  case_file_id     TEXT NOT NULL REFERENCES case_files(id) ON DELETE CASCADE,
  institution_id   TEXT NOT NULL REFERENCES institutions(id),
  professional_id  TEXT REFERENCES users(id),
  interviewee_name TEXT,
  course           TEXT,
  application_date TEXT,
  structure_json   TEXT NOT NULL,
  answers_json     TEXT NOT NULL DEFAULT '{}',
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_sqi_case ON student_question_interviews(case_file_id);
CREATE INDEX IF NOT EXISTS idx_sqi_institution ON student_question_interviews(institution_id);
