import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireSession, requireInstitutionId } from "@/lib/session";
import { canManageStudents, roleHomePath } from "@/lib/permissions";
import { PageHeader, Badge, EmptyState, formatDate } from "@/components/ui";
import { ACTIVITY_AXIS_LABELS, preventionThemeLabel, type ActivityRow, type UserRow } from "@/lib/types";

const AXIS_COLOR: Record<string, string> = { PROMOCION: "blue", PREVENCION: "amber", CONVIVENCIA: "green" };

export default async function ActividadesPage({
  searchParams,
}: {
  searchParams: { eje?: string };
}) {
  const session = await requireSession();
  if (session.user.role === "DISTRITO") redirect(roleHomePath(session.user.role));
  const institutionId = requireInstitutionId(session);
  const canManage = canManageStudents(session.user.role);

  let where = "WHERE institution_id = ?";
  const params: any[] = [institutionId];
  if (searchParams.eje) {
    where += " AND axis = ?";
    params.push(searchParams.eje);
  }

  const activities = db
    .prepare(`SELECT * FROM activities ${where} ORDER BY date DESC LIMIT 200`)
    .all(...params) as ActivityRow[];
  const users = db.prepare("SELECT * FROM users WHERE institution_id = ?").all(institutionId) as UserRow[];
  const userMap = new Map(users.map((u) => [u.id, u.name]));

  return (
    <div>
      <PageHeader
        title="Promoción, prevención y convivencia"
        description="Planificación y registro de actividades institucionales del DECE."
        action={
          canManage ? (
            <Link href="/actividades/nueva" className="btn-primary">
              + Nueva actividad
            </Link>
          ) : undefined
        }
      />

      <form className="card p-4 mb-4 flex gap-3" method="get">
        <select name="eje" defaultValue={searchParams.eje || ""} className="select max-w-xs">
          <option value="">Todos los ejes</option>
          {Object.entries(ACTIVITY_AXIS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <button type="submit" className="btn-secondary">Filtrar</button>
      </form>

      {activities.length === 0 ? (
        <EmptyState title="No hay actividades registradas" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {activities.map((a) => (
            <div key={a.id} className="card p-4">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-medium text-slate-800">{a.title}</h3>
                <Badge color={AXIS_COLOR[a.axis]}>{ACTIVITY_AXIS_LABELS[a.axis]}</Badge>
              </div>
              {a.prevention_theme && (
                <p className="text-xs font-medium text-amber-700 mb-1">{preventionThemeLabel(a.prevention_theme)}</p>
              )}
              {a.description && <p className="text-sm text-slate-600 mb-2">{a.description}</p>}
              <div className="text-xs text-slate-400 space-y-0.5">
                <div>Fecha: {formatDate(a.date)}</div>
                {a.target_audience && <div>Dirigido a: {a.target_audience}</div>}
                {a.courses && <div>Cursos: {a.courses}</div>}
                {a.participants_count != null && <div>Participantes: {a.participants_count}</div>}
                <div>Responsable: {userMap.get(a.responsible_id) || "—"}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
