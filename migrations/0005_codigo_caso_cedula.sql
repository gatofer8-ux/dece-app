-- Migracion 0005: codigo de caso con siglas de institucion + documento del estudiante.
-- Nuevo formato: SIGLAS-DOCUMENTO-ANIO-NN  (ej. UESR-1805123456-2026-01)
-- El codigo anterior de cada caso se conserva en case_files.legacy_code.
ALTER TABLE institutions ADD COLUMN acronym TEXT;
ALTER TABLE case_files ADD COLUMN legacy_code TEXT;
