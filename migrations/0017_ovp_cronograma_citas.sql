-- Cronograma de citas para la entrevista de toma de decisión del OVP (décimo EGB).
-- Guarda una "foto" de la lista de estudiantes con su hora asignada al momento de
-- generar el cronograma, para que reimprimirlo más tarde no cambie los horarios
-- ya comunicados a los tutores aunque la matrícula del curso cambie después.
CREATE TABLE IF NOT EXISTS ovp_interview_schedules (
  id                 TEXT PRIMARY KEY,
  institution_id     TEXT NOT NULL REFERENCES institutions(id),
  title              TEXT NOT NULL,
  course             TEXT NOT NULL,
  parallels_json     TEXT NOT NULL DEFAULT '[]', -- JSON array de paralelos, en el orden en que se agenda
  interview_date     TEXT,                        -- YYYY-MM-DD
  start_time         TEXT NOT NULL DEFAULT '07:00', -- HH:MM
  slot_minutes       INTEGER NOT NULL DEFAULT 10,
  students_per_slot  INTEGER NOT NULL DEFAULT 3,
  location           TEXT,
  entries_json       TEXT NOT NULL DEFAULT '[]', -- snapshot: [{parallel, position, student_id, full_name, document_id, time}]
  created_by         TEXT REFERENCES users(id),
  created_at         TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at         TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_ovp_cronograma_institution ON ovp_interview_schedules(institution_id, created_at DESC);
