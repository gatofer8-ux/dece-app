import { db } from "@/lib/db";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { PageHeader } from "@/components/ui";
import type { InstitutionRow } from "@/lib/types";
import InstitutionSettingsForm from "./InstitutionSettingsForm";

export default async function MiInstitucionPage() {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  const institution = db.prepare("SELECT * FROM institutions WHERE id = ?").get(institutionId) as InstitutionRow;

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title="Datos y Membrete Institucional"
        description="Personaliza el nombre de tu colegio, código AMIE, distrito, zona y el logo institucional que aparecerá en los documentos oficiales (Word y PDF)."
      />

      <InstitutionSettingsForm institution={institution} />
    </div>
  );
}
