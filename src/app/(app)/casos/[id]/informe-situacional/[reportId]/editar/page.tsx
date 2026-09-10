import { notFound } from "next/navigation";
import { studentGradeLabel } from "@/lib/studentCourse";
import { db } from "@/lib/db";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { PageHeader } from "@/components/ui";
import type { CaseFileRow, StudentRow, SituationalReportRow } from "@/lib/types";
import { getCaseDocumentDefaults } from "@/lib/caseDocumentDefaults";
import SituationalReportForm from "../../nueva/SituationalReportForm";

export default async function EditarInformeSituacionalPage({ params }: { params: { id: string, reportId: string } }) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  const caseFile = db
    .prepare("SELECT * FROM case_files WHERE id = ? AND institution_id = ?")
    .get(params.id, institutionId) as CaseFileRow | undefined;
  if (!caseFile) notFound();
  
  const report = db.prepare("SELECT * FROM situational_reports WHERE id = ? AND case_file_id = ?").get(params.reportId, caseFile.id) as SituationalReportRow | undefined;
  if (!report) notFound();

  const student = db.prepare("SELECT * FROM students WHERE id = ?").get(caseFile.student_id) as StudentRow;
  const defaults = getCaseDocumentDefaults(caseFile.id, session, institutionId);

  return (
    <div>
      <PageHeader title={"Editar Informe Situacional"} description={`${student.full_name} - ${caseFile.code}`} />
      <SituationalReportForm
        caseId={caseFile.id}
        studentName={student.full_name}
        studentCourse={studentGradeLabel(student)}
        studentParallel=""
        defaultResponsibleName={defaults?.deceProfessional.fullName || session.user.name || ""}
        defaultResponsibleRole={defaults?.deceProfessional.role || "ANALISTA DECE"}
        defaultCoordinatorName={defaults?.deceCoordinator.fullName || ""}
        defaultAuthorityName={defaults?.authority.fullName || ""}
        defaultAuthorityRole={defaults?.authority.role || "RECTOR/A"}
        report={report}
      />
    </div>
  );
}