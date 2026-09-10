import { notFound } from "next/navigation";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import { getMeetingMinutesPrefill } from "@/lib/meetingMinutesDefaults";
import type { MeetingMinutesRow } from "@/lib/types";
import ActasReunionForm from "../../_form/ActasReunionForm";

export default async function EditarActaReunionPage({ params }: { params: { id: string } }) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  const acta = db
    .prepare("SELECT * FROM meeting_minutes WHERE id = ? AND institution_id = ?")
    .get(params.id, institutionId) as MeetingMinutesRow | undefined;
  if (!acta) notFound();

  const prefill = getMeetingMinutesPrefill(session, institutionId);

  return (
    <div>
      <PageHeader title="Editar acta de reunión" description={acta.meeting_topic || acta.meeting_code || ""} />
      <div className="mb-4">
        <a href={`/actas-reunion/${params.id}/imprimir`} className="btn-secondary text-xs">
          👁️ Ver / imprimir
        </a>
      </div>
      <ActasReunionForm mode="edit" meetingId={params.id} prefill={prefill} initialData={acta} />
    </div>
  );
}
