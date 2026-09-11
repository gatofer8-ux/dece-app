-- Migracion 0026: ajustes de fidelidad al formato oficial del Ministerio de
-- Educacion en Actas de Reunion (verificado contra un acta real institucional):
-- asunto/tipo de reunion editable junto al titulo, y desarrollo de la reunion
-- como texto narrativo libre (en vez de la tabla de compromisos).
ALTER TABLE meeting_minutes ADD COLUMN title_suffix TEXT;
ALTER TABLE meeting_minutes ADD COLUMN desarrollo_narrativo TEXT;
