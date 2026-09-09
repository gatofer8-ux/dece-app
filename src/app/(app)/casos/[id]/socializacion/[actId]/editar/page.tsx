import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { PageHeader } from "@/components/ui";
import type { CaseFileRow, StudentRow, SocializationActRow } from "@/lib/types";
import SocializationActEditForm from "./SocializationActEditForm";

export default async function EditarActaSocializacionPage({ params }: { params: { id: string; actId: string } }) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);

  const caseFile = db
    .prepare("SELECT * FROM case_files WHERE id = ? AND institution_id = ?")
    .get(params.id, institutionId) as CaseFileRow | undefined;
  if (!caseFile) notFound();

  const act = db
    .prepare("SELECT * FROM socialization_acts WHERE id = ? AND case_file_id = ?")
    .get(params.actId, caseFile.id) as SocializationActRow | undefined;
  if (!act) notFound();

  const student = db.prepare("SELECT * FROM students WHERE id = ?").get(caseFile.student_id) as StudentRow;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <PageHeader
          title="Editar Acta de Socialización de Vulnerabilidad"
          description={`${student.full_name} — ${caseFile.code}`}
        />
        <Link href={`/casos/${caseFile.id}/socializacion/${act.id}/imprimir`} className="btn-secondary text-xs">
          ← Volver a la ficha
        </Link>
      </div>

      <SocializationActEditForm
        caseId={caseFile.id}
        studentName={student.full_name}
        act={act}
      />
    </div>
  );
}
