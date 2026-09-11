import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { formatDate, formatDateTime } from "@/components/ui";
import type { CaseFileRow, StudentRow, SocializationActRow, InstitutionRow } from "@/lib/types";
import {
  NORMATIVE_TEXT,
  CONFIDENTIALITY_TEXT,
  formatCurricularAdaptationText,
  parseJsonArray,
  type TeacherSignatureEntry,
} from "@/lib/socializationAct";
import { formatStudentCourseFull } from "@/lib/studentCourse";
import PrintButton from "@/components/PrintButton";
import DocumentHeader from "@/components/DocumentHeader";
import DocumentFooter from "@/components/DocumentFooter";

export default async function ImprimirActaSocializacionPage({ params }: { params: { id: string; actId: string } }) {
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
  const institution = db.prepare("SELECT * FROM institutions WHERE id = ?").get(institutionId) as InstitutionRow;

  const courseFormatted = formatStudentCourseFull(student);
  const agreements = parseJsonArray<string>(act.agreements);
  const rawTeacherSignatures = parseJsonArray<TeacherSignatureEntry>(act.teacher_signatures);
  const teacherSignatures =
    rawTeacherSignatures.length > 0
      ? rawTeacherSignatures
      : Array.from({ length: 18 }).map(() => ({ asignatura: "", docente: "" }));

  return (
    <div className="max-w-4xl mx-auto bg-white">
      {/* Barra superior con botón único de descarga Word y botón de edición */}
      <div className="no-print p-3 bg-slate-100 border-b border-slate-200 flex items-center justify-between mb-4 rounded-lg">
        <div className="flex items-center gap-3">
          <Link
            href={`/casos/${caseFile.id}`}
            className="text-xs text-slate-600 hover:text-slate-900 font-semibold"
          >
            ← Volver al caso
          </Link>
          <span className="text-slate-300">|</span>
          <Link
            href={`/casos/${caseFile.id}/socializacion/${act.id}/editar`}
            className="text-xs text-blue-700 hover:text-blue-900 font-semibold flex items-center gap-1"
          >
            ✏️ Editar datos
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={`/api/casos/${caseFile.id}/socializacion/${act.id}/export-word`}
            className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold px-3 py-1.5 rounded-md flex items-center gap-1.5 shadow-xs transition-colors"
          >
            📥 Descargar Word (.docx)
          </a>
          <PrintButton hideWordButton={true} className="p-0 bg-transparent border-none" />
        </div>
      </div>

      <div id="printable-content" className="p-8 print:p-0 text-sm">
        <DocumentHeader
          title="Acta de Socialización de Estudiantes en Situación de Vulnerabilidad"
          subtitle="Departamento de Consejería Estudiantil"
          institutionName={institution.name}
          sealImage={institution.seal_image}
        />
        <p className="text-center text-xs text-slate-500 mb-4">
          {institution.name} · Fecha del acta: {formatDate(act.act_date)}{act.act_place ? ` · Lugar: ${act.act_place}` : ""}
        </p>

        <section className="mb-4 border border-slate-300 p-3 text-xs text-slate-600">
          <p className="whitespace-pre-wrap">{NORMATIVE_TEXT}</p>
        </section>

        <section className="mb-4 text-sm">
          <p>
            Con este antecedente me permito indicar que, por medio de la presente acta, se da a conocer que a la
            estudiante/el estudiante <strong>{student.full_name}</strong>, quien cursa el <strong>{courseFormatted}</strong>, se encuentra recibiendo atención psicosocial por
            parte del Departamento de Consejería Estudiantil de la {institution.name}, por encontrarse en situación
            de vulnerabilidad; dificultades <strong>{act.vulnerability_type}</strong>.
          </p>
        </section>

        {/* Apartado: Estrategias para el acompañamiento socioemocional */}
        <section className="mb-4">
          <h2 className="font-semibold uppercase text-xs mb-2 bg-[#2F5496] text-white px-2.5 py-1 rounded-xs">
            ESTRATEGIAS PARA EL ACOMPAÑAMIENTO SOCIOEMOCIONAL
          </h2>
          <div className="border border-slate-200 rounded p-3 bg-slate-50 text-xs leading-relaxed whitespace-pre-wrap">
            {act.psychosocial_strategies || "Sin registrar."}
          </div>
        </section>

        <section className="mb-4">
          <h2 className="font-semibold uppercase text-xs mb-2 bg-[#2F5496] text-white px-2.5 py-1 rounded-xs">Acuerdos</h2>
          {agreements.length === 0 ? (
            <p className="text-slate-400">Sin registrar.</p>
          ) : (
            <ul className="list-disc pl-5 space-y-1 text-xs">
              {agreements.map((a, i) => (
                <li key={i}>{a}</li>
              ))}
              {formatCurricularAdaptationText(act.curricular_adaptation_grade) && (
                <li>
                  {formatCurricularAdaptationText(act.curricular_adaptation_grade)}
                </li>
              )}
            </ul>
          )}

          {/* Renglones para acuerdo a mano adicional */}
          <div className="mt-3 pt-2 text-xs border-t border-slate-200/60">
            <p className="font-semibold text-slate-700 mb-2">
              Acuerdo adicional acordado en la socialización (a completar a mano):
            </p>
            <div className="space-y-3 pt-1">
              <div className="border-b border-slate-300 h-4"></div>
              <div className="border-b border-slate-300 h-4"></div>
              <div className="border-b border-slate-300 h-4"></div>
            </div>
          </div>
        </section>

        <section className="mb-4">
          <h2 className="font-semibold uppercase text-xs mb-2 bg-[#2F5496] text-white px-2.5 py-1 rounded-xs">Firmas de responsabilidad</h2>
          <table className="w-full text-xs border border-slate-300 border-collapse">
            <thead>
              <tr className="bg-[#2F5496] text-white">
                <th className="border border-slate-300 px-2 py-1.5 text-left w-3/12">Asignatura</th>
                <th className="border border-slate-300 px-2 py-1.5 text-left w-4/12">Nombre del docente</th>
                <th className="border border-slate-300 px-2 py-1.5 text-left w-3/12">Firma</th>
                <th className="border border-slate-300 px-2 py-1.5 text-left w-2/12">Cédula</th>
              </tr>
            </thead>
            <tbody>
              {teacherSignatures.map((t, i) => (
                <tr key={i} className="h-8 print:h-9">
                  <td className="border border-slate-300 px-2 py-1.5 font-normal text-slate-800 align-middle">
                    {t.asignatura || <span className="text-slate-300">&nbsp;</span>}
                  </td>
                  <td className="border border-slate-300 px-2 py-1.5 font-normal text-slate-800 align-middle">
                    {t.docente || (t.asignatura ? <span className="text-slate-400">................................................</span> : <span className="text-slate-300">&nbsp;</span>)}
                  </td>
                  <td className="border border-slate-300 px-2 py-1.5 align-middle">&nbsp;</td>
                  <td className="border border-slate-300 px-2 py-1.5 align-middle">&nbsp;</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <p className="text-xs text-slate-500 mb-4">
          NOTA: El presente documento será enviado de manera digital a los correos institucionales.
        </p>

        <p className="text-xs text-slate-400 italic whitespace-pre-wrap border-t border-slate-200 pt-3 mb-6">
          {CONFIDENTIALITY_TEXT}
        </p>

        <section className="mb-4">
          <table className="w-full text-xs border border-slate-800 border-collapse">
            <thead>
              <tr className="bg-[#2F5496] text-white">
                <th className="border border-slate-400 px-2 py-1 text-left w-1/4">Rol</th>
                <th className="border border-slate-400 px-2 py-1 text-left">Nombre</th>
                <th className="border border-slate-400 px-2 py-1 text-left w-1/4">Firma</th>
                <th className="border border-slate-400 px-2 py-1 text-left w-1/6">Fecha</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-slate-400 px-2 py-1 font-medium">Desarrollo del documento</td>
                <td className="border border-slate-400 px-2 py-1">{act.prepared_by_name || "—"}</td>
                <td className="border border-slate-400 px-2 py-1">&nbsp;</td>
                <td className="border border-slate-400 px-2 py-1">{formatDate(act.act_date)}</td>
              </tr>
              <tr>
                <td className="border border-slate-400 px-2 py-1 font-medium">
                  Aprobación del documento<br /><span className="text-slate-400 font-normal">Rectora/Rector</span>
                </td>
                <td className="border border-slate-400 px-2 py-1">{act.approved_by_name || "—"}</td>
                <td className="border border-slate-400 px-2 py-1">&nbsp;</td>
                <td className="border border-slate-400 px-2 py-1">&nbsp;</td>
              </tr>
              <tr>
                <td className="border border-slate-400 px-2 py-1 font-medium">
                  Recibido por<br /><span className="text-slate-400 font-normal">{act.received_by_role || "—"}</span>
                </td>
                <td className="border border-slate-400 px-2 py-1">{act.received_by_name || "—"}</td>
                <td className="border border-slate-400 px-2 py-1">&nbsp;</td>
                <td className="border border-slate-400 px-2 py-1">&nbsp;</td>
              </tr>
            </tbody>
          </table>
        </section>

        <DocumentFooter institution={institution} />
      </div>
    </div>
  );
}
