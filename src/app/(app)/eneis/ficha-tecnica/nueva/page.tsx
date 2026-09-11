import { requireRole, requireInstitutionId } from "@/lib/session";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import type { InstitutionRow } from "@/lib/types";
import EneisFichaTecnicaForm from "../_form/EneisFichaTecnicaForm";

export default async function NuevaEneisFichaTecnicaPage() {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  const institution = db.prepare("SELECT * FROM institutions WHERE id = ?").get(institutionId) as InstitutionRow;

  const prefill = {
    fecha_elaboracion: new Date().toISOString().slice(0, 10),
    coordinacion_zonal_distrito: institution.district_code || institution.district || "",
  };

  return (
    <div>
      <PageHeader
        title="Nueva ficha técnica del equipo escolar"
        description="Planificación estratégica institucional de implementación de la Educación Integral en Sexualidad."
      />
      <EneisFichaTecnicaForm mode="create" prefill={prefill} />
    </div>
  );
}
