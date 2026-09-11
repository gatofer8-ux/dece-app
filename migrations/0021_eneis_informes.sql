-- Informe periódico (trimestral/semestral) de implementación del ENEIS que se
-- envía al Distrito Educativo. Las tablas de "Actividades realizadas por
-- docentes" y "Cobertura" se calculan solas a partir de las fichas de
-- aplicación ya cargadas en el período elegido (fase 1), en vez de
-- compilarlas a mano revisando cada ficha en papel. Se guarda una foto de
-- esas tablas al generar el informe, para que reabrirlo después no cambie
-- los números ya reportados aunque se sigan cargando más fichas.
CREATE TABLE IF NOT EXISTS eneis_informes (
  id                    TEXT PRIMARY KEY,
  institution_id        TEXT NOT NULL REFERENCES institutions(id),
  tipo                  TEXT NOT NULL DEFAULT 'SEMESTRAL', -- TRIMESTRAL / SEMESTRAL
  titulo                TEXT NOT NULL,
  numero_informe        TEXT,
  fecha_informe         TEXT,
  responsable_nombre    TEXT,
  responsable_contacto  TEXT,
  responsable_cargo     TEXT,
  dirigido_nombre       TEXT,
  dirigido_contacto     TEXT,
  dirigido_cargo        TEXT,
  periodo_desde         TEXT NOT NULL,
  periodo_hasta         TEXT NOT NULL,
  padres_alcanzados     INTEGER,
  desarrollo_resumen    TEXT,
  actividades_dece      TEXT,
  buenas_practicas      TEXT,
  nudos_criticos        TEXT,
  conclusiones          TEXT,
  recomendaciones       TEXT,
  tablas_json           TEXT NOT NULL DEFAULT '{}', -- foto de las tablas calculadas al generar
  created_by_id         TEXT REFERENCES users(id),
  created_at            TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at            TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_eneis_informes_institution ON eneis_informes(institution_id, created_at DESC);
