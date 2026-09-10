import { redirect } from "next/navigation";
import { requireSession, requireInstitutionId } from "@/lib/session";
import { canManageStudents, roleHomePath } from "@/lib/permissions";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import { getSignatureDefaults } from "@/lib/caseDocumentDefaults";
import CirculoConsentForm from "../CirculoConsentForm";
import type { StudentRow, CaseFileRow } from "@/lib/types";

export default async function NuevoCirculoConsentPage({
  searchParams,
}: {
  searchParams: { caseId?: string; studentId?: string };
}) {
  const session = await requireSession();
  if (!canManageStudents(session.user.role)) {
    redirect(roleHomePath(session.user.role));
  }
  const institutionId = requireInstitutionId(session);
  const sig = getSignatureDefaults(session, institutionId);

  let targetStudentId = searchParams.studentId || null;
  let prefilledStudent: StudentRow | null = null;
  let caseCode: string | null = null;

  if (searchParams.caseId) {
    const caseRow = db
      .prepare("SELECT * FROM case_files WHERE id = ? AND institution_id = ?")
      .get(searchParams.caseId, institutionId) as CaseFileRow | undefined;
    if (caseRow) {
      caseCode = caseRow.code;
      if (!targetStudentId) {
        targetStudentId = caseRow.student_id;
      }
    }
  }

  if (targetStudentId) {
    prefilledStudent = (db
      .prepare("SELECT * FROM students WHERE id = ?")
      .get(targetStudentId) as StudentRow | undefined) || null;
  }

  const students = db
    .prepare(
      "SELECT * FROM students WHERE institution_id = ? ORDER BY full_name ASC"
    )
    .all(institutionId) as StudentRow[];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nuevo Consentimiento para Círculo Restaurativo"
        description="Generación de documento formal de consentimiento informado para la atención psicosocial con estudiantes."
      />

      <CirculoConsentForm
        students={students}
        prefilledCaseId={searchParams.caseId || null}
        prefilledStudentId={targetStudentId}
        prefilledStudent={prefilledStudent}
        caseCode={caseCode}
        currentUserName={sig.deceProfessional.fullName || session.user.name || "Profesional DECE"}
      />
    </div>
  );
}
