import { notFound } from "next/navigation";
import { studentGradeOnly } from "@/lib/studentCourse";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { db } from "@/lib/db";
import { getSelectedSchoolYear } from "@/lib/schoolYear";
import { currentSchoolYearText } from "@/lib/schoolYearText";
import { previewNextCitationNumber } from "@/lib/esquelas";
import { PageHeader } from "@/components/ui";
import EsquelaForm from "@/app/(app)/esquelas/EsquelaForm";
import type { CaseFileRow, StudentRow } from "@/lib/types";

export default async function NuevaEsquelaCasoPage({
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

  const student = db
    .prepare("SELECT * FROM students WHERE id = ?")
    .get(caseFile.student_id) as StudentRow | undefined;

  if (!student) notFound();

  const selectedYear = await getSelectedSchoolYear(institutionId);
  const schoolYearText = selectedYear?.name || currentSchoolYearText();

  const preview = previewNextCitationNumber({
    institutionId,
    schoolYearText,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Nueva Esquela de Citación — ${caseFile.code}`}
        description={`Convocatoria a representante o estudiante para el caso de ${student.full_name}.`}
      />

      <EsquelaForm
        previewCode={preview.citationNumber}
        schoolYearText={schoolYearText}
        caseFileId={caseFile.id}
        returnToCase={true}
        currentUserName={session.user.name || undefined}
        initialData={{
          case_file_id: caseFile.id,
          student_id: student.id,
          student_name: student.full_name,
          student_id_number: student.document_id || "",
          course: studentGradeOnly(student) || student.course || "",
          parallel: student.parallel || "",
          representative_name: student.representative || "",
          representative_phone: student.rep_phone || "",
        }}
      />
    </div>
  );
}
