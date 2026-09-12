import Link from "next/link";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { db } from "@/lib/db";
import { PageHeader, EmptyState, formatDate } from "@/components/ui";
import { parseAttendees } from "@/lib/meetingMinutes";
import type { MeetingMinutesRow } from "@/lib/types";

export default async function ActasReunionPage() {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);

  const actas = db
    .prepare(
      "SELECT * FROM meeting_minutes WHERE institution_id = ? ORDER BY COALESCE(meeting_date, created_at) DESC, created_at DESC"
    )
    .all(institutionId) as MeetingMinutesRow[];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Actas de reunión"
        description="Actas de las reuniones del DECE, por equipo o con otras personas, en el formato oficial del Ministerio de Educación."
        action={
          <Link href="/actas-reunion/nueva" className="btn-primary flex items-center gap-1.5 font-bold shadow-sm">
            <span>+</span> Nueva acta
          </Link>
        }
      />

      {actas.length === 0 ? (
        <EmptyState
          icon="📝"
          title="Todavía no hay actas de reunión"
          description="Registra la primera acta con asistentes, compromisos y firmas."
          action={
            <Link href="/actas-reunion/nueva" className="btn-primary">
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
                  <th>Código</th>
                  <th>Fecha</th>
                  <th>Tema</th>
                  <th>Responsable</th>
                  <th>Asistentes</th>
                  <th>Custodia y Archivo</th>
                  <th className="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {actas.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <Link
                        href={`/actas-reunion/${a.id}/imprimir`}
                        className="font-mono text-xs font-bold text-brand-700 hover:underline"
                      >
                        {a.meeting_code || "—"}
                      </Link>
                    </td>
                    <td className="text-xs font-semibold text-slate-900">{formatDate(a.meeting_date)}</td>
                    <td className="text-xs text-slate-700 max-w-xs truncate" title={a.meeting_topic || ""}>
                      {a.meeting_topic || "—"}
                    </td>
                    <td className="text-xs text-slate-700">{a.responsible_name || "—"}</td>
                    <td className="text-xs text-slate-500">{parseAttendees(a.attendees_json).length}</td>
                    <td>
                      {a.physical_file_ref ? (
                        <div className="space-y-1">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            a.physical_evidence_url || a.signature_type === "DIGITAL"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                              : "bg-amber-50 text-amber-800 border-amber-300"
                          }`}>
                            {a.physical_evidence_url || a.signature_type === "DIGITAL" ? "🟢 Conforme" : "🟡 En carpeta"}
                          </span>
                          <div className="text-[11px] text-slate-600 truncate max-w-[140px]" title={a.physical_file_ref}>
                            📁 {a.physical_file_ref}
                          </div>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          🔴 Pendiente
                        </span>
                      )}
                    </td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/actas-reunion/${a.id}/imprimir`}
                          className="text-xs text-brand-700 hover:underline font-semibold"
                        >
                          🖨️ Ver / imprimir
                        </Link>
                        <Link
                          href={`/actas-reunion/${a.id}/editar`}
                          className="text-xs text-slate-600 hover:text-slate-900 hover:underline"
                        >
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
