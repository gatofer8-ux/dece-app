-- Migracion 0012: Ficha de planificacion del Circulo Restaurativo del DECE
-- Calca fiel del formato "FICHA CIRCULO RESTAURATIVO".
-- Disponible de forma independiente y tambien desde un caso o estudiante.
CREATE TABLE IF NOT EXISTS restorative_circle_fichas (
  id                  TEXT PRIMARY KEY,
  institution_id      TEXT NOT NULL REFERENCES institutions(id),
  created_by_id       TEXT REFERENCES users(id),
  school_year_id      TEXT REFERENCES school_years(id),
  case_file_id        TEXT REFERENCES case_files(id),
  student_id          TEXT REFERENCES students(id),

  ficha_code          TEXT,
  center_name         TEXT,
  district_name       TEXT,
  facilitator_name    TEXT,
  circle_type         TEXT DEFAULT 'Reactivo',
  participants_count  TEXT,
  participant_type    TEXT,
  problematica        TEXT,
  circle_date         TEXT,
  circle_time         TEXT,

  diagnostico         TEXT,
  objetivos           TEXT,
  declaracion_inicial TEXT,
  q_icebreaker        TEXT,
  q_intro             TEXT,
  q_develop           TEXT,
  q_actions           TEXT,
  declaracion_cierre  TEXT,
  informe_circulo     TEXT,
  conclusion          TEXT,

  created_at          TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at          TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_rc_fichas_institution ON restorative_circle_fichas(institution_id);
CREATE INDEX IF NOT EXISTS idx_rc_fichas_case ON restorative_circle_fichas(case_file_id);
