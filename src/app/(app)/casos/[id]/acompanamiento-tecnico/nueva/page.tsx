import { notFound } from "next/navigation";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import type { CaseFileRow, StudentRow } from "@/lib/types";
import { getAccompanimentPrefill } from "@/lib/accompanimentReportDefaults";
import AccompanimentReportForm from "../AccompanimentReportForm";

export default async function NuevoInformeAcompanamientoPage({ params }: { params: { id: string } }) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  const caseFile = db
    .prepare("SELECT * FROM case_files WHERE id = ? AND institution_id = ?")
    .get(params.id, institutionId) as CaseFileRow | undefined;
  if (!caseFile) notFound();
  const student = db.prepare("SELECT * FROM students WHERE id = ?").get(caseFile.student_id) as StudentRow;

  const { values, restitutionPlans } = getAccompanimentPrefill(params.id, session, institutionId);
  const existing = db
    .prepare("SELECT id FROM case_accompaniment_reports WHERE case_file_id = ? ORDER BY created_at DESC LIMIT 1")
    .get(params.id) as { id: string } | undefined;

  return (
    <div>
      <PageHeader title="Informe técnico de acompañamiento a víctimas de violencia" description={`${student.full_name} — ${caseFile.code}`} />
      {existing && (
        <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Este caso ya tiene un informe técnico de acompañamiento.{" "}
          <a href={`/casos/${params.id}/acompanamiento-tecnico/${existing.id}/editar`} className="font-semibold underline">
            Editar el existente
          </a>.
        </p>
      )}
      <AccompanimentReportForm caseId={params.id} mode="create" prefill={values} restitutionPlans={restitutionPlans} />
    </div>
  );
}
