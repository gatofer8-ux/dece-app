import Link from "next/link";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { db } from "@/lib/db";
import { PageHeader, EmptyState, formatDate } from "@/components/ui";
import type { EneisDiagnosticoRow } from "@/lib/types";

export default async function EneisDiagnosticoPage() {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);

  const diagnosticos = db
    .prepare("SELECT * FROM eneis_diagnosticos WHERE institution_id = ? ORDER BY COALESCE(fecha, created_at) DESC, created_at DESC")
    .all(institutionId) as EneisDiagnosticoRow[];

  return (
    <div className="space-y-6">
      <PageHeader
        title="ENEIS — Diagnóstico institucional"
        description="Informe del Diagnóstico Institucional sobre la ENEIS, en el formato propio usado por la institución."
        action={
          <Link href="/eneis/diagnostico/nuevo" className="btn-primary flex items-center gap-1.5 font-bold shadow-sm">
            <span>+</span> Nuevo diagnóstico
          </Link>
        }
      />

      {diagnosticos.length === 0 ? (
        <EmptyState
          icon="🩺"
          title="Todavía no hay diagnósticos institucionales"
          description="Registra el diagnóstico institucional sobre la ENEIS."
          action={
            <Link href="/eneis/diagnostico/nuevo" className="btn-primary">
              + Nuevo diagnóstico
            </Link>
          }
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Distrito</th>
                  <th className="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {diagnosticos.map((d) => (
                  <tr key={d.id}>
                    <td className="text-xs font-semibold text-slate-900 whitespace-nowrap">
                      <Link href={`/eneis/diagnostico/${d.id}/imprimir`} className="hover:underline text-brand-700">
                        {formatDate(d.fecha)}
                      </Link>
                    </td>
                    <td className="text-xs text-slate-600">{d.distrito || "—"}</td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/eneis/diagnostico/${d.id}/imprimir`} className="text-xs text-brand-700 hover:underline font-semibold">
                          🖨️ Ver / imprimir
                        </Link>
                        <Link href={`/eneis/diagnostico/${d.id}/editar`} className="text-xs text-slate-600 hover:text-slate-900 hover:underline">
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
