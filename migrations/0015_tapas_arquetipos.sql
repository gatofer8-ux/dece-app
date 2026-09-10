-- Migracion 0015: Juego de Tarjetas de Arquetipos (Proyecto TaPas - VVOB / MinEduc).
-- Herramienta de Orientacion Vocacional y Profesional aplicada en linea, sin cuenta.
-- El estudiante clasifica 74 arquetipos, arma grupos de talentos y los ordena.

CREATE TABLE IF NOT EXISTS tapas_sessions (
  id              TEXT PRIMARY KEY,
  institution_id  TEXT NOT NULL REFERENCES institutions(id),
  created_by_id   TEXT REFERENCES users(id),
  school_year_id  TEXT REFERENCES school_years(id),

  title           TEXT NOT NULL,
  course          TEXT,
  parallel        TEXT,
  jornada         TEXT,

  access_code     TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'ABIERTA',
  opens_at        TEXT,
  closes_at       TEXT,

  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS uidx_tapas_sessions_code ON tapas_sessions(access_code);
CREATE INDEX IF NOT EXISTS idx_tapas_sessions_institution ON tapas_sessions(institution_id);

CREATE TABLE IF NOT EXISTS tapas_applications (
  id                TEXT PRIMARY KEY,
  session_id        TEXT NOT NULL REFERENCES tapas_sessions(id),
  institution_id    TEXT NOT NULL REFERENCES institutions(id),
  student_id        TEXT REFERENCES students(id),

  student_name      TEXT NOT NULL,
  course_snapshot   TEXT,
  parallel_snapshot TEXT,

  status            TEXT NOT NULL DEFAULT 'EN_PROGRESO',
  classification_json TEXT NOT NULL DEFAULT '{}',
  groups_json       TEXT NOT NULL DEFAULT '[]',
  reflection        TEXT,
  future_letter     TEXT,
  result_json       TEXT,

  started_at        TEXT NOT NULL DEFAULT (datetime('now')),
  finished_at       TEXT,
  updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_tapas_applications_session ON tapas_applications(session_id);
CREATE INDEX IF NOT EXISTS idx_tapas_applications_institution ON tapas_applications(institution_id);
CREATE INDEX IF NOT EXISTS idx_tapas_applications_student ON tapas_applications(student_id);
