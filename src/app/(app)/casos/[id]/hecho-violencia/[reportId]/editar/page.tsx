import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { PageHeader } from "@/components/ui";
import type { CaseFileRow, StudentRow, ViolenceReportRow } from "@/lib/types";
import { formatStudentCourseFull } from "@/lib/studentCourse";
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
      />
    </div>
  );
}
