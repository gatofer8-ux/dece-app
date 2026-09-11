import { notFound } from "next/navigation";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import type { EneisDiagnosticoRow } from "@/lib/types";
import EneisDiagnosticoForm from "../../_form/EneisDiagnosticoForm";

export default async function EditarEneisDiagnosticoPage({ params }: { params: { id: string } }) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  const diagnostico = db
    .prepare("SELECT * FROM eneis_diagnosticos WHERE id = ? AND institution_id = ?")
    .get(params.id, institutionId) as EneisDiagnosticoRow | undefined;
  if (!diagnostico) notFound();

  return (
    <div>
      <PageHeader title="Editar diagnóstico institucional" description={diagnostico.distrito || ""} />
      <div className="mb-4">
        <a href={`/eneis/diagnostico/${params.id}/imprimir`} className="btn-secondary text-xs">
          👁️ Ver / imprimir
        </a>
      </div>
      <EneisDiagnosticoForm mode="edit" diagnosticoId={params.id} prefill={{}} initialData={diagnostico} />
    </div>
  );
}
