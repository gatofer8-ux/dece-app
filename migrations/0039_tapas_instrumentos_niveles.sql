-- Migracion 0039: instrumentos y niveles del Proyecto TaPas.
-- Hasta ahora solo existia el juego de Tarjetas de arquetipos. El Manual de uso de las
-- herramientas TaPas (VVOB, 2021) define tres herramientas basicas: Perfil de talentos
-- (version 1 y 2), Tarjetas de arquetipos y Experimento de talento. Cada aplicacion
-- (sesion) usa un instrumento y un nivel educativo (Inicial, Basica o Bachillerato).

ALTER TABLE tapas_sessions ADD COLUMN instrument TEXT NOT NULL DEFAULT 'ARQUETIPOS';
ALTER TABLE tapas_sessions ADD COLUMN nivel TEXT NOT NULL DEFAULT 'BACHILLERATO';

-- Respuestas propias de cada instrumento (perfil de talentos, experimento). El juego de
-- arquetipos sigue usando classification_json / groups_json.
ALTER TABLE tapas_applications ADD COLUMN data_json TEXT;
-- Copia del instrumento de la sesion, para que los consumidores antiguos (ficha del
-- estudiante, informe consolidado OVP) puedan filtrar solo los juegos de arquetipos.
ALTER TABLE tapas_applications ADD COLUMN instrument TEXT NOT NULL DEFAULT 'ARQUETIPOS';

-- Proceso con varias hojas en una misma aplicacion: lista de hojas, cuales estan habilitadas
-- y si se aplican en una sola sesion o en varias horas de clase (JSON). NULL = una sola hoja.
ALTER TABLE tapas_sessions ADD COLUMN plan_json TEXT;
-- Identifica a la misma persona en todas las hojas de un proceso (una fila por hoja).
ALTER TABLE tapas_applications ADD COLUMN participant_id TEXT;
CREATE INDEX IF NOT EXISTS idx_tapas_applications_participant ON tapas_applications(participant_id);
