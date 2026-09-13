-- Registra desde dónde se hizo cada acción de la bitácora: dirección IP de
-- origen y el navegador/dispositivo (user agent), además de quién y cuándo,
-- que ya existían.
ALTER TABLE audit_logs ADD COLUMN ip_address TEXT;
ALTER TABLE audit_logs ADD COLUMN user_agent TEXT;
