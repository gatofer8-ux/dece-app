import type { UserRow } from "./types";

export const STANDARD_ECUADOR_COURSES = [
  "Inicial I",
  "Inicial II",
  "1ro EGB (Preparatoria)",
  "2do EGB (Elemental)",
  "3ro EGB (Elemental)",
  "4to EGB (Elemental)",
  "5to EGB (Media)",
  "6to EGB (Media)",
  "7mo EGB (Media)",
  "8vo EGB (Superior)",
  "9no EGB (Superior)",
  "10mo EGB (Superior)",
  "1ro BGU (Bachillerato)",
  "2do BGU (Bachillerato)",
  "3ro BGU (Bachillerato)",
  "1ro BT (Técnico)",
  "2do BT (Técnico)",
  "3ro BT (Técnico)",
];

export function parseCoverageCourses(raw?: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.map((c) => String(c).trim()).filter(Boolean);
  } catch {
    return raw
      .split(/[,;\n]/)
      .map((c) => c.trim())
      .filter(Boolean);
  }
  return [];
}

export function normalizeCourseName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

/**
 * Encuentra el profesional DECE responsable de la cobertura de un curso dado.
 */
export function findProfessionalForCourse(
  professionals: (UserRow & { coverage_courses?: string | null })[],
  courseQuery: string
): UserRow | null {
  if (!courseQuery || professionals.length === 0) return null;
  const normalizedQuery = normalizeCourseName(courseQuery);
  if (!normalizedQuery) return null;

  for (const prof of professionals) {
    const courses = parseCoverageCourses(prof.coverage_courses);
    for (const c of courses) {
      const normC = normalizeCourseName(c);
      if (normC === normalizedQuery || normC.includes(normalizedQuery) || normalizedQuery.includes(normC)) {
        return prof;
      }
    }
  }

  return null;
}
