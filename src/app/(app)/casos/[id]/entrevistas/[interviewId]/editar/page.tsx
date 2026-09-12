import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { PageHeader } from "@/components/ui";
import { updateInterview } from "../../../../actions";
import type { CaseFileRow, StudentRow, CaseInterviewRow, UserRow } from "@/lib/types";
import InterviewForm from "../../InterviewForm";
import Link from "next/link";

export default async function EditarEntrevistaPage({ params }: { params: { id: string; interviewId: string } }) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  const caseFile = db
    .prepare("SELECT * FROM case_files WHERE id = ? AND institution_id = ?")
    .get(params.id, institutionId) as CaseFileRow | undefined;
  if (!caseFile) notFound();

  const interview = db
    .prepare("SELECT * FROM case_interviews WHERE id = ? AND case_file_id = ?")
    .get(params.interviewId, caseFile.id) as CaseInterviewRow | undefined;
  if (!interview) notFound();

  const student = db.prepare("SELECT * FROM students WHERE id = ?").get(caseFile.student_id) as StudentRow;

  const deceUser = interview.professional_id
    ? (db.prepare("SELECT * FROM users WHERE id = ?").get(interview.professional_id) as UserRow | undefined)
    : (db.prepare("SELECT * FROM users WHERE id = ?").get(session.user.id) as UserRow | undefined);

  const defaultDeceName = (deceUser?.title_prefix ? `${deceUser.title_prefix} ` : "") + (deceUser?.name || session.user.name || "Profesional DECE");
  const defaultDeceRole = deceUser?.job_title || "PROFESIONAL DECE";

  const boundUpdate = updateInterview.bind(null, caseFile.id, interview.id);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <PageHeader
          title="Editar Entrevista semiestructurada"
          description={`${student.full_name} — ${caseFile.code}`}
        />
        <Link
          href={`/casos/${caseFile.id}/entrevistas/${interview.id}/imprimir`}
          className="btn-secondary text-xs"
        >
          ← Volver a la ficha
        </Link>
      </div>

      <InterviewForm
        caseId={caseFile.id}
        student={student}
        interview={interview}
        defaultDeceName={defaultDeceName}
        defaultDeceRole={defaultDeceRole}
        action={boundUpdate}
        isEditing={true}
        cancelHref={`/casos/${caseFile.id}/entrevistas/${interview.id}/imprimir`}
      />
    </div>
  );
}
