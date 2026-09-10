import { notFound } from "next/navigation";
import { studentGradeLabel } from "@/lib/studentCourse";
import { db } from "@/lib/db";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { PageHeader } from "@/components/ui";
import type { CaseFileRow, StudentRow, CaseObservationSheetRow } from "@/lib/types";
import { parseOfficialObservationData } from "@/lib/observationSheet";
import { getCaseDocumentDefaults } from "@/lib/caseDocumentDefaults";
import ObservationSheetOfficialForm from "../../ObservationSheetOfficialForm";

export default async function EditarFichaObservacionPage({
  params,
}: {
  params: { id: string; sheetId: string };
}) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  const caseFile = db
    .prepare("SELECT * FROM case_files WHERE id = ? AND institution_id = ?")
    .get(params.id, institutionId) as CaseFileRow | undefined;
  if (!caseFile) notFound();

  const sheet = db
    .prepare("SELECT * FROM case_observation_sheets WHERE id = ? AND case_file_id = ? AND institution_id = ?")
    .get(params.sheetId, caseFile.id, institutionId) as CaseObservationSheetRow | undefined;
  if (!sheet) notFound();

  const student = db.prepare("SELECT * FROM students WHERE id = ?").get(caseFile.student_id) as StudentRow;
  const studentCourse = `${student.course || ""} ${student.parallel || ""}`.trim() || "No especificado";
  const defaults = getCaseDocumentDefaults(caseFile.id, session, institutionId);
  const defaultObserver = defaults?.deceProfessional.fullName || session.user.name || undefined;
  const parsedData = parseOfficialObservationData(sheet.observation_data, defaultObserver);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Editar Ficha de Observación Oficial"
        description={`${student.full_name} — ${caseFile.code} | Edición de Ficha Ministerial`}
      />

      <ObservationSheetOfficialForm
        caseId={caseFile.id}
        caseCode={caseFile.code}
        studentName={student.full_name}
        studentCourse={studentCourse}
        defaultData={parsedData}
        sheetId={sheet.id}
        isEditing={true}
      />
    </div>
  );
}
