-- Migracion 0031: Oficios institucionales del DECE (correspondencia oficial saliente).
--
-- Un oficio es la comunicacion formal que el DECE dirige a la maxima autoridad
-- institucional (rectora/rector) o a una entidad externa (Junta Cantonal de
-- Proteccion de Derechos, Direccion Distrital, MSP, ONG, etc.).
--
-- Es un modulo AUTONOMO, no anidado a un caso: muchos oficios no tienen
-- expediente (p. ej. solicitar autorizacion para una actividad de prevencion
-- con un organismo externo). case_file_id es OPCIONAL y solo se usa cuando el
-- oficio si corresponde a un caso abierto (p. ej. reporte de violencia).
--
-- oficio_type define la circunstancia y con ella el parrafo de encuadre legal
-- o contextual por defecto (body_intro). La cita del Art. 63.4 "Debida
-- Diligencia" aplica UNICAMENTE al tipo INFORME_RIESGO_VIOLENCIA.
CREATE TABLE IF NOT EXISTS oficios (
  id                    TEXT PRIMARY KEY,
  institution_id        TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  case_file_id          TEXT REFERENCES case_files(id) ON DELETE SET NULL,
  student_id            TEXT REFERENCES students(id) ON DELETE SET NULL,

  oficio_number         TEXT NOT NULL,
  oficio_type           TEXT NOT NULL DEFAULT 'OTRO',
  oficio_date           TEXT NOT NULL,
  city                  TEXT NOT NULL DEFAULT 'Ambato',

  asunto                TEXT NOT NULL,

  addressee_name        TEXT NOT NULL,
  addressee_role        TEXT NOT NULL DEFAULT 'RECTORA',
  addressee_institution TEXT,

  body_intro            TEXT,
  body_content          TEXT NOT NULL,
  closing_note          TEXT NOT NULL DEFAULT 'Particular que comunico para los fines pertinentes.',

  signer_name           TEXT NOT NULL,
  signer_role           TEXT NOT NULL DEFAULT 'ANALISTA DECE',

  signatures_json       TEXT DEFAULT '[]',
  signature_type        TEXT DEFAULT 'PENDIENTE',
  physical_file_ref     TEXT,
  physical_evidence_url TEXT,

  created_by            TEXT REFERENCES users(id),
  created_at            TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at            TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_oficios_inst ON oficios(institution_id, oficio_date);
CREATE INDEX IF NOT EXISTS idx_oficios_case ON oficios(case_file_id);

-- Secuencia propia de correspondencia saliente (oficios), SEPARADA del contador
-- de informes tecnicos (dece_report_sequences). En la practica real del DECE se
-- llevan dos libros distintos: el de informes y el de oficios enviados. El
-- FORMATO del numero es el mismo (se reusan los helpers de reportNumberingShared),
-- pero el consecutivo es independiente y reinicia cada ano lectivo.
CREATE TABLE IF NOT EXISTS oficio_sequences (
  institution_id   TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  school_year_code TEXT NOT NULL,
  last_number      INTEGER NOT NULL DEFAULT 0,
  updated_at       TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (institution_id, school_year_code)
);

-- Registro inmutable de oficios emitidos (auditoria de correspondencia).
CREATE TABLE IF NOT EXISTS oficios_issued (
  id               TEXT PRIMARY KEY,
  institution_id   TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  school_year_code TEXT NOT NULL,
  sequence_number  INTEGER NOT NULL,
  oficio_number    TEXT NOT NULL UNIQUE,
  oficio_type      TEXT NOT NULL,
  record_id        TEXT,
  case_file_id     TEXT,
  professional_id  TEXT,
  created_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS uidx_oficios_issued_seq
  ON oficios_issued(institution_id, school_year_code, sequence_number);
