-- Migracion 0022: Actas de reunion ENEIS (formato propio de seguimiento
-- mensual de la Comision/Red institucional ENEIS, distinto del acta general
-- del DECE en /actas-reunion).
CREATE TABLE IF NOT EXISTS eneis_actas (
  id                  TEXT PRIMARY KEY,
  institution_id      TEXT NOT NULL REFERENCES institutions(id),
  created_by_id       TEXT REFERENCES users(id),

  ciudad              TEXT,
  meeting_date        TEXT,
  tema                TEXT,
  hora_inicio         TEXT,
  hora_fin            TEXT,
  lugar               TEXT,
  desarrollo          TEXT,

  participants_json   TEXT NOT NULL DEFAULT '[]',
  compromisos_json    TEXT NOT NULL DEFAULT '[]',

  created_at          TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at          TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_eneis_actas_institution ON eneis_actas(institution_id);
