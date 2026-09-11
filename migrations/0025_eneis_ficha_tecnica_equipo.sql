-- Migracion 0025: Ficha Tecnica del Equipo Escolar - Implementacion de
-- Educacion Integral en Sexualidad (planificacion estrategica institucional,
-- una vez por ano/ciclo).
CREATE TABLE IF NOT EXISTS eneis_fichas_tecnicas (
  id                          TEXT PRIMARY KEY,
  institution_id              TEXT NOT NULL REFERENCES institutions(id),
  created_by_id               TEXT REFERENCES users(id),

  coordinacion_zonal_distrito TEXT,
  fecha_elaboracion           TEXT,
  funcionarios_json           TEXT NOT NULL DEFAULT '[]',

  nivel_preparacion_index     INTEGER,
  temas_seleccionados_json    TEXT NOT NULL DEFAULT '[]',
  recursos_seleccionados_json TEXT NOT NULL DEFAULT '[]',

  cronograma_json             TEXT NOT NULL DEFAULT '[]',
  avances_json                TEXT NOT NULL DEFAULT '[]',
  nudos_criticos              TEXT,

  firmas_escolares_json       TEXT NOT NULL DEFAULT '[]',
  firmas_distritales_json     TEXT NOT NULL DEFAULT '[]',

  created_at                  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at                  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_eneis_fichas_tecnicas_institution ON eneis_fichas_tecnicas(institution_id);
