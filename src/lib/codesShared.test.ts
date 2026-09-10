import { describe, it, expect } from "vitest";
import { deriveAcronym, institutionAcronym, documentToken, buildCaseCode } from "./codesShared";

describe("codesShared", () => {
  it("deriveAcronym: iniciales del nombre, sin palabras de enlace ni tildes", () => {
    expect(deriveAcronym("Unidad Educativa Santa Rosa")).toBe("UESR");
    expect(deriveAcronym("UNIDAD EDUCATIVA DEL MILENIO RÉPLICA")).toBe("UEMR");
    expect(deriveAcronym("Colegio de Bachillerato La Merced")).toBe("CBM");
    expect(deriveAcronym("")).toBe("IE");
    expect(deriveAcronym(null)).toBe("IE");
  });

  it("institutionAcronym: usa el campo configurado si existe, si no lo deriva", () => {
    expect(institutionAcronym({ acronym: "UESR", name: "Unidad Educativa Santa Rosa" })).toBe("UESR");
    expect(institutionAcronym({ acronym: "  ue-sr ", name: "x" })).toBe("UESR");
    expect(institutionAcronym({ acronym: "", name: "Unidad Educativa Santa Rosa" })).toBe("UESR");
    expect(institutionAcronym(null)).toBe("IE");
  });

  it("documentToken: cédula/pasaporte limpio; fallback estable si no hay documento", () => {
    expect(documentToken("1805123456", "abc")).toBe("1805123456");
    expect(documentToken("AB-123.456", "abc")).toBe("AB123456");
    expect(documentToken(null, "9f8e7d6c-1111")).toBe("SD9F8E7D");
    expect(documentToken("  ", "9f8e7d6c-1111")).toBe("SD9F8E7D");
  });

  it("buildCaseCode: formato SIGLAS-DOC-AÑO-NN", () => {
    expect(buildCaseCode("UESR", "1805123456", 2026, 1)).toBe("UESR-1805123456-2026-01");
    expect(buildCaseCode("UESR", "1805123456", 2026, 12)).toBe("UESR-1805123456-2026-12");
  });
});
