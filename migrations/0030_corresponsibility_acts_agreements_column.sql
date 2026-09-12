-- Migracion 0030: agrega la columna agreements_and_commitments a
-- case_corresponsibility_acts. El formulario y el generador del acta ya
-- referenciaban este campo (con fallback a commitments_representative),
-- pero la columna nunca se creo, lo que hacia fallar el INSERT y bloqueaba
-- por completo la creacion de actas de corresponsabilidad.
ALTER TABLE case_corresponsibility_acts ADD COLUMN agreements_and_commitments TEXT;
