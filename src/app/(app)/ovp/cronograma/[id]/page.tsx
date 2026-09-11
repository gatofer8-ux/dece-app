import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession, requireInstitutionId } from "@/lib/session";
import { canManageStudents } from "@/lib/permissions";
import { PageHeader, formatDate } from "@/components/ui";
import DeleteButton from "@/components/DeleteButton";
import {
  getInterviewSchedule,
  parseEntries,
  parseParallels,
  groupEntriesByParallel,
} from "@/lib/ovp/interviewSchedule";
import { deleteInterviewScheduleAction } from "../actions";

export default async function CronogramaDetailPage({ params }: { params: { id: string } }) {
  const session = await requireSession();
  const institutionId = requireInstitutionId(session);
  const canManage = canManageStudents(session.user.role);

  const sched = getInterviewSchedule(params.id, institutionId);
  if (!sched) notFound();

  const entries = parseEntries(sched.entries_json);
  const parallels = parseParallels(sched.parallels_json);
  const groups = groupEntriesByParallel(entries);

  return (
    <div className="space-y-6">
      <PageHeader
        title={sched.title}
        description={`${sched.course} · Paralelos ${parallels.map((p) => `“${p}”`).join(", ")} · ${entries.length} estudiantes`}
        action={
          <div className="flex items-center gap-2">
            <a href={`/api/ovp/cronograma/${sched.id}/export-word`} className="btn-primary flex items-center gap-1.5">
              <span>⬇️</span> Descargar Word
            </a>
            {canManage && (
              <DeleteButton
                onDelete={async () => {
                  "use server";
                  return await deleteInterviewScheduleAction(sched.id);
                }}
                confirmMessage="¿Eliminar este cronograma? Esta acción no se puede deshacer."
                label="🗑️ Eliminar"
                redirectTo="/ovp/cronograma"
              />
            )}
          </div>
        }
      />

      <div className="card p-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
        <div>
          <div className="text-[11px] text-slate-400 font-medium uppercase">Fecha</div>
          <div className="font-semibold text-slate-800">
            {sched.interview_date ? formatDate(sched.interview_date) : "Por definir"}
          </div>
        </div>
        <div>
          <div className="text-[11px] text-slate-400 font-medium uppercase">Hora de inicio</div>
          <div className="font-semibold text-slate-800">{sched.start_time}</div>
        </div>
        <div>
          <div className="text-[11px] text-slate-400 font-medium uppercase">Duración / turno</div>
          <div className="font-semibold text-slate-800">
            {sched.slot_minutes} min · {sched.students_per_slot} est.
          </div>
        </div>
        <div>
          <div className="text-[11px] text-slate-400 font-medium uppercase">Lugar</div>
          <div className="font-semibold text-slate-800">{sched.location || "—"}</div>
        </div>
      </div>

      {groups.map((g) => (
        <div key={g.parallel} className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
            <h3 className="text-sm font-bold text-slate-800">
              Paralelo “{g.parallel}” — {g.entries.length} estudiantes
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>N°</th>
                  <th>Cédula</th>
                  <th>Nombres completos</th>
                  <th>Hora</th>
                </tr>
              </thead>
              <tbody>
                {g.entries.map((e) => (
                  <tr key={e.student_id}>
                    <td className="text-xs text-slate-500">{e.position}</td>
                    <td className="text-xs text-slate-600 font-mono">{e.document_id || "—"}</td>
                    <td className="text-sm text-slate-800">{e.full_name}</td>
                    <td className="text-sm font-bold text-brand-700">{e.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      <div>
        <Link href="/ovp/cronograma" className="text-xs text-slate-500 hover:underline">
          ← Volver a cronogramas
        </Link>
      </div>
    </div>
  );
}
