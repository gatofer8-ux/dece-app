import { notFound } from "next/navigation";
import { studentGradeOnly } from "@/lib/studentCourse";
import { db } from "@/lib/db";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { PageHeader } from "@/components/ui";
import type { CaseFileRow, StudentRow, InstitutionRow } from "@/lib/types";
import { getCaseDocumentDefaults } from "@/lib/caseDocumentDefaults";
import AlertNotificationForm from "../AlertNotificationForm";

export default async function NuevaAlertaPage({
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

  const student = db.prepare("SELECT * FROM students WHERE id = ?").get(caseFile.student_id) as StudentRow;
  const defaults = getCaseDocumentDefaults(caseFile.id, session, institutionId);

  // Extraer tutor del curso si existe en cuotas institucionales
  let tutorName = "";
  try {
    const quota = db
      .prepare("SELECT tutor_name FROM institution_course_quotas WHERE institution_id = ? AND course_name = ?")
      .get(institutionId, student.course) as { tutor_name: string } | undefined;
    if (quota?.tutor_name) tutorName = quota.tutor_name;
  } catch {}

  // Calcular edad si fecha de nacimiento existe
  let ageStr = "";
  if (student.birth_date) {
    const birthYear = new Date(student.birth_date).getFullYear();
    const currYear = new Date().getFullYear();
    if (!isNaN(birthYear) && currYear > birthYear) {
      ageStr = `${currYear - birthYear} años`;
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ficha de Notificación de Alerta"
        description={`${student.full_name} — ${caseFile.code} | Detección temprana y derivación institucional al DECE`}
      />

      <AlertNotificationForm
        caseId={caseFile.id}
        caseCode={caseFile.code}
        studentName={student.full_name}
        studentIdNum={student.document_id || ""}
        studentBirthDate={student.birth_date || ""}
        studentAge={ageStr}
        representativeName={student.representative || student.mother_name || student.father_name || ""}
        representativeAddress={student.address || student.representative_address || ""}
        representativePhone={student.rep_phone || student.mother_phone || student.father_phone || ""}
        studentGrade={studentGradeOnly(student)}
        studentParallel={student.parallel || ""}
        studentJornada={student.jornada || "MATUTINA"}
        docenteTutor={tutorName}
        defaultNotificadorNombre={defaults?.deceProfessional.fullName || session.user.name || "Analista DECE"}
        defaultNotificadorCargo={defaults?.deceProfessional.role || "Analista DECE"}
        defaultNotificadorContacto={session.user.email || ""}
        isEditing={false}
      />
    </div>
  );
}
