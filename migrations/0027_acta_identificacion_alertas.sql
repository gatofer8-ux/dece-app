-- Migracion 0027: Acta de Identificacion de Alertas (Junta de Curso), formato
-- propio del Ministerio de Educacion para que los docentes registren, durante
-- la junta de grado/curso, los estudiantes en los que identifican un riesgo
-- psicosocial. El DECE arma una "sesion" (una junta, por curso y fecha) con un
-- codigo/enlace publico, y cada docente presente agrega sus propias filas de
-- "estudiante en alerta" sin necesidad de cuenta.
CREATE TABLE IF NOT EXISTS alert_identification_sessions (
  id                    TEXT PRIMARY KEY,
  institution_id        TEXT NOT NULL REFERENCES institutions(id),
  created_by_id         TEXT REFERENCES users(id),

  curso                 TEXT,
  fecha                 TEXT,
  lugar                 TEXT,
  responsible_name      TEXT,
  responsible_email     TEXT,
  responsible_phone_ext TEXT,
  responsible_role      TEXT,

  attendees_json        TEXT NOT NULL DEFAULT '[]',
  observaciones         TEXT,

  access_code           TEXT NOT NULL UNIQUE,
  status                TEXT NOT NULL DEFAULT 'ABIERTA', -- ABIERTA / CERRADA

  created_at            TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at            TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_alert_id_sessions_institution ON alert_identification_sessions(institution_id, created_at DESC);

CREATE TABLE IF NOT EXISTS alert_identification_entries (
  id             TEXT PRIMARY KEY,
  session_id     TEXT NOT NULL REFERENCES alert_identification_sessions(id),
  institution_id TEXT NOT NULL REFERENCES institutions(id),

  student_name   TEXT NOT NULL,
  risk_type      TEXT NOT NULL,
  teacher_name   TEXT NOT NULL,

  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_alert_id_entries_session ON alert_identification_entries(session_id, created_at);
