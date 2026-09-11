import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";

describe("eneisReporteAvances", () => {
  let tmpDb: string;

  beforeEach(() => {
    tmpDb = path.join(os.tmpdir(), `test-reporte-avances-${Date.now()}.db`);
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

  it("formatPeriodoReporte convierte YYYY-MM a MES AÑO", async () => {
    const { formatPeriodoReporte } = await import("./eneisReporteAvances");
    expect(formatPeriodoReporte("2025-10")).toBe("OCTUBRE 2025");
  });

  it("computeReporteAvances agrupa las fichas del mes y calcula el numero correlativo", async () => {
    const { db } = await import("@/lib/db");
    const institutionId = "inst-1";
    db.prepare(
      `INSERT INTO institutions (id, name, amie_code) VALUES (?, ?, ?)`
    ).run(institutionId, "UE Santa Rosa", "18H00036");
    const sessionId = "session-1";
    db.prepare(
      `INSERT INTO eneis_sessions (id, institution_id, title, access_code) VALUES (?, ?, ?, ?)`
    ).run(sessionId, institutionId, "Octubre", "ABC123");
    db.prepare(
      `INSERT INTO eneis_fichas (id, session_id, institution_id, docente_nombre, asignatura, curso, paralelo, fecha_desde, fecha_hasta, nombre_ficha, num_estudiantes_capacitados, material_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run("f1", sessionId, institutionId, "Ana Pérez", "Ciencias Naturales", "8vo", "A", "2025-10-01", "2025-10-01", "Mi aseo personal", 30, "oportunidades_1");

    const { computeReporteAvances } = await import("./eneisReporteAvances");
    const result = computeReporteAvances(institutionId, "2025-10");
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].asignatura).toBe("CIENCIAS NATURALES");
    expect(result.rows[0].tema).toBe("Mi aseo personal");
    expect(result.numero).toBe(1);

    const empty = computeReporteAvances(institutionId, "2025-11");
    expect(empty.rows).toHaveLength(0);
  });
});
