-- Migración 0004: Columna current_situation_history en referrals
ALTER TABLE referrals ADD COLUMN current_situation_history TEXT;
