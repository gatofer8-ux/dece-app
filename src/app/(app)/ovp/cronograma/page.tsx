import Link from "next/link";
import { requireSession, requireInstitutionId } from "@/lib/session";
import { canManageStudents } from "@/lib/permissions";
import { PageHeader, EmptyState, formatDate } from "@/components/ui";
import { listInterviewSchedules, parseParallels, parseEntries } from "@/lib/ovp/interviewSchedule";

export default async function CronogramaListPage() {
  const session = await requireSession();
  const institutionId = requireInstitutionId(session);
  const canManage = canManageStudents(session.user.role);

  const schedules = listInterviewSchedules(institutionId);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cronogramas de citas — Toma de decisión (OVP)"
        description='Cronogramas de la entrevista presencial con estudiante y representante para la "toma de decisión" de la figura profesional, con horarios asignados automáticamente por curso y paralelo.'
        action={
          canManage ? (
            <Link href="/ovp/cronograma/nueva" className="btn-primary flex items-center gap-1.5">
              <span>➕</span> Nuevo cronograma
            </Link>
          ) : undefined
        }
      />

      {schedules.length === 0 ? (
        <EmptyState
          icon="🗓️"
          title="Todavía no hay cronogramas generados"
          description='Crea uno seleccionando el curso, los paralelos, la fecha y la duración de cada turno; el sistema asigna la hora de cada estudiante automáticamente.'
          action={
            canManage ? (
              <Link href="/ovp/cronograma/nueva" className="btn-primary mt-2">+ Nuevo cronograma</Link>
            ) : undefined
          }
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Cronograma</th>
                  <th>Curso</th>
                  <th>Paralelos</th>
                  <th>Fecha</th>
                  <th>Estudiantes</th>
                  <th>Creado</th>
                  <th className="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {schedules.map((s) => {
                  const parallels = parseParallels(s.parallels_json);
                  const total = parseEntries(s.entries_json).length;
                  return (
                    <tr key={s.id}>
                      <td className="text-sm font-semibold text-slate-900">
                        <Link href={`/ovp/cronograma/${s.id}`} className="hover:underline text-brand-700">
                          {s.title}
                        </Link>
                      </td>
                      <td className="text-xs text-slate-600">{s.course}</td>
                      <td className="text-xs text-slate-600">
                        {parallels.map((p) => `“${p}”`).join(", ") || "—"}
                      </td>
                      <td className="text-xs text-slate-500 whitespace-nowrap">
                        {s.interview_date ? formatDate(s.interview_date) : "Por definir"}
                      </td>
                      <td className="text-xs text-slate-600">{total}</td>
                      <td className="text-xs text-slate-500 whitespace-nowrap">{formatDate(s.created_at)}</td>
                      <td className="text-right">
                        <Link
                          href={`/ovp/cronograma/${s.id}`}
                          className="px-2.5 py-1 text-xs font-medium bg-brand-50 text-brand-700 hover:bg-brand-100 rounded border border-brand-200"
                        >
                          Ver / descargar
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
