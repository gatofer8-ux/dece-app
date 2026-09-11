-- Ficha de Actividades de Aplicación ENEIS (Estrategia Nacional de Educación
-- Integral en Sexualidad): cada docente registra, por un enlace/código público
-- sin necesidad de cuenta, la ficha de la clase donde aplicó un tema ENEIS. El
-- DECE arma una "sesión" (convocatoria, ej. por mes) y la "recepción de
-- fichas" que hoy se lleva a mano en una tabla aparte se arma sola a partir
-- de las fichas ya recibidas.
CREATE TABLE IF NOT EXISTS eneis_sessions (
  id             TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id),
  title          TEXT NOT NULL,
  access_code    TEXT NOT NULL UNIQUE,
  status         TEXT NOT NULL DEFAULT 'ABIERTA', -- ABIERTA / CERRADA
  opens_at       TEXT,
  closes_at      TEXT,
  created_by_id  TEXT REFERENCES users(id),
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_eneis_sessions_institution ON eneis_sessions(institution_id, created_at DESC);

CREATE TABLE IF NOT EXISTS eneis_fichas (
  id                          TEXT PRIMARY KEY,
  session_id                  TEXT NOT NULL REFERENCES eneis_sessions(id),
  institution_id              TEXT NOT NULL REFERENCES institutions(id),
  docente_nombre              TEXT NOT NULL,
  asignatura                  TEXT NOT NULL,
  subnivel                    TEXT,
  curso                       TEXT,
  paralelo                    TEXT,
  fecha_desde                 TEXT,
  fecha_hasta                 TEXT,
  nombre_ficha                TEXT,
  objetivo_curricular         TEXT,
  objetivo_eis                TEXT,
  destrezas                   TEXT,
  orientacion_conceptual      TEXT,
  recursos                    TEXT,
  anticipacion                TEXT,
  conceptualizacion           TEXT,
  consolidacion                TEXT,
  indicadores_evaluacion      TEXT,
  num_estudiantes_capacitados INTEGER,
  observaciones               TEXT,
  created_at                  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_eneis_fichas_session ON eneis_fichas(session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_eneis_fichas_institution ON eneis_fichas(institution_id, created_at DESC);
