import { requireRole } from "@/lib/session";
import { PageHeader } from "@/components/ui";
import ImportCasesForm from "./ImportCasesForm";

export default async function ImportarCasosPage() {
  await requireRole(["ADMIN", "DECE"]);

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Importar Matriz de Casos / Vulnerabilidades"
        description="Abre y carga automáticamente expedientes de casos en seguimiento a partir de las matrices institucionales consolidadas."
      />
      <ImportCasesForm />
    </div>
  );
}
