-- Migracion 0024: Informe del Diagnostico Institucional sobre la ENEIS
-- (documento narrativo de una sola vez/anual, distinto de los informes
-- periodicos automaticos).
CREATE TABLE IF NOT EXISTS eneis_diagnosticos (
  id                          TEXT PRIMARY KEY,
  institution_id              TEXT NOT NULL REFERENCES institutions(id),
  created_by_id               TEXT REFERENCES users(id),

  zona                        TEXT,
  distrito                    TEXT,
  fecha                       TEXT,

  antecedentes                TEXT,
  objetivo_general            TEXT,
  objetivos_especificos_json  TEXT NOT NULL DEFAULT '[]',
  actividades_json            TEXT NOT NULL DEFAULT '[]',
  resultados_json             TEXT NOT NULL DEFAULT '[]',
  conclusiones                TEXT,
  recomendaciones             TEXT,
  responsables_json           TEXT NOT NULL DEFAULT '[]',

  created_at                  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at                  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_eneis_diagnosticos_institution ON eneis_diagnosticos(institution_id);
