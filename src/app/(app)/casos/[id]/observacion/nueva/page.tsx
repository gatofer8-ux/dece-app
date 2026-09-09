import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { PageHeader } from "@/components/ui";
import type { CaseFileRow, StudentRow } from "@/lib/types";
import { getDefaultOfficialObservationData } from "@/lib/observationSheet";
import ObservationSheetOfficialForm from "../ObservationSheetOfficialForm";

export default async function NuevaFichaObservacionPage({
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

  const studentCourse = `${student.course || ""} ${student.parallel || ""}`.trim() || "No especificado";
  const defaultData = getDefaultOfficialObservationData(session.user.name || "Profesional DECE");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ficha de Observación Oficial"
        description={`${student.full_name} — ${caseFile.code} | Formato Oficial del Ministerio de Educación`}
      />

      <ObservationSheetOfficialForm
        caseId={caseFile.id}
        caseCode={caseFile.code}
        studentName={student.full_name}
        studentCourse={studentCourse}
        defaultData={defaultData}
        isEditing={false}
      />
    </div>
  );
}
