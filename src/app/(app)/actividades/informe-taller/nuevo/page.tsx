import { requireRole, requireInstitutionId } from "@/lib/session";
import { PageHeader } from "@/components/ui";
import { getActivityReportPrefill } from "@/lib/activityReportDefaults";
import ActivityReportForm from "../../_report/ActivityReportForm";

export default async function NuevoInformeTallerSueltoPage() {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  const prefill = getActivityReportPrefill(null, session, institutionId);

  return (
    <div>
      <PageHeader
        title="Nuevo informe de taller"
        description="Se registrará también como actividad de promoción y prevención."
      />
      <ActivityReportForm mode="create-standalone" prefill={prefill} />
    </div>
  );
}
