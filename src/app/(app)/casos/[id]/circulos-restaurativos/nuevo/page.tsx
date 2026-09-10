import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { PageHeader } from "@/components/ui";
import CirculoConsentForm from "@/app/(app)/circulos-restaurativos/CirculoConsentForm";
import type { CaseFileRow, StudentRow } from "@/lib/types";
import { getCaseDocumentDefaults } from "@/lib/caseDocumentDefaults";

export default async function NuevoCirculoConsentCasoPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);

  const caseFile = db
    .prepare("SELECT * FROM case_files WHERE id = ? AND institution_id = ?")
    .get(params.id, institutionId) as CaseFileRow | undefined;
  if (!caseFile) notFound();
  const defaults = getCaseDocumentDefaults(caseFile.id, session, institutionId);

  const student = db
    .prepare("SELECT * FROM students WHERE id = ?")
    .get(caseFile.student_id) as StudentRow | undefined;
  if (!student) notFound();

  const students = db
    .prepare("SELECT * FROM students WHERE institution_id = ? ORDER BY full_name ASC")
    .all(institutionId) as StudentRow[];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nuevo Consentimiento para Círculo Restaurativo"
        description={`${student.full_name} — Caso ${caseFile.code} | Consentimiento informado para la atención psicosocial con estudiantes.`}
      />

      <CirculoConsentForm
        students={students}
        prefilledCaseId={caseFile.id}
        prefilledStudentId={student.id}
        prefilledStudent={student}
        caseCode={caseFile.code}
        currentUserName={defaults?.deceProfessional.fullName || session.user.name || "Profesional DECE"}
      />
    </div>
  );
}
