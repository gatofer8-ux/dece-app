import Link from "next/link";
import { redirect } from "next/navigation";
import { requireSession, requireInstitutionId } from "@/lib/session";
import { canManageStudents, roleHomePath } from "@/lib/permissions";
import { db } from "@/lib/db";
import { PageHeader, EmptyState, formatDate } from "@/components/ui";
import DeleteButton from "@/components/DeleteButton";
import { deleteCircleFicha } from "./actions";
import type { RestorativeCircleFichaRow } from "@/lib/types";

export default async function FichasCirculoPage() {
  const session = await requireSession();
  if (session.user.role === "DISTRITO") redirect(roleHomePath(session.user.role));
  const institutionId = requireInstitutionId(session);
  const canManage = canManageStudents(session.user.role);

  const fichas = db
    .prepare(
      "SELECT * FROM restorative_circle_fichas WHERE institution_id = ? ORDER BY COALESCE(circle_date, created_at) DESC, created_at DESC"
    )
    .all(institutionId) as RestorativeCircleFichaRow[];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fichas de círculo restaurativo"
        description="Planificación de círculos restaurativos: diagnóstico, objetivos, declaraciones, preguntas restaurativas (con apoyo de IA) e informe final."
        action={
          <div className="flex items-center gap-2">
            <Link href="/circulos-restaurativos" className="btn-secondary text-xs">
              Consentimientos
            </Link>
            {canManage && (
              <Link href="/circulos-restaurativos/fichas/nueva" className="btn-primary flex items-center gap-1.5">
                <span>➕</span> Nueva ficha
              </Link>
            )}
          </div>
        }
      />

      {fichas.length === 0 ? (
        <EmptyState
          icon="⭕"
          title="Todavía no hay fichas de círculo restaurativo"
          description="Crea la primera ficha para planificar el círculo con su problemática, objetivos y preguntas restaurativas."
          action={
            canManage ? (
              <Link href="/circulos-restaurativos/fichas/nueva" className="btn-primary mt-2">
                + Nueva ficha
              </Link>
            ) : undefined
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
                  <th>Problemática</th>
                  <th>Participantes</th>
                  <th>Tipo</th>
                  <th>Facilitador/a</th>
                  <th>Custodia y Archivo</th>
                  <th className="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {fichas.map((f) => (
                  <tr key={f.id}>
                    <td>
                      <Link
                        href={`/circulos-restaurativos/fichas/${f.id}/imprimir`}
                        className="font-mono text-xs font-bold text-brand-700 hover:underline"
                      >
                        {f.ficha_code || "—"}
                      </Link>
                      {f.case_file_id && (
                        <Link
                          href={`/casos/${f.case_file_id}`}
                          className="block text-[11px] text-brand-600 hover:underline"
                        >
                          📁 Caso
                        </Link>
                      )}
                    </td>
                    <td className="text-xs font-semibold text-slate-900">{formatDate(f.circle_date)}</td>
                    <td className="text-xs text-slate-700 max-w-xs truncate" title={f.problematica || ""}>
                      {f.problematica || "—"}
                    </td>
                    <td className="text-xs text-slate-600 max-w-[14rem] truncate" title={f.participant_type || ""}>
                      {f.participant_type || "—"}
                    </td>
                    <td className="text-xs text-slate-600">{f.circle_type || "—"}</td>
                    <td className="text-xs text-slate-600">{f.facilitator_name || "—"}</td>
                    <td>
                      {f.physical_evidence_url || (f.physical_file_ref && f.signature_type === "DIGITAL") ? (
                        <div className="space-y-0.5">
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                            🟢 Conforme
                          </span>
                          {f.physical_file_ref && (
                            <div className="text-[10px] text-slate-500 font-mono truncate max-w-[130px]" title={f.physical_file_ref}>
                              📁 {f.physical_file_ref}
                            </div>
                          )}
                        </div>
                      ) : f.physical_file_ref ? (
                        <div className="space-y-0.5">
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                            🟡 En carpeta
                          </span>
                          <div className="text-[10px] text-slate-500 font-mono truncate max-w-[130px]" title={f.physical_file_ref}>
                            📁 {f.physical_file_ref}
                          </div>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                          🔴 Pendiente
                        </span>
                      )}
                    </td>
                    <td className="text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          href={`/circulos-restaurativos/fichas/${f.id}/imprimir`}
                          className="px-2.5 py-1 text-xs font-medium bg-brand-50 text-brand-700 hover:bg-brand-100 rounded border border-brand-200"
                        >
                          👁️ Ver / Imprimir
                        </Link>
                        <a
                          href={`/api/circulos-restaurativos/fichas/${f.id}/export-word`}
                          className="px-2.5 py-1 text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 rounded border border-blue-200"
                        >
                          📥 Word
                        </a>
                        {canManage && (
                          <>
                            <Link
                              href={`/circulos-restaurativos/fichas/${f.id}/editar`}
                              className="px-2 py-1 text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 rounded"
                            >
                              ✏️
                            </Link>
                            <DeleteButton
                              onDelete={async () => {
                                "use server";
                                await deleteCircleFicha(f.id);
                              }}
                              confirmMessage="¿Eliminar esta ficha de círculo restaurativo? Esta acción no se puede deshacer."
                            />
                          </>
                        )}
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
