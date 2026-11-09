import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { PageHeader } from "@/components/ui";
import { formatStudentCourseFull } from "@/lib/studentCourse";
import { getInterviewFormat } from "@/lib/entrevistaPreguntasFormat";
import type { CaseFileRow, StudentRow } from "@/lib/types";
import { createQuestionInterview } from "../actions";
import PreguntasInterviewForm from "../PreguntasInterviewForm";

export default async function NuevaEntrevistaPreguntasPage({ params }: { params: { id: string } }) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  const caseFile = db
    .prepare("SELECT * FROM case_files WHERE id = ? AND institution_id = ?")
    .get(params.id, institutionId) as CaseFileRow | undefined;
  if (!caseFile) notFound();
  const student = db.prepare("SELECT * FROM students WHERE id = ?").get(caseFile.student_id) as StudentRow;
  const format = getInterviewFormat(institutionId);

  return (
    <div className="space-y-4">
      <PageHeader title={format.structure.title} description={`${student.full_name} — ${caseFile.code}`} />
      <p className="text-xs text-slate-500">
        Las preguntas siguen el formato de tu institución.{" "}
        <Link href="/institucion/formatos" className="text-brand-700 underline">Cambiar formato</Link>
      </p>
      <PreguntasInterviewForm
        structure={format.structure}
        answers={{}}
        defaults={{
          name: student.full_name,
          course: formatStudentCourseFull(student) || `${student.course} ${student.parallel || ""}`.trim(),
          date: new Date().toISOString().slice(0, 10),
        }}
        action={createQuestionInterview.bind(null, caseFile.id)}
        cancelHref={`/casos/${caseFile.id}`}
      />
    </div>
  );
}
