import { notFound } from "next/navigation";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { getEsquelaById } from "@/lib/esquelas";
import { PageHeader } from "@/components/ui";
import EsquelaForm from "../../EsquelaForm";

export default async function EditarEsquelaPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);

  const esquela = getEsquelaById(params.id, institutionId);
  if (!esquela) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Editar Citación N° ${esquela.citation_number}`}
        description="Modificación de los datos de la convocatoria. El número consecutivo permanece inmutable."
      />

      <EsquelaForm
        isEditing={true}
        initialData={esquela}
        previewCode={esquela.citation_number}
        schoolYearText={esquela.school_year_code}
        caseFileId={esquela.case_file_id}
      />
    </div>
  );
}
