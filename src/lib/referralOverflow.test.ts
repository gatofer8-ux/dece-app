import { describe, it, expect } from "vitest";
import { estimateReferralOverflow } from "./referralOverflow";

describe("estimateReferralOverflow", () => {
  it("contenido conciso: cabe en una hoja", () => {
    const est = estimateReferralOverflow({
      current_situation_history:
        "El caso está en seguimiento por el DECE tras el reporte de la docente tutora. La estudiante presenta ánimo bajo y aislamiento. Se evidencia ansiedad moderada. Vive con su madre. No hay antecedentes en salud mental.",
      actions_taken: "- Diálogo con la madre\n- Consentimiento informado\n- Entrevista con la estudiante\n- Agendamiento de cita",
      care_type_required: "Atención psicológica clínica",
      observations: "• Brindar atención psicológica.\n• Enviar certificado de asistencia.",
    });
    expect(est.overflow).toBe(false);
    expect(est.linesOver).toBe(0);
  });

  it("contenido muy largo: avisa de desbordamiento", () => {
    const parrafo = "Texto extenso de la historia con mucho detalle clínico y familiar que se repite. ".repeat(20);
    const est = estimateReferralOverflow({
      current_situation_history: parrafo,
      actions_taken: Array.from({ length: 15 }, (_, i) => `- Acción número ${i + 1} desarrollada durante el seguimiento`).join("\n"),
      observations: Array.from({ length: 10 }, (_, i) => `• Observación e indicación ${i + 1} para la entidad receptora`).join("\n"),
      care_type_required: "Atención psicológica y psiquiátrica especializada",
    });
    expect(est.overflow).toBe(true);
    expect(est.linesOver).toBeGreaterThan(0);
  });

  it("vacío: no avisa", () => {
    expect(estimateReferralOverflow({}).overflow).toBe(false);
  });
});
