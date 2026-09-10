import { describe, it, expect } from "vitest";
import { generateRestorativeCircleFichaDocx } from "./restorativeCircleFichaDocx";
import type { RestorativeCircleFichaRow } from "./types";

describe("generateRestorativeCircleFichaDocx", () => {
  it("genera un buffer de Word válido incluyendo la firma de responsabilidad", async () => {
    const mockFicha: RestorativeCircleFichaRow = {
      id: "f-123",
      institution_id: "inst-1",
      created_by_id: "user-1",
      school_year_id: "sy-1",
      case_file_id: null,
      student_id: null,
      ficha_code: "FICHA-CIRC-001",
      center_name: "Unidad Educativa del Milenio",
      district_name: "17D01",
      facilitator_name: "Lic. Andrea Morales",
      circle_type: "Círculo de Diálogo",
      circle_modality: "Presencial",
      participants_count: "15",
      participant_type: "Estudiantes 9no EGB",
      problematica: "Dificultades de convivencia en el aula",
      circle_date: "2026-09-10",
      circle_time: "09:00 - 10:30",
      diagnostico: "Se detectan tensiones entre subgrupos.",
      objetivos: "Restablecer la empatía y acuerdos.",
      declaracion_inicial: "Bienvenidos al círculo restaurativo.",
      q_icebreaker: "¿Cuál es tu comida favorita?",
      q_intro: "¿Qué significa el respeto para ti?",
      q_develop: "¿Cómo te afectó la situación?",
      q_actions: "¿Qué compromiso asumes hoy?",
      declaracion_cierre: "Gracias por participar con honestidad.",
      informe_circulo: "Se desarrolló en ambiente de respeto.",
      conclusion: "Acuerdos firmados por unanimidad.",
      created_at: "2026-09-10T10:00:00Z",
      updated_at: "2026-09-10T10:00:00Z",
    };

    const buffer = await generateRestorativeCircleFichaDocx(mockFicha);
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(1000);
  });
});
