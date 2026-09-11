import Link from "next/link";
import { requireSession, requireInstitutionId } from "@/lib/session";
import { canManageStudents } from "@/lib/permissions";
import { db } from "@/lib/db";
import { PageHeader, EmptyState, formatDate, Badge } from "@/components/ui";
import { listEneisSessions } from "@/lib/eneis/eneisSessions";

export default async function EneisPage() {
  const session = await requireSession();
  const institutionId = requireInstitutionId(session);
  const canManage = canManageStudents(session.user.role);

  const sessions = listEneisSessions(institutionId);
  const counts = db
    .prepare(
      `SELECT session_id, COUNT(*) AS n, COUNT(DISTINCT docente_nombre) AS docentes,
              COALESCE(SUM(num_estudiantes_capacitados), 0) AS estudiantes
       FROM eneis_fichas WHERE institution_id = ? GROUP BY session_id`
    )
    .all(institutionId) as { session_id: string; n: number; docentes: number; estudiantes: number }[];
  const cmap = new Map(counts.map((c) => [c.session_id, c]));

  const totalFichas = counts.reduce((a, c) => a + c.n, 0);
  const openCount = sessions.filter((s) => s.status === "ABIERTA").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="ENEIS — Fichas de Aplicación"
        description='Estrategia Nacional de Educación Integral en Sexualidad. Los docentes entregan su ficha por un enlace, sin cuenta, y la recepción se arma sola.'
        action={
          <div className="flex items-center gap-2">
            <Link
              href="/eneis/encuestas"
              className="px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-semibold flex items-center gap-1.5"
            >
              <span>📊</span> Encuestas de percepción
            </Link>
            {canManage ? (
              <Link href="/eneis/nueva" className="btn-primary flex items-center gap-1.5">
                <span>➕</span> Nueva convocatoria
              </Link>
            ) : undefined}
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-4">
          <div className="text-2xl font-bold text-slate-800">{sessions.length}</div>
          <div className="text-xs text-slate-500 font-medium">Convocatorias creadas</div>
        </div>
        <div className="card p-4">
          <div className="text-2xl font-bold text-emerald-700">{openCount}</div>
          <div className="text-xs text-slate-500 font-medium">Abiertas para recibir fichas</div>
        </div>
        <div className="card p-4">
          <div className="text-2xl font-bold text-brand-700">{totalFichas}</div>
          <div className="text-xs text-slate-500 font-medium">Fichas recibidas</div>
        </div>
      </div>

      {sessions.length === 0 ? (
        <EmptyState
          icon="🧩"
          title="Todavía no hay convocatorias de fichas ENEIS"
          description="Crea una convocatoria (ej. por mes), comparte el enlace o el código con los docentes, y cada uno entrega su ficha ahí mismo."
          action={
            canManage ? (
              <Link href="/eneis/nueva" className="btn-primary mt-2">+ Nueva convocatoria</Link>
            ) : undefined
          }
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Convocatoria</th>
                  <th>Código</th>
                  <th>Estado</th>
                  <th>Fichas</th>
                  <th>Docentes</th>
                  <th>Estudiantes alcanzados</th>
                  <th>Creada</th>
                  <th className="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => {
                  const c = cmap.get(s.id);
                  return (
                    <tr key={s.id}>
                      <td className="text-sm font-semibold text-slate-900">
                        <Link href={`/eneis/${s.id}`} className="hover:underline text-brand-700">
                          {s.title}
                        </Link>
                      </td>
                      <td>
                        <span className="font-mono text-sm font-bold tracking-wider">{s.access_code}</span>
                      </td>
                      <td>
                        {s.status === "ABIERTA" ? <Badge color="green">Abierta</Badge> : <Badge color="slate">Cerrada</Badge>}
                      </td>
                      <td className="text-xs text-slate-600">{c?.n ?? 0}</td>
                      <td className="text-xs text-slate-600">{c?.docentes ?? 0}</td>
                      <td className="text-xs text-slate-600">{c?.estudiantes ?? 0}</td>
                      <td className="text-xs text-slate-500 whitespace-nowrap">{formatDate(s.created_at)}</td>
                      <td className="text-right">
                        <Link
                          href={`/eneis/${s.id}`}
                          className="px-2.5 py-1 text-xs font-medium bg-brand-50 text-brand-700 hover:bg-brand-100 rounded border border-brand-200"
                        >
                          Gestionar
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
