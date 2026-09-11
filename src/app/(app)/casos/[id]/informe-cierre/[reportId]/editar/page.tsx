import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { PageHeader } from "@/components/ui";
import type {
  CaseFileRow,
  StudentRow,
  InstitutionRow,
  SchoolYearRow,
  CaseClosureReportRow,
} from "@/lib/types";
import {
  getCaseBimonthlyReports,
  getCasePsychosocialActionsSummary,
} from "@/lib/caseClosureReportServer";
import { getCaseDocumentDefaults } from "@/lib/caseDocumentDefaults";
import { currentSchoolYearSpaced } from "@/lib/schoolYearText";
import CaseClosureReportForm from "../../nuevo/CaseClosureReportForm";

export default async function EditarInformeCierrePage({
  params,
}: {
  params: { id: string; reportId: string };
}) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);

  const caseFile = db
    .prepare("SELECT * FROM case_files WHERE id = ? AND institution_id = ?")
    .get(params.id, institutionId) as CaseFileRow | undefined;
  if (!caseFile) notFound();

  const report = db
    .prepare(
      "SELECT * FROM case_closure_reports WHERE id = ? AND case_file_id = ? AND institution_id = ?"
    )
    .get(params.reportId, caseFile.id, institutionId) as CaseClosureReportRow | undefined;
  if (!report) notFound();

  const student = db
    .prepare("SELECT * FROM students WHERE id = ?")
    .get(caseFile.student_id) as StudentRow | undefined;
  if (!student) notFound();

  const institution = db
    .prepare("SELECT * FROM institutions WHERE id = ?")
    .get(institutionId) as InstitutionRow;

  const activeYear = db
    .prepare("SELECT * FROM school_years WHERE institution_id = ? AND is_active = 1")
    .get(institutionId) as SchoolYearRow | undefined;

  const schoolYearText = report.school_year_text || activeYear?.name || currentSchoolYearSpaced();
  const defaultPsychosocialSummary =
    report.activities_psychosocial || getCasePsychosocialActionsSummary(caseFile.id);
  const bimonthlyItems = getCaseBimonthlyReports(caseFile.id);
  const defaults = getCaseDocumentDefaults(caseFile.id, session, institutionId);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Editar Informe Técnico de Cierre de Caso"
        description={`Informe N° ${report.report_number} — ${student.full_name} (Caso ${caseFile.code})`}
      />
      <CaseClosureReportForm
        caseId={caseFile.id}
        student={student}
        caseFile={caseFile}
        institution={institution}
        schoolYearText={schoolYearText}
        defaultReportNumber={report.report_number}
        defaultPsychosocialSummary={defaultPsychosocialSummary}
        bimonthlyItems={bimonthlyItems}
        report={report}
        deceProfessional={defaults?.deceProfessional}
        authority={defaults?.authority}
        deceCoordinator={defaults?.deceCoordinator}
      />
    </div>
  );
}
