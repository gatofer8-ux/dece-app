import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { PageHeader } from "@/components/ui";
import type { CaseFileRow, StudentRow, InstitutionRow, SchoolYearRow } from "@/lib/types";
import { generateReportNumber } from "@/lib/caseClosureReport";
import {
  getCaseBimonthlyReports,
  getCasePsychosocialActionsSummary,
} from "@/lib/caseClosureReportServer";
import CaseClosureReportForm from "./CaseClosureReportForm";

export default async function NuevoInformeCierrePage({
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

  const institution = db
    .prepare("SELECT * FROM institutions WHERE id = ?")
    .get(institutionId) as InstitutionRow;

  const activeYear = db
    .prepare("SELECT * FROM school_years WHERE institution_id = ? AND is_active = 1")
    .get(institutionId) as SchoolYearRow | undefined;

  const schoolYearText = activeYear?.name || "2024 - 2025";
  const defaultReportNumber = generateReportNumber(institution?.name || "UE", schoolYearText);
  const defaultPsychosocialSummary = getCasePsychosocialActionsSummary(caseFile.id);
  const bimonthlyItems = getCaseBimonthlyReports(caseFile.id);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nuevo Informe Técnico de Cierre de Caso"
        description={`Cierre por finalización del año lectivo, graduación o traslado — ${student.full_name} (Caso ${caseFile.code})`}
      />
      <CaseClosureReportForm
        caseId={caseFile.id}
        student={student}
        caseFile={caseFile}
        institution={institution}
        schoolYearText={schoolYearText}
        defaultReportNumber={defaultReportNumber}
        defaultPsychosocialSummary={defaultPsychosocialSummary}
        bimonthlyItems={bimonthlyItems}
      />
    </div>
  );
}
