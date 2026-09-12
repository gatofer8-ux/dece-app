import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import os from "os";
import path from "path";
import fs from "fs";
import { formatEcuadorPhone, generateAppointmentWhatsAppMessage } from "@/components/WhatsAppAppointmentReminderButton";

describe("WhatsAppAppointmentReminderButton helpers", () => {
  it("formatEcuadorPhone transforma adecuadamente telefonos ecuatorianos", () => {
    expect(formatEcuadorPhone("0991234567")).toBe("593991234567");
    expect(formatEcuadorPhone("991234567")).toBe("593991234567");
    expect(formatEcuadorPhone("+593 99 123 4567")).toBe("593991234567");
    expect(formatEcuadorPhone("098-765-4321")).toBe("593987654321");
  });

  it("generateAppointmentWhatsAppMessage incluye fecha, hora, profesional, bloque y recomendacion de puntualidad y cedula", () => {
    const msg = generateAppointmentWhatsAppMessage({
      recipientName: "María López",
      studentName: "Juan Pérez",
      studentCourse: "10mo EGB",
      professionalName: "Lcda. Carmen Morales",
      institutionName: "Unidad Educativa Quito",
      date: "2026-09-15",
      startTime: "09:00",
      endTime: "09:40",
      location: "Bloque 2, Oficina DECE",
      title: "Entrevista de Seguimiento Académico y Emocional",
    });

    expect(msg).toContain("María López");
    expect(msg).toContain("Unidad Educativa Quito");
    expect(msg).toContain("*Juan Pérez* (10mo EGB)");
    expect(msg).toContain("2026-09-15");
    expect(msg).toContain("09:00 a 09:40");
    expect(msg).toContain("Lcda. Carmen Morales");
    expect(msg).toContain("Bloque 2, Oficina DECE");
    expect(msg).toContain("Entrevista de Seguimiento Académico y Emocional");
    expect(msg).toContain("cédula original");
    expect(msg).toContain("puntualidad");
  });
});

const tmpDb = path.join(os.tmpdir(), `dece-apptauto-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
const INST_ID = "inst-test-1";
const PROF_ID = "prof-test-1";

let db: import("better-sqlite3").Database;
let convertAppointmentToDailyAttentionAction: typeof import("@/app/(app)/citas/actions").convertAppointmentToDailyAttentionAction;

beforeAll(async () => {
  vi.stubEnv("DATABASE_FILE", tmpDb);
  vi.stubEnv("NODE_ENV", "test");
  vi.resetModules();

  vi.mock("next/cache", () => ({
    revalidatePath: vi.fn(),
  }));

  vi.mock("next/navigation", () => ({
    redirect: vi.fn(),
  }));

  vi.mock("@/lib/session", () => ({
    requireRole: vi.fn().mockResolvedValue({
      user: { id: PROF_ID, role: "DECE", name: "Psic. Andrés Gómez", institution_id: INST_ID },
    }),
    requireInstitutionId: vi.fn().mockReturnValue(INST_ID),
  }));

  vi.mock("@/lib/audit", () => ({
    logAudit: vi.fn(),
  }));

  ({ db } = await import("./db"));
  const actions = await import("@/app/(app)/citas/actions");
  convertAppointmentToDailyAttentionAction = actions.convertAppointmentToDailyAttentionAction;

  db.prepare("INSERT INTO institutions (id, name) VALUES (?, ?)").run(INST_ID, "Colegio Nacional");
  db.prepare("INSERT INTO users (id, institution_id, email, name, password_hash, role, active) VALUES (?, ?, ?, ?, 'dummyhash', 'DECE', 1)").run(
    PROF_ID,
    INST_ID,
    "dece@test.ec",
    "Psic. Andrés Gómez"
  );
});

afterAll(() => {
  vi.unstubAllEnvs();
  try {
    db?.close();
  } catch {}
  try {
    fs.unlinkSync(tmpDb);
  } catch {}
});

describe("convertAppointmentToDailyAttentionAction", () => {
  it("convierte una cita en registro de bitacora diaria, la marca como ATENDIDA y enlaza daily_attention_id", async () => {
    const studentId = "student-test-1";
    const appointmentId = "appt-test-1";

    db.prepare(
      "INSERT INTO students (id, institution_id, full_name, course, parallel, representative, rep_phone, active) VALUES (?, ?, ?, ?, ?, ?, ?, 1)"
    ).run(
      studentId,
      INST_ID,
      "Mateo Salazar",
      "9no EGB",
      "A",
      "Rosa Salazar",
      "0981112233"
    );

    db.prepare(
      `INSERT INTO appointments (
        id, institution_id, student_id, professional_id, title, date, start_time, end_time, attendee_type, location, notes, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PROGRAMADA')`
    ).run(
      appointmentId,
      INST_ID,
      studentId,
      PROF_ID,
      "Entrevista sobre rendimiento escolar",
      "2026-09-18",
      "10:00",
      "10:45",
      "REPRESENTANTE",
      "Oficina DECE Bloque B",
      "Se convoca a la madre por alertas académicas"
    );

    const result = await convertAppointmentToDailyAttentionAction(appointmentId, "La representante asistió puntualmente y se acordó seguimiento");
    expect(result.success).toBe(true);
    expect(result.dailyAttentionId).toBeDefined();

    // Verificar que la cita fue actualizada
    const updatedAppt = db.prepare("SELECT * FROM appointments WHERE id = ?").get(appointmentId) as any;
    expect(updatedAppt.status).toBe("ATENDIDA");
    expect(updatedAppt.daily_attention_id).toBe(result.dailyAttentionId);

    // Verificar que la entrada en daily_attentions existe y tiene todos los datos
    const dailyEntry = db.prepare("SELECT * FROM daily_attentions WHERE id = ?").get(result.dailyAttentionId) as any;
    expect(dailyEntry).toBeDefined();
    expect(dailyEntry.institution_id).toBe(INST_ID);
    expect(dailyEntry.student_name).toBe("Mateo Salazar");
    expect(dailyEntry.student_grade).toBe('9no EGB "A"');
    expect(dailyEntry.representative_name).toBe("Rosa Salazar");
    expect(dailyEntry.attendee_type).toBe("REPRESENTANTE");
    expect(dailyEntry.duration).toBe("45 min");
    expect(dailyEntry.reason).toBe("Entrevista sobre rendimiento escolar");
    expect(dailyEntry.observations).toContain("Cita presencial atendida desde Agenda DECE");
    expect(dailyEntry.observations).toContain("La representante asistió puntualmente");

    // Verificar idempotencia: si se vuelve a llamar para la misma cita, devuelve el mismo id
    const secondCall = await convertAppointmentToDailyAttentionAction(appointmentId);
    expect(secondCall.success).toBe(true);
    expect(secondCall.dailyAttentionId).toBe(result.dailyAttentionId);
  });
});
