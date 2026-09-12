-- Migración 0033: Custodia física, evidencias y firmas en esquelas de citación DECE
ALTER TABLE dece_esquelas ADD COLUMN signature_type TEXT DEFAULT 'PENDIENTE';
ALTER TABLE dece_esquelas ADD COLUMN signatures_json TEXT DEFAULT '[]';
