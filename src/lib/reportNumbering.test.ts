import { describe, it, expect, beforeEach } from "vitest";
import Database from "better-sqlite3";
import {
  cleanCodePart,
  formatZoneCode,
  formatDistrictCode,
  formatInstitutionAcronym,
  getProfessionalReportCode,
  normalizeSchoolYearCode,
  formatSequenceNumber,
  buildReportNumberString,
} from "./reportNumberingShared";
import {
  previewNextReportNumber,
  assignNextReportNumber,
  getReportConfigParts,
} from "./reportNumbering";

describe("DECE Report Numbering - Shared Formatting", () => {
  it("cleanCodePart normaliza espacios y caracteres alfanuméricos", () => {
    expect(cleanCodePart("  CZ3  ")).toBe("CZ3");
    expect(cleanCodePart("Mineduc / Zonal")).toBe("MineducZonal");
    expect(cleanCodePart(null, "DEF")).toBe("DEF");
    expect(cleanCodePart("", "DEF")).toBe("DEF");
  });

  it("formatZoneCode formatea adecuadamente la coordinación zonal (ej. CZ3)", () => {
    expect(formatZoneCode("Zona 3", null)).toBe("CZ3");
    expect(formatZoneCode("3", null)).toBe("CZ3");
    expect(formatZoneCode(null, "CZ3")).toBe("CZ3");
    expect(formatZoneCode(null, "3")).toBe("CZ3");
    expect(formatZoneCode("Coordinación Zonal 3", null)).toBe("CZ3");
    expect(formatZoneCode(null, null)).toBe("CZ3");
  });

  it("formatDistrictCode formatea el código distrital (ej. 18D02)", () => {
    expect(formatDistrictCode("Distrito 18D02", null)).toBe("18D02");
    expect(formatDistrictCode(null, "18D02")).toBe("18D02");
    expect(formatDistrictCode("18D02 - Ambato", null)).toBe("18D02");
    expect(formatDistrictCode(null, null)).toBe("18D02");
  });

  it("formatInstitutionAcronym obtiene el acrónimo institucional (ej. UESR)", () => {
    expect(formatInstitutionAcronym("Unidad Educativa Santa Rosa", null)).toBe("UESR");
    expect(formatInstitutionAcronym("Cualquier Colegio", "UESR")).toBe("UESR");
    expect(formatInstitutionAcronym("", null)).toBe("UESR");
  });

  it("getProfessionalReportCode obtiene las iniciales del profesional (ej. MJ)", () => {
    expect(getProfessionalReportCode({ name: "Maria Jose", professional_code: null })).toBe("MJ");
    expect(getProfessionalReportCode({ name: "Maria Jose Lopez", professional_code: "MJ" })).toBe("MJ");
    expect(getProfessionalReportCode({ name: "Carlos Perez", professional_code: "CP" })).toBe("CP");
    expect(getProfessionalReportCode(null)).toBe("MJ");
  });

  it("normalizeSchoolYearCode normaliza el año lectivo a formato YYYY/YYYY (ej. 2025/2026)", () => {
    expect(normalizeSchoolYearCode("2025 - 2026")).toBe("2025/2026");
    expect(normalizeSchoolYearCode("2025-2026")).toBe("2025/2026");
    expect(normalizeSchoolYearCode("2025/2026")).toBe("2025/2026");
    expect(normalizeSchoolYearCode("Año 2025 a 2026")).toBe("2025/2026");
  });

  it("formatSequenceNumber formatea a mínimo 3 dígitos (001, 002, ...)", () => {
    expect(formatSequenceNumber(1)).toBe("001");
    expect(formatSequenceNumber(9)).toBe("009");
    expect(formatSequenceNumber(10)).toBe("010");
    expect(formatSequenceNumber(99)).toBe("099");
    expect(formatSequenceNumber(100)).toBe("100");
    expect(formatSequenceNumber(1000)).toBe("1000");
  });

  it("buildReportNumberString produce la estructura oficial exacta sin cédula ni ID de estudiante", () => {
    const reportCode = buildReportNumberString({
      mineduc: "Mineduc",
      zone: "CZ3",
      district: "18D02",
      institution: "UESR",
      dece: "DECE",
      professional: "MJ",
      schoolYear: "2025/2026",
      sequence: 1,
    });

    expect(reportCode).toBe("Mineduc-CZ3-18D02-UESR-DECE-MJ-2025/2026-001");
    // Verificación explícita de que no contiene cédula ni identificadores de estudiante
    expect(reportCode).not.toContain("180");
    expect(reportCode).not.toContain("cedula");
    expect(reportCode).not.toContain("CASO-");
  });
});

describe("DECE Report Numbering - DB Operations & Atomicity", () => {
  let testDb: Database.Database;
  const testInstitutionId = "inst-test-01";
  const testUserId = "user-test-01";

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

      CREATE TABLE users (
        id TEXT PRIMARY KEY,
        institution_id TEXT,
        name TEXT NOT NULL,
        role TEXT NOT NULL,
        professional_code TEXT
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
    `);

    testDb.prepare(`
      INSERT INTO institutions (id, name, acronym, zona, district, mineduc_code, zone_code, district_code, dece_code)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      testInstitutionId,
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
      INSERT INTO users (id, institution_id, name, role, professional_code)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      testUserId,
      testInstitutionId,
      "Maria Jose",
      "DECE",
      "MJ"
    );
  });

  it("previewNextReportNumber no incrementa la secuencia", () => {
    const preview1 = previewNextReportNumber(
      {
        institutionId: testInstitutionId,
        userId: testUserId,
        schoolYearText: "2025/2026",
      },
      testDb
    );

    expect(preview1.reportNumber).toBe("Mineduc-CZ3-18D02-UESR-DECE-MJ-2025/2026-001");
    expect(preview1.sequenceNumber).toBe(1);

    // Segunda previsualización debe seguir mostrando 001 sin haber consumido número
    const preview2 = previewNextReportNumber(
      {
        institutionId: testInstitutionId,
        userId: testUserId,
        schoolYearText: "2025/2026",
      },
      testDb
    );

    expect(preview2.reportNumber).toBe("Mineduc-CZ3-18D02-UESR-DECE-MJ-2025/2026-001");
    expect(preview2.sequenceNumber).toBe(1);
  });

  it("assignNextReportNumber genera consecutivos 001, 002, 003 de forma atómica", () => {
    const res1 = assignNextReportNumber(
      {
        institutionId: testInstitutionId,
        userId: testUserId,
        schoolYearText: "2025/2026",
        reportType: "SITUATIONAL",
      },
      testDb
    );
    expect(res1.reportNumber).toBe("Mineduc-CZ3-18D02-UESR-DECE-MJ-2025/2026-001");
    expect(res1.sequenceNumber).toBe(1);

    const res2 = assignNextReportNumber(
      {
        institutionId: testInstitutionId,
        userId: testUserId,
        schoolYearText: "2025/2026",
        reportType: "VIOLENCE",
      },
      testDb
    );
    expect(res2.reportNumber).toBe("Mineduc-CZ3-18D02-UESR-DECE-MJ-2025/2026-002");
    expect(res2.sequenceNumber).toBe(2);

    const res3 = assignNextReportNumber(
      {
        institutionId: testInstitutionId,
        userId: testUserId,
        schoolYearText: "2025/2026",
        reportType: "CLOSURE",
      },
      testDb
    );
    expect(res3.reportNumber).toBe("Mineduc-CZ3-18D02-UESR-DECE-MJ-2025/2026-003");
    expect(res3.sequenceNumber).toBe(3);

    // La previsualización ahora debe mostrar 004
    const previewNext = previewNextReportNumber(
      {
        institutionId: testInstitutionId,
        userId: testUserId,
        schoolYearText: "2025/2026",
      },
      testDb
    );
    expect(previewNext.reportNumber).toBe("Mineduc-CZ3-18D02-UESR-DECE-MJ-2025/2026-004");
  });

  it("reinicio anual: cada nuevo año lectivo inicia en 001 de forma independiente", () => {
    // Año 2025/2026 emite informe 001
    const repYear1 = assignNextReportNumber(
      {
        institutionId: testInstitutionId,
        userId: testUserId,
        schoolYearText: "2025/2026",
        reportType: "SITUATIONAL",
      },
      testDb
    );
    expect(repYear1.reportNumber).toBe("Mineduc-CZ3-18D02-UESR-DECE-MJ-2025/2026-001");

    // Nuevo año lectivo 2026/2027 reinicia en 001
    const repYear2 = assignNextReportNumber(
      {
        institutionId: testInstitutionId,
        userId: testUserId,
        schoolYearText: "2026/2027",
        reportType: "SITUATIONAL",
      },
      testDb
    );
    expect(repYear2.reportNumber).toBe("Mineduc-CZ3-18D02-UESR-DECE-MJ-2026/2027-001");

    // Si se emite otro en 2025/2026 continúa con 002
    const repYear1Next = assignNextReportNumber(
      {
        institutionId: testInstitutionId,
        userId: testUserId,
        schoolYearText: "2025/2026",
        reportType: "CLOSURE",
      },
      testDb
    );
    expect(repYear1Next.reportNumber).toBe("Mineduc-CZ3-18D02-UESR-DECE-MJ-2025/2026-002");
  });

  it("eliminar un informe no libera ni reutiliza el número asignado", () => {
    const rep1 = assignNextReportNumber(
      {
        institutionId: testInstitutionId,
        userId: testUserId,
        schoolYearText: "2025/2026",
        reportType: "SITUATIONAL",
      },
      testDb
    );
    expect(rep1.reportNumber).toBe("Mineduc-CZ3-18D02-UESR-DECE-MJ-2025/2026-001");

    // Simulamos la eliminación del informe emitido
    testDb.prepare("DELETE FROM dece_issued_reports WHERE report_number = ?").run(rep1.reportNumber);

    // El siguiente número asignado debe ser 002, jamás 001 nuevamente
    const rep2 = assignNextReportNumber(
      {
        institutionId: testInstitutionId,
        userId: testUserId,
        schoolYearText: "2025/2026",
        reportType: "VIOLENCE",
      },
      testDb
    );
    expect(rep2.reportNumber).toBe("Mineduc-CZ3-18D02-UESR-DECE-MJ-2025/2026-002");
    expect(rep2.sequenceNumber).toBe(2);
  });

  it("configuración institucional personalizable sin valores fijos quemados", () => {
    // Actualizar configuración institucional a otra zona y distrito
    testDb.prepare(`
      UPDATE institutions
      SET zone_code = 'CZ7', district_code = '11D01', acronym = 'COLEGIOLOJA'
      WHERE id = ?
    `).run(testInstitutionId);

    const config = getReportConfigParts(testDb, testInstitutionId, testUserId, "2025/2026");
    expect(config.zoneCode).toBe("CZ7");
    expect(config.districtCode).toBe("11D01");
    expect(config.institutionCode).toBe("COLEGIOLOJA");

    const assigned = assignNextReportNumber(
      {
        institutionId: testInstitutionId,
        userId: testUserId,
        schoolYearText: "2025/2026",
        reportType: "SITUATIONAL",
      },
      testDb
    );
    expect(assigned.reportNumber).toBe("Mineduc-CZ7-11D01-COLEGIOLOJA-DECE-MJ-2025/2026-001");
  });
});
