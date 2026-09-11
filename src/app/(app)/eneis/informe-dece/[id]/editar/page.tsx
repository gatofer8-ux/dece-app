import { notFound } from "next/navigation";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import { formatPeriodoDece } from "@/lib/eneis/eneisInformeDece";
import type { EneisInformeDeceRow } from "@/lib/types";
import EneisInformeDeceForm from "../../_form/EneisInformeDeceForm";

export default async function EditarEneisInformeDecePage({ params }: { params: { id: string } }) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  const informe = db
    .prepare("SELECT * FROM eneis_informes_dece WHERE id = ? AND institution_id = ?")
    .get(params.id, institutionId) as EneisInformeDeceRow | undefined;
  if (!informe) notFound();

  return (
    <div>
      <PageHeader title="Editar informe mensual DECE" description={formatPeriodoDece(informe.periodo)} />
      <div className="mb-4">
        <a href={`/eneis/informe-dece/${params.id}/imprimir`} className="btn-secondary text-xs">
          👁️ Ver / imprimir
        </a>
      </div>
      <EneisInformeDeceForm mode="edit" informeId={params.id} defaultPeriodo={informe.periodo} initialData={informe} />
    </div>
  );
}
