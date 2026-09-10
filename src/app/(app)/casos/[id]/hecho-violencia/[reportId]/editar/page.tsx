import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { PageHeader } from "@/components/ui";
import type { CaseFileRow, StudentRow, ViolenceReportRow } from "@/lib/types";
import { formatStudentCourseFull } from "@/lib/studentCourse";
import { getCaseDocumentDefaults } from "@/lib/caseDocumentDefaults";
import ViolenceReportEditForm from "./ViolenceReportEditForm";

export default async function EditarReporteHechoViolenciaPage({ params }: { params: { id: string; reportId: string } }) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);

  const caseFile = db
    .prepare("SELECT * FROM case_files WHERE id = ? AND institution_id = ?")
    .get(params.id, institutionId) as CaseFileRow | undefined;
  if (!caseFile) notFound();

  const report = db
    .prepare("SELECT * FROM violence_reports WHERE id = ? AND case_file_id = ?")
    .get(params.reportId, caseFile.id) as ViolenceReportRow | undefined;
  if (!report) notFound();

  const student = db.prepare("SELECT * FROM students WHERE id = ?").get(caseFile.student_id) as StudentRow;
  const defaults = getCaseDocumentDefaults(caseFile.id, session, institutionId);

  const authorityUser = db
    .prepare("SELECT name FROM users WHERE institution_id = ? AND role = 'AUTORIDAD' LIMIT 1")
    .get(institutionId) as { name: string } | undefined;
  const rectorName = defaults?.authority.fullName || authorityUser?.name || "";

  const userDb = db.prepare("SELECT role, job_title FROM users WHERE id = ?").get(session.user.id) as { role?: string; job_title?: string } | undefined;
  const isCoordinator = session.user.role === "ADMIN" || /coord/i.test(userDb?.job_title || "");
  const defaultProfessionalRole = isCoordinator ? "COORDINADOR/A DECE" : (userDb?.job_title?.toUpperCase() || defaults?.deceProfessional.role || "ANALISTA DECE");

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <PageHeader
          title="Editar Reporte del Hecho de Violencia"
          description={`${student.full_name} — ${caseFile.code}`}
        />
        <Link href={`/casos/${caseFile.id}/hecho-violencia/${report.id}/imprimir`} className="btn-secondary text-xs">
          ← Volver al reporte
        </Link>
      </div>

      <ViolenceReportEditForm
        caseId={caseFile.id}
        studentName={student.full_name}
        studentCourseFormatted={formatStudentCourseFull(student)}
        report={report}
        defaultRepresentativeName={student.representative || ""}
        defaultRepresentativeAddress={student.address || ""}
        defaultRepresentativePhone={student.rep_phone || ""}
        defaultProfessionalName={defaults?.deceProfessional.fullName || session.user.name || ""}
        defaultProfessionalRole={defaultProfessionalRole}
        defaultRectoraName={rectorName || "Máxima Autoridad Institucional"}
      />
    </div>
  );
}
