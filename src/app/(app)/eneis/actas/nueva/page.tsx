import { requireRole } from "@/lib/session";
import { PageHeader } from "@/components/ui";
import EneisActaForm from "../_form/EneisActaForm";

export default async function NuevaEneisActaPage() {
  await requireRole(["ADMIN", "DECE"]);

  const prefill = { meeting_date: new Date().toISOString().slice(0, 10) };

  return (
    <div>
      <PageHeader
        title="Nueva acta ENEIS"
        description="Formato propio de seguimiento mensual de la Comisión/Red institucional ENEIS. Usa el dictado por voz donde se necesite."
      />
      <EneisActaForm mode="create" prefill={prefill} />
    </div>
  );
}
