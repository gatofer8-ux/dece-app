import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { PageHeader, Badge, formatDateTime } from "@/components/ui";
import type { AuditLogRow, UserRow } from "@/lib/types";

export default async function AuditoriaPage({
  searchParams,
}: {
  searchParams: { entidad?: string; usuario?: string };
}) {
  const session = await requireRole(["ADMIN", "DISTRITO"]);
  const isDistrito = session.user.role === "DISTRITO";

  let where = "WHERE 1=1";
  const params: any[] = [];
  if (!isDistrito) {
    // ADMIN solo ve la bitácora de su propia institución.
    where += " AND institution_id = ?";
    params.push(session.user.institution_id);
  }
  if (searchParams.entidad) {
    where += " AND entity_type = ?";
    params.push(searchParams.entidad);
  }
  if (searchParams.usuario) {
    where += " AND user_id = ?";
    params.push(searchParams.usuario);
  }

  const logs = db
    .prepare(`SELECT * FROM audit_logs ${where} ORDER BY timestamp DESC LIMIT 500`)
    .all(...params) as AuditLogRow[];

  const users = isDistrito
    ? (db.prepare("SELECT * FROM users ORDER BY name ASC").all() as UserRow[])
    : (db
        .prepare("SELECT * FROM users WHERE institution_id = ? ORDER BY name ASC")
        .all(session.user.institution_id) as UserRow[]);
  const userMap = new Map(users.map((u) => [u.id, u.name]));

  const entityTypes = db.prepare("SELECT DISTINCT entity_type FROM audit_logs ORDER BY entity_type").all() as { entity_type: string }[];

  const actionColor: Record<string, string> = {
    CREAR: "green",
    EDITAR: "blue",
    ELIMINAR: "red",
    LOGIN: "slate",
    LOGIN_FALLIDO: "red",
    EXPORTAR: "purple",
    DESACTIVAR: "amber",
    REACTIVAR: "green",
    RESETEAR_CLAVE: "amber",
  };

  return (
    <div>
      <PageHeader title="Bitácora de auditoría" description="Trazabilidad de todas las acciones realizadas en el sistema." />

      <form className="card p-4 mb-4 flex flex-wrap gap-3" method="get">
        <select name="entidad" defaultValue={searchParams.entidad || ""} className="select max-w-xs">
          <option value="">Todas las entidades</option>
          {entityTypes.map((e) => (
            <option key={e.entity_type} value={e.entity_type}>{e.entity_type}</option>
          ))}
        </select>
        <select name="usuario" defaultValue={searchParams.usuario || ""} className="select max-w-xs">
          <option value="">Todos los usuarios</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>
        <button type="submit" className="btn-secondary">Filtrar</button>
      </form>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-3">Fecha</th>
              <th className="text-left px-4 py-3">Usuario</th>
              <th className="text-left px-4 py-3">Acción</th>
              <th className="text-left px-4 py-3">Entidad</th>
              <th className="text-left px-4 py-3">Detalles</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {logs.map((l) => (
              <tr key={l.id}>
                <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{formatDateTime(l.timestamp)}</td>
                <td className="px-4 py-3">{l.user_id ? userMap.get(l.user_id) || "—" : "—"}</td>
                <td className="px-4 py-3">
                  <Badge color={actionColor[l.action] || "slate"}>{l.action}</Badge>
                </td>
                <td className="px-4 py-3 text-slate-600">{l.entity_type}</td>
                <td className="px-4 py-3 text-slate-500 text-xs max-w-xs truncate">{l.details || ""}</td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-400">Sin registros.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
