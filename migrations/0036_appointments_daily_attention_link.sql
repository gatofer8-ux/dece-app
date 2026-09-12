-- Migracion 0036: Enlace entre citas agendadas y registro en bitacora de atencion diaria
ALTER TABLE appointments ADD COLUMN daily_attention_id TEXT REFERENCES daily_attentions(id);
