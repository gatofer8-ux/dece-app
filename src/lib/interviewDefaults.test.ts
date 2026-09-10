import { describe, it, expect } from "vitest";
import { REPRESENTATIVE_AWARENESS_NOTE, getDefaultInterviewCommitment } from "./interviewDefaults";

describe("interviewDefaults - nota de corresponsabilidad", () => {
  it("contiene la nota técnica formal y accesible", () => {
    expect(REPRESENTATIVE_AWARENESS_NOTE).toContain("NOTA DE CONOCIMIENTO Y CORRESPONSABILIDAD:");
    expect(REPRESENTATIVE_AWARENESS_NOTE).toContain("madre, padre y/o representante legal");
    expect(REPRESENTATIVE_AWARENESS_NOTE).toContain("plena toma de conocimiento");
    expect(REPRESENTATIVE_AWARENESS_NOTE).toContain("corresponsabilidad con los compromisos");
    expect(REPRESENTATIVE_AWARENESS_NOTE).toContain("bienestar integral");
  });

  it("genera el compromiso precargado con acuerdos y la nota", () => {
    const text = getDefaultInterviewCommitment("Gabriel Alarcón");
    expect(text).toContain("1. El/la representante legal se compromete");
    expect(text).toContain("2. El Departamento de Consejería Estudiantil (DECE)");
    expect(text).toContain("del/la estudiante Gabriel Alarcón");
    expect(text).toContain("NOTA DE CONOCIMIENTO Y CORRESPONSABILIDAD:");
  });

  it("funciona adecuadamente sin nombre de estudiante", () => {
    const text = getDefaultInterviewCommitment();
    expect(text).toContain("del/la estudiante");
    expect(text).toContain("NOTA DE CONOCIMIENTO Y CORRESPONSABILIDAD:");
  });
});
