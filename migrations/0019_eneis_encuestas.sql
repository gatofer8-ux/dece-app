-- Encuestas de percepción ENEIS (estudiantes y docentes): igual que las fichas,
-- se responden por un enlace público sin necesidad de cuenta y son ANÓNIMAS
-- (no se guarda quién respondió). El DECE crea una convocatoria eligiendo el
-- instrumento (estudiantes o docentes) y ve los resultados ya tabulados.
CREATE TABLE IF NOT EXISTS eneis_survey_sessions (
  id             TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id),
  title          TEXT NOT NULL,
  instrument     TEXT NOT NULL, -- ESTUDIANTES / DOCENTES
  access_code    TEXT NOT NULL UNIQUE,
  status         TEXT NOT NULL DEFAULT 'ABIERTA', -- ABIERTA / CERRADA
  opens_at       TEXT,
  closes_at      TEXT,
  created_by_id  TEXT REFERENCES users(id),
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_eneis_survey_sessions_institution ON eneis_survey_sessions(institution_id, created_at DESC);

CREATE TABLE IF NOT EXISTS eneis_survey_responses (
  id             TEXT PRIMARY KEY,
  session_id     TEXT NOT NULL REFERENCES eneis_survey_sessions(id),
  institution_id TEXT NOT NULL REFERENCES institutions(id),
  answers_json   TEXT NOT NULL, -- JSON: arreglo de índices de opción elegidos, uno por pregunta (0-based)
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_eneis_survey_responses_session ON eneis_survey_responses(session_id);
