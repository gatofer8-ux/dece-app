-- Migracion 0029: Plan Estrategico Bianual del DECE.
--
-- Cada institucion entrega un Plan de Accion (POA) por ano lectivo y un Plan
-- Estrategico Bianual cada dos anos. El POA se desprende del bianual: el
-- objetivo general, los objetivos especificos y las metas de cada eje del plan
-- bianual sirven de contexto para la generacion asistida del POA.
--
-- La matriz se guarda en axis_items_data (JSON de StrategicBianualAxisItem[])
-- agrupada por los 4 ejes de accion del DECE (Consejeria, Promocion y
-- Prevencion, Inclusion Socioeducativa y Atencion Psicosocial), de modo que
-- coincida estructuralmente con los componentes del POA anual.
--
-- socioeconomic_condition y professionals_count son entradas propias de este
-- modulo: la IA las usa (junto a students_count y available_resources) para
-- proponer objetivos y metas realmente cumplibles en la realidad institucional.
CREATE TABLE IF NOT EXISTS strategic_plans_bianual (
  id                       TEXT PRIMARY KEY,
  institution_id           TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,

  period_start_year        TEXT NOT NULL,
  period_end_year          TEXT NOT NULL,
  period_text              TEXT NOT NULL,

  district_code            TEXT DEFAULT '',
  district_name            TEXT DEFAULT '',

  coordinator_name         TEXT DEFAULT '',
  analysts_data            TEXT NOT NULL DEFAULT '[]',

  students_count           INTEGER NOT NULL DEFAULT 0,
  professionals_count      INTEGER NOT NULL DEFAULT 0,
  available_resources      TEXT DEFAULT '',
  socioeconomic_condition  TEXT DEFAULT '',

  general_objective        TEXT DEFAULT '',
  specific_objectives      TEXT NOT NULL DEFAULT '[]',
  axis_items_data          TEXT NOT NULL DEFAULT '[]',

  elaborated_by            TEXT DEFAULT '',
  reviewed_by              TEXT DEFAULT '',
  approved_by              TEXT DEFAULT '',

  created_by               TEXT REFERENCES users(id),
  created_at               TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at               TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_strategic_bianual_inst ON strategic_plans_bianual(institution_id, created_at);
