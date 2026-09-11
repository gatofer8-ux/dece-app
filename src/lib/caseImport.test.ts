import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Database from "better-sqlite3";
import ExcelJS from "exceljs";
import { db } from "./db";
import {
  mapTypologyToRiskType,
  resolveColumnIndices,
  detectHeaderRow,
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

  it("reconoce acrónimos y abreviaturas oficiales del DECE en Ecuador", () => {
    expect(mapTypologyToRiskType("AS").riskType).toBe("VIOLENCIA_SEXUAL");
    expect(mapTypologyToRiskType("VS").riskType).toBe("VIOLENCIA_SEXUAL");
    expect(mapTypologyToRiskType("V.S").riskType).toBe("VIOLENCIA_SEXUAL");
    expect(mapTypologyToRiskType("AS - TRASTORNO DE ANSIEDAD").riskType).toBe("VIOLENCIA_SEXUAL");
    expect(mapTypologyToRiskType("AUTOLESIONES/ IDEACIÓN SUICIDA").riskType).toBe("SALUD_MENTAL");
    expect(mapTypologyToRiskType("CUTTING E INESTABILIDAD EMOCIONAL").riskType).toBe("SALUD_MENTAL");
    expect(mapTypologyToRiskType("MADRE PRIVADA DE LA LIBERTAD").riskType).toBe("VULNERACION_DERECHOS");
    expect(mapTypologyToRiskType("HIJOS PPL").riskType).toBe("VULNERACION_DERECHOS");
    expect(mapTypologyToRiskType("EXTORSION - AMENAZA").riskType).toBe("VULNERACION_DERECHOS");
    expect(mapTypologyToRiskType("MADRE ADOLESCENTE").riskType).toBe("EMBARAZO_ADOLESCENTE");
    expect(mapTypologyToRiskType("APRESTAMIENTO ESCOLAR").riskType).toBe("DIFICULTAD_APRENDIZAJE");
    expect(mapTypologyToRiskType("VIOLENCIA INSTITUCIONAL").riskType).toBe("VIOLENCIA_ESCOLAR_BULLYING");
  });
});

describe("caseImport - Detección Inteligente de Fila de Encabezados", () => {
  it("detecta la cabecera real ignorando títulos y membretes en las primeras filas", () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Matriz Real");

    // Fila 1 y 2: Membrete o vacías
    ws.addRow([]);
    ws.addRow([]);
    // Fila 3: Banner de título combinado
    ws.addRow([
      "MATRIZ DE VULNERABILIDAD 2026-2027",
      "MATRIZ DE VULNERABILIDAD 2026-2027",
      "MATRIZ DE VULNERABILIDAD 2026-2027",
      "MATRIZ DE VULNERABILIDAD 2026-2027",
      "MATRIZ DE VULNERABILIDAD 2026-2027",
      "MATRIZ DE VULNERABILIDAD 2026-2027",
      "MATRIZ DE VULNERABILIDAD 2026-2027",
      "MATRIZ DE VULNERABILIDAD 2026-2027",
    ]);
    // Fila 4: Encabezados verdaderos
    ws.addRow([
      "N°",
      "AÑO",
      "PARALELO",
      "JORNADA",
      "IDENTIFICACIÓN",
      "CÓDIGO REDEVI",
      "ESTUDIANTE",
      "VULNERABILIDAD",
      "AJUSTES RAZONABLES",
      "TUTOR/A",
      "OBSERVACIONES",
    ]);

    const det = detectHeaderRow(ws);

    expect(det.headerRowIndex).toBe(4);
    expect(det.colMap.courseCol).toBe(2);
    expect(det.colMap.parallelCol).toBe(3);
    expect(det.colMap.docCol).toBe(5);
    expect(det.colMap.nameCol).toBe(7);
    expect(det.colMap.typologyCol).toBe(8);
    expect(det.colMap.descriptionCol).toBe(11);
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

  it("procesa un libro de Excel con formato ministerial, ignora separadores y crea casos", async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Matriz_Vulnerabilidad");

    // Fila 1: Banner institucional
    ws.addRow([
      "UNIDAD EDUCATIVA FISCAL - MATRIZ DE VULNERABILIDAD 2026-2027",
      "UNIDAD EDUCATIVA FISCAL - MATRIZ DE VULNERABILIDAD 2026-2027",
      "UNIDAD EDUCATIVA FISCAL - MATRIZ DE VULNERABILIDAD 2026-2027",
    ]);

    // Fila 2: Cabeceras reales
    ws.addRow([
      "N°",
      "AÑO",
      "PARALELO",
      "IDENTIFICACIÓN",
      "ESTUDIANTE",
      "VULNERABILIDAD",
      "OBSERVACIONES",
    ]);

    // Fila 3: Separador de sección (NO debe crear estudiante ni caso)
    ws.addRow([
      "VIOLENCIA SEXUAL",
      "VIOLENCIA SEXUAL",
      "VIOLENCIA SEXUAL",
      "VIOLENCIA SEXUAL",
      "VIOLENCIA SEXUAL",
      "VIOLENCIA SEXUAL",
      "VIOLENCIA SEXUAL",
    ]);

    // Fila 4: Estudiante 1 bajo sección Violencia Sexual
    ws.addRow([
      "1",
      "8VO EGB",
      "D",
      "1850992445",
      "CHISAG OÑATE ESTEFANI VICTORIA",
      "AS",
      "Caso ingresado con código Z3-18D02-32814",
    ]);

    // Fila 5: Separador de sección Salud Mental
    ws.addRow([
      "SALUD MENTAL",
      "SALUD MENTAL",
      "SALUD MENTAL",
      "SALUD MENTAL",
      "SALUD MENTAL",
      "SALUD MENTAL",
      "SALUD MENTAL",
    ]);

    // Fila 6: Estudiante 2 bajo sección Salud Mental
    ws.addRow([
      "2",
      "9NO EGB",
      "A",
      "1851080703",
      "PAUCAR MORENO NESTOR JOEL",
      "CUTTING Y CRISIS EMOCIONAL",
      "Requiere seguimiento socioemocional",
    ]);

    const summary = await processCaseMatrixWorkbook(wb, {
      institutionId: "inst-test-01",
      userId: "user-test-01",
      defaultStatus: "EN_SEGUIMIENTO",
    });

    expect(summary.createdCases).toBe(2);
    expect(summary.createdStudents).toBe(2);

    // Verificar Estudiante 1
    const case1 = summary.rows.find((r) => r.studentName.includes("CHISAG OÑATE"));
    expect(case1).toBeDefined();
    expect(case1?.riskTypeLabel).toBe("VIOLENCIA_SEXUAL");
    expect(case1?.course).toBe("8VO EGB");
    expect(case1?.parallel).toBe("D");
    expect(case1?.documentId).toBe("1850992445");

    // Verificar Estudiante 2
    const case2 = summary.rows.find((r) => r.studentName.includes("PAUCAR MORENO"));
    expect(case2).toBeDefined();
    expect(case2?.riskTypeLabel).toBe("SALUD_MENTAL");
    expect(case2?.course).toBe("9NO EGB");
    expect(case2?.parallel).toBe("A");
    expect(case2?.documentId).toBe("1851080703");
  });
});
