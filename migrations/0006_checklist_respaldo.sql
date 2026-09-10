-- Migracion 0006: respaldo documental por item del checklist del expediente.
-- Permite colgar un archivo (ej. oficio mas acuse de recibo de instancias
-- externas) de un item concreto del checklist. Al adjuntarlo, el item se
-- marca en SI de forma automatica.
ALTER TABLE case_checklist_items ADD COLUMN attachment_id TEXT;
ALTER TABLE attachments ADD COLUMN checklist_item_id TEXT;
