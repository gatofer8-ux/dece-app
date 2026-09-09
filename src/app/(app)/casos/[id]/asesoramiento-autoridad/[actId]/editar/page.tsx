import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { PageHeader } from "@/components/ui";
import AuthorityAdvisoryEditForm from "./AuthorityAdvisoryEditForm";
import type { CaseFileRow, AuthorityAdvisoryActRow, StudentRow } from "@/lib/types";
import Link from "next/link";

export default async function EditarActaAsesoramientoAutoridadPage({
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
    .prepare("SELECT * FROM authority_advisory_acts WHERE id = ? AND case_file_id = ?")
    .get(params.actId, caseFile.id) as AuthorityAdvisoryActRow | undefined;
  if (!act) notFound();

  const student = db.prepare("SELECT * FROM students WHERE id = ?").get(caseFile.student_id) as StudentRow;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <PageHeader
          title="Editar Acta de Asesoramiento a la Máxima Autoridad"
          description={`${student.full_name} — ${caseFile.code}`}
        />
        <Link
          href={`/casos/${caseFile.id}/asesoramiento-autoridad/${act.id}/imprimir`}
          className="btn-secondary text-xs"
        >
          ← Volver al acta
        </Link>
      </div>
      <AuthorityAdvisoryEditForm caseId={caseFile.id} act={act} />
    </div>
  );
}
