-- Migracion 0013: modalidad del circulo restaurativo (grupal / individual / mixto).
-- Permite que la IA analice y genere preguntas grupales o individuales segun el caso.
ALTER TABLE restorative_circle_fichas ADD COLUMN circle_modality TEXT DEFAULT 'grupal';
