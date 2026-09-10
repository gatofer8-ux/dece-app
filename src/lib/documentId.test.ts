import { describe, it, expect } from "vitest";
import {
  normalizeDocumentId,
  detectDocumentType,
  validateEcuadorianCedula,
  validatePassport,
  validateDocumentId,
  formatDocumentId,
  getDocumentTypeLabel,
} from "./documentId";

describe("normalizeDocumentId", () => {
  it("elimina espacios, guiones y puntos", () => {
    expect(normalizeDocumentId("17-1003.406 5")).toBe("1710034065");
    expect(normalizeDocumentId(" p-123.456 78 ")).toBe("P12345678");
  });

  it("convierte a mayúsculas para pasaportes", () => {
    expect(normalizeDocumentId("a12345678")).toBe("A12345678");
    expect(normalizeDocumentId("pas-987654")).toBe("PAS987654");
  });

  it("maneja valores vacíos o nulos", () => {
    expect(normalizeDocumentId("")).toBe("");
    expect(normalizeDocumentId(null)).toBe("");
    expect(normalizeDocumentId(undefined)).toBe("");
  });
});

describe("detectDocumentType", () => {
  it("detecta CEDULA para 10 dígitos numéricos", () => {
    expect(detectDocumentType("1710034065")).toBe("CEDULA");
    expect(detectDocumentType("0926687856")).toBe("CEDULA");
  });

  it("detecta PASAPORTE si contiene letras", () => {
    expect(detectDocumentType("P12345678")).toBe("PASAPORTE");
    expect(detectDocumentType("A987654321")).toBe("PASAPORTE");
  });

  it("detecta OTRO si está vacío o con longitud no estándar", () => {
    expect(detectDocumentType("")).toBe("OTRO");
    expect(detectDocumentType("12345")).toBe("OTRO");
  });
});

describe("validateEcuadorianCedula", () => {
  it("valida cédulas ecuatorianas reales y válidas", () => {
    expect(validateEcuadorianCedula("1710034065").ok).toBe(true);
    expect(validateEcuadorianCedula("0926687856").ok).toBe(true);
    expect(validateEcuadorianCedula("1850129212").ok).toBe(true);
    expect(validateEcuadorianCedula("0110000007").ok).toBe(true);
    expect(validateEcuadorianCedula("1810000008").ok).toBe(true);
    expect(validateEcuadorianCedula("2410000000").ok).toBe(true); // Provincia límite 24 (Santa Elena)
    expect(validateEcuadorianCedula("3010000002").ok).toBe(true); // Provincia 30 (Exterior)
  });

  it("rechaza si está vacía", () => {
    const res = validateEcuadorianCedula("");
    expect(res.ok).toBe(false);
    expect(res.reason).toContain("vacío");
  });

  it("rechaza si la longitud es diferente de 10 dígitos", () => {
    const resShort = validateEcuadorianCedula("171003406");
    expect(resShort.ok).toBe(false);
    expect(resShort.reason).toContain("Longitud inválida");

    const resLong = validateEcuadorianCedula("17100340651");
    expect(resLong.ok).toBe(false);
    expect(resLong.reason).toContain("Longitud inválida");
  });

  it("rechaza si contiene caracteres no numéricos", () => {
    const res = validateEcuadorianCedula("171003406A");
    expect(res.ok).toBe(false);
    expect(res.reason).toContain("solo debe contener dígitos numéricos");
  });

  it("rechaza códigos de provincia inválidos (< 01 o > 24 y != 30)", () => {
    const resZero = validateEcuadorianCedula("0010000005");
    expect(resZero.ok).toBe(false);
    expect(resZero.reason).toContain("Código de provincia incorrecto");

    const resOver = validateEcuadorianCedula("2510000005");
    expect(resOver.ok).toBe(false);
    expect(resOver.reason).toContain("Código de provincia incorrecto");
  });

  it("rechaza tercer dígito mayor o igual a 6 para personas naturales", () => {
    const resPublic = validateEcuadorianCedula("1760034065");
    expect(resPublic.ok).toBe(false);
    expect(resPublic.reason).toContain("Tercer dígito inválido");

    const resJuridica = validateEcuadorianCedula("1790034065");
    expect(resJuridica.ok).toBe(false);
    expect(resJuridica.reason).toContain("Tercer dígito inválido");
  });

  it("rechaza si el dígito verificador no coincide", () => {
    // 1710034065 es válida, con dígito 4 debe fallar
    const res = validateEcuadorianCedula("1710034064");
    expect(res.ok).toBe(false);
    expect(res.reason).toContain("Dígito verificador no coincide");
  });
});

describe("validatePassport", () => {
  it("valida pasaportes válidos de 6 a 15 caracteres alfanuméricos", () => {
    expect(validatePassport("P12345678").ok).toBe(true); // Venezolano / Peruano
    expect(validatePassport("AA1234567").ok).toBe(true); // Colombiano
    expect(validatePassport("123456789").ok).toBe(true); // Estadounidense (9 dígitos numéricos)
    expect(validatePassport("XYZ987654321").ok).toBe(true);
  });

  it("rechaza pasaportes menores a 6 o mayores a 15 caracteres", () => {
    const resShort = validatePassport("A1234");
    expect(resShort.ok).toBe(false);
    expect(resShort.reason).toContain("Longitud de pasaporte inválida");

    const resLong = validatePassport("A1234567890123456");
    expect(resLong.ok).toBe(false);
    expect(resLong.reason).toContain("Longitud de pasaporte inválida");
  });

  it("rechaza pasaportes con caracteres especiales o símbolos", () => {
    const res = validatePassport("P12345-678#");
    expect(res.ok).toBe(false);
    expect(res.reason).toContain("solo debe contener letras mayúsculas y números");
  });
});

describe("validateDocumentId", () => {
  it("despacha a la validación de cédula si type es CEDULA", () => {
    expect(validateDocumentId("CEDULA", "1710034065").ok).toBe(true);
    expect(validateDocumentId("CEDULA", "1710034064").ok).toBe(false);
  });

  it("despacha a la validación de pasaporte si type es PASAPORTE", () => {
    expect(validateDocumentId("PASAPORTE", "P12345678").ok).toBe(true);
    expect(validateDocumentId("PASAPORTE", "123").ok).toBe(false);
  });

  it("maneja tipo OTRO validando formato básico de 3 a 20 caracteres", () => {
    expect(validateDocumentId("OTRO", "ID-98765").ok).toBe(true);
    expect(validateDocumentId("OTRO", "12").ok).toBe(false);
  });

  it("maneja valores vacíos cuando no son requeridos", () => {
    expect(validateDocumentId("CEDULA", "").ok).toBe(true);
    expect(validateDocumentId("CEDULA", null).ok).toBe(true);
  });

  it("rechaza valores vacíos cuando son requeridos", () => {
    expect(validateDocumentId("CEDULA", "", { required: true }).ok).toBe(false);
  });
});

describe("formatDocumentId", () => {
  it("formatea cédulas con prefijo C.I. o Cédula", () => {
    expect(formatDocumentId("CEDULA", "1710034065")).toBe("C.I. 1710034065");
    expect(formatDocumentId("CEDULA", "1710034065", "full")).toBe("Cédula: 1710034065");
  });

  it("formatea pasaportes con prefijo Pasaporte", () => {
    expect(formatDocumentId("PASAPORTE", "p12345678")).toBe("Pasaporte P12345678");
    expect(formatDocumentId("PASAPORTE", "p12345678", "full")).toBe("Pasaporte: P12345678");
  });

  it("formatea documentos tipo OTRO", () => {
    expect(formatDocumentId("OTRO", "XYZ123")).toBe("Doc. XYZ123");
    expect(formatDocumentId("OTRO", "XYZ123", "full")).toBe("Documento: XYZ123");
  });

  it("retorna guión largo para valores vacíos", () => {
    expect(formatDocumentId("CEDULA", "")).toBe("—");
    expect(formatDocumentId("PASAPORTE", null)).toBe("—");
  });
});

describe("getDocumentTypeLabel", () => {
  it("retorna las etiquetas legibles en español", () => {
    expect(getDocumentTypeLabel("CEDULA")).toBe("Cédula de identidad");
    expect(getDocumentTypeLabel("PASAPORTE")).toBe("Pasaporte");
    expect(getDocumentTypeLabel("OTRO")).toBe("Otro documento");
  });
});
