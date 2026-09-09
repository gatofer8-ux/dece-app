import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { formatDate, formatDateTime } from "@/components/ui";
import type { CaseFileRow, StudentRow, CaseCarePlanRow, InstitutionRow, UserRow } from "@/lib/types";
import { INTERVENTION_TYPE_OPTIONS, parseCarePlanActions, parseStringList } from "@/lib/carePlan";
import { formatStudentCourseFull } from "@/lib/studentCourse";
import PrintButton from "@/components/PrintButton";
import DocumentHeader from "@/components/DocumentHeader";
import DocumentFooter from "@/components/DocumentFooter";

export default async function ImprimirPlanAtencionPage({ params }: { params: { id: string; planId: string } }) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  const caseFile = db
    .prepare("SELECT * FROM case_files WHERE id = ? AND institution_id = ?")
    .get(params.id, institutionId) as CaseFileRow | undefined;
  if (!caseFile) notFound();

  const plan = db
    .prepare("SELECT * FROM case_care_plans WHERE id = ? AND case_file_id = ?")
    .get(params.planId, caseFile.id) as CaseCarePlanRow | undefined;
  if (!plan) notFound();

  const student = db.prepare("SELECT * FROM students WHERE id = ?").get(caseFile.student_id) as StudentRow;
  const institution = db.prepare("SELECT * FROM institutions WHERE id = ?").get(institutionId) as InstitutionRow;
  const professional = plan.professional_id
    ? (db.prepare("SELECT * FROM users WHERE id = ?").get(plan.professional_id) as UserRow | undefined)
    : undefined;

  let analystRole = "ANALISTA DECE";
  if (professional) {
    analystRole =
      professional.role === "ADMIN" || /coord/i.test(professional.job_title || "")
        ? "COORDINADOR/A DECE"
        : (professional.job_title || "ANALISTA DECE");
  } else if (session.user.role === "ADMIN") {
    analystRole = "COORDINADOR/A DECE";
  }

  const courseFormatted = formatStudentCourseFull(student);
  const interventionTypes = parseStringList(plan.intervention_types);
  const actions = parseCarePlanActions(plan.actions);

  return (
    <div className="max-w-3xl mx-auto bg-white">
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
            href={`/casos/${caseFile.id}/atencion/${plan.id}/editar`}
            className="text-xs text-blue-700 hover:text-blue-900 font-semibold flex items-center gap-1"
          >
            ✏️ Editar datos
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={`/api/casos/${caseFile.id}/atencion/${plan.id}/export-word`}
            className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold px-3 py-1.5 rounded-md flex items-center gap-1.5 shadow-xs transition-colors"
          >
            📥 Descargar Word (.docx)
          </a>
          <PrintButton hideWordButton={true} className="p-0 bg-transparent border-none" />
        </div>
      </div>

      <div id="printable-content" className="p-8 print:p-0 text-sm">
        <DocumentHeader
          title="Plan de Atención Psicosocial y Seguimiento"
          subtitle="Departamento de Consejería Estudiantil"
          institutionName={institution.name}
          sealImage={institution.seal_image}
        />

        <table className="w-full text-xs border border-slate-800 border-collapse mb-4 mt-4">
          <tbody>
            <tr>
              <td className="border border-slate-400 px-2 py-1 font-medium w-1/4">Estudiante a atender</td>
              <td className="border border-slate-400 px-2 py-1">{student.full_name}</td>
              <td className="border border-slate-400 px-2 py-1 font-medium w-1/4">Grado/curso</td>
              <td className="border border-slate-400 px-2 py-1">{courseFormatted}</td>
            </tr>
            <tr>
              <td className="border border-slate-400 px-2 py-1 font-medium">Jornada</td>
              <td className="border border-slate-400 px-2 py-1">{plan.jornada || "—"}</td>
              <td className="border border-slate-400 px-2 py-1 font-medium">Fecha de elaboración</td>
              <td className="border border-slate-400 px-2 py-1">{formatDate(plan.plan_date)}</td>
            </tr>
            <tr>
              <td className="border border-slate-400 px-2 py-1 font-medium">Docente tutor/a</td>
              <td className="border border-slate-400 px-2 py-1">{plan.tutor_name || "—"}</td>
              <td className="border border-slate-400 px-2 py-1 font-medium">Profesional DECE</td>
              <td className="border border-slate-400 px-2 py-1">{professional?.name || "—"}</td>
            </tr>
          </tbody>
        </table>

        <section className="mb-4">
          <h2 className="font-semibold uppercase text-xs mb-2 bg-[#2F5496] text-white px-2.5 py-1 rounded-xs">Resumen del diagnóstico situacional</h2>
          <p className="whitespace-pre-wrap">{plan.diagnosis_summary}</p>
        </section>

        <section className="mb-4">
          <h2 className="font-semibold uppercase text-xs mb-2 bg-[#2F5496] text-white px-2.5 py-1 rounded-xs">Tipo(s) de intervención psicosocial</h2>
          <ul className="space-y-0.5">
            {INTERVENTION_TYPE_OPTIONS.map((o) => (
              <li key={o.value} className="flex items-start gap-2">
                <span className="w-4 shrink-0">{interventionTypes.includes(o.value) ? "☑" : "☐"}</span>
                <span className={interventionTypes.includes(o.value) ? "font-medium" : "text-slate-500"}>{o.label}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="mb-6">
          <h2 className="font-semibold uppercase text-xs mb-2 bg-[#2F5496] text-white px-2.5 py-1 rounded-xs">Acciones para implementar</h2>
          {actions.length === 0 ? (
            <p className="text-slate-400">Sin acciones registradas.</p>
          ) : (
            <table className="w-full text-xs border border-slate-300 border-collapse">
              <thead>
                <tr className="bg-[#2F5496] text-white">
                  <th className="border border-slate-300 px-2 py-1 text-left">Acción</th>
                  <th className="border border-slate-300 px-2 py-1 text-left">Profesional</th>
                  <th className="border border-slate-300 px-2 py-1 text-left">Tiempo</th>
                  <th className="border border-slate-300 px-2 py-1 text-left">Observaciones</th>
                </tr>
              </thead>
              <tbody>
                {actions.map((a, i) => (
                  <tr key={i}>
                    <td className="border border-slate-300 px-2 py-1">{a.accion}</td>
                    <td className="border border-slate-300 px-2 py-1">{a.profesional || "—"}</td>
                    <td className="border border-slate-300 px-2 py-1">{a.tiempo || "—"}</td>
                    <td className="border border-slate-300 px-2 py-1">{a.observaciones || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="grid grid-cols-1 gap-6 text-center mt-10 max-w-xs mx-auto">
          <div className="border-t border-slate-500 pt-1">
            Firma {analystRole}<br />{professional?.name || "—"}
          </div>
        </section>

        <DocumentFooter institution={institution} />
      </div>
    </div>
  );
}
