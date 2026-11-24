import { requireRole, requireInstitutionId } from "@/lib/session";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import { createTapasSession } from "../actions";
import NuevaTapasForm from "./NuevaTapasForm";

export default async function NuevaTapasSessionPage() {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);

  const courses = (
    db
      .prepare("SELECT DISTINCT course FROM students WHERE institution_id = ? AND active = 1 AND course <> '' ORDER BY course")
      .all(institutionId) as { course: string }[]
  ).map((r) => r.course);
  const parallels = (
    db
      .prepare("SELECT DISTINCT parallel FROM students WHERE institution_id = ? AND active = 1 AND parallel IS NOT NULL AND parallel <> '' ORDER BY parallel")
      .all(institutionId) as { parallel: string }[]
  ).map((r) => r.parallel);

  return (
    <div>
      <PageHeader
        title="Nueva aplicación TaPas"
        description="Elige el nivel y la herramienta. Se genera un código y un enlace para que los estudiantes del curso participen."
      />
      <NuevaTapasForm action={createTapasSession} courses={courses} parallels={parallels} />
    </div>
  );
}
