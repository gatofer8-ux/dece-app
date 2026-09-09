import { requireRole } from "@/lib/session";
import { PageHeader } from "@/components/ui";
import ImportStudentsForm from "./ImportStudentsForm";

export default async function ImportarEstudiantesPage() {
  await requireRole(["ADMIN", "DECE"]);
  return (
    <div>
      <PageHeader
        title="Importar estudiantes desde Excel"
        description="Sube una planilla con varios estudiantes para crearlos de una sola vez."
      />
      <ImportStudentsForm />
    </div>
  );
}
