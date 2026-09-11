import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from "vitest";
import os from "os";
import path from "path";

const tmpDb = path.join(os.tmpdir(), `dece-sync-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);

let db: import("better-sqlite3").Database;
let POST: typeof import("./route").POST;

const INST_ID = "inst-sync-test";
const USER_ID = "user-dece-sync";

beforeAll(async () => {
  vi.stubEnv("DATABASE_FILE", tmpDb);
  vi.stubEnv("NODE_ENV", "test");
  vi.resetModules();

  vi.mock("@/lib/session", () => ({
    getSession: vi.fn().mockResolvedValue({
      user: { id: USER_ID, role: "DECE", institution_id: INST_ID, name: "Lic. Sincronizador" },
    }),
    requireInstitutionId: vi.fn().mockReturnValue(INST_ID),
  }));

  vi.mock("@/lib/audit", () => ({
    logAudit: vi.fn(),
  }));

  ({ db } = await import("@/lib/db"));
  const routeModule = await import("./route");
  POST = routeModule.POST;

  // Insertar institución y usuario de prueba
  db.prepare("INSERT OR IGNORE INTO institutions (id, name) VALUES (?, ?)").run(INST_ID, "Unidad Educativa Fronteriza");
  db.prepare("INSERT OR IGNORE INTO users (id, institution_id, email, name, role, password_hash) VALUES (?, ?, ?, ?, ?, ?)")
    .run(USER_ID, INST_ID, "dece@frontera.edu.ec", "Lic. Sincronizador", "DECE", "hashed_password");
});

afterAll(() => {
  vi.unstubAllEnvs();
  try {
    db?.close();
  } catch {}
});

describe("POST /api/sync/batch - Sincronización en lote Offline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rechaza peticiones sin autenticación válida con HTTP 401", async () => {
    const { getSession } = await import("@/lib/session");
    (getSession as any).mockResolvedValueOnce(null);

    const req = new Request("http://localhost/api/sync/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: [] }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toMatch(/No autorizado/i);
  });

  it("responde 200 con 0 procesados cuando la lista de items está vacía", async () => {
    const req = new Request("http://localhost/api/sync/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: [] }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.processedCount).toBe(0);
  });

  it("sincroniza la creación de un nuevo estudiante creado offline", async () => {
    const studentId = `st-off-${Date.now()}`;
    const syncItem = {
      id: `item-st-${Date.now()}`,
      entityId: studentId,
      action: "CREATE_STUDENT" as const,
      payload: {
        id: studentId,
        full_name: "Estudiante Offline Rural",
        document_type: "CEDULA",
        document_id: "0701234567",
        course: "9no EGB",
        parallel: "B",
        jornada: "MATUTINA",
        representative: "Padre de Familia",
        rep_phone: "0987654321",
        medical_condition: "Ninguna",
      },
    };

    const req = new Request("http://localhost/api/sync/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: [syncItem] }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.syncedCount).toBe(1);
    expect(data.results[0].status).toBe("synced");

    // Verificar en base de datos SQLite
    const saved = db.prepare("SELECT * FROM students WHERE id = ?").get(studentId) as any;
    expect(saved).toBeDefined();
    expect(saved.full_name).toBe("Estudiante Offline Rural");
    expect(saved.institution_id).toBe(INST_ID);
    expect(saved.course).toBe("9no EGB");
    expect(saved.parallel).toBe("B");
    expect(saved.jornada).toBe("MATUTINA");
  });

  it("sincroniza un registro de atención diaria creado offline", async () => {
    const attentionId = `att-off-${Date.now()}`;
    const syncItem = {
      id: `item-att-${Date.now()}`,
      entityId: attentionId,
      action: "CREATE_DAILY_ATTENTION" as const,
      payload: {
        id: attentionId,
        attendee_type: "ESTUDIANTE",
        attention_date: "2026-09-11 10:30:00",
        duration: "30 min",
        student_name: "Estudiante Offline Rural",
        student_grade: "9no EGB - B",
        jornada: "MATUTINA",
        reason: "Orientación psicoemocional en territorio",
        action_axis: ["INTERVENCION_INDIVIDUAL"],
        observations: "Acuerdos registrados en visita comunitaria",
      },
    };

    const req = new Request("http://localhost/api/sync/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: [syncItem] }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.syncedCount).toBe(1);

    // Verificar en base de datos SQLite
    const saved = db.prepare("SELECT * FROM daily_attentions WHERE id = ?").get(attentionId) as any;
    expect(saved).toBeDefined();
    expect(saved.institution_id).toBe(INST_ID);
    expect(saved.professional_id).toBe(USER_ID);
    expect(saved.student_name).toBe("Estudiante Offline Rural");
    expect(saved.reason).toBe("Orientación psicoemocional en territorio");
  });

  it("es idempotente: re-enviar los mismos registros no genera error y se consolida correctamente", async () => {
    const studentId = `st-idemp-${Date.now()}`;
    const syncItem = {
      id: `item-idemp-${Date.now()}`,
      entityId: studentId,
      action: "CREATE_STUDENT" as const,
      payload: {
        id: studentId,
        full_name: "Estudiante Idempotente",
        course: "10mo EGB",
        parallel: "A",
        jornada: "VESPERTINA",
      },
    };

    // Primer envío
    const req1 = new Request("http://localhost/api/sync/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: [syncItem] }),
    });
    const res1 = await POST(req1);
    expect(res1.status).toBe(200);

    // Segundo envío con el mismo id
    const req2 = new Request("http://localhost/api/sync/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: [syncItem] }),
    });
    const res2 = await POST(req2);
    expect(res2.status).toBe(200);
    const data2 = await res2.json();
    expect(data2.syncedCount).toBe(1);
    expect(data2.results[0].status).toBe("synced");
  });

  it("sincroniza una entrevista creada offline y la vincula a un caso de forma transparente", async () => {
    const interviewId = `int-off-${Date.now()}`;
    const syncItem = {
      id: `item-int-${Date.now()}`,
      entityId: interviewId,
      action: "CREATE_INTERVIEW" as const,
      payload: {
        interviewee_full_name: "Madre de Familia Offline",
        interviewee_cedula: "0709876543",
        family_relation: "Madre",
        summary: "Se acuerda acompañamiento en casa y horario de estudio",
        commitment: "Supervisar tareas diariamente",
        recommendations: "Establecer rutina nocturna",
      },
    };

    const req = new Request("http://localhost/api/sync/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: [syncItem] }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.syncedCount).toBe(1);

    const saved = db.prepare("SELECT * FROM case_interviews WHERE id = ?").get(interviewId) as any;
    expect(saved).toBeDefined();
    expect(saved.interviewee_full_name).toBe("Madre de Familia Offline");
    expect(saved.commitment).toBe("Supervisar tareas diariamente");
  });

  it("sincroniza una alerta temprana creada offline", async () => {
    const alertId = `alt-off-${Date.now()}`;
    const syncItem = {
      id: `item-alt-${Date.now()}`,
      entityId: alertId,
      action: "CREATE_ALERT" as const,
      payload: {
        student_name: "Estudiante con Alerta",
        description: "Ausentismo recurrente de tres días seguidos sin justificación",
      },
    };

    const req = new Request("http://localhost/api/sync/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: [syncItem] }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.syncedCount).toBe(1);

    const saved = db.prepare("SELECT * FROM teacher_alerts WHERE id = ?").get(alertId) as any;
    expect(saved).toBeDefined();
    expect(saved.status).toBe("PENDIENTE");
    expect(saved.description).toContain("Ausentismo recurrente");
  });

  it("registra evento en la bitácora de auditoría al completar sincronización", async () => {
    const { logAudit } = await import("@/lib/audit");
    const syncItem = {
      id: `item-aud-${Date.now()}`,
      entityId: `st-aud-${Date.now()}`,
      action: "CREATE_STUDENT" as const,
      payload: {
        full_name: "Estudiante Auditado",
        course: "1ro BGU",
      },
    };

    const req = new Request("http://localhost/api/sync/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: [syncItem] }),
    });

    await POST(req);
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "SINCRONIZACION_OFFLINE",
        userId: USER_ID,
        institutionId: INST_ID,
      })
    );
  });
});
