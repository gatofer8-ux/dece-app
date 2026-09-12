-- Migracion 0035: Custodia fisica y evidencias en Actas de Identificacion de Alertas
ALTER TABLE alert_identification_sessions ADD COLUMN signature_type TEXT DEFAULT 'PENDIENTE';
ALTER TABLE alert_identification_sessions ADD COLUMN physical_file_ref TEXT;
ALTER TABLE alert_identification_sessions ADD COLUMN physical_evidence_url TEXT;
