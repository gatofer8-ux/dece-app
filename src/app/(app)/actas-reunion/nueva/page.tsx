import { requireRole, requireInstitutionId } from "@/lib/session";
import { PageHeader } from "@/components/ui";
import { getMeetingMinutesPrefill } from "@/lib/meetingMinutesDefaults";
import ActasReunionForm from "../_form/ActasReunionForm";

export default async function NuevaActaReunionPage() {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  const prefill = getMeetingMinutesPrefill(session, institutionId);

  return (
    <div>
      <PageHeader
        title="Nueva acta de reunión"
        description="Formato oficial del Ministerio de Educación. Usa el dictado por voz y la ayuda de IA donde se necesite."
      />
      <ActasReunionForm mode="create" prefill={prefill} />
    </div>
  );
}
