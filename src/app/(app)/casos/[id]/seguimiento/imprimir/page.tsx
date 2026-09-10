import { notFound } from "next/navigation";
import { studentGradeLabel } from "@/lib/studentCourse";
import { db } from "@/lib/db";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { formatDate, formatDateTime } from "@/components/ui";
import { INTERVENTION_TYPE_LABELS } from "@/lib/types";
import type { CaseFileRow, StudentRow, CaseActionRow, UserRow, InstitutionRow } from "@/lib/types";
import PrintButton from "@/components/PrintButton";
import DocumentHeader from "@/components/DocumentHeader";
import DocumentFooter from "@/components/DocumentFooter";

export default async function ImprimirSeguimientoPage({ params }: { params: { id: string } }) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  const caseFile = db
    .prepare("SELECT * FROM case_files WHERE id = ? AND institution_id = ?")
    .get(params.id, institutionId) as CaseFileRow | undefined;
  if (!caseFile) notFound();

  const actions = db
    .prepare("SELECT * FROM case_actions WHERE case_file_id = ? ORDER BY date ASC")
    .all(caseFile.id) as CaseActionRow[];
  const student = db.prepare("SELECT * FROM students WHERE id = ?").get(caseFile.student_id) as StudentRow;
  const institution = db.prepare("SELECT * FROM institutions WHERE id = ?").get(institutionId) as InstitutionRow;
  const users = db.prepare("SELECT * FROM users WHERE institution_id = ?").all(institutionId) as UserRow[];
  const userMap = new Map(users.map((u) => [u.id, u.name]));

  return (
    <div className="max-w-4xl mx-auto bg-white">
      <PrintButton />
      <div id="printable-content" className="p-8 print:p-0 text-sm">
        <DocumentHeader
          title="Seguimiento de la Atención Psicosocial"
          subtitle="Bitácora Oficial — Departamento de Consejería Estudiantil (DECE)"
          institutionName={institution?.name}
          sealImage={institution?.seal_image}
        />

        <section className="grid grid-cols-2 gap-x-8 gap-y-1 mb-4 text-xs mt-4">
          <div><strong>Estudiante:</strong> {student.full_name}</div>
          <div><strong>Código de caso:</strong> {caseFile.code}</div>
          <div><strong>Curso:</strong> {studentGradeLabel(student)}</div>
          <div><strong>Institución:</strong> {institution?.name || "—"}</div>
        </section>

        <p className="font-semibold text-xs uppercase mb-2">Acciones implementadas para la atención psicosocial</p>

        <table className="w-full text-xs border-collapse border border-slate-400">
          <thead>
            <tr className="bg-slate-100">
              <th className="border border-slate-400 p-1 w-32">Tipo de intervención realizada (individual, familiar o grupal, en crisis)</th>
              <th className="border border-slate-400 p-1">Descripción de la atención psicosocial realizada</th>
              <th className="border border-slate-400 p-1 w-32">Profesional que realiza la atención psicosocial</th>
              <th className="border border-slate-400 p-1 w-20">Fecha de atención</th>
              <th className="border border-slate-400 p-1 w-36">Observaciones</th>
            </tr>
          </thead>
          <tbody>
            {actions.map((a) => (
              <tr key={a.id}>
                <td className="border border-slate-400 p-1 align-top">
                  {a.intervention_type ? INTERVENTION_TYPE_LABELS[a.intervention_type] || a.intervention_type : a.type}
                </td>
                <td className="border border-slate-400 p-1 align-top whitespace-pre-wrap">{a.description}</td>
                <td className="border border-slate-400 p-1 align-top">{userMap.get(a.author_id) || ""}</td>
                <td className="border border-slate-400 p-1 align-top">{formatDate(a.date)}</td>
                <td className="border border-slate-400 p-1 align-top">{a.observations || ""}</td>
              </tr>
            ))}
            {actions.length === 0 && (
              <tr>
                <td colSpan={5} className="border border-slate-400 p-3 text-center text-slate-400">
                  Sin acciones registradas.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <DocumentFooter institution={institution} />
      </div>
    </div>
  );
}
