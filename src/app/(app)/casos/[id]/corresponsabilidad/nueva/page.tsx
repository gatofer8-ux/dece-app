import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { PageHeader } from "@/components/ui";
import type { CaseFileRow, StudentRow, InstitutionRow } from "@/lib/types";
import { getCaseDocumentDefaults } from "@/lib/caseDocumentDefaults";
import CorresponsibilityActForm from "../CorresponsibilityActForm";

export default async function NuevaActaCorresponsabilidadPage({
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
  const institution = db.prepare("SELECT * FROM institutions WHERE id = ?").get(institutionId) as InstitutionRow;
  const defaults = getCaseDocumentDefaults(caseFile.id, session, institutionId);

  // Extraer ciudad sugerida de la institución
  const cityMatch = institution.address?.match(/(?:cantón|ciudad de|en)\s+([A-Za-zÁÉÍÓÚáéíóúñÑ]+)/i);
  const defaultCity = cityMatch ? cityMatch[1] : (institution.district?.includes("18D02") ? "Ambato" : "Ambato");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nueva Acta de Corresponsabilidad"
        description={`${student.full_name} — ${caseFile.code} | Suscripción de acuerdos y compromisos con representantes legales`}
      />

      <CorresponsibilityActForm
        caseId={caseFile.id}
        caseCode={caseFile.code}
        studentName={student.full_name}
        studentGrade={student.course}
        studentParallel={student.parallel || ""}
        studentJornada={student.jornada || "MATUTINA"}
        representativeName={student.representative || student.mother_name || student.father_name || ""}
        representativeIdNum={student.representative_document_id || student.mother_document_id || student.father_document_id || ""}
        representativePhone={student.rep_phone || student.mother_phone || student.father_phone || ""}
        representativeAddress={student.address || student.representative_address || ""}
        initialData={{
          city: defaultCity,
          dece_professional_name: defaults?.deceProfessional.fullName || session.user.name || "Profesional DECE",
          dece_professional_id_num: defaults?.deceProfessional.documentId || "",
        }}
        isEditing={false}
      />
    </div>
  );
}
