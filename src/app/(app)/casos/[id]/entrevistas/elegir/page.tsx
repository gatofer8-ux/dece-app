import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { PageHeader } from "@/components/ui";
import { getInterviewFormat } from "@/lib/entrevistaPreguntasFormat";
import type { CaseFileRow, StudentRow } from "@/lib/types";

export default async function ElegirFormatoEntrevistaPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { cita?: string };
}) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  const caseFile = db
    .prepare("SELECT * FROM case_files WHERE id = ? AND institution_id = ?")
    .get(params.id, institutionId) as CaseFileRow | undefined;
  if (!caseFile) notFound();
  const student = db.prepare("SELECT * FROM students WHERE id = ?").get(caseFile.student_id) as StudentRow;
  const format = getInterviewFormat(institutionId);

  const cita = searchParams.cita ? `?cita=${encodeURIComponent(searchParams.cita)}` : "";
  const questionCount = format.structure.sections
    .filter((s) => s.visible)
    .reduce((n, s) => n + s.questions.filter((q) => q.visible).length, 0);

  return (
    <div className="space-y-5 max-w-3xl">
      <PageHeader title="Nueva entrevista" description={`${student.full_name} — ${caseFile.code}. ¿Qué formato vas a usar?`} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href={`/casos/${caseFile.id}/entrevistas/nueva${cita}`}
          className="card p-5 hover:border-brand-400 hover:shadow-md transition-all block"
        >
          <div className="text-sm font-semibold text-slate-800 mb-1">Entrevista semiestructurada</div>
          <p className="text-xs text-slate-500">
            Formato oficial del sistema: resumen de lo tratado, situación del estudiante, recomendaciones y compromiso,
            con firmas del profesional, el representante y el estudiante.
          </p>
        </Link>

        <Link
          href={`/casos/${caseFile.id}/entrevistas-preguntas/nueva`}
          className="card p-5 hover:border-brand-400 hover:shadow-md transition-all block"
        >
          <div className="text-sm font-semibold text-slate-800 mb-1">{format.structure.title}</div>
          <p className="text-xs text-slate-500">
            Cuestionario por secciones y preguntas con el formato de tu institución ({questionCount} preguntas). Se exporta
            a Word con tu membrete o con tu propia plantilla.
          </p>
        </Link>
      </div>

      <p className="text-xs text-slate-500">
        ¿Tu institución usa otro formato?{" "}
        <Link href="/institucion/formatos" className="text-brand-700 underline">Configura el membrete, las preguntas o sube tu plantilla</Link>.
      </p>
    </div>
  );
}
