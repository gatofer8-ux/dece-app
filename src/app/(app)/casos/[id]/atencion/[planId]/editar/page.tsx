import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { PageHeader } from "@/components/ui";
import type { CaseFileRow, StudentRow, CaseCarePlanRow } from "@/lib/types";
import CarePlanEditForm from "./CarePlanEditForm";

export default async function EditarPlanAtencionPage({ params }: { params: { id: string; planId: string } }) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);

  const caseFile = db
    .prepare("SELECT * FROM case_files WHERE id = ? AND institution_id = ?")
    .get(params.id, institutionId) as CaseFileRow | undefined;
  if (!caseFile) notFound();

  const plan = db
    .prepare("SELECT * FROM case_care_plans WHERE id = ? AND case_file_id = ?")
    .get(params.planId, caseFile.id) as CaseCarePlanRow | undefined;
  if (!plan) notFound();

  const student = db.prepare("SELECT * FROM students WHERE id = ?").get(caseFile.student_id) as StudentRow;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <PageHeader
          title="Editar Plan de atención psicosocial"
          description={`${student.full_name} — ${caseFile.code}`}
        />
        <Link href={`/casos/${caseFile.id}/atencion/${plan.id}/imprimir`} className="btn-secondary text-xs">
          ← Volver a la ficha
        </Link>
      </div>

      <CarePlanEditForm
        caseId={caseFile.id}
        studentName={student.full_name}
        plan={plan}
      />
    </div>
  );
}
