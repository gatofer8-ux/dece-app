-- Migracion 0032: Homologacion de custodia fisica, archivo institucional y firmas duales en Actas de Reunion
ALTER TABLE meeting_minutes ADD COLUMN signature_type TEXT DEFAULT 'MANUSCRITA';
ALTER TABLE meeting_minutes ADD COLUMN physical_file_ref TEXT;
ALTER TABLE meeting_minutes ADD COLUMN physical_evidence_url TEXT;
