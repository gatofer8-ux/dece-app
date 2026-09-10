import { notFound } from "next/navigation";
import { studentGradeOnly } from "@/lib/studentCourse";
import { db } from "@/lib/db";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { PageHeader } from "@/components/ui";
import type { CaseFileRow, StudentRow, CaseAlertNotificationRow } from "@/lib/types";
import { getCaseDocumentDefaults } from "@/lib/caseDocumentDefaults";
import AlertNotificationForm from "../../AlertNotificationForm";

export default async function EditarAlertaPage({
  params,
}: {
  params: { id: string; alertId: string };
}) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);

  const caseFile = db
    .prepare("SELECT * FROM case_files WHERE id = ? AND institution_id = ?")
    .get(params.id, institutionId) as CaseFileRow | undefined;
  if (!caseFile) notFound();

  const alert = db
    .prepare("SELECT * FROM case_alert_notifications WHERE id = ? AND case_file_id = ? AND institution_id = ?")
    .get(params.alertId, caseFile.id, institutionId) as CaseAlertNotificationRow | undefined;
  if (!alert) notFound();

  const student = db.prepare("SELECT * FROM students WHERE id = ?").get(caseFile.student_id) as StudentRow | undefined;
  const defaults = getCaseDocumentDefaults(caseFile.id, session, institutionId);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Editar Ficha de Notificación de Alerta"
        description={`${alert.student_name} — Caso #${caseFile.code} | Los cambios regenerarán instantáneamente el documento Word y la vista previa oficial.`}
      />

      <AlertNotificationForm
        caseId={caseFile.id}
        caseCode={caseFile.code}
        studentName={alert.student_name}
        studentIdNum={alert.student_id_num || ""}
        studentBirthDate={alert.student_birth_date || ""}
        studentAge={alert.student_age || ""}
        representativeName={alert.representative_name || ""}
        representativeAddress={alert.representative_address || ""}
        representativePhone={alert.representative_phone || ""}
        studentGrade={alert.student_grade || ""}
        studentParallel={alert.student_parallel || ""}
        studentJornada={alert.jornada || "MATUTINA"}
        docenteTutor={alert.docente_tutor || ""}
        defaultNotificadorNombre={alert.notificador_nombre || defaults?.deceProfessional.fullName || session.user.name || "Analista DECE"}
        defaultNotificadorCargo={alert.notificador_cargo || defaults?.deceProfessional.role || "Analista DECE"}
        defaultNotificadorContacto={alert.notificador_contacto || defaults?.deceProfessional.email || session.user.email || ""}
        initialData={alert}
        isEditing={true}
        alertId={alert.id}
      />
    </div>
  );
}
