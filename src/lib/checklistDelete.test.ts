import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Database in memory
vi.mock("./db", async () => {
  const Database = (await import("better-sqlite3")).default;
  const db = new Database(":memory:");
  db.exec(`
    CREATE TABLE case_checklist_items (
      id TEXT PRIMARY KEY,
      case_file_id TEXT,
      category TEXT,
      item_order INTEGER,
      item_text TEXT,
      status TEXT,
      observations TEXT,
      attachment_id TEXT,
      updated_at TEXT
    );
    CREATE TABLE case_checklist_reviews (
      id TEXT PRIMARY KEY,
      case_file_id TEXT,
      role_label TEXT,
      full_name TEXT,
      signed_date TEXT
    );
    CREATE TABLE attachments (
      id TEXT PRIMARY KEY,
      case_file_id TEXT,
      path TEXT
    );
    CREATE TABLE audit_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      action TEXT,
      entity_type TEXT,
      entity_id TEXT,
      details TEXT,
      institution_id TEXT,
      created_at TEXT
    );
  `);
  return { db };
});

vi.mock("./session", () => ({
  requireRole: vi.fn().mockResolvedValue({ user: { id: "u1", role: "DECE" } }),
  requireInstitutionId: vi.fn().mockReturnValue("inst-1"),
}));

vi.mock("./scopedDb", () => ({
  requireOwnedCase: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

const mockDeleteAttachmentFile = vi.fn();
vi.mock("./uploads", () => ({
  deleteAttachmentFile: (p: string) => mockDeleteAttachmentFile(p),
}));

describe("deleteChecklist", () => {
  beforeEach(async () => {
    const { db } = await import("./db");
    db.prepare("DELETE FROM case_checklist_items").run();
    db.prepare("DELETE FROM case_checklist_reviews").run();
    db.prepare("DELETE FROM attachments").run();
    mockDeleteAttachmentFile.mockClear();
  });

  it("elimina todos los ítems de la categoría seleccionada y sus archivos de respaldo asociados", async () => {
    const { db } = await import("./db");
    const { deleteChecklist } = await import("@/app/(app)/casos/actions");

    // Insertar ítems de Violencia Sexual con un adjunto
    db.prepare(
      "INSERT INTO case_checklist_items (id, case_file_id, category, item_order, item_text, attachment_id) VALUES (?, ?, ?, ?, ?, ?)"
    ).run("item-1", "case-1", "VIOLENCIA_SEXUAL", 1, "Denuncia", "att-1");
    db.prepare(
      "INSERT INTO case_checklist_items (id, case_file_id, category, item_order, item_text, attachment_id) VALUES (?, ?, ?, ?, ?, ?)"
    ).run("item-2", "case-1", "VIOLENCIA_SEXUAL", 2, "Consentimiento", null);

    // Insertar registro de adjunto
    db.prepare("INSERT INTO attachments (id, case_file_id, path) VALUES (?, ?, ?)").run(
      "att-1",
      "case-1",
      "/uploads/att-1.pdf"
    );

    // Insertar reviews de checklist
    db.prepare(
      "INSERT INTO case_checklist_reviews (id, case_file_id, role_label) VALUES (?, ?, ?)"
    ).run("rev-1", "case-1", "Analista DECE");

    // Ejecutar eliminación
    const result = await deleteChecklist("case-1", "VIOLENCIA_SEXUAL");
    expect(result).toBeUndefined();

    // Comprobar que los ítems fueron eliminados
    const remainingItems = db
      .prepare("SELECT * FROM case_checklist_items WHERE case_file_id = ?")
      .all("case-1");
    expect(remainingItems.length).toBe(0);

    // Comprobar que el archivo de respaldo fue borrado
    const remainingAtt = db
      .prepare("SELECT * FROM attachments WHERE id = ?")
      .all("att-1");
    expect(remainingAtt.length).toBe(0);
    expect(mockDeleteAttachmentFile).toHaveBeenCalledWith("/uploads/att-1.pdf");

    // Como era el único checklist, las reviews también se limpiaron
    const remainingReviews = db
      .prepare("SELECT * FROM case_checklist_reviews WHERE case_file_id = ?")
      .all("case-1");
    expect(remainingReviews.length).toBe(0);
  });

  it("mantiene los ítems de otra categoría si el caso tenía múltiples checklists", async () => {
    const { db } = await import("./db");
    const { deleteChecklist } = await import("@/app/(app)/casos/actions");

    // Insertar ítems de dos categorías distintas
    db.prepare(
      "INSERT INTO case_checklist_items (id, case_file_id, category, item_order, item_text) VALUES (?, ?, ?, ?, ?)"
    ).run("item-vs", "case-1", "VIOLENCIA_SEXUAL", 1, "Denuncia");
    db.prepare(
      "INSERT INTO case_checklist_items (id, case_file_id, category, item_order, item_text) VALUES (?, ?, ?, ?, ?)"
    ).run("item-ap", "case-1", "ATENCION_PSICOSOCIAL", 1, "Ficha de datos");

    db.prepare(
      "INSERT INTO case_checklist_reviews (id, case_file_id, role_label) VALUES (?, ?, ?)"
    ).run("rev-1", "case-1", "Analista DECE");

    // Eliminar solo Violencia Sexual
    await deleteChecklist("case-1", "VIOLENCIA_SEXUAL");

    // Violencia Sexual borrado, pero Atención Psicosocial se mantiene intacto
    const vsItems = db
      .prepare("SELECT * FROM case_checklist_items WHERE category = 'VIOLENCIA_SEXUAL'")
      .all();
    expect(vsItems.length).toBe(0);

    const apItems = db
      .prepare("SELECT * FROM case_checklist_items WHERE category = 'ATENCION_PSICOSOCIAL'")
      .all();
    expect(apItems.length).toBe(1);

    // Las reviews se mantienen porque todavía existe el checklist de Atención Psicosocial
    const reviews = db
      .prepare("SELECT * FROM case_checklist_reviews WHERE case_file_id = ?")
      .all("case-1");
    expect(reviews.length).toBe(1);
  });
});
