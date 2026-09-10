import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { PageHeader } from "@/components/ui";
import type { CaseFileRow, StudentRow } from "@/lib/types";
import { getCaseDocumentDefaults } from "@/lib/caseDocumentDefaults";
import { previewNextReportNumber } from "@/lib/reportNumbering";
import SituationalReportForm from "./SituationalReportForm";

export default async function NuevoInformeSituacionalPage({ params }: { params: { id: string } }) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  const caseFile = db
    .prepare("SELECT * FROM case_files WHERE id = ? AND institution_id = ?")
    .get(params.id, institutionId) as CaseFileRow | undefined;
  if (!caseFile) notFound();
  const defaults = getCaseDocumentDefaults(caseFile.id, session, institutionId);
  const student = db.prepare("SELECT * FROM students WHERE id = ?").get(caseFile.student_id) as StudentRow;

  const preview = previewNextReportNumber({
    institutionId,
    userId: session.user.id,
    userName: session.user.name,
    schoolYearText: defaults?.schoolYearText,
  });

  return (
    <div>
      <PageHeader title="Informe técnico situacional" description={`${student.full_name} — ${caseFile.code}`} />
      <SituationalReportForm
        caseId={caseFile.id}
        studentName={student.full_name}
        studentCourse={student.course}
        studentParallel={student.parallel || ""}
        defaultResponsibleName={defaults?.deceProfessional.fullName || session.user.name || ""}
        defaultReportNumber={preview.reportNumber}
      />
    </div>
  );
}
