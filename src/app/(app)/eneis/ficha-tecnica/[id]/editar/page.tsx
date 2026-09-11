import { notFound } from "next/navigation";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import type { EneisFichaTecnicaRow } from "@/lib/types";
import EneisFichaTecnicaForm from "../../_form/EneisFichaTecnicaForm";

export default async function EditarEneisFichaTecnicaPage({ params }: { params: { id: string } }) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  const ficha = db
    .prepare("SELECT * FROM eneis_fichas_tecnicas WHERE id = ? AND institution_id = ?")
    .get(params.id, institutionId) as EneisFichaTecnicaRow | undefined;
  if (!ficha) notFound();

  return (
    <div>
      <PageHeader title="Editar ficha técnica del equipo escolar" description={ficha.coordinacion_zonal_distrito || ""} />
      <div className="mb-4">
        <a href={`/eneis/ficha-tecnica/${params.id}/imprimir`} className="btn-secondary text-xs">
          👁️ Ver / imprimir
        </a>
      </div>
      <EneisFichaTecnicaForm mode="edit" fichaId={params.id} prefill={{}} initialData={ficha} />
    </div>
  );
}
