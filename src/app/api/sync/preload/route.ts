import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession, requireInstitutionId } from "@/lib/session";
import { getUserCoverage, buildCoverageSqlFilter } from "@/lib/distributivo";
import { JORNADA_OPTIONS } from "@/lib/student";
import { RISK_TYPE_LABELS } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * Endpoint para precargar la información institucional esencial en el almacenamiento
 * local del navegador (IndexedDB) antes de que el profesional se traslade a zonas sin cobertura.
 */
export async function GET() {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  let institutionId: string;
  try {
    institutionId = requireInstitutionId(session);
  } catch {
    return NextResponse.json({ error: "Sesión sin institución asociada" }, { status: 400 });
  }

  const coverage = await getUserCoverage(session.user.id, institutionId, session.user.role);

  let where = "WHERE institution_id = ? AND active = 1";
  const params: any[] = [institutionId];

  if (!coverage.isAllInstitutional) {
    const coverageFilter = buildCoverageSqlFilter(coverage);
    if (coverageFilter.sql !== "1=1" && coverageFilter.sql !== "1=0") {
      where += ` AND ${coverageFilter.sql}`;
      params.push(...coverageFilter.params);
    } else if (coverageFilter.sql === "1=0") {
      where += " AND (created_by_id = ? OR created_by_id IS NULL)";
      params.push(session.user.id);
    }
  }

  // Estudiantes activos accesibles para el profesional
  const students = db
    .prepare(
      `SELECT id, full_name, document_type, document_id, course, parallel, jornada, 
              education_level, bachillerato_specialty, representative, rep_phone, rep_email, 
              birth_date, gender, medical_condition, medical_allergies, nee_types, notes
       FROM students ${where} 
       ORDER BY full_name ASC 
       LIMIT 1000`
    )
    .all(...params);

  // Años lectivos de la institución
  const schoolYears = db
    .prepare("SELECT id, name, is_active FROM school_years WHERE institution_id = ? ORDER BY start_date DESC")
    .all(institutionId);

  // Institución básica
  const institution = db
    .prepare("SELECT id, name, amie_code FROM institutions WHERE id = ?")
    .get(institutionId);

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    institution,
    students,
    schoolYears,
    catalogues: {
      jornadas: JORNADA_OPTIONS,
      riskTypes: Object.entries(RISK_TYPE_LABELS).map(([value, label]) => ({ value, label })),
    },
    user: {
      id: session.user.id,
      name: session.user.name,
      role: session.user.role,
      institutionId,
    },
  });
}
