import Link from "next/link";
import { db } from "@/lib/db";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { PageHeader, Badge, formatDate } from "@/components/ui";
import { ROLE_LABELS, type UserRow } from "@/lib/types";
import { toggleUserActive, deleteUser } from "./actions";
import ResetPasswordForm from "./ResetPasswordForm";
import ConfirmDeleteForm from "@/components/ConfirmDeleteForm";
import CoordinatorDelegationModal from "./CoordinatorDelegationModal";
import RevokeDelegationButton from "./RevokeDelegationButton";

export default async function UsuariosPage() {
  const session = await requireRole(["ADMIN"]);
  const institutionId = requireInstitutionId(session);
  const isSuperadmin = session.user.role === "SUPERADMIN";

  const users = db
    .prepare("SELECT * FROM users WHERE institution_id = ? ORDER BY name ASC")
    .all(institutionId) as UserRow[];

  const delegations = db
    .prepare(`
      SELECT d.*, 
             COALESCE(u.name, d.delegated_user_name) as delegated_name,
             u.email as delegated_email,
             COALESCE(del.name, d.original_user_name, 'Coordinador') as delegator_name
      FROM dece_coordinator_delegations d
      LEFT JOIN users u ON u.id = d.delegated_user_id
      LEFT JOIN users del ON del.id = COALESCE(d.delegator_user_id, d.original_user_id, d.created_by_id)
      WHERE d.institution_id = ?
      ORDER BY d.created_at DESC
    `)
    .all(institutionId) as any[];

  const activeDelegation = delegations.find(
    (d) => d.is_active === 1 && (!d.end_date || new Date(d.end_date + "T23:59:59") >= new Date())
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Usuarios y Equipo DECE"
        description="Gestiona el acceso del personal al sistema y la delegación de responsabilidades de coordinación."
        action={
          <div className="flex items-center gap-2">
            <CoordinatorDelegationModal users={users} currentUserId={session.user.id} />
            {isSuperadmin && (
              <Link href="/usuarios/nuevo" className="btn-primary">
                + Nuevo usuario
              </Link>
            )}
          </div>
        }
      />

      {/* Banner de delegación activa si existe */}
      {activeDelegation && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-lg shrink-0">
              ⭐
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-indigo-950">
                  Coordinación Delegada en curso
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 uppercase tracking-wide">
                  {activeDelegation.delegation_type}
                </span>
              </div>
              <p className="text-xs text-indigo-800 mt-0.5">
                Delegado a: <strong className="font-semibold">{activeDelegation.delegated_name}</strong> ({activeDelegation.delegated_email})
                {activeDelegation.delegation_type === "TEMPORAL" && (
                  <> · Período: {formatDate(activeDelegation.start_date)} {activeDelegation.end_date ? `hasta ${formatDate(activeDelegation.end_date)}` : "(hasta revocación manual)"}</>
                )}
              </p>
              <p className="text-xs text-indigo-600 italic mt-0.5">
                Motivo: "{activeDelegation.reason}"
              </p>
            </div>
          </div>
          <div className="shrink-0 self-end sm:self-center">
            <RevokeDelegationButton delegationId={activeDelegation.id} />
          </div>
        </div>
      )}

      {/* Tabla de usuarios del equipo */}
      <div className="card overflow-x-auto">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-sm text-slate-800">Personal Registrado</h2>
          <span className="text-xs text-slate-500">{users.length} usuarios</span>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-3">Nombre</th>
              <th className="text-left px-4 py-3">Correo</th>
              <th className="text-left px-4 py-3">Rol</th>
              <th className="text-left px-4 py-3">Estado</th>
              <th className="text-left px-4 py-3">Creado</th>
              <th className="text-left px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((u) => {
              const isDelegatedUser = activeDelegation?.delegated_user_id === u.id;
              return (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">
                    <div className="flex items-center gap-2">
                      <span>{u.name}</span>
                      {isDelegatedUser && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700 border border-indigo-200">
                          ⭐ Coord. Delegado
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{u.email}</td>
                  <td className="px-4 py-3 text-slate-600">
                    <span className="inline-flex items-center gap-1">
                      {ROLE_LABELS[u.role] || u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {u.active ? <Badge color="green">Activo</Badge> : <Badge color="slate">Inactivo</Badge>}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{formatDate(u.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <form action={async () => { "use server"; await toggleUserActive(u.id, !u.active); }}>
                        <button className="text-xs text-brand-700 hover:underline">
                          {u.active ? "Desactivar" : "Reactivar"}
                        </button>
                      </form>
                      <ResetPasswordForm userId={u.id} />
                      {isSuperadmin && (
                        <ConfirmDeleteForm
                          action={deleteUser.bind(null, u.id)}
                          confirmMessage={`¿Eliminar definitivamente a ${u.name}? Esta acción no se puede deshacer. Si el usuario ya tiene actividad registrada, el sistema rechazará el borrado y te sugerirá desactivarlo en su lugar.`}
                        />
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Historial de delegaciones */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h2 className="font-semibold text-sm text-slate-800 flex items-center gap-2">
              <span>📋</span> Historial de Delegaciones de Coordinación
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Trazabilidad de transferencias y encargos de coordinación DECE realizados en esta institución.
            </p>
          </div>
          <span className="text-xs text-slate-500">{delegations.length} registros</span>
        </div>

        {delegations.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            No se han registrado delegaciones de coordinación en esta institución.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase border-b border-slate-100">
                <tr>
                  <th className="text-left px-4 py-2.5">Delegado a</th>
                  <th className="text-left px-4 py-2.5">Tipo</th>
                  <th className="text-left px-4 py-2.5">Período</th>
                  <th className="text-left px-4 py-2.5">Motivo</th>
                  <th className="text-left px-4 py-2.5">Delegado por</th>
                  <th className="text-left px-4 py-2.5">Estado</th>
                  <th className="text-left px-4 py-2.5">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {delegations.map((d) => {
                  const isExpired = d.delegation_type === "TEMPORAL" && d.end_date && new Date(d.end_date + "T23:59:59") < new Date();
                  const isCurrentlyActive = d.is_active === 1 && !isExpired;

                  return (
                    <tr key={d.id} className="hover:bg-slate-50/80">
                      <td className="px-4 py-2.5 font-medium text-slate-900">
                        {d.delegated_name || d.delegated_user_id}
                        <div className="text-[11px] text-slate-400 font-normal">{d.delegated_email}</div>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          d.delegation_type === "PERMANENTE"
                            ? "bg-purple-100 text-purple-700"
                            : "bg-blue-100 text-blue-700"
                        }`}>
                          {d.delegation_type}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-slate-600">
                        <div>Desde: {formatDate(d.start_date)}</div>
                        <div className="text-slate-400">
                          Hasta: {d.end_date ? formatDate(d.end_date) : "Reversión manual"}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-slate-700 max-w-xs truncate" title={d.reason}>
                        {d.reason}
                      </td>
                      <td className="px-4 py-2.5 text-slate-600">
                        {d.delegator_name || "Coordinador"}
                        <div className="text-[10px] text-slate-400">{formatDate(d.created_at)}</div>
                      </td>
                      <td className="px-4 py-2.5">
                        {isCurrentlyActive ? (
                          <Badge color="green">Activa</Badge>
                        ) : isExpired ? (
                          <Badge color="slate">Vencida</Badge>
                        ) : (
                          <Badge color="amber">Revertida</Badge>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        {isCurrentlyActive && (
                          <RevokeDelegationButton delegationId={d.id} />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
