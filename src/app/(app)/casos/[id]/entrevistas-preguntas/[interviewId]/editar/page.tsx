import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { PageHeader } from "@/components/ui";
import { parseAnswers, parseStructure } from "@/lib/entrevistaPreguntas";
import { updateQuestionInterview } from "../../actions";
import PreguntasInterviewForm from "../../PreguntasInterviewForm";

export default async function EditarEntrevistaPreguntasPage({
  params,
}: {
  params: { id: string; interviewId: string };
}) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  const row = db
    .prepare("SELECT * FROM student_question_interviews WHERE id = ? AND case_file_id = ? AND institution_id = ?")
    .get(params.interviewId, params.id, institutionId) as
    | {
        interviewee_name: string | null;
        course: string | null;
        application_date: string | null;
        structure_json: string;
        answers_json: string;
      }
    | undefined;
  if (!row) notFound();

  const structure = parseStructure(row.structure_json);

  return (
    <div className="space-y-4">
      <PageHeader title={structure.title} description={`Editar entrevista — ${row.interviewee_name || "estudiante"}`} />
      <PreguntasInterviewForm
        structure={structure}
        answers={parseAnswers(row.answers_json)}
        defaults={{ name: row.interviewee_name || "", course: row.course || "", date: row.application_date || "" }}
        action={updateQuestionInterview.bind(null, params.id, params.interviewId)}
        cancelHref={`/casos/${params.id}`}
        isEditing
      />
    </div>
  );
}
