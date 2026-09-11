import { requireRole } from "@/lib/session";
import { PageHeader } from "@/components/ui";
import EneisInformeDeceForm from "../_form/EneisInformeDeceForm";

export default async function NuevoEneisInformeDecePage() {
  await requireRole(["ADMIN", "DECE"]);
  const defaultPeriodo = new Date().toISOString().slice(0, 7);

  return (
    <div>
      <PageHeader
        title="Nuevo informe mensual de actividades DECE"
        description='Formato propio "INFORME DE ACTIVIDADES Nº ..." con las 4 actividades mensuales requeridas por la ENEIS.'
      />
      <EneisInformeDeceForm mode="create" defaultPeriodo={defaultPeriodo} />
    </div>
  );
}
