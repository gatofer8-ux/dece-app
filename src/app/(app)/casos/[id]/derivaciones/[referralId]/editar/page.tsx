import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { PageHeader } from "@/components/ui";
import type { CaseFileRow, StudentRow, InstitutionRow, ReferralRow } from "@/lib/types";
import ReferralForm from "../../nueva/ReferralForm";

function computeAge(birthDate: string | null): string {
  if (!birthDate) return "";
  const b = new Date(birthDate);
  if (Number.isNaN(b.getTime())) return "";
  const today = new Date();
  let age = today.getFullYear() - b.getFullYear();
  const m = today.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < b.getDate())) age--;
  return age >= 0 ? String(age) : "";
}

export default async function EditarDerivacionPage({
  params,
}: {
  params: { id: string; referralId: string };
}) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);

  const caseFile = db
    .prepare("SELECT * FROM case_files WHERE id = ? AND institution_id = ?")
    .get(params.id, institutionId) as CaseFileRow | undefined;
  if (!caseFile) notFound();

  const referral = db
    .prepare("SELECT * FROM referrals WHERE id = ? AND case_file_id = ?")
    .get(params.referralId, caseFile.id) as ReferralRow | undefined;
  if (!referral) notFound();

  const student = db.prepare("SELECT * FROM students WHERE id = ?").get(caseFile.student_id) as StudentRow;
  const institution = db.prepare("SELECT * FROM institutions WHERE id = ?").get(institutionId) as InstitutionRow;

  return (
    <div>
      <PageHeader
        title="Editar Ficha de derivación"
        description={`${student.full_name} — ${caseFile.code}`}
      />
      <ReferralForm
        caseId={caseFile.id}
        defaultElaboratedBy={referral.elaborated_by_name || session.user.name || ""}
        defaultAge={referral.student_age || computeAge(student.birth_date)}
        defaultDistrictOfficeLabel={referral.district_office_label || (institution.district ? `DIRECCIÓN DISTRITAL DE EDUCACIÓN ${institution.district}` : "")}
        initialData={referral}
      />
    </div>
  );
}
