-- Migracion 0014: Orientacion Vocacional y Profesional (OVP) - IPPJ MINEDUC.
-- Sesiones de aplicacion por curso y aplicaciones individuales del inventario.
-- El estudiante responde por un enlace publico con codigo (sin cuenta); el
-- sistema califica automaticamente. El instrumento no se descarga.

CREATE TABLE IF NOT EXISTS ovp_sessions (
  id              TEXT PRIMARY KEY,
  institution_id  TEXT NOT NULL REFERENCES institutions(id),
  created_by_id   TEXT REFERENCES users(id),
  school_year_id  TEXT REFERENCES school_years(id),

  title           TEXT NOT NULL,
  instrument      TEXT NOT NULL DEFAULT 'IPPJ',
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
CREATE UNIQUE INDEX IF NOT EXISTS uidx_ovp_sessions_code ON ovp_sessions(access_code);
CREATE INDEX IF NOT EXISTS idx_ovp_sessions_institution ON ovp_sessions(institution_id);

CREATE TABLE IF NOT EXISTS ovp_applications (
  id                TEXT PRIMARY KEY,
  session_id        TEXT NOT NULL REFERENCES ovp_sessions(id),
  institution_id    TEXT NOT NULL REFERENCES institutions(id),
  student_id        TEXT REFERENCES students(id),

  student_name      TEXT NOT NULL,
  course_snapshot   TEXT,
  parallel_snapshot TEXT,
  gender            TEXT NOT NULL DEFAULT 'OTRO',
  age               INTEGER,

  status            TEXT NOT NULL DEFAULT 'EN_PROGRESO',
  survey_json       TEXT NOT NULL DEFAULT '{}',
  answers_json      TEXT NOT NULL DEFAULT '{}',
  result_json       TEXT,

  started_at        TEXT NOT NULL DEFAULT (datetime('now')),
  finished_at       TEXT,
  updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_ovp_applications_session ON ovp_applications(session_id);
CREATE INDEX IF NOT EXISTS idx_ovp_applications_institution ON ovp_applications(institution_id);
CREATE INDEX IF NOT EXISTS idx_ovp_applications_student ON ovp_applications(student_id);
