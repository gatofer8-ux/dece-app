import { describe, it, expect, beforeEach } from "vitest";
import Database from "better-sqlite3";
import { getInactiveCases, getCaseInactivityInfo } from "./caseAlerts";

describe("Sistema de Alertas de Casos sin Seguimiento ni Conversación", () => {
  let db: Database.Database;
  const instId = "inst-01";

  beforeEach(() => {
    db = new Database(":memory:");
    db.exec(`
      CREATE TABLE institutions (id TEXT PRIMARY KEY, name TEXT);
      CREATE TABLE students (
        id TEXT PRIMARY KEY,
        institution_id TEXT NOT NULL,
        full_name TEXT NOT NULL,
        course TEXT,
        parallel TEXT,
        representative TEXT,
        rep_phone TEXT
      );
      CREATE TABLE case_files (
        id TEXT PRIMARY KEY,
        institution_id TEXT NOT NULL,
        student_id TEXT NOT NULL,
        code TEXT NOT NULL,
        legacy_code TEXT,
        status TEXT NOT NULL DEFAULT 'ABIERTO',
        priority TEXT NOT NULL DEFAULT 'MEDIA',
        risk_type TEXT NOT NULL DEFAULT 'ACADEMICO',
        detection_date TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE case_actions (
        id TEXT PRIMARY KEY,
        case_file_id TEXT NOT NULL,
        author_id TEXT,
        date TEXT NOT NULL,
        type TEXT NOT NULL,
        description TEXT NOT NULL,
        intervention_type TEXT,
        observations TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE case_interviews (
        id TEXT PRIMARY KEY,
        case_file_id TEXT NOT NULL,
        application_date TEXT
      );
      CREATE TABLE dece_esquelas (
        id TEXT PRIMARY KEY,
        institution_id TEXT NOT NULL,
        case_file_id TEXT,
        citation_date TEXT NOT NULL
      );

      INSERT INTO institutions (id, name) VALUES ('inst-01', 'Institución Test');
      INSERT INTO students (id, institution_id, full_name, course, representative)
      VALUES ('s1', 'inst-01', 'Estudiante Activo', '10mo A', 'Rep 1'),
             ('s2', 'inst-01', 'Estudiante Abandonado', '9no B', 'Rep 2'),
             ('s3', 'inst-01', 'Estudiante Caso Cerrado', '8vo C', 'Rep 3');
    `);
  });

  it("detecta casos abiertos con más de 30 días sin conversación con el estudiante o representante", () => {
    const today = new Date();
    const d5DaysAgo = new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const d40DaysAgo = new Date(today.getTime() - 40 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    // Caso 1: abierto hace 40 días pero con entrevista hace 5 días -> NO debe alertar
    db.exec(`
      INSERT INTO case_files (id, institution_id, student_id, code, status, detection_date)
      VALUES ('c1', 'inst-01', 's1', 'CASO-01', 'EN_PROCESO', '${d40DaysAgo}');

      INSERT INTO case_actions (id, case_file_id, date, type, description)
      VALUES ('a1', 'c1', '${d5DaysAgo}', 'Entrevista', 'Entrevista con el representante');
    `);

    // Caso 2: abierto hace 40 días SIN ninguna acción -> DEBE alertar
    db.exec(`
      INSERT INTO case_files (id, institution_id, student_id, code, status, detection_date)
      VALUES ('c2', 'inst-01', 's2', 'CASO-02', 'EN_PROCESO', '${d40DaysAgo}');
    `);

    // Caso 3: abierto hace 50 días pero CERRADO -> NO debe alertar
    db.exec(`
      INSERT INTO case_files (id, institution_id, student_id, code, status, detection_date)
      VALUES ('c3', 'inst-01', 's3', 'CASO-03', 'CERRADO', '${d40DaysAgo}');
    `);

    const result = getInactiveCases(instId, 30, db);
    expect(result.totalOpenCases).toBe(2);
    expect(result.alertCasesCount).toBe(1);
    expect(result.cases[0].id).toBe("c2");
    expect(result.cases[0].days_without_conversation).toBeGreaterThanOrEqual(40);
  });

  it("diferencia entre acciones puramente administrativas y conversaciones directas", () => {
    const today = new Date();
    const d5DaysAgo = new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const d45DaysAgo = new Date(today.getTime() - 45 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    // Caso con acción administrativa reciente ('Cambio de estado') pero SIN conversación directa
    db.exec(`
      INSERT INTO case_files (id, institution_id, student_id, code, status, detection_date)
      VALUES ('c4', 'inst-01', 's1', 'CASO-04', 'EN_PROCESO', '${d45DaysAgo}');

      INSERT INTO case_actions (id, case_file_id, date, type, description)
      VALUES ('a2', 'c4', '${d5DaysAgo}', 'Cambio de estado', 'Se cambió prioridad del caso');
    `);

    const result = getInactiveCases(instId, 30, db);
    // Debe alertar porque no hay diálogo con el estudiante o su representante en > 30 días
    expect(result.alertCasesCount).toBe(1);
    expect(result.cases[0].id).toBe("c4");
  });

  it("resetea la alerta cuando se emite una esquela de citación", () => {
    const today = new Date();
    const d35DaysAgo = new Date(today.getTime() - 35 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const d2DaysAgo = new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    db.exec(`
      INSERT INTO case_files (id, institution_id, student_id, code, status, detection_date)
      VALUES ('c5', 'inst-01', 's2', 'CASO-05', 'EN_PROCESO', '${d35DaysAgo}');
    `);

    let info = getCaseInactivityInfo("c5", instId, db);
    expect(info.isAlert).toBe(true);

    // Emitir esquela hace 2 días
    db.exec(`
      INSERT INTO dece_esquelas (id, institution_id, case_file_id, citation_date)
      VALUES ('esq-1', 'inst-01', 'c5', '${d2DaysAgo}');
    `);

    info = getCaseInactivityInfo("c5", instId, db);
    expect(info.isAlert).toBe(false);
    expect(info.daysWithoutConversation).toBeLessThanOrEqual(3);
  });
});
