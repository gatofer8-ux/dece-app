/**
 * Privacidad del asistente de IA.
 *
 * El asistente de redacción envía texto a la API de Google Gemini. Este módulo
 * asegura que ese texto NO contenga datos que identifiquen a un estudiante
 * menor de edad ni a su familia, y define un modo de "confidencialidad
 * reforzada" para los tipos de caso más delicados.
 *
 * Ver SECURITY.md → "Datos enviados a terceros (IA)".
 */

/**
 * Tipos de riesgo (case_files.risk_type) para los que NO se envía el relato del
 * caso a la IA — solo datos mínimos no identificativos. Editable.
 */
export const HEIGHTENED_CONFIDENTIALITY_RISK_TYPES = new Set<string>([
  "VIOLENCIA_SEXUAL",
  "SALUD_MENTAL",
  "CONSUMO_SUSTANCIAS",
]);

export function isHeightenedConfidentiality(riskType: string | null | undefined): boolean {
  return !!riskType && HEIGHTENED_CONFIDENTIALITY_RISK_TYPES.has(riskType);
}

/** Palabras que nunca deben tratarse como "nombre" aunque aparezcan en uno. */
const NAME_STOPWORDS = new Set([
  "de", "del", "la", "las", "los", "san", "santa", "y", "da", "do", "el",
]);

export interface CaseEntities {
  /** Nombre completo del estudiante. */
  studentName?: string | null;
  studentDocument?: string | null;
  representativeName?: string | null;
  fatherName?: string | null;
  motherName?: string | null;
  institutionName?: string | null;
  phones?: (string | null | undefined)[];
  addresses?: (string | null | undefined)[];
  emails?: (string | null | undefined)[];
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Reemplaza cada token "significativo" de `fullName` por `placeholder`. */
function redactName(text: string, fullName: string | null | undefined, placeholder: string): string {
  if (!fullName) return text;
  let out = text;
  const tokens = fullName
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 3 && !NAME_STOPWORDS.has(t.toLowerCase()));
  // Primero el nombre completo tal cual (por si aparece exacto), luego token a token.
  const full = fullName.trim();
  if (full.length >= 3) {
    out = out.replace(new RegExp(escapeRegExp(full), "gi"), placeholder);
  }
  for (const tok of tokens) {
    out = out.replace(new RegExp(`\\b${escapeRegExp(tok)}\\b`, "gi"), placeholder);
  }
  return out;
}

/**
 * Devuelve `text` sin datos identificativos: nombres conocidos reemplazados por
 * su rol, y barrido genérico de cédulas, teléfonos y correos.
 */
export function pseudonymize(text: string, entities: CaseEntities = {}): string {
  if (!text) return text;
  let out = text;

  out = redactName(out, entities.studentName, "[estudiante]");
  out = redactName(out, entities.representativeName, "[representante]");
  out = redactName(out, entities.fatherName, "[padre]");
  out = redactName(out, entities.motherName, "[madre]");
  out = redactName(out, entities.institutionName, "[la institución]");

  for (const addr of entities.addresses ?? []) {
    if (addr && addr.trim().length >= 4) {
      out = out.replace(new RegExp(escapeRegExp(addr.trim()), "gi"), "[dirección]");
    }
  }
  for (const phone of entities.phones ?? []) {
    if (phone && phone.trim().length >= 6) {
      out = out.replace(new RegExp(escapeRegExp(phone.trim()), "g"), "[teléfono]");
    }
  }
  for (const email of entities.emails ?? []) {
    if (email && email.includes("@")) {
      out = out.replace(new RegExp(escapeRegExp(email.trim()), "gi"), "[correo]");
    }
  }
  if (entities.studentDocument && entities.studentDocument.trim().length >= 5) {
    out = out.replace(new RegExp(escapeRegExp(entities.studentDocument.trim()), "g"), "[documento]");
  }

  // Barrido genérico (Ecuador): cédula 10 dígitos, RUC 13, teléfonos, correos.
  out = out.replace(/\b\d{13}\b/g, "[ruc]");
  out = out.replace(/\b\d{10}\b/g, "[documento]");
  out = out.replace(/\b(?:0\d{2}[\s-]?\d{3}[\s-]?\d{4}|\+?593\d{8,9})\b/g, "[teléfono]");
  out = out.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, "[correo]");

  return out;
}

/**
 * Contexto mínimo NO identificativo para casos de confidencialidad reforzada.
 * No incluye nada de la narrativa del caso.
 */
export function minimalCaseContext(params: {
  code: string;
  riskLabel: string;
  status: string;
  priority: string;
}): string {
  return [
    `EXPEDIENTE: Código ${params.code} | Estado: ${params.status} | Prioridad: ${params.priority}`,
    `TIPO DE RIESGO: ${params.riskLabel}`,
    `NOTA: Caso de confidencialidad reforzada. No se envían a la IA el relato ni ` +
      `los documentos del caso. Redacta con encuadre técnico y normativo general.`,
  ].join("\n");
}
