import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { getAnnualManagementReportById } from "@/lib/informeGestion";
import { getSignatureDefaults } from "@/lib/caseDocumentDefaults";
import { getInstitutionDeceTeam } from "@/lib/distributivo";
import AnnualReportForm from "../../AnnualReportForm";
import type { SchoolYearRow, InstitutionRow } from "@/lib/types";

export default async function EditAnnualReportPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getSession();
  if (!session || !session.user) {
    redirect("/login");
  }

  const institutionId = session.user.institution_id;
  if (!institutionId) {
    redirect("/informe-gestion");
  }

  const sig = getSignatureDefaults(session, institutionId);

  const report = getAnnualManagementReportById(params.id, institutionId);
  if (!report) {
    notFound();
  }

  const institution = db
    .prepare("SELECT * FROM institutions WHERE id = ?")
    .get(institutionId) as InstitutionRow | undefined;

  const schoolYears = db
    .prepare("SELECT * FROM school_years WHERE institution_id = ? ORDER BY is_active DESC, created_at DESC")
    .all(institutionId) as SchoolYearRow[];

  const deceTeam = getInstitutionDeceTeam(institutionId);

  return (
    <AnnualReportForm
      report={report}
      schoolYears={schoolYears}
      selectedYearId={report.school_year_id}
      currentUserId={session.user.id}
      currentUserName={report.user_name || sig.deceProfessional.fullName || session.user.name || ""}
      currentUserEmail={session.user.email || undefined}
      currentUserRole={session.user.role}
      institutionName={institution?.name || "UNIDAD EDUCATIVA"}
      institutionDistrict={institution?.district || ""}
      deceTeam={deceTeam}
    />
  );
}
