import { requireRole, requireInstitutionId } from "@/lib/session";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import NewInformeForm from "./NewInformeForm";
import type { InstitutionRow } from "@/lib/types";

export default async function NuevoEneisInformePage() {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);

  const institution = db.prepare("SELECT * FROM institutions WHERE id = ?").get(institutionId) as
    | InstitutionRow
    | undefined;

  return (
    <div>
      <PageHeader
        title="Nuevo informe ENEIS"
        description="Elige el período: las tablas de actividades y cobertura se calculan solas a partir de las fichas ya cargadas en ese rango de fechas."
      />
      <NewInformeForm
        defaultResponsableNombre={session.user.name || ""}
        institutionName={institution?.name || ""}
      />
    </div>
  );
}
