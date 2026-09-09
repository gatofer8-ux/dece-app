import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { PageHeader } from "@/components/ui";
import type { CaseFileRow, StudentRow, InstitutionRow } from "@/lib/types";
import SocializationActForm from "./SocializationActForm";

export default async function NuevaActaSocializacionPage({ params }: { params: { id: string } }) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  const caseFile = db
    .prepare("SELECT * FROM case_files WHERE id = ? AND institution_id = ?")
    .get(params.id, institutionId) as CaseFileRow | undefined;
  if (!caseFile) notFound();
  const student = db.prepare("SELECT * FROM students WHERE id = ?").get(caseFile.student_id) as StudentRow;
  const institution = db.prepare("SELECT * FROM institutions WHERE id = ?").get(institutionId) as InstitutionRow;

  return (
    <div>
      <PageHeader
        title="Acta de Socialización de Estudiantes en Situación de Vulnerabilidad"
        description={`${student.full_name} — ${caseFile.code} — ${institution.name}`}
      />
      <SocializationActForm caseId={caseFile.id} studentName={student.full_name} defaultPreparedBy={session.user.name || ""} />
    </div>
  );
}
