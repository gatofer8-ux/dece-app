-- Migracion 0016: mazo de cartillas ilustradas del juego de arquetipos TaPas.
-- Cada institucion carga su propia copia de la herramienta oficial gratuita
-- (Tarjetas de arquetipos, Proyecto TaPas - VVOB / MinEduc). El sistema la
-- procesa en una imagen por arquetipo, guardada como archivo de la institucion.
-- Las ilustraciones NO forman parte del codigo del sistema.
CREATE TABLE IF NOT EXISTS tapas_card_decks (
  institution_id   TEXT PRIMARY KEY REFERENCES institutions(id),
  cards_json       TEXT NOT NULL DEFAULT '{}',
  card_count       INTEGER NOT NULL DEFAULT 0,
  source_note      TEXT,
  uploaded_by_id   TEXT REFERENCES users(id),
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
);
