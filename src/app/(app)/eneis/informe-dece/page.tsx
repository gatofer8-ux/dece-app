import Link from "next/link";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { db } from "@/lib/db";
import { PageHeader, EmptyState } from "@/components/ui";
import { formatPeriodoDece } from "@/lib/eneis/eneisInformeDece";
import type { EneisInformeDeceRow } from "@/lib/types";

export default async function EneisInformeDecePage() {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);

  const informes = db
    .prepare("SELECT * FROM eneis_informes_dece WHERE institution_id = ? ORDER BY periodo DESC")
    .all(institutionId) as EneisInformeDeceRow[];

  return (
    <div className="space-y-6">
      <PageHeader
        title="ENEIS — Informe mensual de actividades DECE"
        description='Formato propio "INFORME DE ACTIVIDADES Nº ..." con las 4 actividades mensuales requeridas por la ENEIS.'
        action={
          <Link href="/eneis/informe-dece/nueva" className="btn-primary flex items-center gap-1.5 font-bold shadow-sm">
            <span>+</span> Nuevo informe
          </Link>
        }
      />

      {informes.length === 0 ? (
        <EmptyState
          icon="📋"
          title="Todavía no hay informes mensuales"
          description="Registra el primer informe de actividades DECE del mes."
          action={
            <Link href="/eneis/informe-dece/nueva" className="btn-primary">
              + Nuevo informe
            </Link>
          }
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Periodo</th>
                  <th className="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {informes.map((inf, i) => (
                  <tr key={inf.id}>
                    <td className="text-sm font-semibold text-slate-900">
                      <Link href={`/eneis/informe-dece/${inf.id}/imprimir`} className="hover:underline text-brand-700">
                        Nº {informes.length - i} — {formatPeriodoDece(inf.periodo)}
                      </Link>
                    </td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/eneis/informe-dece/${inf.id}/imprimir`} className="text-xs text-brand-700 hover:underline font-semibold">
                          🖨️ Ver / imprimir
                        </Link>
                        <Link href={`/eneis/informe-dece/${inf.id}/editar`} className="text-xs text-slate-600 hover:text-slate-900 hover:underline">
                          ✏️ Editar
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
