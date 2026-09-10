import { notFound } from "next/navigation";
import { studentGradeLabel } from "@/lib/studentCourse";
import { db } from "@/lib/db";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { getCaseDocumentDefaults } from "@/lib/caseDocumentDefaults";
import type { CaseFileRow, StudentRow, CaseActionRow, UserRow, InstitutionRow } from "@/lib/types";
import SeguimientoPrintView from "./SeguimientoPrintView";

export default async function ImprimirSeguimientoPage({ params }: { params: { id: string } }) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  const caseFile = db
    .prepare("SELECT * FROM case_files WHERE id = ? AND institution_id = ?")
    .get(params.id, institutionId) as CaseFileRow | undefined;
  if (!caseFile) notFound();

  const actions = db
    .prepare("SELECT * FROM case_actions WHERE case_file_id = ? ORDER BY date ASC, created_at ASC")
    .all(caseFile.id) as CaseActionRow[];
  const student = db.prepare("SELECT * FROM students WHERE id = ?").get(caseFile.student_id) as StudentRow;
  const institution = db.prepare("SELECT * FROM institutions WHERE id = ?").get(institutionId) as InstitutionRow;
  const users = db.prepare("SELECT * FROM users WHERE institution_id = ?").all(institutionId) as UserRow[];
  const userMap: Record<string, string> = {};
  users.forEach((u) => {
    userMap[u.id] = u.name;
  });

  const defaults = getCaseDocumentDefaults(caseFile.id, session, institutionId);

  const professional = {
    name: defaults?.deceProfessional.fullName || session.user.name || "Profesional DECE",
    role: defaults?.deceProfessional.role || "PROFESIONAL DECE",
    documentId: defaults?.deceProfessional.documentId || "",
  };

  const representative = {
    name: student.representative || "",
    documentId: student.representative_document_id || "",
    phone: student.rep_phone || "",
    relationship: "",
  };

  const studentGrade = studentGradeLabel(student) || [student.course, student.parallel].filter(Boolean).join(" ");

  return (
    <SeguimientoPrintView
      caseFile={caseFile}
      student={student}
      studentGrade={studentGrade}
      actions={actions}
      institution={institution}
      professional={professional}
      userMap={userMap}
      representative={representative}
    />
  );
}
