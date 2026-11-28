-- Migracion 0040: Reporte para Juntas de Grado/Curso con el formato E.D1.C2.DE3.
-- Los informes existentes conservan el formato anterior (INFORME_TECNICO).
ALTER TABLE course_board_reports ADD COLUMN report_format TEXT NOT NULL DEFAULT 'INFORME_TECNICO';
ALTER TABLE course_board_reports ADD COLUMN observaciones_generales TEXT;
ALTER TABLE course_board_reports ADD COLUMN vicerrector_name TEXT;
