import { requireRole, requireInstitutionId } from "@/lib/session";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import NewInterviewScheduleForm from "./NewInterviewScheduleForm";

export default async function NuevoCronogramaPage() {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);

  const rows = db
    .prepare(
      `SELECT course, parallel, COUNT(*) AS n
       FROM students
       WHERE institution_id = ? AND active = 1 AND course <> '' AND parallel IS NOT NULL AND parallel <> ''
       GROUP BY course, parallel
       ORDER BY course, parallel`
    )
    .all(institutionId) as { course: string; parallel: string; n: number }[];

  // Curso sugerido por defecto: el que se parezca a "10mo / décimo de EGB".
  const courses = Array.from(new Set(rows.map((r) => r.course)));
  const defaultCourse =
    courses.find((c) => /^10\b|10mo|d[eé]cimo/i.test(c)) || courses[0] || "";

  return (
    <div>
      <PageHeader
        title="Nuevo cronograma de citas — Toma de decisión (OVP)"
        description='Genera automáticamente el cronograma de entrevistas presenciales con estudiante y representante para la "toma de decisión" de la figura profesional, con horarios asignados en orden alfabético.'
      />
      <NewInterviewScheduleForm roster={rows} defaultCourse={defaultCourse} />
    </div>
  );
}
