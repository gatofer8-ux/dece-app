import Link from "next/link";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { db } from "@/lib/db";
import { PageHeader, EmptyState, formatDate } from "@/components/ui";
import type { EneisFichaTecnicaRow } from "@/lib/types";

export default async function EneisFichaTecnicaPage() {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);

  const fichas = db
    .prepare("SELECT * FROM eneis_fichas_tecnicas WHERE institution_id = ? ORDER BY COALESCE(fecha_elaboracion, created_at) DESC, created_at DESC")
    .all(institutionId) as EneisFichaTecnicaRow[];

  return (
    <div className="space-y-6">
      <PageHeader
        title="ENEIS — Ficha técnica del equipo escolar"
        description="Planificación estratégica institucional de implementación de la Educación Integral en Sexualidad, en el formato propio usado por la institución."
        action={
          <Link href="/eneis/ficha-tecnica/nueva" className="btn-primary flex items-center gap-1.5 font-bold shadow-sm">
            <span>+</span> Nueva ficha
          </Link>
        }
      />

      {fichas.length === 0 ? (
        <EmptyState
          icon="🗂️"
          title="Todavía no hay fichas técnicas"
          description="Registra la ficha técnica del equipo escolar."
          action={
            <Link href="/eneis/ficha-tecnica/nueva" className="btn-primary">
              + Nueva ficha
            </Link>
          }
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Fecha de elaboración</th>
                  <th>Coordinación zonal / Distrito</th>
                  <th className="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {fichas.map((f) => (
                  <tr key={f.id}>
                    <td className="text-xs font-semibold text-slate-900 whitespace-nowrap">
                      <Link href={`/eneis/ficha-tecnica/${f.id}/imprimir`} className="hover:underline text-brand-700">
                        {formatDate(f.fecha_elaboracion)}
                      </Link>
                    </td>
                    <td className="text-xs text-slate-600">{f.coordinacion_zonal_distrito || "—"}</td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/eneis/ficha-tecnica/${f.id}/imprimir`} className="text-xs text-brand-700 hover:underline font-semibold">
                          🖨️ Ver / imprimir
                        </Link>
                        <Link href={`/eneis/ficha-tecnica/${f.id}/editar`} className="text-xs text-slate-600 hover:text-slate-900 hover:underline">
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
