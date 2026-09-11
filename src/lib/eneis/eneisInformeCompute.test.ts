import { describe, it, expect, beforeAll, vi } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import { randomUUID } from "crypto";

const tmpDb = path.join(os.tmpdir(), `dece-eneis-informe-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
let db: import("better-sqlite3").Database;
let computeInformeTablas: typeof import("./eneisInformeCompute").computeInformeTablas;

const INST = "inst-1";

function insertFicha(opts: {
  docente: string;
  asignatura: string;
  curso?: string;
  paralelo?: string;
  fecha: string;
  estudiantes?: number;
  materialId?: string;
}) {
  db.prepare(
    `INSERT INTO eneis_sessions (id, institution_id, title, access_code, status)
     VALUES (?, ?, 'sesion', ?, 'ABIERTA')`
  ).run(randomUUID(), INST, `COD${Math.random().toString(36).slice(2, 8).toUpperCase()}`);
  const sessionId = db.prepare("SELECT id FROM eneis_sessions WHERE institution_id = ? ORDER BY created_at DESC LIMIT 1").get(INST) as { id: string };

  db.prepare(
    `INSERT INTO eneis_fichas (
      id, session_id, institution_id, docente_nombre, asignatura, curso, paralelo,
      fecha_desde, fecha_hasta, num_estudiantes_capacitados, material_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    randomUUID(),
    sessionId.id,
    INST,
    opts.docente,
    opts.asignatura,
    opts.curso || null,
    opts.paralelo || null,
    opts.fecha,
    opts.fecha,
    opts.estudiantes ?? 0,
    opts.materialId || null
  );
}

beforeAll(async () => {
  vi.stubEnv("DATABASE_FILE", tmpDb);
  vi.stubEnv("NODE_ENV", "test");
  vi.resetModules();
  ({ db } = await import("../db"));
  ({ computeInformeTablas } = await import("./eneisInformeCompute"));

  db.prepare("INSERT INTO institutions (id, name) VALUES (?, ?)").run(INST, "U.E. Prueba ENEIS");

  insertFicha({ docente: "Mg. Ana Pérez", asignatura: "Ciencias Naturales", curso: "9no EGB", paralelo: "A", fecha: "2025-10-05", estudiantes: 30, materialId: "oportunidades_1" });
  insertFicha({ docente: "Mg. Ana Pérez", asignatura: "Ciencias Naturales", curso: "9no EGB", paralelo: "B", fecha: "2025-10-12", estudiantes: 28, materialId: "oportunidades_1" });
  insertFicha({ docente: "Lic. Juan Ruiz", asignatura: "Lengua y Literatura", curso: "10mo EGB", paralelo: "A", fecha: "2025-11-03", estudiantes: 25, materialId: "guia_embarazo" });
  // Fuera del período que se va a consultar (diciembre) — no debe contarse.
  insertFicha({ docente: "Lic. Juan Ruiz", asignatura: "Lengua y Literatura", curso: "10mo EGB", paralelo: "A", fecha: "2025-12-15", estudiantes: 25 });
});

describe("computeInformeTablas", () => {
  it("agrupa por asignatura y mes, y suma la población dentro del período", () => {
    const { actividadesDocentes, totalFichas } = computeInformeTablas(INST, "2025-10-01", "2025-11-30");
    expect(totalFichas).toBe(3);

    const ciencias = actividadesDocentes.find((a) => a.area === "CIENCIAS NATURALES");
    expect(ciencias).toBeTruthy();
    expect(ciencias!.nroPlanificaciones).toBe(2);
    expect(ciencias!.poblacion).toContain("9no EGB");

    const lengua = actividadesDocentes.find((a) => a.area === "LENGUA Y LITERATURA");
    expect(lengua).toBeTruthy();
    expect(lengua!.nroPlanificaciones).toBe(1);
  });

  it("calcula la cobertura: estudiantes sumados, docentes distintos, y docentes que usan Oportunidades Curriculares", () => {
    const { cobertura } = computeInformeTablas(INST, "2025-10-01", "2025-11-30");
    expect(cobertura.estudiantesAlcanzados).toBe(30 + 28 + 25);
    expect(cobertura.docentesAlcanzados).toBe(2); // Ana Pérez, Juan Ruiz
    expect(cobertura.docentesOportunidades).toBe(1); // solo Ana Pérez usó Oportunidades Curriculares
  });

  it("respeta el rango de fechas: una ficha de diciembre no se cuenta en un período de oct-nov", () => {
    const { totalFichas } = computeInformeTablas(INST, "2025-10-01", "2025-11-30");
    expect(totalFichas).toBe(3);
    const { totalFichas: totalDiciembre } = computeInformeTablas(INST, "2025-12-01", "2025-12-31");
    expect(totalDiciembre).toBe(1);
  });

  it("devuelve tablas vacías si no hay fichas en el período", () => {
    const { actividadesDocentes, cobertura, totalFichas } = computeInformeTablas(INST, "2020-01-01", "2020-01-31");
    expect(actividadesDocentes).toEqual([]);
    expect(totalFichas).toBe(0);
    expect(cobertura).toEqual({ estudiantesAlcanzados: 0, docentesAlcanzados: 0, docentesOportunidades: 0 });
  });
});
