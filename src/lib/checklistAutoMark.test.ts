import { it, expect, vi } from "vitest";

// Aísla la conexión: un :memory: propio para el test.
vi.mock("./db", async () => {
  const Database = (await import("better-sqlite3")).default;
  const db = new Database(":memory:");
  db.exec(`CREATE TABLE case_checklist_items (
    id TEXT PRIMARY KEY, case_file_id TEXT, item_text TEXT, status TEXT, observations TEXT, updated_at TEXT
  );`);
  return { db };
});

it("autoMarkChecklistItems marca en SI el ítem que coincide con todas las palabras clave", async () => {
  const { db } = await import("./db");
  const { autoMarkChecklistItems } = await import("./checklistAutoMark");

  const mk = (id: string, text: string, status: string | null = null) =>
    db.prepare("INSERT INTO case_checklist_items (id, case_file_id, item_text, status) VALUES (?, 'c1', ?, ?)").run(id, text, status);
  mk("i1", "Ficha de derivación (MSP, DINAPEN, UDAI) (de acuerdo al modelo DECE)");
  mk("i2", "Ficha de reporte del hecho de violencia");
  mk("i3", "Consentimiento informado", "NO");
  mk("i4", "Plan de Atención Psicosocial y seguimiento", "SI");

  autoMarkChecklistItems("c1", ["ficha de derivacion"], "Ficha de derivación");
  autoMarkChecklistItems("c1", ["reporte", "hecho de violencia"], "Reporte de hecho de violencia");

  const rows = db.prepare("SELECT id, status, observations FROM case_checklist_items ORDER BY id").all() as any[];
  const byId = Object.fromEntries(rows.map((r) => [r.id, r]));
  expect(byId.i1.status).toBe("SI");
  expect(byId.i1.observations).toContain("Generado en el sistema");
  expect(byId.i2.status).toBe("SI");
  expect(byId.i3.status).toBe("NO"); // no coincide, no se toca
  expect(byId.i4.status).toBe("SI"); // ya estaba en SI, se deja
});
