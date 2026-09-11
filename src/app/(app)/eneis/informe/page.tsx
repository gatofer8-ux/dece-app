import Link from "next/link";
import { requireSession, requireInstitutionId } from "@/lib/session";
import { canManageStudents } from "@/lib/permissions";
import { PageHeader, EmptyState, formatDate, Badge } from "@/components/ui";
import { listInformes } from "@/lib/eneis/eneisInformes";

export default async function EneisInformesPage() {
  const session = await requireSession();
  const institutionId = requireInstitutionId(session);
  const canManage = canManageStudents(session.user.role);

  const informes = listInformes(institutionId);

  return (
    <div className="space-y-6">
      <PageHeader
        title="ENEIS — Informe trimestral/semestral"
        description="Arma el informe para el Distrito jalando automáticamente las tablas de actividades y cobertura desde las fichas ya cargadas, sin volver a compilarlas a mano."
        action={
          canManage ? (
            <Link href="/eneis/informe/nuevo" className="btn-primary flex items-center gap-1.5">
              <span>➕</span> Nuevo informe
            </Link>
          ) : undefined
        }
      />

      {informes.length === 0 ? (
        <EmptyState
          icon="📄"
          title="Todavía no hay informes generados"
          description="Elige el período (trimestre o semestre) y el sistema arma las tablas de actividades y cobertura solas, a partir de las fichas ya recibidas."
          action={
            canManage ? (
              <Link href="/eneis/informe/nuevo" className="btn-primary mt-2">+ Nuevo informe</Link>
            ) : undefined
          }
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Informe</th>
                  <th>Tipo</th>
                  <th>Período</th>
                  <th>Creado</th>
                  <th className="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {informes.map((inf) => (
                  <tr key={inf.id}>
                    <td className="text-sm font-semibold text-slate-900">
                      <Link href={`/eneis/informe/${inf.id}`} className="hover:underline text-brand-700">
                        {inf.titulo}
                      </Link>
                    </td>
                    <td>
                      <Badge color={inf.tipo === "SEMESTRAL" ? "green" : "slate"}>{inf.tipo}</Badge>
                    </td>
                    <td className="text-xs text-slate-600 whitespace-nowrap">
                      {formatDate(inf.periodo_desde)} — {formatDate(inf.periodo_hasta)}
                    </td>
                    <td className="text-xs text-slate-500 whitespace-nowrap">{formatDate(inf.created_at)}</td>
                    <td className="text-right">
                      <Link
                        href={`/eneis/informe/${inf.id}`}
                        className="px-2.5 py-1 text-xs font-medium bg-brand-50 text-brand-700 hover:bg-brand-100 rounded border border-brand-200"
                      >
                        Ver / descargar
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
