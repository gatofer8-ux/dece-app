import { requireRole, requireInstitutionId } from "@/lib/session";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import type { InstitutionRow } from "@/lib/types";
import EneisDiagnosticoForm from "../_form/EneisDiagnosticoForm";

export default async function NuevoEneisDiagnosticoPage() {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  const institution = db.prepare("SELECT * FROM institutions WHERE id = ?").get(institutionId) as InstitutionRow;

  const prefill = {
    fecha: new Date().toISOString().slice(0, 10),
    distrito: institution.district_code || institution.district || "",
    zona: institution.zone_code || "",
  };

  return (
    <div>
      <PageHeader
        title="Nuevo diagnóstico institucional"
        description="Informe del Diagnóstico Institucional sobre la ENEIS. Usa el dictado por voz donde se necesite."
      />
      <EneisDiagnosticoForm mode="create" prefill={prefill} />
    </div>
  );
}
