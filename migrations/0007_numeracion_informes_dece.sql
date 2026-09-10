-- Migracion 0007: Numeracion automatica de informes administrativos del DECE.
-- Estructura oficial: Mineduc-CZ3-18D02-UESR-DECE-MJ-2025/2026-001

-- Parametros institucionales para configuracion de numeracion
ALTER TABLE institutions ADD COLUMN mineduc_code TEXT DEFAULT 'Mineduc';
ALTER TABLE institutions ADD COLUMN zone_code TEXT;
ALTER TABLE institutions ADD COLUMN district_code TEXT;
ALTER TABLE institutions ADD COLUMN dece_code TEXT DEFAULT 'DECE';

-- Codigo o iniciales del profesional (opcional para sobreescribir iniciales automaticas)
ALTER TABLE users ADD COLUMN professional_code TEXT;

-- Soporte de numero de informe en informes bimensuales
ALTER TABLE bimonthly_reports ADD COLUMN report_number TEXT;

-- Tabla de secuencias consecutivas por institucion y ano lectivo (reinicio anual desde 001)
CREATE TABLE IF NOT EXISTS dece_report_sequences (
  institution_id   TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  school_year_code TEXT NOT NULL,
  last_number      INTEGER NOT NULL DEFAULT 0,
  updated_at       TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (institution_id, school_year_code)
);

-- Registro inmutable de informes emitidos para garantizar unicidad y trazabilidad
CREATE TABLE IF NOT EXISTS dece_issued_reports (
  id               TEXT PRIMARY KEY,
  institution_id   TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  school_year_code TEXT NOT NULL,
  sequence_number  INTEGER NOT NULL,
  report_number    TEXT NOT NULL UNIQUE,
  report_type      TEXT NOT NULL,
  record_id        TEXT,
  case_file_id     TEXT,
  student_id       TEXT,
  professional_id  TEXT,
  created_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS uidx_dece_issued_reports_seq
  ON dece_issued_reports(institution_id, school_year_code, sequence_number);
