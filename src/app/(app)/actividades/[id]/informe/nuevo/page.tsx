import { notFound } from "next/navigation";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import type { ActivityRow } from "@/lib/types";
import { getActivityReportPrefill } from "@/lib/activityReportDefaults";
import ActivityReportForm from "../../../_report/ActivityReportForm";

export default async function NuevoInformeTallerPage({ params }: { params: { id: string } }) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  const activity = db
    .prepare("SELECT * FROM activities WHERE id = ? AND institution_id = ?")
    .get(params.id, institutionId) as ActivityRow | undefined;
  if (!activity) notFound();

  const existing = db
    .prepare("SELECT id FROM activity_reports WHERE activity_id = ? ORDER BY created_at DESC LIMIT 1")
    .get(params.id) as { id: string } | undefined;

  const prefill = getActivityReportPrefill(params.id, session, institutionId);

  return (
    <div>
      <PageHeader
        title="Nuevo informe de taller"
        description={activity.title}
      />
      {existing && (
        <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Esta actividad ya tiene un informe.{" "}
          <a href={`/actividades/${params.id}/informe/${existing.id}/editar`} className="font-semibold underline">
            Editar el existente
          </a>{" "}
          o crear uno nuevo aquí abajo.
        </p>
      )}
      <ActivityReportForm mode="create-from-activity" activityId={params.id} prefill={prefill} />
    </div>
  );
}
