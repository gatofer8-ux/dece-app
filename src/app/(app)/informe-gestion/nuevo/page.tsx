import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import AnnualReportForm from "../AnnualReportForm";
import type { SchoolYearRow, InstitutionRow } from "@/lib/types";

export default async function NewAnnualReportPage() {
  const session = await getSession();
  if (!session || !session.user) {
    redirect("/login");
  }

  const institutionId = session.user.institution_id;
  if (!institutionId) {
    redirect("/informe-gestion");
  }

  const institution = db
    .prepare("SELECT * FROM institutions WHERE id = ?")
    .get(institutionId) as InstitutionRow | undefined;

  const schoolYears = db
    .prepare("SELECT * FROM school_years WHERE institution_id = ? ORDER BY is_active DESC, created_at DESC")
    .all(institutionId) as SchoolYearRow[];

  const activeYear = schoolYears.find((y) => y.is_active) || schoolYears[0];

  return (
    <AnnualReportForm
      schoolYears={schoolYears}
      selectedYearId={activeYear?.id}
      currentUserId={session.user.id}
      currentUserName={session.user.name || ""}
      currentUserEmail={session.user.email || undefined}
      currentUserRole={session.user.role}
      institutionName={institution?.name || "UNIDAD EDUCATIVA"}
      institutionDistrict={institution?.district || ""}
    />
  );
}
