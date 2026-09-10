import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";

const tmpDb = path.join(os.tmpdir(), `dece-defaults-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
let db: import("better-sqlite3").Database;
let getCaseDocumentDefaults: typeof import("./caseDocumentDefaults").getCaseDocumentDefaults;

const INST = "inst-1";

beforeAll(async () => {
  vi.stubEnv("DATABASE_FILE", tmpDb);
  vi.stubEnv("NODE_ENV", "test");
  vi.resetModules();
  ({ db } = await import("./db"));
  ({ getCaseDocumentDefaults } = await import("./caseDocumentDefaults"));

  db.prepare("INSERT INTO institutions (id, name, rector_title, rector_name, rector_role) VALUES (?, ?, ?, ?, ?)").run(
    INST,
    "U.E. Prueba",
    "Msc.",
    "Ana Torres",
    "RECTORA DE LA UNIDAD EDUCATIVA"
  );
  db.prepare(
    "INSERT INTO users (id, institution_id, name, email, password_hash, role, active, title_prefix, job_title, document_id, phone_ext) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)"
  ).run("u1", INST, "Carla Ruiz", "carla@ue.test", "x", "DECE", "Psic. Cl.", "ANALISTA DECE", "1804567890", "102");
  db.prepare("INSERT INTO students (id, institution_id, full_name, course, birth_date) VALUES (?, ?, ?, ?, ?)").run(
    "s1",
    INST,
    "Estudiante Uno",
    "8vo A",
    "2012-06-15"
  );
  db.prepare(
    "INSERT INTO case_files (id, institution_id, code, student_id, opened_by_id, risk_type, description) VALUES (?, ?, ?, ?, ?, 'OTRO', 'x')"
  ).run("c1", INST, "C-1", "s1", "u1");
});

afterAll(() => {
  vi.unstubAllEnvs();
  try {
    db?.close();
  } catch {}
  for (const s of ["", "-wal", "-shm", "-journal"]) {
    try {
      fs.unlinkSync(tmpDb + s);
    } catch {}
  }
});

describe("getCaseDocumentDefaults", () => {
  const session = { user: { id: "u1", institution_id: INST, name: "Carla Ruiz", email: "carla@ue.test" } };

  it("precarga profesional con título, cargo, cédula y extensión", () => {
    const d = getCaseDocumentDefaults("c1", session, INST)!;
    expect(d.deceProfessional.fullName).toBe("Psic. Cl. Carla Ruiz");
    expect(d.deceProfessional.role).toBe("ANALISTA DECE");
    expect(d.deceProfessional.documentId).toBe("1804567890");
    expect(d.deceProfessional.phoneExt).toBe("102");
  });

  it("precarga la autoridad institucional", () => {
    const d = getCaseDocumentDefaults("c1", session, INST)!;
    expect(d.authority.fullName).toBe("Msc. Ana Torres");
    expect(d.authority.role).toBe("RECTORA DE LA UNIDAD EDUCATIVA");
  });

  it("calcula la edad del estudiante desde la fecha de nacimiento", () => {
    const d = getCaseDocumentDefaults("c1", session, INST)!;
    expect(d.studentAge).toBeGreaterThanOrEqual(12);
    expect(d.studentAge).toBeLessThan(20);
  });

  it("devuelve null para un caso de otra institución", () => {
    expect(getCaseDocumentDefaults("c1", session, "otra-inst")).toBeNull();
  });
});
