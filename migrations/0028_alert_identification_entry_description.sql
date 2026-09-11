-- Migracion 0028: breve descripcion del caso en cada estudiante en alerta
-- registrado en el Acta de Identificacion de Alertas, para dejar constancia
-- de lo ocurrido ademas del tipo de riesgo psicosocial.
ALTER TABLE alert_identification_entries ADD COLUMN description TEXT;
