import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { PageHeader } from "@/components/ui";
import type { CaseFileRow, StudentRow, CaseCorresponsibilityActRow } from "@/lib/types";
import { getCaseDocumentDefaults } from "@/lib/caseDocumentDefaults";
import CorresponsibilityActForm from "../../CorresponsibilityActForm";

export default async function EditarActaCorresponsabilidadPage({
  params,
}: {
  params: { id: string; actId: string };
}) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  const caseFile = db
    .prepare("SELECT * FROM case_files WHERE id = ? AND institution_id = ?")
    .get(params.id, institutionId) as CaseFileRow | undefined;
  if (!caseFile) notFound();

  const act = db
    .prepare("SELECT * FROM case_corresponsibility_acts WHERE id = ? AND case_file_id = ? AND institution_id = ?")
    .get(params.actId, caseFile.id, institutionId) as CaseCorresponsibilityActRow | undefined;
  if (!act) notFound();

  const student = db.prepare("SELECT * FROM students WHERE id = ?").get(caseFile.student_id) as StudentRow;
  const defaults = getCaseDocumentDefaults(caseFile.id, session, institutionId);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Editar Acta de Corresponsabilidad"
        description={`${student.full_name} — ${caseFile.code} | Modificación del acta oficial de compromisos`}
      />

      <CorresponsibilityActForm
        caseId={caseFile.id}
        caseCode={caseCodeFallback(caseFile.code)}
        studentName={act.student_name}
        studentGrade={act.student_grade}
        studentParallel={act.student_parallel}
        studentJornada={act.jornada}
        representativeName={act.representative_name}
        representativeIdNum={act.representative_id_num}
        representativeRelationship={act.representative_relationship}
        representativePhone={act.representative_phone}
        representativeAddress={act.representative_address}
        initialData={{
          ...act,
          dece_professional_name: act.dece_professional_name || defaults?.deceProfessional.fullName || session.user.name || "Profesional DECE",
          dece_professional_id_num: act.dece_professional_id_num || defaults?.deceProfessional.documentId || "",
          tutor_authority_name: act.tutor_authority_name || defaults?.authority.fullName || "",
        }}
        isEditing={true}
        actId={act.id}
      />
    </div>
  );
}

function caseCodeFallback(code: string) {
  return code || "CASO";
}
