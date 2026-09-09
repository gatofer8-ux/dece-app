import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { PageHeader } from "@/components/ui";
import StudentForm from "../../StudentForm";
import { updateStudent } from "../../actions";
import type { StudentRow } from "@/lib/types";

export default async function EditarEstudiantePage({ params }: { params: { id: string } }) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  const student = db
    .prepare("SELECT * FROM students WHERE id = ? AND institution_id = ?")
    .get(params.id, institutionId) as StudentRow | undefined;
  if (!student) notFound();

  const action = updateStudent.bind(null, student.id);

  return (
    <div>
      <PageHeader title={`Editar: ${student.full_name}`} />
      <StudentForm student={student} action={action} />
    </div>
  );
}
