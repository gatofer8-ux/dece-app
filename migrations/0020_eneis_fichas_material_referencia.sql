-- Registra qué libro/guía oficial del ENEIS usó el docente como referencia
-- para su ficha (Oportunidades Curriculares I/II, Guía de Embarazo,
-- RURANKAPAK, Guía de Diversidades, Recorrido de la Prevención), para
-- trazabilidad y para que la ayuda de IA se base en el contenido real de
-- ese material en vez de inventar temas o páginas.
ALTER TABLE eneis_fichas ADD COLUMN material_id TEXT;
