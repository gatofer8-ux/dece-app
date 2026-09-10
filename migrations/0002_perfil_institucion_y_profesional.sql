-- 0002 — Datos de perfil que se llenan una vez y precargan en todos los
-- documentos: autoridad institucional, coordinación DECE, y datos del
-- profesional (cédula, título, extensión).

ALTER TABLE institutions ADD COLUMN rector_title           TEXT;   -- Msc., Dr., Lic.
ALTER TABLE institutions ADD COLUMN rector_name            TEXT;   -- nombre de la máxima autoridad
ALTER TABLE institutions ADD COLUMN rector_role            TEXT DEFAULT 'RECTOR(A) DE LA UNIDAD EDUCATIVA';
ALTER TABLE institutions ADD COLUMN dece_coordinator_title TEXT;
ALTER TABLE institutions ADD COLUMN dece_coordinator_name  TEXT;
ALTER TABLE institutions ADD COLUMN institution_phone      TEXT;   -- teléfono / conmutador institucional

ALTER TABLE users ADD COLUMN document_id  TEXT;   -- cédula del profesional
ALTER TABLE users ADD COLUMN title_prefix TEXT;   -- Psic. Cl., Lcda., Msc.
ALTER TABLE users ADD COLUMN phone_ext    TEXT;   -- extensión telefónica
