/**
 * Funciones puras para la estructura y formateo de numeración de informes DECE.
 * Sin dependencias de base de datos para poder ejecutarse tanto en servidor como en cliente.
 *
 * Estructura oficial requerida:
 * [Mineduc]-[Coordinación Zonal]-[Distrito]-[Institución]-[DECE]-[Profesional]-[Año lectivo]-[Número consecutivo]
 * Ejemplo:
 * Mineduc-CZ3-18D02-UESR-DECE-MJ-2025/2026-001
 */

import { deriveAcronym } from "./codesShared";

/**
 * Obtiene las iniciales de una persona (ej: Marlon Jácome -> MJ)
 */
export function getInitials(name?: string | null): string {
  if (!name) return "DECE";
  return name
    .replace(/^(psc|lic|ing|mg|msc|dr|dra)\.?\s+/i, "")
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .join("")
    .toUpperCase()
    .slice(0, 4) || "DECE";
}

export interface ReportConfigParts {
  mineducCode: string;
  zoneCode: string;
  districtCode: string;
  institutionCode: string;
  deceCode: string;
  professionalCode: string;
  schoolYearCode: string;
}

/**
 * Limpia y normaliza una parte del código alfanumérico evitando caracteres extraños
 */
export function cleanCodePart(val?: string | null, fallback = ""): string {
  if (!val) return fallback;
  const cleaned = val.trim().replace(/[^a-zA-Z0-9]/g, "");
  return cleaned || fallback;
}

/**
 * Normaliza el código de zona (ej: "ZONA 3", "Zona 3", "CZ3", "3" -> "CZ3")
 */
export function formatZoneCode(rawZone?: string | null, explicitCode?: string | null): string {
  const codeToTry = explicitCode?.trim() || rawZone?.trim();
  if (!codeToTry) return "CZ3";
  const numMatch = codeToTry.match(/(?:cz|zona|coordinacion\s*zonal)?\s*(\d+)/i);
  if (numMatch) {
    return `CZ${numMatch[1]}`;
  }
  return cleanCodePart(codeToTry.toUpperCase(), "CZ3");
}

/**
 * Normaliza el código de distrito (ej: "18D02 AMBATO 2", "18d02" -> "18D02")
 */
export function formatDistrictCode(rawDistrict?: string | null, explicitCode?: string | null): string {
  if (explicitCode && explicitCode.trim()) {
    return cleanCodePart(explicitCode.toUpperCase(), "18D02");
  }
  if (!rawDistrict) return "18D02";
  const match = rawDistrict.match(/\b(\d{2}D\d{2})\b/i);
  if (match) {
    return match[1].toUpperCase();
  }
  return cleanCodePart(rawDistrict.split(/\s+/)[0].toUpperCase(), "18D02");
}

/**
 * Normaliza las siglas o código de la institución (ej: "UESR", "Unidad Educativa Santa Rosa" -> "UESR")
 */
export function formatInstitutionAcronym(
  institutionName?: string | null,
  explicitAcronym?: string | null
): string {
  if (explicitAcronym && explicitAcronym.trim()) {
    return cleanCodePart(explicitAcronym.toUpperCase(), "UESR");
  }
  if (!institutionName) return "UESR";
  const derived = deriveAcronym(institutionName);
  return derived && derived !== "IE" ? derived : cleanCodePart(institutionName.slice(0, 4).toUpperCase(), "UESR");
}

/**
 * Obtiene el código o iniciales del profesional DECE (ej: Marlon Jácome -> "MJ")
 */
export function getProfessionalReportCode(
  user?: { name?: string | null; professional_code?: string | null } | null
): string {
  if (user?.professional_code && user.professional_code.trim()) {
    return cleanCodePart(user.professional_code.toUpperCase(), "MJ");
  }
  if (user?.name) {
    return getInitials(user.name) || "MJ";
  }
  return "MJ";
}

/**
 * Normaliza el año lectivo al formato canónico requerido: YYYY/YYYY (ej: "2025/2026")
 */
export function normalizeSchoolYearCode(yearText?: string | null): string {
  if (!yearText) {
    const currentYear = new Date().getFullYear();
    return `${currentYear}/${currentYear + 1}`;
  }
  const match = yearText.match(/(\d{4})\s*[-/]\s*(\d{4})/);
  if (match) {
    return `${match[1]}/${match[2]}`;
  }
  const singleYear = yearText.match(/\b(\d{4})\b/);
  if (singleYear) {
    const y = parseInt(singleYear[1], 10);
    return `${y}/${y + 1}`;
  }
  const currentYear = new Date().getFullYear();
  return `${currentYear}/${currentYear + 1}`;
}

/**
 * Da formato con ceros a la izquierda al consecutivo (ej. 1 -> "001", 12 -> "012", 105 -> "105")
 */
export function formatSequenceNumber(seq: number): string {
  if (seq <= 0) return "001";
  return String(seq).padStart(3, "0");
}

/**
 * Ensambla el código completo de numeración oficial del informe
 * Mineduc-CZ3-18D02-UESR-DECE-MJ-2025/2026-001
 */
export function buildReportNumberString(parts: {
  mineduc: string;
  zone: string;
  district: string;
  institution: string;
  dece: string;
  professional: string;
  schoolYear: string;
  sequence: number;
}): string {
  return `${parts.mineduc}-${parts.zone}-${parts.district}-${parts.institution}-${parts.dece}-${parts.professional}-${parts.schoolYear}-${formatSequenceNumber(
    parts.sequence
  )}`;
}
