import { requireRole, requireInstitutionId } from "@/lib/session";
import { PageHeader } from "@/components/ui";
import { getFichaPrefill } from "@/lib/restorativeCircleFichaDefaults";
import FichaCirculoForm from "../_form/FichaCirculoForm";

export default async function NuevaFichaCirculoPage({
  searchParams,
}: {
  searchParams: { caso?: string };
}) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  const prefill = getFichaPrefill(session, institutionId, { caseFileId: searchParams.caso || null });

  return (
    <div>
      <PageHeader
        title="Nueva ficha de círculo restaurativo"
        description="Calca del formato oficial. Usa el dictado por voz y la ayuda de IA donde se necesite."
      />
      <FichaCirculoForm mode="create" prefill={prefill} />
    </div>
  );
}
