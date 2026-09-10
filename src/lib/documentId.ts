/**
 * Validador y formateador unificado de documentos de identidad ecuatorianos y extranjeros
 * Soporta:
 * - Cédula de Identidad Ecuatoriana (Persona Natural: 10 dígitos, provincias 01-24 y 30 exterior, tercer dígito < 6, algoritmo módulo 10)
 * - Pasaporte Extranjero (Alfanumérico de 6 a 15 caracteres)
 * - Otro documento (Alfanumérico 3 a 20 caracteres)
 */

export type DocumentType = "CEDULA" | "PASAPORTE" | "OTRO";

export interface ValidationResult {
  ok: boolean;
  reason?: string;
}

/**
 * Normaliza un número de documento:
 * - Elimina espacios en blanco, guiones y puntos
 * - Convierte a mayúsculas (clave para pasaportes extranjeros)
 */
export function normalizeDocumentId(value: string | null | undefined): string {
  if (!value) return "";
  return value.replace(/[\s\-\.]/g, "").toUpperCase().trim();
}

/**
 * Detecta automáticamente el tipo de documento según su formato:
 * - 10 dígitos estrictos -> CEDULA
 * - Contiene letras -> PASAPORTE
 * - Otros -> OTRO
 */
export function detectDocumentType(value: string | null | undefined): DocumentType {
  const normalized = normalizeDocumentId(value);
  if (!normalized) return "OTRO";
  if (/^\d{10}$/.test(normalized)) return "CEDULA";
  if (/[A-Z]/.test(normalized)) return "PASAPORTE";
  return "OTRO";
}

/**
 * Valida una cédula de identidad ecuatoriana (persona natural):
 * 1. Exactamente 10 dígitos numéricos
 * 2. Código de provincia válido: 01 a 24, o 30 para ecuatorianos registrados en el exterior
 * 3. Tercer dígito < 6 (persona natural)
 * 4. Algoritmo de Luhn (módulo 10 con coeficientes 2, 1, 2, 1, 2, 1, 2, 1, 2)
 */
export function validateEcuadorianCedula(value: string | null | undefined): ValidationResult {
  const cleaned = normalizeDocumentId(value);

  if (!cleaned) {
    return { ok: false, reason: "El número de cédula está vacío" };
  }

  if (cleaned.length !== 10) {
    return {
      ok: false,
      reason: `Longitud inválida: tiene ${cleaned.length} caracteres (debe tener exactamente 10 dígitos)`,
    };
  }

  if (!/^\d{10}$/.test(cleaned)) {
    return { ok: false, reason: "La cédula solo debe contener dígitos numéricos" };
  }

  // Código de provincia: primeros 2 dígitos (01 a 24, o 30 en el exterior)
  const provinceCode = parseInt(cleaned.substring(0, 2), 10);
  const isValidProvince = (provinceCode >= 1 && provinceCode <= 24) || provinceCode === 30;
  if (!isValidProvince) {
    return {
      ok: false,
      reason: `Código de provincia incorrecto (${cleaned.substring(0, 2)}). Debe estar entre 01 y 24, o 30 para el exterior`,
    };
  }

  // Tercer dígito para persona natural: debe ser menor a 6 (0 a 5)
  const thirdDigit = parseInt(cleaned[2], 10);
  if (thirdDigit >= 6) {
    return {
      ok: false,
      reason: `Tercer dígito inválido (${thirdDigit}). Para personas naturales debe ser menor a 6 (de 0 a 5)`,
    };
  }

  // Algoritmo Módulo 10 (Luhn) sobre los primeros 9 dígitos
  const coefficients = [2, 1, 2, 1, 2, 1, 2, 1, 2];
  let sum = 0;

  for (let i = 0; i < 9; i++) {
    let prod = parseInt(cleaned[i], 10) * coefficients[i];
    if (prod >= 10) {
      prod -= 9;
    }
    sum += prod;
  }

  const verifierDigit = parseInt(cleaned[9], 10);
  const nextTen = Math.ceil(sum / 10) * 10;
  let expectedVerifier = nextTen - sum;
  if (expectedVerifier === 10) {
    expectedVerifier = 0;
  }

  if (verifierDigit !== expectedVerifier) {
    return {
      ok: false,
      reason: `Dígito verificador no coincide (esperado: ${expectedVerifier}, recibido: ${verifierDigit})`,
    };
  }

  return { ok: true };
}

/**
 * Valida un pasaporte de estudiante extranjero:
 * - Alfanumérico (letras A-Z y números 0-9)
 * - Longitud entre 6 y 15 caracteres
 * - Sin símbolos ni caracteres especiales
 */
export function validatePassport(value: string | null | undefined): ValidationResult {
  const cleaned = normalizeDocumentId(value);

  if (!cleaned) {
    return { ok: false, reason: "El número de pasaporte está vacío" };
  }

  if (cleaned.length < 6 || cleaned.length > 15) {
    return {
      ok: false,
      reason: `Longitud de pasaporte inválida: tiene ${cleaned.length} caracteres (debe tener entre 6 y 15)`,
    };
  }

  if (!/^[A-Z0-9]+$/.test(cleaned)) {
    return {
      ok: false,
      reason: "El pasaporte solo debe contener letras mayúsculas y números, sin símbolos",
    };
  }

  return { ok: true };
}

/**
 * Función de alto nivel para validación de documentos según su tipo
 */
export function validateDocumentId(
  type: string | null | undefined,
  value: string | null | undefined,
  options?: { required?: boolean }
): ValidationResult {
  const required = options?.required ?? false;
  const cleaned = normalizeDocumentId(value);

  if (!cleaned) {
    if (required) {
      return { ok: false, reason: "El documento de identidad es requerido" };
    }
    return { ok: true };
  }

  const docType = (type || "CEDULA").toUpperCase().trim() as DocumentType;

  if (docType === "CEDULA") {
    return validateEcuadorianCedula(cleaned);
  }

  if (docType === "PASAPORTE") {
    return validatePassport(cleaned);
  }

  if (docType === "OTRO") {
    if (cleaned.length < 3 || cleaned.length > 20) {
      return {
        ok: false,
        reason: `El documento debe tener entre 3 y 20 caracteres (actual: ${cleaned.length})`,
      };
    }
    if (!/^[A-Z0-9\-_]+$/.test(cleaned)) {
      return {
        ok: false,
        reason: "El documento contiene caracteres no permitidos",
      };
    }
    return { ok: true };
  }

  return { ok: true };
}

/**
 * Formatea la presentación visual de un documento según su tipo
 * Ejemplos:
 * - CEDULA -> "C.I. 1710034065" o "Cédula: 1710034065"
 * - PASAPORTE -> "Pasaporte A12345678" o "Pasaporte: A12345678"
 * - OTRO -> "Doc. XYZ123" o "Documento: XYZ123"
 */
export function formatDocumentId(
  type: string | null | undefined,
  value: string | null | undefined,
  prefixStyle: "short" | "full" = "short"
): string {
  if (!value || !value.trim()) return "—";
  const val = normalizeDocumentId(value);
  const docType = (type || "CEDULA").toUpperCase().trim();

  if (docType === "PASAPORTE") {
    return prefixStyle === "full" ? `Pasaporte: ${val}` : `Pasaporte ${val}`;
  }
  if (docType === "OTRO") {
    return prefixStyle === "full" ? `Documento: ${val}` : `Doc. ${val}`;
  }
  return prefixStyle === "full" ? `Cédula: ${val}` : `C.I. ${val}`;
}

export function getDocumentTypeLabel(type: string | null | undefined): string {
  const docType = (type || "CEDULA").toUpperCase().trim();
  switch (docType) {
    case "PASAPORTE":
      return "Pasaporte";
    case "OTRO":
      return "Otro documento";
    case "CEDULA":
    default:
      return "Cédula de identidad";
  }
}
