import { requireRole, requireInstitutionId } from "@/lib/session";
import { PageHeader } from "@/components/ui";
import { getActivityReportPrefill } from "@/lib/activityReportDefaults";
import ActivityReportForm from "../../_report/ActivityReportForm";

export default async function NuevoInformeTallerSueltoPage({
  searchParams,
}: {
  searchParams?: { tallerId?: string; tema?: string; titulo?: string };
}) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  const prefill = getActivityReportPrefill(null, session, institutionId);

  if (searchParams?.titulo) {
    prefill.activity_name = searchParams.titulo;
    prefill.tema = searchParams.titulo;
  }
  if (searchParams?.tema) {
    prefill.prevention_theme = searchParams.tema;
  }
  if (searchParams?.tallerId) {
    const { getWorkshopById } = await import("@/lib/talleres/talleresData");
    const ws = getWorkshopById(searchParams.tallerId);
    if (ws) {
      prefill.objective_general = ws.generalObjective;
      prefill.objectives_specific = ws.specificObjectives.map((o) => `• ${o}`).join("\n");
      prefill.activity_beneficiaries = ws.targetAudienceLabel;
    }
  }

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
