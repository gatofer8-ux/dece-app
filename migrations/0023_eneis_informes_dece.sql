-- Migracion 0023: Informe mensual de actividades DECE requeridas por la ENEIS
-- (formato "INFORME DE ACTIVIDADES N", distinto del informe trimestral/semestral
-- automatico y del "Reporte de avances" por materia).
CREATE TABLE IF NOT EXISTS eneis_informes_dece (
  id                  TEXT PRIMARY KEY,
  institution_id      TEXT NOT NULL REFERENCES institutions(id),
  created_by_id       TEXT REFERENCES users(id),

  periodo             TEXT NOT NULL, -- "YYYY-MM"
  actividades_json    TEXT NOT NULL DEFAULT '[]',

  created_at          TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at          TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(institution_id, periodo)
);
CREATE INDEX IF NOT EXISTS idx_eneis_informes_dece_institution ON eneis_informes_dece(institution_id);
