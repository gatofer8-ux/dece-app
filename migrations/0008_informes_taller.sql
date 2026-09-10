-- Migracion 0008: Informes de Talleres (actividades de promocion y prevencion).
-- Cada actividad puede tener un informe con el formato oficial "INFORME DE
-- TALLERES". Las fotos del registro fotografico se guardan como attachments
-- enlazados al informe (attachments.activity_report_id) y se incrustan en el
-- documento Word generado.
CREATE TABLE IF NOT EXISTS activity_reports (
  id                    TEXT PRIMARY KEY,
  institution_id        TEXT NOT NULL REFERENCES institutions(id),
  activity_id           TEXT REFERENCES activities(id) ON DELETE SET NULL,
  created_by_id         TEXT REFERENCES users(id),

  report_number         TEXT,
  report_date           TEXT NOT NULL DEFAULT (date('now')),
  school_year_text      TEXT,

  responsible_name      TEXT,
  responsible_role      TEXT,
  responsible_phone_ext TEXT,
  responsible_email     TEXT,

  directed_to_name      TEXT,
  directed_to_role      TEXT,
  directed_to_phone_ext TEXT,
  directed_to_email     TEXT,

  tema                  TEXT,
  legal_basis           TEXT,
  scope_text            TEXT,
  objective_general     TEXT,
  objectives_specific   TEXT,
  development_analysis   TEXT,

  activity_name         TEXT,
  activity_axis         TEXT,
  activity_date         TEXT,
  activity_responsible   TEXT,
  activity_beneficiaries TEXT,

  participants_count    INTEGER,
  advances              TEXT,
  critical_nodes        TEXT,
  conclusions           TEXT,
  recommendations       TEXT,

  elaborated_by_name    TEXT,
  elaborated_by_role    TEXT,
  elaborated_date       TEXT,
  approved_by_name      TEXT,
  approved_by_role      TEXT,
  approved_date         TEXT,

  created_at            TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at            TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_activity_reports_institution ON activity_reports(institution_id);
CREATE INDEX IF NOT EXISTS idx_activity_reports_activity ON activity_reports(activity_id);

ALTER TABLE attachments ADD COLUMN activity_report_id TEXT;
ALTER TABLE attachments ADD COLUMN caption TEXT;
