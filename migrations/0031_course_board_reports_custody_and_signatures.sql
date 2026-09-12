-- Migracion 0031: Homologacion de custodia fisica y firmas duales en informes tecnicos de juntas de curso
ALTER TABLE course_board_reports ADD COLUMN signatures_json TEXT;
ALTER TABLE course_board_reports ADD COLUMN signature_type TEXT DEFAULT 'MANUSCRITA';
ALTER TABLE course_board_reports ADD COLUMN physical_file_ref TEXT;
ALTER TABLE course_board_reports ADD COLUMN physical_evidence_url TEXT;
