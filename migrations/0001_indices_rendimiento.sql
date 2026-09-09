-- 0001 — Índices de rendimiento para consultas frecuentes.
-- Primera migración con el nuevo runner (src/lib/migrations.ts). Sirve además
-- como prueba de que el mecanismo funciona: es puramente aditiva e idempotente.

-- Listados de casos por institución + estado (dashboard, /casos).
CREATE INDEX IF NOT EXISTS idx_case_files_inst_status
  ON case_files(institution_id, status);

-- Bitácora de un caso ordenada por fecha (vista de detalle del caso).
CREATE INDEX IF NOT EXISTS idx_case_actions_case_date
  ON case_actions(case_file_id, date DESC);

-- Auditoría filtrada por institución y fecha (/auditoria).
CREATE INDEX IF NOT EXISTS idx_audit_logs_inst_ts
  ON audit_logs(institution_id, timestamp DESC);

-- Citas por institución y fecha (agenda diaria, recordatorios).
CREATE INDEX IF NOT EXISTS idx_appointments_inst_date
  ON appointments(institution_id, date);

-- Alertas docentes pendientes por institución.
CREATE INDEX IF NOT EXISTS idx_teacher_alerts_inst_status
  ON teacher_alerts(institution_id, status);

-- Búsqueda de estudiantes por institución (selects, búsqueda global).
CREATE INDEX IF NOT EXISTS idx_students_inst_name
  ON students(institution_id, full_name);
