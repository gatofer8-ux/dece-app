import { notFound } from "next/navigation";
import Link from "next/link";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import type { CaseAccompanimentReportRow } from "@/lib/types";
import { getAccompanimentPrefill } from "@/lib/accompanimentReportDefaults";
import AccompanimentReportForm from "../../AccompanimentReportForm";

export default async function EditarInformeAcompanamientoPage({
  params,
}: {
  params: { id: string; reportId: string };
}) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  const report = db
    .prepare("SELECT * FROM case_accompaniment_reports WHERE id = ? AND case_file_id = ? AND institution_id = ?")
    .get(params.reportId, params.id, institutionId) as CaseAccompanimentReportRow | undefined;
  if (!report) notFound();

  const { values, restitutionPlans } = getAccompanimentPrefill(params.id, session, institutionId);

  return (
    <div>
      <PageHeader title="Editar informe técnico de acompañamiento" />
      <div className="mb-4">
        <Link href={`/casos/${params.id}/acompanamiento-tecnico/${params.reportId}/imprimir`} className="btn-secondary text-xs">
          👁️ Ver / imprimir
        </Link>
      </div>
      <AccompanimentReportForm
        caseId={params.id}
        mode="edit"
        reportId={params.reportId}
        prefill={values}
        restitutionPlans={restitutionPlans}
        initialData={report}
      />
    </div>
  );
}
