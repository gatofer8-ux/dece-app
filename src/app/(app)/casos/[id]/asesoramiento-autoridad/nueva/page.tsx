import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { PageHeader } from "@/components/ui";
import type { CaseFileRow, StudentRow } from "@/lib/types";
import AuthorityAdvisoryForm from "./AuthorityAdvisoryForm";

export default async function NuevaActaAsesoramientoAutoridadPage({ params }: { params: { id: string } }) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  const caseFile = db
    .prepare("SELECT * FROM case_files WHERE id = ? AND institution_id = ?")
    .get(params.id, institutionId) as CaseFileRow | undefined;
  if (!caseFile) notFound();
  const student = db.prepare("SELECT * FROM students WHERE id = ?").get(caseFile.student_id) as StudentRow;

  return (
    <div>
      <PageHeader
        title="Acta de Asesoramiento a la Máxima Autoridad Institucional"
        description={`${student.full_name} — ${caseFile.code}`}
      />
      <AuthorityAdvisoryForm caseId={caseFile.id} defaultProfessionalName={session.user.name || ""} />
    </div>
  );
}
