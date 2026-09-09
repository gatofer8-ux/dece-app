import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { PageHeader } from "@/components/ui";
import type { CaseFileRow, StudentRow, InstitutionRow, CaseRestitutionPlanRow } from "@/lib/types";
import { ensureDefaultSchoolYear } from "@/lib/schoolYear";
import RestitutionPlanForm from "../../nueva/RestitutionPlanForm";

export default async function EditarPlanRestitucionPage({
  params,
}: {
  params: { id: string; planId: string };
}) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);

  const caseFile = db
    .prepare("SELECT * FROM case_files WHERE id = ? AND institution_id = ?")
    .get(params.id, institutionId) as CaseFileRow | undefined;
  if (!caseFile) notFound();

  const plan = db
    .prepare("SELECT * FROM case_restitution_plans WHERE id = ? AND case_file_id = ?")
    .get(params.planId, caseFile.id) as CaseRestitutionPlanRow | undefined;
  if (!plan) notFound();

  const student = db.prepare("SELECT * FROM students WHERE id = ?").get(caseFile.student_id) as StudentRow;
  const institution = db.prepare("SELECT * FROM institutions WHERE id = ?").get(institutionId) as InstitutionRow;
  const activeYear = institutionId ? ensureDefaultSchoolYear(institutionId) : null;

  return (
    <div>
      <PageHeader
        title="Editar Plan de Acompañamiento y Restitución"
        description={`${student.full_name} — ${caseFile.code}`}
      />
      <RestitutionPlanForm
        caseId={caseFile.id}
        institutionName={institution.name}
        defaultPreparedBy={session.user.name || ""}
        student={student}
        institution={institution}
        activeYear={activeYear}
        initialData={plan}
      />
    </div>
  );
}
