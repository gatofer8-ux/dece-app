import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { PageHeader } from "@/components/ui";
import { createInterview } from "../../../actions";
import type { CaseFileRow, StudentRow, UserRow } from "@/lib/types";
import InterviewForm from "../InterviewForm";

export default async function NuevaEntrevistaPage({ params }: { params: { id: string } }) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  const caseFile = db
    .prepare("SELECT * FROM case_files WHERE id = ? AND institution_id = ?")
    .get(params.id, institutionId) as CaseFileRow | undefined;
  if (!caseFile) notFound();
  const student = db.prepare("SELECT * FROM students WHERE id = ?").get(caseFile.student_id) as StudentRow;

  const deceUser = db.prepare("SELECT * FROM users WHERE id = ?").get(session.user.id) as UserRow | undefined;
  const defaultDeceName = (deceUser?.title_prefix ? `${deceUser.title_prefix} ` : "") + (deceUser?.name || session.user.name || "Profesional DECE");
  const defaultDeceRole = deceUser?.job_title || "PROFESIONAL DECE";

  const boundCreate = createInterview.bind(null, caseFile.id);

  return (
    <div>
      <PageHeader
        title="Entrevista semiestructurada"
        description={`${student.full_name} — ${caseFile.code}`}
      />
      <InterviewForm
        caseId={caseFile.id}
        student={student}
        defaultDeceName={defaultDeceName}
        defaultDeceRole={defaultDeceRole}
        action={boundCreate}
        cancelHref={`/casos/${caseFile.id}`}
      />
    </div>
  );
}
