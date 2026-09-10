-- 0003 — Tipo de documento de identidad para estudiantes (cédula ecuatoriana, pasaporte o extranjero/otro)
ALTER TABLE students ADD COLUMN document_type TEXT DEFAULT 'CEDULA';

-- 1. Si está vacío o nulo -> 'OTRO'
UPDATE students
SET document_type = 'OTRO'
WHERE document_id IS NULL OR trim(document_id) = '';

-- 2. Si contiene letras -> 'PASAPORTE'
UPDATE students
SET document_type = 'PASAPORTE'
WHERE document_id GLOB '*[a-zA-Z]*';

-- 3. Si tiene exactamente 10 dígitos numéricos -> 'CEDULA'
UPDATE students
SET document_type = 'CEDULA'
WHERE trim(document_id) GLOB '[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]';

-- 4. Otros casos no vacíos que no sean 10 dígitos ni tengan letras -> 'OTRO'
UPDATE students
SET document_type = 'OTRO'
WHERE (document_id IS NOT NULL AND trim(document_id) != '')
  AND NOT (document_id GLOB '*[a-zA-Z]*')
  AND NOT (trim(document_id) GLOB '[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]');
