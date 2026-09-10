import { requireRole, requireInstitutionId } from "@/lib/session";
import { db } from "@/lib/db";
import { getSelectedSchoolYear } from "@/lib/schoolYear";
import { previewNextCitationNumber } from "@/lib/esquelas";
import { PageHeader } from "@/components/ui";
import EsquelaForm from "../EsquelaForm";
import type { StudentRow } from "@/lib/types";

export default async function NuevaEsquelaPage() {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);

  const selectedYear = await getSelectedSchoolYear(institutionId);
  const schoolYearText = selectedYear?.name || `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`;

  const preview = previewNextCitationNumber({
    institutionId,
    schoolYearText,
  });

  const students = db
    .prepare(
      `SELECT id, full_name, course, parallel, document_id, representative, rep_phone, representative_document_id, jornada
       FROM students
       WHERE institution_id = ? AND active = 1
       ORDER BY full_name ASC`
    )
    .all(institutionId) as StudentRow[];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Emitir Esquela de Citación"
        description="Convocatoria formal a representantes legales o estudiantes del DECE (independiente o fuera de caso)."
      />

      <EsquelaForm
        previewCode={preview.citationNumber}
        schoolYearText={schoolYearText}
        studentsList={students}
        currentUserName={session.user.name || undefined}
      />
    </div>
  );
}
