import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";

describe("alertIdentificationSessions", () => {
  let tmpDb: string;

  beforeEach(() => {
    tmpDb = path.join(os.tmpdir(), `test-alert-id-${Date.now()}.db`);
    vi.stubEnv("DATABASE_FILE", tmpDb);
    vi.resetModules();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    try {
      fs.unlinkSync(tmpDb);
    } catch {
      /* noop */
    }
  });

  it("crea una sesion con codigo unico y permite recuperarla por codigo", async () => {
    const { db } = await import("@/lib/db");
    const institutionId = "inst-1";
    db.prepare("INSERT INTO institutions (id, name) VALUES (?, ?)").run(institutionId, "UE Prueba");

    const { generateUniqueAccessCode, getSessionByCode, createEntry, listEntriesForSession } = await import("./alertIdentificationSessions");
    const code = generateUniqueAccessCode();
    expect(code).toHaveLength(6);

    const { randomUUID } = await import("crypto");
    const sessionId = randomUUID();
    db.prepare(
      "INSERT INTO alert_identification_sessions (id, institution_id, curso, access_code) VALUES (?, ?, ?, ?)"
    ).run(sessionId, institutionId, "8vo A", code);

    const found = getSessionByCode(code);
    expect(found?.curso).toBe("8vo A");

    createEntry({ sessionId, institutionId, studentName: "Juan Pérez", riskType: "SALUD_MENTAL", teacherName: "Prof. Ana" });
    const entries = listEntriesForSession(sessionId);
    expect(entries).toHaveLength(1);
    expect(entries[0].student_name).toBe("Juan Pérez");
  });
});
