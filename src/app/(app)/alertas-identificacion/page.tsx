import Link from "next/link";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { canManageStudents } from "@/lib/permissions";
import { PageHeader, EmptyState, formatDate, Badge } from "@/components/ui";
import { listSessions, listEntriesForSession } from "@/lib/alertIdentificationSessions";

export default async function AlertasIdentificacionPage() {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  const canManage = canManageStudents(session.user.role);

  const sessions = listSessions(institutionId);
  const counts = new Map(sessions.map((s) => [s.id, listEntriesForSession(s.id).length]));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Actas de Identificación de Alertas"
        description="Junta de curso: los docentes registran por un enlace, sin cuenta, los estudiantes en los que identificaron un riesgo psicosocial."
        action={
          canManage ? (
            <Link href="/alertas-identificacion/nueva" className="btn-primary flex items-center gap-1.5 font-bold shadow-sm">
              <span>+</span> Nueva acta
            </Link>
          ) : undefined
        }
      />

      {sessions.length === 0 ? (
        <EmptyState
          icon="🚩"
          title="Todavía no hay actas de identificación de alertas"
          description="Crea una para la próxima junta de curso y comparte el enlace con los docentes."
          action={
            canManage ? (
              <Link href="/alertas-identificacion/nueva" className="btn-primary mt-2">+ Nueva acta</Link>
            ) : undefined
          }
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Curso</th>
                  <th>Fecha</th>
                  <th>Código</th>
                  <th>Estado</th>
                  <th>Estudiantes en alerta</th>
                  <th className="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => (
                  <tr key={s.id}>
                    <td className="text-sm font-semibold text-slate-900">
                      <Link href={`/alertas-identificacion/${s.id}`} className="hover:underline text-brand-700">
                        {s.curso || "—"}
                      </Link>
                    </td>
                    <td className="text-xs text-slate-600 whitespace-nowrap">{formatDate(s.fecha)}</td>
                    <td>
                      <span className="font-mono text-sm font-bold tracking-wider">{s.access_code}</span>
                    </td>
                    <td>{s.status === "ABIERTA" ? <Badge color="green">Abierta</Badge> : <Badge color="slate">Cerrada</Badge>}</td>
                    <td className="text-xs text-slate-600">{counts.get(s.id) ?? 0}</td>
                    <td className="text-right">
                      <Link
                        href={`/alertas-identificacion/${s.id}`}
                        className="px-2.5 py-1 text-xs font-medium bg-brand-50 text-brand-700 hover:bg-brand-100 rounded border border-brand-200"
                      >
                        Ver acta
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
