import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { PageHeader, Badge, formatDateTime } from "@/components/ui";
import type { AuditLogRow, UserRow } from "@/lib/types";

export default async function AuditoriaPage({
  searchParams,
}: {
  searchParams: { entidad?: string; usuario?: string; institucion?: string; accion?: string; q?: string };
}) {
  const session = await requireRole(["SUPERADMIN", "ADMIN", "DISTRITO"]);
  const isSuperadmin = session.user.role === "SUPERADMIN";
  const isDistrito = session.user.role === "DISTRITO";
  const canViewAllInstitutions = isSuperadmin || isDistrito;

  let where = "WHERE 1=1";
  const params: any[] = [];

  if (!canViewAllInstitutions) {
    // ADMIN solo ve la bitácora de su propia institución.
    where += " AND institution_id = ?";
    params.push(session.user.institution_id);
  } else if (searchParams.institucion) {
    if (searchParams.institucion === "GLOBAL_DISTRITO") {
      where += " AND institution_id IS NULL";
    } else {
      where += " AND institution_id = ?";
      params.push(searchParams.institucion);
    }
  }

  if (searchParams.entidad) {
    where += " AND entity_type = ?";
    params.push(searchParams.entidad);
  }
  if (searchParams.usuario) {
    where += " AND user_id = ?";
    params.push(searchParams.usuario);
  }
  if (searchParams.accion) {
    where += " AND action = ?";
    params.push(searchParams.accion);
  }
  if (searchParams.q?.trim()) {
    const query = `%${searchParams.q.trim()}%`;
    where += " AND (details LIKE ? OR entity_id LIKE ?)";
    params.push(query, query);
  }

  const logs = db
    .prepare(`SELECT * FROM audit_logs ${where} ORDER BY timestamp DESC LIMIT 500`)
    .all(...params) as AuditLogRow[];

  const institutions = canViewAllInstitutions
    ? (db.prepare("SELECT id, name, amie_code FROM institutions ORDER BY name ASC").all() as { id: string; name: string; amie_code: string | null }[])
    : [];
  const instMap = new Map(institutions.map((i) => [i.id, i.name]));

  let users: UserRow[] = [];
  if (canViewAllInstitutions) {
    if (searchParams.institucion && searchParams.institucion !== "GLOBAL_DISTRITO") {
      users = db.prepare("SELECT * FROM users WHERE institution_id = ? ORDER BY name ASC").all(searchParams.institucion) as UserRow[];
    } else if (searchParams.institucion === "GLOBAL_DISTRITO") {
      users = db.prepare("SELECT * FROM users WHERE institution_id IS NULL ORDER BY name ASC").all() as UserRow[];
    } else {
      users = db.prepare("SELECT * FROM users ORDER BY name ASC").all() as UserRow[];
    }
  } else {
    users = db
      .prepare("SELECT * FROM users WHERE institution_id = ? ORDER BY name ASC")
      .all(session.user.institution_id) as UserRow[];
  }
  const userMap = new Map(users.map((u) => [u.id, u.name]));

  const entityTypes = db.prepare("SELECT DISTINCT entity_type FROM audit_logs ORDER BY entity_type").all() as { entity_type: string }[];
  const actionsList = db.prepare("SELECT DISTINCT action FROM audit_logs ORDER BY action").all() as { action: string }[];

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
      <PageHeader title="Bitácora de auditoría" description="Trazabilidad y control de todas las acciones realizadas en el sistema." />

      <form className="card p-4 mb-4 flex flex-wrap gap-3 items-center" method="get">
        {canViewAllInstitutions && (
          <select name="institucion" defaultValue={searchParams.institucion || ""} className="select max-w-xs text-xs">
            <option value="">Todas las instituciones</option>
            <option value="GLOBAL_DISTRITO">Nivel Central / Distrito (Sin IE)</option>
            {institutions.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name} {i.amie_code ? `(${i.amie_code})` : ""}
              </option>
            ))}
          </select>
        )}

        <select name="usuario" defaultValue={searchParams.usuario || ""} className="select max-w-xs text-xs">
          <option value="">Todos los usuarios</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>

        <select name="accion" defaultValue={searchParams.accion || ""} className="select max-w-xs text-xs">
          <option value="">Todas las acciones</option>
          {actionsList.map((a) => (
            <option key={a.action} value={a.action}>{a.action}</option>
          ))}
        </select>

        <select name="entidad" defaultValue={searchParams.entidad || ""} className="select max-w-xs text-xs">
          <option value="">Todas las entidades</option>
          {entityTypes.map((e) => (
            <option key={e.entity_type} value={e.entity_type}>{e.entity_type}</option>
          ))}
        </select>

        <input
          type="text"
          name="q"
          defaultValue={searchParams.q || ""}
          placeholder="Buscar en detalles..."
          className="input max-w-xs text-xs"
        />

        <button type="submit" className="btn-secondary text-xs">Filtrar</button>

        {(searchParams.institucion || searchParams.usuario || searchParams.accion || searchParams.entidad || searchParams.q) && (
          <a href="/auditoria" className="text-xs text-slate-500 hover:text-slate-800 font-semibold underline ml-1">
            Limpiar filtros
          </a>
        )}
      </form>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-3 whitespace-nowrap">Fecha y Hora</th>
              {canViewAllInstitutions && <th className="text-left px-4 py-3">Institución</th>}
              <th className="text-left px-4 py-3">Usuario</th>
              <th className="text-left px-4 py-3">Acción</th>
              <th className="text-left px-4 py-3">Entidad</th>
              <th className="text-left px-4 py-3">Detalles</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {logs.map((l) => (
              <tr key={l.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 text-slate-600 whitespace-nowrap font-mono">{formatDateTime(l.timestamp)}</td>
                {canViewAllInstitutions && (
                  <td className="px-4 py-3 font-medium text-slate-700">
                    {l.institution_id ? instMap.get(l.institution_id) || "—" : "Nivel Central / Distrito"}
                  </td>
                )}
                <td className="px-4 py-3 font-semibold text-slate-900">{l.user_id ? userMap.get(l.user_id) || "—" : "—"}</td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <Badge color={actionColor[l.action] || "slate"}>{l.action}</Badge>
                </td>
                <td className="px-4 py-3 text-slate-600 font-medium">
                  {l.entity_type} {l.entity_id ? <span className="font-mono text-[10px] text-slate-400">({l.entity_id.slice(0, 8)})</span> : ""}
                </td>
                <td className="px-4 py-3 text-slate-500 max-w-md leading-relaxed">{l.details || "—"}</td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr><td colSpan={canViewAllInstitutions ? 6 : 5} className="px-4 py-8 text-center text-slate-400">Sin registros de auditoría encontrados.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
