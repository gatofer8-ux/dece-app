import { describe, it, expect, beforeEach } from "vitest";
import Database from "better-sqlite3";
import { recodifyExistingReports } from "./recodifyReports";
import { previewNextReportNumber } from "./reportNumbering";

describe("recodifyExistingReports", () => {
  let testDb: Database.Database;
  const instId = "inst-uesr-01";
  const userId = "user-mj-01";
  const caseId = "case-01";

  beforeEach(() => {
    testDb = new Database(":memory:");
    testDb.exec(`
      CREATE TABLE institutions (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        acronym TEXT,
        zona TEXT,
        district TEXT,
        mineduc_code TEXT,
        zone_code TEXT,
        district_code TEXT,
        dece_code TEXT
      );

      CREATE TABLE school_years (
        id TEXT PRIMARY KEY,
        institution_id TEXT NOT NULL,
        name TEXT NOT NULL,
        is_active INTEGER NOT NULL DEFAULT 1
      );

      CREATE TABLE users (
        id TEXT PRIMARY KEY,
        institution_id TEXT,
        name TEXT NOT NULL,
        role TEXT NOT NULL,
        professional_code TEXT
      );

      CREATE TABLE case_files (
        id TEXT PRIMARY KEY,
        institution_id TEXT NOT NULL,
        code TEXT NOT NULL
      );

      CREATE TABLE dece_report_sequences (
        institution_id TEXT NOT NULL,
        school_year_code TEXT NOT NULL,
        last_number INTEGER NOT NULL DEFAULT 0,
        updated_at TEXT NOT NULL,
        PRIMARY KEY (institution_id, school_year_code)
      );

      CREATE TABLE dece_issued_reports (
        id TEXT PRIMARY KEY,
        institution_id TEXT NOT NULL,
        school_year_code TEXT NOT NULL,
        sequence_number INTEGER NOT NULL,
        report_number TEXT NOT NULL,
        report_type TEXT NOT NULL,
        record_id TEXT,
        case_file_id TEXT,
        student_id TEXT,
        professional_id TEXT,
        created_at TEXT NOT NULL,
        UNIQUE (institution_id, school_year_code, sequence_number)
      );

      CREATE TABLE violence_reports (
        id TEXT PRIMARY KEY,
        case_file_id TEXT,
        institution_id TEXT NOT NULL,
        report_number TEXT,
        report_date TEXT,
        analyst_name TEXT,
        created_by TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE situational_reports (
        id TEXT PRIMARY KEY,
        case_file_id TEXT,
        institution_id TEXT NOT NULL,
        report_number TEXT,
        report_date TEXT,
        responsible_name TEXT,
        preparer_name TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE bimonthly_reports (
        id TEXT PRIMARY KEY,
        case_file_id TEXT,
        institution_id TEXT NOT NULL,
        report_number TEXT,
        school_year_text TEXT,
        elaborated_by_name TEXT,
        created_by TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE case_closure_reports (
        id TEXT PRIMARY KEY,
        case_file_id TEXT,
        institution_id TEXT NOT NULL,
        report_number TEXT,
        school_year_text TEXT,
        report_date TEXT,
        dece_name TEXT,
        dece_user_id TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE annual_management_reports (
        id TEXT PRIMARY KEY,
        institution_id TEXT NOT NULL,
        report_code TEXT,
        school_year_text TEXT,
        report_date TEXT,
        user_name TEXT,
        user_id TEXT,
        created_at TEXT NOT NULL
      );
    `);

    testDb.prepare(`
      INSERT INTO institutions (id, name, acronym, zona, district, mineduc_code, zone_code, district_code, dece_code)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      instId,
      "Unidad Educativa Santa Rosa",
      "UESR",
      "Zona 3",
      "18D02",
      "Mineduc",
      "CZ3",
      "18D02",
      "DECE"
    );

    testDb.prepare(`
      INSERT INTO school_years (id, institution_id, name, is_active)
      VALUES (?, ?, ?, 1)
    `).run("sy-01", instId, "2025/2026");

    testDb.prepare(`
      INSERT INTO users (id, institution_id, name, role, professional_code)
      VALUES (?, ?, ?, ?, ?)
    `).run(userId, instId, "Maria Jose", "DECE", "MJ");

    testDb.prepare(`
      INSERT INTO case_files (id, institution_id, code)
      VALUES (?, ?, ?)
    `).run(caseId, instId, "UESR-1805123456-2026-01");
  });

  it("recodifica retroactivamente informes anteriores que tenían código null o antiguo", () => {
    // Insertamos informes con códigos nulos o antiguos
    testDb.prepare(`
      INSERT INTO violence_reports (id, case_file_id, institution_id, report_number, report_date, analyst_name, created_by, created_at)
      VALUES (?, ?, ?, NULL, '2025-10-01', 'Maria Jose', ?, '2025-10-01 08:00:00')
    `).run("vr-1", caseId, instId, userId);

    testDb.prepare(`
      INSERT INTO situational_reports (id, case_file_id, institution_id, report_number, report_date, responsible_name, preparer_name, created_at)
      VALUES (?, ?, ?, '001', '2025-10-05', 'Maria Jose', 'Maria Jose', '2025-10-05 09:00:00')
    `).run("sr-1", caseId, instId);

    testDb.prepare(`
      INSERT INTO bimonthly_reports (id, case_file_id, institution_id, report_number, school_year_text, elaborated_by_name, created_by, created_at)
      VALUES (?, ?, ?, '', '2025/2026', 'Maria Jose', ?, '2025-10-10 10:00:00')
    `).run("br-1", caseId, instId, userId);

    testDb.prepare(`
      INSERT INTO case_closure_reports (id, case_file_id, institution_id, report_number, school_year_text, report_date, dece_name, dece_user_id, created_at)
      VALUES (?, ?, ?, 'IT-DECE-UE-2024-2025-01', '2025/2026', '2025-10-15', 'Maria Jose', ?, '2025-10-15 11:00:00')
    `).run("ccr-1", caseId, instId, userId);

    // Ejecutar recodificación
    recodifyExistingReports(testDb);

    // Verificar que los 4 informes históricos tienen la codificación oficial consecutiva
    const vr = testDb.prepare("SELECT report_number FROM violence_reports WHERE id = 'vr-1'").get() as any;
    expect(vr.report_number).toBe("Mineduc-CZ3-18D02-UESR-DECE-MJ-2025/2026-001");

    const sr = testDb.prepare("SELECT report_number FROM situational_reports WHERE id = 'sr-1'").get() as any;
    expect(sr.report_number).toBe("Mineduc-CZ3-18D02-UESR-DECE-MJ-2025/2026-002");

    const br = testDb.prepare("SELECT report_number FROM bimonthly_reports WHERE id = 'br-1'").get() as any;
    expect(br.report_number).toBe("Mineduc-CZ3-18D02-UESR-DECE-MJ-2025/2026-003");

    const ccr = testDb.prepare("SELECT report_number FROM case_closure_reports WHERE id = 'ccr-1'").get() as any;
    expect(ccr.report_number).toBe("Mineduc-CZ3-18D02-UESR-DECE-MJ-2025/2026-004");

    // Verificar que dece_report_sequences tiene last_number = 4
    const seq = testDb.prepare("SELECT last_number FROM dece_report_sequences WHERE institution_id = ?").get(instId) as any;
    expect(seq.last_number).toBe(4);

    // Un nuevo informe que se cree ahora debe recibir 005
    const preview = previewNextReportNumber({ institutionId: instId, userId, schoolYearText: "2025/2026" }, testDb);
    expect(preview.reportNumber).toBe("Mineduc-CZ3-18D02-UESR-DECE-MJ-2025/2026-005");
  });

  it("es idempotente: una segunda ejecución no altera los códigos asignados", () => {
    testDb.prepare(`
      INSERT INTO violence_reports (id, case_file_id, institution_id, report_number, report_date, analyst_name, created_by, created_at)
      VALUES (?, ?, ?, NULL, '2025-10-01', 'Maria Jose', ?, '2025-10-01 08:00:00')
    `).run("vr-idemp", caseId, instId, userId);

    recodifyExistingReports(testDb);
    const firstCode = (testDb.prepare("SELECT report_number FROM violence_reports WHERE id = 'vr-idemp'").get() as any).report_number;

    // Segunda ejecución
    recodifyExistingReports(testDb);
    const secondCode = (testDb.prepare("SELECT report_number FROM violence_reports WHERE id = 'vr-idemp'").get() as any).report_number;

    expect(secondCode).toBe(firstCode);
    const seq = testDb.prepare("SELECT last_number FROM dece_report_sequences WHERE institution_id = ?").get(instId) as any;
    expect(seq.last_number).toBe(1);
  });
});
