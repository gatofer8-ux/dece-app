import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { PageHeader } from "@/components/ui";
import type { CaseFileRow, StudentRow, ReferralRow } from "@/lib/types";
import { formatStudentCourseFull } from "@/lib/studentCourse";
import { getCaseDocumentDefaults } from "@/lib/caseDocumentDefaults";
import ViolenceReportForm from "./ViolenceReportForm";

export default async function NuevoInformeHechoViolenciaPage({ params }: { params: { id: string } }) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  const caseFile = db
    .prepare("SELECT * FROM case_files WHERE id = ? AND institution_id = ?")
    .get(params.id, institutionId) as CaseFileRow | undefined;
  if (!caseFile) notFound();
  const student = db.prepare("SELECT * FROM students WHERE id = ?").get(caseFile.student_id) as StudentRow;
  const defaults = getCaseDocumentDefaults(caseFile.id, session, institutionId);

  // Rector/a: primero el perfil de la institución, luego el usuario con rol AUTORIDAD.
  const authorityUser = db
    .prepare("SELECT name FROM users WHERE institution_id = ? AND role = 'AUTORIDAD' LIMIT 1")
    .get(institutionId) as { name: string } | undefined;
  const rectorName = defaults?.authority.fullName || authorityUser?.name || "";

  // Determinar rol del profesional: Si es ADMIN es Coordinador/a DECE
  const userDb = db.prepare("SELECT role, job_title FROM users WHERE id = ?").get(session.user.id) as { role?: string; job_title?: string } | undefined;
  const isCoordinator = session.user.role === "ADMIN" || /coord/i.test(userDb?.job_title || "");
  const defaultProfessionalRole = isCoordinator ? "COORDINADOR/A DECE" : (userDb?.job_title?.toUpperCase() || "ANALISTA DECE");

  // Buscar derivación asociada para precargar persona que refiere si existe
  const referral = db
    .prepare("SELECT * FROM referrals WHERE case_file_id = ? ORDER BY created_at DESC LIMIT 1")
    .get(caseFile.id) as ReferralRow | undefined;

  const formattedCourse = formatStudentCourseFull(student);

  return (
    <div>
      <PageHeader
        title="Informe de Reporte del Hecho de Violencia"
        description={`${student.full_name} — ${caseFile.code} (${formattedCourse})`}
      />
      <ViolenceReportForm
        caseId={caseFile.id}
        studentName={student.full_name}
        studentCourseFormatted={formattedCourse}
        defaultRepresentativeName={student.representative || ""}
        defaultRepresentativeRelationship={student.lives_with || "Representante legal"}
        defaultRepresentativeAddress={student.representative_address || student.address || ""}
        defaultRepresentativePhone={student.rep_phone || ""}
        defaultProfessionalName={defaults?.deceProfessional.fullName || session.user.name || ""}
        defaultProfessionalRole={defaultProfessionalRole}
        defaultRectoraName={rectorName || "Máxima Autoridad Institucional"}
        defaultInformantName={(referral as any)?.applicant_name || referral?.elaborated_by_name || ""}
        defaultInformantIdNumber={(referral as any)?.applicant_id_number || ""}
        defaultInformantRole={(referral as any)?.applicant_role || (referral ? "Docente tutor/a" : "")}
      />
    </div>
  );
}
