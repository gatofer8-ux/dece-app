import Link from "next/link";
import { redirect } from "next/navigation";
import { requireSession, requireInstitutionId } from "@/lib/session";
import { canManageStudents, roleHomePath } from "@/lib/permissions";
import { db } from "@/lib/db";
import { PageHeader, EmptyState, formatDate, Badge } from "@/components/ui";
import type { OvpSessionRow } from "@/lib/types";

export default async function OvpPage() {
  const session = await requireSession();
  if (session.user.role === "DISTRITO") redirect(roleHomePath(session.user.role));
  const institutionId = requireInstitutionId(session);
  const canManage = canManageStudents(session.user.role);

  const sessions = db
    .prepare("SELECT * FROM ovp_sessions WHERE institution_id = ? ORDER BY created_at DESC")
    .all(institutionId) as OvpSessionRow[];

  const counts = db
    .prepare(
      `SELECT session_id,
              SUM(CASE WHEN status='FINALIZADA' THEN 1 ELSE 0 END) AS done,
              COUNT(*) AS total
       FROM ovp_applications WHERE institution_id = ? GROUP BY session_id`
    )
    .all(institutionId) as { session_id: string; done: number; total: number }[];
  const cmap = new Map(counts.map((c) => [c.session_id, c]));

  const openCount = sessions.filter((s) => s.status === "ABIERTA").length;
  const totalDone = counts.reduce((a, c) => a + c.done, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Orientación Vocacional y Profesional (OVP)"
        description="Aplicación del Inventario de Preferencias Profesionales para Jóvenes (IPPJ – MINEDUC). Los estudiantes responden por un enlace, sin cuenta, y el sistema califica automáticamente."
        action={
          canManage ? (
            <Link href="/ovp/nueva" className="btn-primary flex items-center gap-1.5">
              <span>➕</span> Nueva aplicación
            </Link>
          ) : undefined
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-4">
          <div className="text-2xl font-bold text-slate-800">{sessions.length}</div>
          <div className="text-xs text-slate-500 font-medium">Aplicaciones creadas</div>
        </div>
        <div className="card p-4">
          <div className="text-2xl font-bold text-emerald-700">{openCount}</div>
          <div className="text-xs text-slate-500 font-medium">Abiertas para responder</div>
        </div>
        <div className="card p-4">
          <div className="text-2xl font-bold text-brand-700">{totalDone}</div>
          <div className="text-xs text-slate-500 font-medium">Cuestionarios finalizados</div>
        </div>
      </div>

      {sessions.length === 0 ? (
        <EmptyState
          icon="🧭"
          title="Todavía no hay aplicaciones del IPPJ"
          description="Crea una aplicación para un curso, comparte el enlace o el código con los estudiantes y revisa los perfiles vocacionales aquí."
          action={
            canManage ? (
              <Link href="/ovp/nueva" className="btn-primary mt-2">+ Nueva aplicación</Link>
            ) : undefined
          }
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Aplicación</th>
                  <th>Curso</th>
                  <th>Código</th>
                  <th>Estado</th>
                  <th>Avance</th>
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
                        <Link href={`/ovp/${s.id}`} className="hover:underline text-brand-700">
                          {s.title}
                        </Link>
                      </td>
                      <td className="text-xs text-slate-600">
                        {[s.course, s.parallel && `"${s.parallel}"`, s.jornada].filter(Boolean).join(" ") || "—"}
                      </td>
                      <td>
                        <span className="font-mono text-sm font-bold tracking-wider">{s.access_code}</span>
                      </td>
                      <td>
                        {s.status === "ABIERTA" ? (
                          <Badge color="green">Abierta</Badge>
                        ) : (
                          <Badge color="slate">Cerrada</Badge>
                        )}
                      </td>
                      <td className="text-xs text-slate-600">
                        {c ? `${c.done} finalizados / ${c.total} iniciados` : "—"}
                      </td>
                      <td className="text-xs text-slate-500 whitespace-nowrap">{formatDate(s.created_at)}</td>
                      <td className="text-right">
                        <Link
                          href={`/ovp/${s.id}`}
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
