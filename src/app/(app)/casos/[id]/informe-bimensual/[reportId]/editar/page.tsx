import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { PageHeader } from "@/components/ui";
import type { CaseFileRow, StudentRow, BimonthlyReportRow } from "@/lib/types";
import { getCaseDocumentDefaults } from "@/lib/caseDocumentDefaults";
import BimonthlyReportForm from "../../nueva/BimonthlyReportForm";

export default async function EditarInformeBimensualPage({
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
    .prepare("SELECT * FROM bimonthly_reports WHERE id = ? AND institution_id = ? AND case_file_id = ?")
    .get(params.reportId, institutionId, caseFile.id) as BimonthlyReportRow | undefined;
  if (!report) notFound();

  const student = db.prepare("SELECT * FROM students WHERE id = ?").get(caseFile.student_id) as StudentRow;
  const defaults = getCaseDocumentDefaults(caseFile.id, session, institutionId);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Editar Informe Bimensual de Acompañamiento"
        description={`${report.victim_initials} — Período: ${report.period_months} (${report.school_year_text})`}
      />
      <BimonthlyReportForm
        caseId={caseFile.id}
        studentName={student?.full_name || ""}
        victimInitials={report.victim_initials}
        institutionName={report.institution_name}
        amieCode={report.amie_code}
        schoolYearText={report.school_year_text}
        defaultResponsibleName={defaults?.deceProfessional.fullName || session.user.name || ""}
        defaultAuthorityName={defaults?.authority.fullName || ""}
        report={report}
      />
    </div>
  );
}

