import Link from "next/link";
import { redirect } from "next/navigation";
import { requireSession, requireInstitutionId } from "@/lib/session";
import { canManageStudents, roleHomePath } from "@/lib/permissions";
import { listCircleConsents, deleteCircleConsentAction } from "@/lib/restorativeCircleConsent";
import { PageHeader, EmptyState, formatDate } from "@/components/ui";
import DeleteButton from "@/components/DeleteButton";

export default async function CirculosRestaurativosPage() {
  const session = await requireSession();
  if (session.user.role === "DISTRITO") redirect(roleHomePath(session.user.role));
  const institutionId = requireInstitutionId(session);
  const canManage = canManageStudents(session.user.role);

  const consents = await listCircleConsents(institutionId);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Consentimientos para Círculos Restaurativos"
        description="Gestión y emisión de consentimientos informados para atención psicosocial y círculos restaurativos con estudiantes."
        action={
          canManage ? (
            <Link href="/circulos-restaurativos/nuevo" className="btn-primary flex items-center gap-1.5">
              <span>➕</span> Nuevo consentimiento
            </Link>
          ) : undefined
        }
      />

      {consents.length === 0 ? (
        <EmptyState
          title="No hay consentimientos de círculos restaurativos registrados"
          description="Genera el primer consentimiento informado para estudiantes seleccionando un caso o directamente desde el botón superior."
          action={
            canManage ? (
              <Link href="/circulos-restaurativos/nuevo" className="btn-primary mt-2">
                + Crear consentimiento
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Estudiante</th>
                  <th className="px-4 py-3">Curso y Paralelo</th>
                  <th className="px-4 py-3">Jornada</th>
                  <th className="px-4 py-3">Representante</th>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Responsable DECE</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {consents.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {c.student_name || <span className="text-slate-400 italic">Formato en blanco</span>}
                      {c.case_file_id && (
                        <span className="block text-[11px] font-normal text-brand-600">
                          <Link href={`/casos/${c.case_file_id}`} className="hover:underline">
                            📁 Vinculado a caso
                          </Link>
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {c.course_parallel}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                        {c.shift}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <div>{c.representative_name || "—"}</div>
                      {c.representative_phone && (
                        <div className="text-xs text-slate-400">Tel: {c.representative_phone}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                      {formatDate(c.consent_date)}
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs">
                      {c.dece_name}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          href={`/circulos-restaurativos/${c.id}/imprimir`}
                          className="px-2.5 py-1 text-xs font-medium bg-brand-50 text-brand-700 hover:bg-brand-100 rounded border border-brand-200"
                          title="Previsualizar e Imprimir"
                        >
                          👁️ Ver / Imprimir
                        </Link>
                        <a
                          href={`/api/circulos-restaurativos/${c.id}/export-word`}
                          className="px-2.5 py-1 text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 rounded border border-blue-200 flex items-center gap-1"
                          title="Descargar Word (.docx)"
                        >
                          📥 Word
                        </a>
                        {canManage && (
                          <>
                            <Link
                              href={`/circulos-restaurativos/${c.id}/editar`}
                              className="px-2 py-1 text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 rounded"
                              title="Editar"
                            >
                              ✏️
                            </Link>
                            <DeleteButton
                              onDelete={async () => {
                                "use server";
                                await deleteCircleConsentAction(c.id);
                              }}
                              confirmMessage="¿Estás seguro de que deseas eliminar este consentimiento de círculo restaurativo? Esta acción no se puede deshacer."
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
