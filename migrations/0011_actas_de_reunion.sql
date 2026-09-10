-- Migracion 0011: Actas de Reunion del DECE (formato oficial MinEduc
-- "Acta de Reunion" - Direccion Nacional de Administracion de Procesos, v2.0).
-- Para reuniones de equipo DECE o con otras personas por distintos motivos.
CREATE TABLE IF NOT EXISTS meeting_minutes (
  id                    TEXT PRIMARY KEY,
  institution_id        TEXT NOT NULL REFERENCES institutions(id),
  created_by_id         TEXT REFERENCES users(id),

  meeting_code          TEXT,
  meeting_date          TEXT,
  next_meeting_date     TEXT,

  responsible_name      TEXT,
  responsible_email     TEXT,
  responsible_phone_ext TEXT,
  responsible_role      TEXT,

  meeting_topic         TEXT,
  start_time            TEXT,
  end_time              TEXT,
  location              TEXT,
  thematic_background   TEXT,

  attendees_json        TEXT NOT NULL DEFAULT '[]',
  agenda_json           TEXT NOT NULL DEFAULT '[]',
  signatories_json      TEXT NOT NULL DEFAULT '[]',
  additional_comments   TEXT,

  created_at            TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at            TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_meeting_minutes_institution ON meeting_minutes(institution_id);
