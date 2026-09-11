import Link from "next/link";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { db } from "@/lib/db";
import { PageHeader, EmptyState, formatDate } from "@/components/ui";
import { parseEneisActaParticipants } from "@/lib/eneis/eneisActas";
import type { EneisActaRow } from "@/lib/types";

export default async function EneisActasPage() {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);

  const actas = db
    .prepare("SELECT * FROM eneis_actas WHERE institution_id = ? ORDER BY COALESCE(meeting_date, created_at) DESC, created_at DESC")
    .all(institutionId) as EneisActaRow[];

  return (
    <div className="space-y-6">
      <PageHeader
        title="ENEIS — Actas de reunión"
        description="Actas de seguimiento mensual de la Comisión/Red institucional ENEIS, en el formato propio usado por la institución."
        action={
          <Link href="/eneis/actas/nueva" className="btn-primary flex items-center gap-1.5 font-bold shadow-sm">
            <span>+</span> Nueva acta
          </Link>
        }
      />

      {actas.length === 0 ? (
        <EmptyState
          icon="📝"
          title="Todavía no hay actas ENEIS"
          description="Registra la primera acta con personas convocadas, desarrollo, compromisos y firmas."
          action={
            <Link href="/eneis/actas/nueva" className="btn-primary">
              + Nueva acta
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
                  <th>Tema</th>
                  <th>Lugar</th>
                  <th>Personas</th>
                  <th className="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {actas.map((a) => (
                  <tr key={a.id}>
                    <td className="text-xs font-semibold text-slate-900 whitespace-nowrap">{formatDate(a.meeting_date)}</td>
                    <td className="text-xs text-slate-700 max-w-xs truncate" title={a.tema || ""}>
                      <Link href={`/eneis/actas/${a.id}/imprimir`} className="hover:underline text-brand-700 font-semibold">
                        {a.tema || "—"}
                      </Link>
                    </td>
                    <td className="text-xs text-slate-600">{a.lugar || "—"}</td>
                    <td className="text-xs text-slate-500">{parseEneisActaParticipants(a.participants_json).length}</td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/eneis/actas/${a.id}/imprimir`} className="text-xs text-brand-700 hover:underline font-semibold">
                          🖨️ Ver / imprimir
                        </Link>
                        <Link href={`/eneis/actas/${a.id}/editar`} className="text-xs text-slate-600 hover:text-slate-900 hover:underline">
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
