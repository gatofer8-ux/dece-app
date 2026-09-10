import { it, expect } from "vitest";
import Database from "better-sqlite3";
import { recodifyExistingCases } from "./recodifyCases";

it("recodify: DECE-* -> SIGLAS-DOC-AÑO-NN, guarda legacy, idempotente, secuencia por estudiante", () => {
  const db = new Database(":memory:");
  db.exec(`CREATE TABLE institutions(id TEXT PRIMARY KEY,name TEXT,acronym TEXT);
    CREATE TABLE students(id TEXT PRIMARY KEY,document_id TEXT);
    CREATE TABLE case_files(id TEXT PRIMARY KEY,institution_id TEXT,student_id TEXT,code TEXT,legacy_code TEXT,created_at TEXT,detection_date TEXT);`);
  db.prepare("INSERT INTO institutions VALUES(?,?,?)").run("i1", "Unidad Educativa Santa Rosa", null);
  db.prepare("INSERT INTO students VALUES(?,?)").run("s1", "1805123456");
  db.prepare("INSERT INTO students VALUES(?,?)").run("s2", null);
  const mk = (id: string, s: string, code: string, ca: string) =>
    db.prepare("INSERT INTO case_files VALUES(?,?,?,?,?,?,?)").run(id, "i1", s, code, null, ca, ca);
  mk("c1", "s1", "DECE-2026-0001", "2026-01-05");
  mk("c2", "s1", "DECE-2026-0007", "2026-03-10");
  mk("c3", "s2", "DECE-2025-0002", "2025-09-01");

  recodifyExistingCases(db);
  const rows = db.prepare("SELECT id,code,legacy_code FROM case_files ORDER BY id").all() as any[];
  const byId = Object.fromEntries(rows.map((r) => [r.id, r]));
  expect(byId.c1.code).toBe("UESR-1805123456-2026-01");
  expect(byId.c2.code).toBe("UESR-1805123456-2026-02");
  expect(byId.c3.code).toBe("UESR-SDS2-2025-01");
  expect(byId.c1.legacy_code).toBe("DECE-2026-0001");

  const before = db.prepare("SELECT code FROM case_files ORDER BY id").all();
  recodifyExistingCases(db);
  expect(db.prepare("SELECT code FROM case_files ORDER BY id").all()).toEqual(before);
});
