import { notFound } from "next/navigation";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import { getFichaPrefill } from "@/lib/restorativeCircleFichaDefaults";
import FichaCirculoForm from "../../_form/FichaCirculoForm";
import type { RestorativeCircleFichaRow } from "@/lib/types";

export default async function EditarFichaCirculoPage({ params }: { params: { id: string } }) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  const ficha = db
    .prepare("SELECT * FROM restorative_circle_fichas WHERE id = ? AND institution_id = ?")
    .get(params.id, institutionId) as RestorativeCircleFichaRow | undefined;
  if (!ficha) notFound();

  const prefill = getFichaPrefill(session, institutionId, { caseFileId: ficha.case_file_id });

  return (
    <div>
      <PageHeader title="Editar ficha de círculo restaurativo" description={ficha.problematica || ficha.ficha_code || ""} />
      <div className="mb-4">
        <a href={`/circulos-restaurativos/fichas/${params.id}/imprimir`} className="btn-secondary text-xs">
          👁️ Ver / imprimir
        </a>
      </div>
      <FichaCirculoForm mode="edit" fichaId={params.id} prefill={prefill} initialData={ficha} />
    </div>
  );
}
