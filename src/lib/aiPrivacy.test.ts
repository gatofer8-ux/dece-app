import { describe, it, expect } from "vitest";
import {
  pseudonymize,
  isHeightenedRiskType,
  isHeightenedConfidentiality,
  minimalCaseContext,
  AI_HEIGHTENED_MODE,
  HEIGHTENED_CONFIDENTIALITY_RISK_TYPES,
} from "./aiPrivacy";

describe("aiPrivacy — seudonimización", () => {
  const entities = {
    studentName: "María Fernanda Pérez López",
    studentDocument: "1804567890",
    representativeName: "Juan Carlos Pérez",
    motherName: "Rosa Elena López",
    phones: ["0987654321", "032-844-123"],
    addresses: ["Av. Cevallos 12-34 y Bolívar"],
    emails: ["mariaf@correo.com"],
  };

  it("reemplaza el nombre del estudiante (completo y por partes)", () => {
    const t = "La estudiante María Fernanda Pérez López y su hermano Pérez faltaron.";
    const out = pseudonymize(t, entities);
    expect(out).not.toMatch(/María|Fernanda|Pérez|López/);
    expect(out).toContain("[estudiante]");
  });

  it("reemplaza representante, madre, teléfono, cédula, dirección y correo", () => {
    const t =
      "Juan Carlos Pérez (0987654321), madre Rosa Elena López. Cédula 1804567890. " +
      "Vive en Av. Cevallos 12-34 y Bolívar. Contacto: mariaf@correo.com";
    const out = pseudonymize(t, entities);
    expect(out).not.toContain("0987654321");
    expect(out).not.toContain("1804567890");
    expect(out).not.toContain("mariaf@correo.com");
    expect(out).not.toContain("Av. Cevallos 12-34 y Bolívar");
    expect(out).toContain("[teléfono]");
    expect(out).toContain("[documento]");
    expect(out).toContain("[correo]");
  });

  it("barrido genérico: cédula y teléfono sin necesidad de entidades", () => {
    const out = pseudonymize("Reportó al 0991112223 y presentó la cédula 0102030405.");
    expect(out).not.toContain("0991112223");
    expect(out).not.toContain("0102030405");
  });

  it("no toca texto sin datos personales", () => {
    const t = "El caso corresponde a una situación de conflicto entre pares en el aula.";
    expect(pseudonymize(t, entities)).toBe(t);
  });

  it("no rompe con entidades vacías", () => {
    expect(pseudonymize("texto plano", {})).toBe("texto plano");
    expect(pseudonymize("", entities)).toBe("");
  });
});

describe("aiPrivacy — confidencialidad reforzada", () => {
  it("identifica los tipos de riesgo reforzados", () => {
    expect(isHeightenedRiskType("VIOLENCIA_SEXUAL")).toBe(true);
    expect(isHeightenedRiskType("SALUD_MENTAL")).toBe(true);
    expect(isHeightenedRiskType("CONSUMO_SUSTANCIAS")).toBe(true);
    expect(isHeightenedRiskType("DIFICULTAD_APRENDIZAJE")).toBe(false);
    expect(isHeightenedRiskType(null)).toBe(false);
  });

  it("el corte total solo se aplica en modo estricto", () => {
    if (AI_HEIGHTENED_MODE === "estricto") {
      expect(isHeightenedConfidentiality("VIOLENCIA_SEXUAL")).toBe(true);
    } else {
      expect(isHeightenedConfidentiality("VIOLENCIA_SEXUAL")).toBe(false);
    }
  });

  it("minimalCaseContext no filtra nada de la narrativa", () => {
    const ctx = minimalCaseContext({
      code: "C-001",
      riskLabel: "Salud mental",
      status: "ABIERTO",
      priority: "ALTA",
    });
    expect(ctx).toContain("C-001");
    expect(ctx).toContain("Salud mental");
    expect(ctx).toMatch(/confidencialidad reforzada/i);
    // No incluye secciones de narrativa del caso.
    expect(ctx).not.toMatch(/MOTIVO Y DESCRIPCIÓN|ENTREVISTA|REPORTE DE HECHO/i);
  });

  it("la lista es editable (es un Set exportado)", () => {
    expect(HEIGHTENED_CONFIDENTIALITY_RISK_TYPES).toBeInstanceOf(Set);
  });
});
