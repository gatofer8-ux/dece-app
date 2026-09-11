import { describe, it, expect } from "vitest";
import { generateDecisionQuestionnaireDocx } from "./decisionQuestionnaireDocx";

describe("generateDecisionQuestionnaireDocx", () => {
  it("genera un buffer de Word válido con una página por estudiante", async () => {
    const buffer = await generateDecisionQuestionnaireDocx({
      institutionName: "Unidad Educativa Teniente Hugo Ortiz",
      interviewDate: "2026-10-15",
      students: [
        {
          full_name: "Ana Lucía Pérez Morales",
          document_id: "1850000001",
          course: "10mo EGB",
          parallel: "A",
          jornada: "Matutina",
          birth_date: "2011-03-14",
          representative: "María Morales",
          representative_document_id: "1800000002",
          rep_phone: "0999999999",
        },
        {
          full_name: "Diego Andrés Salazar Vega",
          document_id: null,
          course: "10mo EGB",
          parallel: "A",
          jornada: "Matutina",
          birth_date: null,
          representative: null,
          representative_document_id: null,
          rep_phone: null,
        },
      ],
    });

    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(1000);
  });

  it("no revienta con una lista vacía de estudiantes", async () => {
    const buffer = await generateDecisionQuestionnaireDocx({ institutionName: "Test", students: [] });
    expect(buffer).toBeInstanceOf(Buffer);
  });
});
