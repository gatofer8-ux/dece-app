-- Migracion 0034: Homologacion de custodia fisica y firmas en Fichas de Circulos Restaurativos
ALTER TABLE restorative_circle_fichas ADD COLUMN signature_type TEXT DEFAULT 'PENDIENTE';
ALTER TABLE restorative_circle_fichas ADD COLUMN signatures_json TEXT DEFAULT '[]';
ALTER TABLE restorative_circle_fichas ADD COLUMN physical_file_ref TEXT;
ALTER TABLE restorative_circle_fichas ADD COLUMN physical_evidence_url TEXT;
