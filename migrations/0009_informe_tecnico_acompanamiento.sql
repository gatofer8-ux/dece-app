-- Migracion 0009: Informe Tecnico de Acompanamiento a victimas frente a
-- situaciones de violencia detectadas en el ambito educativo. Se genera dentro
-- de un caso de riesgo de tipo violencia y puede vincularse al Plan de
-- Acompanamiento y Restitucion de Derechos.
CREATE TABLE IF NOT EXISTS case_accompaniment_reports (
  id                     TEXT PRIMARY KEY,
  case_file_id           TEXT NOT NULL REFERENCES case_files(id) ON DELETE CASCADE,
  institution_id         TEXT NOT NULL REFERENCES institutions(id),
  created_by_id          TEXT REFERENCES users(id),

  report_number          TEXT,
  report_date            TEXT NOT NULL DEFAULT (date('now')),
  professional_managing  TEXT,
  professional_signing   TEXT,
  signing_date           TEXT,

  student_full_name      TEXT,
  student_birth_day      TEXT,
  student_birth_month    TEXT,
  student_birth_year     TEXT,
  student_age            TEXT,
  student_nationality    TEXT,
  student_document_id    TEXT,
  student_grade          TEXT,
  student_jornada        TEXT,

  rep_full_name          TEXT,
  rep_document_id        TEXT,
  rep_relationship       TEXT,
  rep_address            TEXT,
  rep_phone_cell         TEXT,
  rep_phone_landline     TEXT,

  family_situation       TEXT,
  indicators_json        TEXT NOT NULL DEFAULT '{}',
  risk_protection_json   TEXT NOT NULL DEFAULT '{}',
  academic_performance   TEXT,

  accompaniment_actions  TEXT,
  ext_referral_json      TEXT NOT NULL DEFAULT '{}',
  psychosocial_referral_json TEXT NOT NULL DEFAULT '{}',

  restitution_plan_id    TEXT REFERENCES case_restitution_plans(id) ON DELETE SET NULL,

  created_at             TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at             TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_accomp_reports_case ON case_accompaniment_reports(case_file_id);
