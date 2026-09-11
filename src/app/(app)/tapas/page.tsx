import Link from "next/link";
import { redirect } from "next/navigation";
import { requireSession, requireInstitutionId } from "@/lib/session";
import { canManageStudents, roleHomePath } from "@/lib/permissions";
import { db } from "@/lib/db";
import { PageHeader, EmptyState, formatDate, Badge } from "@/components/ui";
import type { TapasSessionRow } from "@/lib/types";

export default async function TapasPage() {
  const session = await requireSession();
  if (session.user.role === "DISTRITO") redirect(roleHomePath(session.user.role));
  const institutionId = requireInstitutionId(session);
  const canManage = canManageStudents(session.user.role);

  const sessions = db
    .prepare("SELECT * FROM tapas_sessions WHERE institution_id = ? ORDER BY created_at DESC")
    .all(institutionId) as TapasSessionRow[];
  const counts = db
    .prepare(
      `SELECT session_id, SUM(CASE WHEN status='FINALIZADA' THEN 1 ELSE 0 END) AS done, COUNT(*) AS total
       FROM tapas_applications WHERE institution_id = ? GROUP BY session_id`
    )
    .all(institutionId) as { session_id: string; done: number; total: number }[];
  const cmap = new Map(counts.map((c) => [c.session_id, c]));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Juego de arquetipos (TaPas)"
        description="Herramienta de Orientación Vocacional y Profesional (Proyecto TaPas – VVOB / MinEduc). El estudiante clasifica 74 arquetipos, arma sus grupos de talentos y los ordena. Se juega por un enlace, sin cuenta."
        action={
          canManage ? (
            <div className="flex items-center gap-2">
              <Link href="/tapas/manual" className="btn-secondary text-xs">📘 Manual</Link>
              <Link href="/tapas/cartillas" className="btn-secondary text-xs">🃏 Cartillas</Link>
              <Link href="/tapas/nueva" className="btn-primary flex items-center gap-1.5">
                <span>➕</span> Nueva aplicación
              </Link>
            </div>
          ) : undefined
        }
      />

      {sessions.length === 0 ? (
        <EmptyState
          icon="🃏"
          title="Todavía no hay aplicaciones del juego de arquetipos"
          description="Crea una aplicación para un curso, comparte el enlace o el QR y revisa los perfiles de talentos aquí."
          action={
            canManage ? <Link href="/tapas/nueva" className="btn-primary mt-2">+ Nueva aplicación</Link> : undefined
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
                        <Link href={`/tapas/${s.id}`} className="hover:underline text-brand-700">{s.title}</Link>
                      </td>
                      <td className="text-xs text-slate-600">
                        {[s.course, s.parallel && `"${s.parallel}"`, s.jornada].filter(Boolean).join(" ") || "—"}
                      </td>
                      <td><span className="font-mono text-sm font-bold tracking-wider">{s.access_code}</span></td>
                      <td>{s.status === "ABIERTA" ? <Badge color="green">Abierta</Badge> : <Badge color="slate">Cerrada</Badge>}</td>
                      <td className="text-xs text-slate-600">{c ? `${c.done} finalizados / ${c.total} iniciados` : "—"}</td>
                      <td className="text-xs text-slate-500 whitespace-nowrap">{formatDate(s.created_at)}</td>
                      <td className="text-right">
                        <Link href={`/tapas/${s.id}`} className="px-2.5 py-1 text-xs font-medium bg-brand-50 text-brand-700 hover:bg-brand-100 rounded border border-brand-200">
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

      <p className="text-[11px] text-slate-400">
        Fuente: Juego de Tarjetas de Arquetipos, Proyecto TaPas (Talentos + Pasiones). VVOB Education for Development y
        TaPasCity. Manual de uso de las herramientas TaPas, VVOB, 1.ª edición, 2021. Distribución gratuita.
      </p>
    </div>
  );
}
