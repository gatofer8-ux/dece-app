import type Database from "better-sqlite3";
import { randomUUID } from "crypto";
import {
  getReportConfigParts,
  buildReportNumberString,
  normalizeSchoolYearCode,
} from "./reportNumbering";

/**
 * Recodifica de forma retroactiva e idempotente todos los informes existentes en la base de datos
 * que carezcan del código oficial ministerial o que tengan formatos antiguos/provisionales.
 *
 * Estructura oficial aplicada:
 * [Mineduc]-[Coordinación Zonal]-[Distrito]-[Institución]-[DECE]-[Profesional]-[Año lectivo]-[Número consecutivo]
 * Ej: Mineduc-CZ3-18D02-UESR-DECE-MJ-2025/2026-001
 *
 * Se ejecuta al iniciar la aplicación (db.ts) después de aplicar las migraciones.
 */
export function recodifyExistingReports(conn: Database.Database): void {
  // Aseguramos que existan las tablas necesarias
  try {
    conn.prepare("SELECT 1 FROM dece_report_sequences LIMIT 1").get();
    conn.prepare("SELECT 1 FROM dece_issued_reports LIMIT 1").get();
  } catch {
    // Tablas aún no creadas (base sin migrar)
    return;
  }

  // Estructura interna para procesar informes ordenados cronológicamente
  type ReportItem = {
    table: string;
    id: string;
    institution_id: string;
    school_year_text: string | null;
    created_at: string;
    report_date: string | null;
    user_id: string | null;
    author_name: string | null;
    current_code: string | null;
    report_type: string;
    case_file_id: string | null;
  };

  const pendingReports: ReportItem[] = [];

  // 1. Reportes de hecho de violencia
  try {
    const rows = conn
      .prepare(
        `SELECT r.id, r.institution_id, r.report_number AS current_code,
                r.report_date, r.created_at, r.created_by AS user_id,
                r.analyst_name AS author_name, r.case_file_id
           FROM violence_reports r
          WHERE r.report_number IS NULL
             OR r.report_number NOT LIKE 'Mineduc-%'
          ORDER BY r.created_at ASC`
      )
      .all() as any[];

    for (const r of rows) {
      pendingReports.push({
        table: "violence_reports",
        id: r.id,
        institution_id: r.institution_id,
        school_year_text: null,
        created_at: r.created_at || r.report_date || new Date().toISOString(),
        report_date: r.report_date,
        user_id: r.user_id,
        author_name: r.author_name,
        current_code: r.current_code,
        report_type: "VIOLENCIA",
        case_file_id: r.case_file_id,
      });
    }
  } catch {}

  // 2. Informes técnicos situacionales
  try {
    const rows = conn
      .prepare(
        `SELECT r.id, r.institution_id, r.report_number AS current_code,
                r.report_date, r.created_at, NULL AS user_id,
                COALESCE(r.responsible_name, r.preparer_name) AS author_name,
                r.case_file_id
           FROM situational_reports r
          WHERE r.report_number IS NULL
             OR r.report_number NOT LIKE 'Mineduc-%'
          ORDER BY r.created_at ASC`
      )
      .all() as any[];

    for (const r of rows) {
      pendingReports.push({
        table: "situational_reports",
        id: r.id,
        institution_id: r.institution_id,
        school_year_text: null,
        created_at: r.created_at || r.report_date || new Date().toISOString(),
        report_date: r.report_date,
        user_id: null,
        author_name: r.author_name,
        current_code: r.current_code,
        report_type: "SITUACIONAL",
        case_file_id: r.case_file_id,
      });
    }
  } catch {}

  // 3. Informes bimensuales de acompañamiento
  try {
    const rows = conn
      .prepare(
        `SELECT r.id, r.institution_id, r.report_number AS current_code,
                r.school_year_text, r.created_at, r.created_by AS user_id,
                r.elaborated_by_name AS author_name, r.case_file_id
           FROM bimonthly_reports r
          WHERE r.report_number IS NULL
             OR r.report_number NOT LIKE 'Mineduc-%'
          ORDER BY r.created_at ASC`
      )
      .all() as any[];

    for (const r of rows) {
      pendingReports.push({
        table: "bimonthly_reports",
        id: r.id,
        institution_id: r.institution_id,
        school_year_text: r.school_year_text,
        created_at: r.created_at || new Date().toISOString(),
        report_date: r.created_at,
        user_id: r.user_id,
        author_name: r.author_name,
        current_code: r.current_code,
        report_type: "BIMENSUAL",
        case_file_id: r.case_file_id,
      });
    }
  } catch {}

  // 4. Informes técnicos de cierre de caso
  try {
    const rows = conn
      .prepare(
        `SELECT r.id, r.institution_id, r.report_number AS current_code,
                r.school_year_text, r.report_date, r.created_at,
                r.dece_user_id AS user_id,
                r.dece_name AS author_name,
                r.case_file_id
           FROM case_closure_reports r
          WHERE r.report_number IS NULL
             OR r.report_number NOT LIKE 'Mineduc-%'
          ORDER BY r.created_at ASC`
      )
      .all() as any[];

    for (const r of rows) {
      pendingReports.push({
        table: "case_closure_reports",
        id: r.id,
        institution_id: r.institution_id,
        school_year_text: r.school_year_text,
        created_at: r.created_at || r.report_date || new Date().toISOString(),
        report_date: r.report_date,
        user_id: r.user_id,
        author_name: r.author_name,
        current_code: r.current_code,
        report_type: "CIERRE",
        case_file_id: r.case_file_id,
      });
    }
  } catch {}

  // 5. Informes anuales de gestión DECE
  try {
    const rows = conn
      .prepare(
        `SELECT r.id, r.institution_id, r.report_code AS current_code,
                r.school_year_text, r.report_date, r.created_at,
                r.user_id, r.user_name AS author_name
           FROM annual_management_reports r
          WHERE r.report_code IS NULL
             OR r.report_code NOT LIKE 'Mineduc-%'
          ORDER BY r.created_at ASC`
      )
      .all() as any[];

    for (const r of rows) {
      pendingReports.push({
        table: "annual_management_reports",
        id: r.id,
        institution_id: r.institution_id,
        school_year_text: r.school_year_text,
        created_at: r.created_at || r.report_date || new Date().toISOString(),
        report_date: r.report_date,
        user_id: r.user_id,
        author_name: r.author_name,
        current_code: r.current_code,
        report_type: "GESTION_ANUAL",
        case_file_id: null,
      });
    }
  } catch {}

  if (pendingReports.length === 0) return;

  // Ordenar todos los reportes pendientes por fecha cronológica para que el 001 sea el más antiguo
  pendingReports.sort((a, b) => (a.created_at > b.created_at ? 1 : -1));

  // Transacción de asignación consecutiva
  const tx = conn.transaction(() => {
    for (const rep of pendingReports) {
      // Determinar año lectivo del reporte
      let schoolYearText = rep.school_year_text;
      if (!schoolYearText) {
        // Intentar obtener el año activo de la institución o calcular por fecha de creación
        const activeYear = conn
          .prepare("SELECT name FROM school_years WHERE institution_id = ? AND is_active = 1")
          .get(rep.institution_id) as { name: string } | undefined;
        schoolYearText = activeYear?.name || normalizeSchoolYearCode(rep.report_date || rep.created_at);
      }

      const userParam = rep.user_id
        ? rep.user_id
        : rep.author_name
        ? { name: rep.author_name }
        : null;

      const config = getReportConfigParts(conn, rep.institution_id, userParam, schoolYearText);

      // Incrementar o asegurar secuencia
      conn
        .prepare(
          `INSERT INTO dece_report_sequences (institution_id, school_year_code, last_number, updated_at)
           VALUES (?, ?, 1, datetime('now'))
           ON CONFLICT(institution_id, school_year_code) DO UPDATE SET
             last_number = dece_report_sequences.last_number + 1,
             updated_at = datetime('now')`
        )
        .run(rep.institution_id, config.schoolYearCode);

      const seqRow = conn
        .prepare(
          "SELECT last_number FROM dece_report_sequences WHERE institution_id = ? AND school_year_code = ?"
        )
        .get(rep.institution_id, config.schoolYearCode) as { last_number: number };

      const assignedSeq = seqRow.last_number;

      const reportNumber = buildReportNumberString({
        mineduc: config.mineducCode,
        zone: config.zoneCode,
        district: config.districtCode,
        institution: config.institutionCode,
        dece: config.deceCode,
        professional: config.professionalCode,
        schoolYear: config.schoolYearCode,
        sequence: assignedSeq,
      });

      // Actualizar la tabla correspondiente
      if (rep.table === "annual_management_reports") {
        conn
          .prepare("UPDATE annual_management_reports SET report_code = ? WHERE id = ?")
          .run(reportNumber, rep.id);
      } else {
        conn
          .prepare(`UPDATE ${rep.table} SET report_number = ? WHERE id = ?`)
          .run(reportNumber, rep.id);
      }

      // Registrar en dece_issued_reports
      try {
        conn
          .prepare(
            `INSERT INTO dece_issued_reports (
               id, institution_id, school_year_code, sequence_number, report_number,
               report_type, record_id, case_file_id, student_id, professional_id, created_at
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, datetime('now'))`
          )
          .run(
            randomUUID(),
            rep.institution_id,
            config.schoolYearCode,
            assignedSeq,
            reportNumber,
            rep.report_type,
            rep.id,
            rep.case_file_id || null,
            rep.user_id || null
          );
      } catch {
        // En caso de que ya estuviera registrado
      }
    }
  });

  tx();
  console.log(
    `[informes-dece] ${pendingReports.length} informe(s) histórico(s) recodificado(s) al estándar oficial Mineduc-CZ-Distrito-IE-DECE-Prof-Año-NNN`
  );
}
