import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";

/**
 * Test de integración de AISLAMIENTO MULTI-INSTITUCIÓN.
 *
 * Usa una base SQLite real y temporal (no mocks): crea dos instituciones con
 * sus datos y verifica que las utilidades de `scopedDb` nunca dejan que una
 * institución vea o modifique recursos de la otra.
 */

const tmpDb = path.join(os.tmpdir(), `dece-scopedtest-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);

let db: import("better-sqlite3").Database;
let scoped: typeof import("./scopedDb");

const INST_A = "inst-a";
const INST_B = "inst-b";

beforeAll(async () => {
  vi.stubEnv("DATABASE_FILE", tmpDb);
  vi.stubEnv("NODE_ENV", "test");
  vi.resetModules();

  ({ db } = await import("./db"));
  scoped = await import("./scopedDb");

  const mkInst = db.prepare("INSERT INTO institutions (id, name) VALUES (?, ?)");
  mkInst.run(INST_A, "Institución A");
  mkInst.run(INST_B, "Institución B");

  const mkUser = db.prepare(
    "INSERT INTO users (id, institution_id, name, email, password_hash, role, active) VALUES (?, ?, ?, ?, ?, ?, 1)"
  );
  mkUser.run("user-a", INST_A, "DECE A", "a@a.test", "x", "DECE");
  mkUser.run("user-b", INST_B, "DECE B", "b@b.test", "x", "DECE");

  const mkStudent = db.prepare(
    "INSERT INTO students (id, institution_id, full_name, course) VALUES (?, ?, ?, ?)"
  );
  mkStudent.run("stu-a", INST_A, "Estudiante A", "1ro A");
  mkStudent.run("stu-b", INST_B, "Estudiante B", "1ro B");

  const mkCase = db.prepare(
    `INSERT INTO case_files (id, institution_id, code, student_id, opened_by_id, risk_type, description)
     VALUES (?, ?, ?, ?, ?, 'OTRO', 'x')`
  );
  mkCase.run("case-a", INST_A, "A-001", "stu-a", "user-a");
  mkCase.run("case-b", INST_B, "B-001", "stu-b", "user-b");
});

afterAll(() => {
  vi.unstubAllEnvs();
  try {
    db?.close();
  } catch {}
  for (const suffix of ["", "-wal", "-shm", "-journal"]) {
    try {
      fs.unlinkSync(tmpDb + suffix);
    } catch {}
  }
});

describe("scopedDb — aislamiento entre instituciones", () => {
  it("findOwned devuelve el recurso propio y undefined para el ajeno", () => {
    expect(scoped.findOwned("case_files", "case-a", INST_A)).toMatchObject({ id: "case-a" });
    expect(scoped.findOwned("case_files", "case-b", INST_A)).toBeUndefined();
    expect(scoped.findOwned("students", "stu-b", INST_A)).toBeUndefined();
  });

  it("requireOwned lanza al pedir un recurso de otra institución", () => {
    expect(() => scoped.requireOwnedCase("case-b", INST_A)).toThrow(/no encontrado en tu institución/);
    expect(() => scoped.requireOwnedStudent("stu-b", INST_A)).toThrow(/no encontrado/);
    // el dueño legítimo sí puede
    expect(scoped.requireOwnedCase("case-b", INST_B)).toMatchObject({ id: "case-b" });
  });

  it("isOwned refleja la pertenencia real", () => {
    expect(scoped.isOwned("case_files", "case-a", INST_A)).toBe(true);
    expect(scoped.isOwned("case_files", "case-a", INST_B)).toBe(false);
  });

  it("rechaza tablas fuera de la lista blanca (evita interpolación arbitraria)", () => {
    expect(() => scoped.findOwned("sqlite_master", "x", INST_A)).toThrow(/lista blanca/);
    expect(() => scoped.findOwned("users; DROP TABLE users", "x", INST_A)).toThrow(/lista blanca/);
  });

  it("un id inexistente no pertenece a nadie", () => {
    expect(scoped.findOwned("case_files", "no-existe", INST_A)).toBeUndefined();
    expect(scoped.isOwned("students", "no-existe", INST_B)).toBe(false);
  });
});
