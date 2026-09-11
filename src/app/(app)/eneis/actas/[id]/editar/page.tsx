import { notFound } from "next/navigation";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import type { EneisActaRow } from "@/lib/types";
import EneisActaForm from "../../_form/EneisActaForm";

export default async function EditarEneisActaPage({ params }: { params: { id: string } }) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  const acta = db
    .prepare("SELECT * FROM eneis_actas WHERE id = ? AND institution_id = ?")
    .get(params.id, institutionId) as EneisActaRow | undefined;
  if (!acta) notFound();

  return (
    <div>
      <PageHeader title="Editar acta ENEIS" description={acta.tema || ""} />
      <div className="mb-4">
        <a href={`/eneis/actas/${params.id}/imprimir`} className="btn-secondary text-xs">
          👁️ Ver / imprimir
        </a>
      </div>
      <EneisActaForm mode="edit" actaId={params.id} prefill={{}} initialData={acta} />
    </div>
  );
}
