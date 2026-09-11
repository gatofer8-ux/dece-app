import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Database from "better-sqlite3";
import ExcelJS from "exceljs";
import { db } from "./db";
import {
  mapTypologyToRiskType,
  resolveColumnIndices,
  processCaseMatrixWorkbook,
} from "./caseImport";

describe("caseImport - Mapeo Inteligente de Tipologías de Riesgo", () => {
  it("mapea textos y variaciones comunes de los DECE a tipologías oficiales", () => {
    expect(mapTypologyToRiskType("Violencia Intrafamiliar / Maltrato")).toEqual({
      riskType: "VIOLENCIA_INTRAFAMILIAR",
    });

    expect(mapTypologyToRiskType("Acoso escolar entre pares (bullying y ciberacoso)")).toEqual({
      riskType: "VIOLENCIA_ESCOLAR_BULLYING",
    });

    expect(mapTypologyToRiskType("Presunta agresión o violencia sexual")).toEqual({
      riskType: "VIOLENCIA_SEXUAL",
    });

    expect(mapTypologyToRiskType("Consumo problemático de SPA y alcohol")).toEqual({
      riskType: "CONSUMO_SUSTANCIAS",
    });

    expect(mapTypologyToRiskType("Salud mental (depresión y autolesiones/cutting)")).toEqual({
      riskType: "SALUD_MENTAL",
    });

    expect(mapTypologyToRiskType("Estudiante con dificultades de aprendizaje y NEE")).toEqual({
      riskType: "DIFICULTAD_APRENDIZAJE",
    });

    expect(mapTypologyToRiskType("Conflicto familiar por separación de progenitores")).toEqual({
      riskType: "CONFLICTO_FAMILIAR",
    });

    expect(mapTypologyToRiskType("Riesgo de deserción escolar por falta de conectividad y acceso")).toEqual({
      riskType: "CONECTIVIDAD_ACCESO_EDUCATIVO",
    });

    expect(mapTypologyToRiskType("Vulneración de derechos / trabajo infantil")).toEqual({
      riskType: "VULNERACION_DERECHOS",
    });

    expect(mapTypologyToRiskType("Embarazo adolescente")).toEqual({
      riskType: "EMBARAZO_ADOLESCENTE",
    });

    // Caso no clasificado
    const otherResult = mapTypologyToRiskType("Situación particular no registrada");
    expect(otherResult.riskType).toBe("OTRO");
    expect(otherResult.riskTypeOther).toBe("Situación particular no registrada");
  });
});

describe("caseImport - Resolución Flexible de Columnas de Matriz", () => {
  it("detecta columnas mediante sinónimos independientemente de su posición", () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Test");

    // Cabecera con nombres alternativos y orden variado
    const row = ws.addRow([
      "Cédula de Identidad",
      "Nombres y Apellidos del Estudiante",
      "Grado / Nivel",
      "Sección",
      "Problemática / Vulnerabilidad Detectada",
      "Detalle de Observaciones",
      "Tutor o Representante",
      "Celular de contacto",
    ]);

    const colMap = resolveColumnIndices(row);

    expect(colMap.docCol).toBe(1);
    expect(colMap.nameCol).toBe(2);
    expect(colMap.courseCol).toBe(3);
    expect(colMap.parallelCol).toBe(4);
    expect(colMap.typologyCol).toBe(5);
    expect(colMap.descriptionCol).toBe(6);
    expect(colMap.representativeCol).toBe(7);
    expect(colMap.phoneCol).toBe(8);
  });
});

describe("caseImport - Procesamiento e Inserción de Casos en Matriz", () => {
  beforeEach(() => {
    db.prepare(`
      INSERT OR IGNORE INTO institutions (id, name, amie_code)
      VALUES ('inst-test-01', 'Institución de Prueba', '123456')
    `).run();

    db.prepare(`
      INSERT OR IGNORE INTO users (id, institution_id, name, email, password_hash, role)
      VALUES ('user-test-01', 'inst-test-01', 'Usuario Prueba', 'test-import@dece.test', 'hash', 'DECE')
    `).run();
  });

  afterEach(() => {
    db.prepare(`DELETE FROM case_actions WHERE case_file_id IN (SELECT id FROM case_files WHERE institution_id = 'inst-test-01')`).run();
    db.prepare(`DELETE FROM case_files WHERE institution_id = 'inst-test-01'`).run();
    db.prepare(`DELETE FROM students WHERE institution_id = 'inst-test-01'`).run();
    db.prepare(`DELETE FROM users WHERE id = 'user-test-01'`).run();
    db.prepare(`DELETE FROM institutions WHERE id = 'inst-test-01'`).run();
  });

  it("procesa un libro de Excel y crea los casos en seguimiento y estudiantes", async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Matriz");

    ws.addRow([
      "Estudiante",
      "Cédula",
      "Curso",
      "Paralelo",
      "Tipología",
      "Observaciones",
    ]);

    ws.addRow([
      "Estudiante Importado Test 1",
      "0950123456",
      "10mo",
      "A",
      "Salud mental / Ideación suicida",
      "Caso en seguimiento desde el período anterior",
    ]);

    ws.addRow([
      "Estudiante Importado Test 2",
      "",
      "8vo",
      "B",
      "Violencia intrafamiliar",
      "Negligencia reportada por docente tutor",
    ]);

    // Fila sin nombre debe omitirse
    ws.addRow(["", "123", "9no", "A", "NEE", "Sin nombre"]);

    // Usar la base de datos real o de test
    const summary = await processCaseMatrixWorkbook(wb, {
      institutionId: "inst-test-01",
      userId: "user-test-01",
      defaultStatus: "EN_SEGUIMIENTO",
    });

    expect(summary.createdCases).toBe(2);
    expect(summary.createdStudents).toBeGreaterThanOrEqual(1);
    expect(summary.skipped.length).toBe(1);
    expect(summary.rows[0].status).toBe("EN_SEGUIMIENTO");
    expect(summary.rows[0].riskTypeLabel).toBe("SALUD_MENTAL");
    expect(summary.rows[0].caseCode).toBeDefined();
  });
});
