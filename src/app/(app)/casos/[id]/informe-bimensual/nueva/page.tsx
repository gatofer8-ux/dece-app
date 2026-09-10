import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { PageHeader } from "@/components/ui";
import type { CaseFileRow, StudentRow, InstitutionRow, SchoolYearRow } from "@/lib/types";
import { getStudentInitials } from "@/lib/bimonthlyReport";
import { getCaseDocumentDefaults } from "@/lib/caseDocumentDefaults";
import BimonthlyReportForm from "./BimonthlyReportForm";

export default async function NuevoInformeBimensualPage({ params }: { params: { id: string } }) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  const caseFile = db
    .prepare("SELECT * FROM case_files WHERE id = ? AND institution_id = ?")
    .get(params.id, institutionId) as CaseFileRow | undefined;
  if (!caseFile) notFound();
  const defaults = getCaseDocumentDefaults(caseFile.id, session, institutionId);

  const student = db.prepare("SELECT * FROM students WHERE id = ?").get(caseFile.student_id) as StudentRow;
  const institution = db.prepare("SELECT * FROM institutions WHERE id = ?").get(institutionId) as InstitutionRow;
  const activeYear = db
    .prepare("SELECT * FROM school_years WHERE institution_id = ? AND is_active = 1")
    .get(institutionId) as SchoolYearRow | undefined;

  const initials = getStudentInitials(student.full_name);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nuevo Informe Bimensual de Acompañamiento"
        description={`Seguimiento institucional a presunta víctima de violencia sexual (${initials} — Caso ${caseFile.code})`}
      />
      <BimonthlyReportForm
        caseId={caseFile.id}
        studentName={student.full_name}
        victimInitials={initials}
        institutionName={institution?.name || "Unidad Educativa Santa Rosa"}
        amieCode={institution?.amie_code || "18H00313"}
        schoolYearText={activeYear?.name || "2025-2026"}
        defaultResponsibleName={defaults?.deceProfessional.fullName || session.user.name || ""}
      />
    </div>
  );
}

