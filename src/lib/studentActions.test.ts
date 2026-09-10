import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import os from "os";
import path from "path";

const tmpDb = path.join(os.tmpdir(), `dece-studactions-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);

let db: import("better-sqlite3").Database;
let createStudent: typeof import("@/app/(app)/estudiantes/actions").createStudent;
let updateStudent: typeof import("@/app/(app)/estudiantes/actions").updateStudent;

const INST_ID = "inst-test-1";

beforeAll(async () => {
  vi.stubEnv("DATABASE_FILE", tmpDb);
  vi.stubEnv("NODE_ENV", "test");
  vi.resetModules();

  // Mock de Next.js y session
  vi.mock("next/cache", () => ({
    revalidatePath: vi.fn(),
  }));

  vi.mock("next/navigation", () => ({
    redirect: vi.fn(),
  }));

  vi.mock("@/lib/session", () => ({
    requireRole: vi.fn().mockResolvedValue({
      user: { id: "user-dece-1", role: "DECE", institution_id: INST_ID },
    }),
    requireInstitutionId: vi.fn().mockReturnValue(INST_ID),
  }));

  vi.mock("@/lib/audit", () => ({
    logAudit: vi.fn(),
  }));

  ({ db } = await import("./db"));
  const actions = await import("@/app/(app)/estudiantes/actions");
  createStudent = actions.createStudent;
  updateStudent = actions.updateStudent;

  db.prepare("INSERT INTO institutions (id, name) VALUES (?, ?)").run(INST_ID, "Colegio de Prueba");
});

afterAll(() => {
  vi.unstubAllEnvs();
  try {
    db?.close();
  } catch {}
});

describe("createStudent y updateStudent - Validación de Documentos de Identidad", () => {
  it("registra un estudiante con cédula ecuatoriana válida (módulo 10)", async () => {
    const fd = new FormData();
    fd.append("full_name", "Juan Fernando Pérez");
    fd.append("document_type", "CEDULA");
    fd.append("document_id", "1710034065");
    fd.append("course", "10mo EGB");

    await createStudent(fd);

    const saved = db.prepare("SELECT * FROM students WHERE document_id = ?").get("1710034065") as any;
    expect(saved).toBeDefined();
    expect(saved.full_name).toBe("Juan Fernando Pérez");
    expect(saved.document_type).toBe("CEDULA");
    expect(saved.document_id).toBe("1710034065");
  });

  it("rechaza registro de estudiante con cédula con dígito verificador inválido", async () => {
    const fd = new FormData();
    fd.append("full_name", "Estudiante Cédula Inválida");
    fd.append("document_type", "CEDULA");
    fd.append("document_id", "1710034064"); // Dígito 4 en vez de 5
    fd.append("course", "9no EGB");

    await expect(createStudent(fd)).rejects.toThrow(/Dígito verificador no coincide/);
  });

  it("rechaza registro de estudiante con cédula con código de provincia inválido", async () => {
    const fd = new FormData();
    fd.append("full_name", "Estudiante Provincia Inválida");
    fd.append("document_type", "CEDULA");
    fd.append("document_id", "9910034065");
    fd.append("course", "8vo EGB");

    await expect(createStudent(fd)).rejects.toThrow(/Código de provincia incorrecto/);
  });

  it("registra un estudiante extranjero con pasaporte válido sin pedir cédula", async () => {
    const fd = new FormData();
    fd.append("full_name", "Carlos Alberto Méndez");
    fd.append("document_type", "PASAPORTE");
    fd.append("document_id", "P12345678");
    fd.append("course", "1ro BGU");

    await createStudent(fd);

    const saved = db.prepare("SELECT * FROM students WHERE document_id = ?").get("P12345678") as any;
    expect(saved).toBeDefined();
    expect(saved.full_name).toBe("Carlos Alberto Méndez");
    expect(saved.document_type).toBe("PASAPORTE");
    expect(saved.document_id).toBe("P12345678");
  });

  it("normaliza el pasaporte convirtiéndolo a mayúsculas y quitando espacios", async () => {
    const fd = new FormData();
    fd.append("full_name", "Elena Sofia Rodriguez");
    fd.append("document_type", "PASAPORTE");
    fd.append("document_id", "  ab-9876543  ");
    fd.append("course", "2do BGU");

    await createStudent(fd);

    const saved = db.prepare("SELECT * FROM students WHERE full_name = ?").get("Elena Sofia Rodriguez") as any;
    expect(saved).toBeDefined();
    expect(saved.document_type).toBe("PASAPORTE");
    expect(saved.document_id).toBe("AB9876543");
  });

  it("rechaza pasaporte con longitud menor a 6 caracteres", async () => {
    const fd = new FormData();
    fd.append("full_name", "Pasaporte Corto");
    fd.append("document_type", "PASAPORTE");
    fd.append("document_id", "A123");
    fd.append("course", "3ro BGU");

    await expect(createStudent(fd)).rejects.toThrow(/Longitud de pasaporte inválida/);
  });

  it("permite registrar un estudiante sin documento (indocumentado)", async () => {
    const fd = new FormData();
    fd.append("full_name", "Estudiante Sin Documento");
    fd.append("document_type", "CEDULA");
    fd.append("document_id", "");
    fd.append("course", "1ro EGB");

    await createStudent(fd);

    const saved = db.prepare("SELECT * FROM students WHERE full_name = ?").get("Estudiante Sin Documento") as any;
    expect(saved).toBeDefined();
    expect(saved.document_id).toBeNull();
  });

  it("rechaza duplicados de documento en la misma institución con mensaje legible", async () => {
    const fd = new FormData();
    fd.append("full_name", "Otro Alumno Misma Cédula");
    fd.append("document_type", "CEDULA");
    fd.append("document_id", "1710034065");
    fd.append("course", "10mo EGB");

    await expect(createStudent(fd)).rejects.toThrow(/Ya existe un estudiante registrado con este documento/);
  });

  it("permite actualizar el documento de cédula a pasaporte al editar", async () => {
    const student = db.prepare("SELECT * FROM students WHERE document_id = ?").get("1710034065") as any;

    const fd = new FormData();
    fd.append("full_name", "Juan Fernando Pérez Actualizado");
    fd.append("document_type", "PASAPORTE");
    fd.append("document_id", "ECU998877");
    fd.append("course", "10mo EGB");

    await updateStudent(student.id, fd);

    const updated = db.prepare("SELECT * FROM students WHERE id = ?").get(student.id) as any;
    expect(updated.full_name).toBe("Juan Fernando Pérez Actualizado");
    expect(updated.document_type).toBe("PASAPORTE");
    expect(updated.document_id).toBe("ECU998877");
  });
});
