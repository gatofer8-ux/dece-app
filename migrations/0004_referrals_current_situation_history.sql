-- Migracion 0004: columna current_situation_history en referrals
-- Historia de la situacion actual segun el formato oficial de la Ficha de Derivacion.
ALTER TABLE referrals ADD COLUMN current_situation_history TEXT;
