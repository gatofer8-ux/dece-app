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
                  <th>Custodia y Archivo</th>
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
                    <td>
                      {s.signature_type === "DIGITAL" || s.physical_evidence_url ? (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          🟢 Conforme
                        </span>
                      ) : s.signature_type === "FISICA" || s.physical_file_ref ? (
                        <div className="text-xs text-amber-800 font-medium max-w-[150px] truncate" title={s.physical_file_ref || ""}>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 truncate">
                            📁 {s.physical_file_ref || "En carpeta"}
                          </span>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-rose-50 text-rose-700 border border-rose-200">
                          🔴 Pendiente
                        </span>
                      )}
                    </td>
                    <td className="text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          href={`/alertas-identificacion/${s.id}/imprimir`}
                          className="px-2 py-1 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded border border-slate-300"
                          title="Ver o Imprimir Acta"
                        >
                          👁️ Imprimir
                        </Link>
                        <a
                          href={`/api/alertas-identificacion/${s.id}/export-word`}
                          className="px-2 py-1 text-xs font-medium bg-blue-50 hover:bg-blue-100 text-blue-700 rounded border border-blue-200"
                          title="Descargar en Word oficial (.docx)"
                        >
                          📥 Word
                        </a>
                        <Link
                          href={`/alertas-identificacion/${s.id}`}
                          className="px-2.5 py-1 text-xs font-medium bg-brand-50 text-brand-700 hover:bg-brand-100 rounded border border-brand-200"
                        >
                          Ver acta
                        </Link>
                      </div>
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
