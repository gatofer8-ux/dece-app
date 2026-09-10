import { notFound, redirect } from "next/navigation";
import { requireSession, requireInstitutionId } from "@/lib/session";
import { canManageStudents, roleHomePath } from "@/lib/permissions";
import { db } from "@/lib/db";
import { getCircleConsentById } from "@/lib/restorativeCircleConsent";
import { getSignatureDefaults } from "@/lib/caseDocumentDefaults";
import { PageHeader } from "@/components/ui";
import CirculoConsentForm from "../../CirculoConsentForm";
import type { StudentRow } from "@/lib/types";

export default async function EditarCirculoConsentPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await requireSession();
  if (!canManageStudents(session.user.role)) {
    redirect(roleHomePath(session.user.role));
  }
  const institutionId = requireInstitutionId(session);
  const sig = getSignatureDefaults(session, institutionId);

  const consent = await getCircleConsentById(params.id, institutionId);
  if (!consent) notFound();

  const students = db
    .prepare(
      "SELECT * FROM students WHERE institution_id = ? ORDER BY full_name ASC"
    )
    .all(institutionId) as StudentRow[];

  let prefilledStudent: StudentRow | null = null;
  if (consent.student_id) {
    prefilledStudent = (db
      .prepare("SELECT * FROM students WHERE id = ?")
      .get(consent.student_id) as StudentRow | undefined) || null;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Editar Consentimiento para Círculo Restaurativo"
        description={`Modificando datos del consentimiento para ${consent.student_name || "Formato en blanco"}.`}
      />

      <CirculoConsentForm
        initialData={consent}
        students={students}
        prefilledStudent={prefilledStudent}
        currentUserName={consent.dece_name || sig.deceProfessional.fullName || session.user.name || "Profesional DECE"}
      />
    </div>
  );
}
