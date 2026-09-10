-- Migracion 0009: Esquelas de Citacion y Convocatorias DECE
-- Soporte de numeracion propia de citaciones (CIT-[Siglas]-[Ano]-NNN)
-- Talon de acuse de recibo desprendible con receptor flexible (estudiante, representante u otro familiar).

CREATE TABLE IF NOT EXISTS dece_citation_sequences (
  institution_id   TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  school_year_code TEXT NOT NULL,
  last_number      INTEGER NOT NULL DEFAULT 0,
  updated_at       TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (institution_id, school_year_code)
);

CREATE TABLE IF NOT EXISTS dece_esquelas (
  id                       TEXT PRIMARY KEY,
  institution_id           TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  citation_number          TEXT NOT NULL UNIQUE,
  sequence_number          INTEGER NOT NULL,
  school_year_code         TEXT NOT NULL,
  case_file_id             TEXT REFERENCES case_files(id) ON DELETE SET NULL,
  student_id               TEXT REFERENCES students(id) ON DELETE SET NULL,
  student_name             TEXT NOT NULL,
  student_id_number        TEXT,
  course                   TEXT,
  parallel                 TEXT,
  jornada                  TEXT,
  representative_name      TEXT NOT NULL,
  representative_id_number TEXT,
  representative_phone     TEXT,
  citation_date            TEXT NOT NULL,
  citation_time            TEXT NOT NULL,
  citation_place           TEXT DEFAULT 'Oficina del DECE',
  citation_reason          TEXT NOT NULL,
  urgency_level            TEXT DEFAULT 'ORDINARIA',
  professional_id          TEXT REFERENCES users(id) ON DELETE SET NULL,
  professional_name        TEXT NOT NULL,
  professional_role        TEXT DEFAULT 'Profesional DECE',
  observations             TEXT,
  talon_returned           INTEGER DEFAULT 0,
  received_by_name         TEXT,
  received_by_relation     TEXT,
  received_by_id_number    TEXT,
  received_date            TEXT,
  talon_attended           INTEGER DEFAULT 0,
  talon_notes              TEXT,
  created_at               TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at               TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_dece_esquelas_inst ON dece_esquelas(institution_id);
CREATE INDEX IF NOT EXISTS idx_dece_esquelas_case ON dece_esquelas(case_file_id);
CREATE INDEX IF NOT EXISTS idx_dece_esquelas_student ON dece_esquelas(student_id);
CREATE INDEX IF NOT EXISTS idx_dece_esquelas_date ON dece_esquelas(citation_date);
