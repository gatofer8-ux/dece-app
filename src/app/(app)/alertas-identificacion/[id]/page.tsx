import { notFound } from "next/navigation";
import Link from "next/link";
import { requireSession, requireInstitutionId } from "@/lib/session";
import { canManageStudents } from "@/lib/permissions";
import { PageHeader, Badge, formatDate } from "@/components/ui";
import DeleteButton from "@/components/DeleteButton";
import { generateQrDataUrl } from "@/lib/pasantes";
import { publicBaseUrl } from "@/lib/ovp/publicUrl";
import { getSession, listEntriesForSession } from "@/lib/alertIdentificationSessions";
import { RISK_TYPE_LABELS, type RiskType } from "@/lib/types";
import { setAlertSessionStatusAction, deleteAlertSessionAction, deleteAlertEntryAction } from "../actions";
import AlertSessionEditForm from "../_form/AlertSessionEditForm";

export default async function AlertaIdentificacionDetailPage({ params }: { params: { id: string } }) {
  const session = await requireSession();
  const institutionId = requireInstitutionId(session);
  const canManage = canManageStudents(session.user.role);

  const s = getSession(params.id, institutionId);
  if (!s) notFound();

  const entries = listEntriesForSession(s.id);
  const link = `${publicBaseUrl()}/al/${s.access_code}`;
  const qr = await generateQrDataUrl(link);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Junta de curso ${s.curso || ""}`}
        description={`${formatDate(s.fecha)} · ${entries.length} estudiante(s) en alerta registrado(s)`}
        action={
          <div className="flex items-center gap-2">
            <Link href="/alertas-identificacion" className="btn-secondary text-xs">← Todas</Link>
            <Link href={`/alertas-identificacion/${s.id}/imprimir`} className="btn-secondary text-xs">🖨️ Ver / imprimir</Link>
            {s.status === "ABIERTA" ? (
              <form action={setAlertSessionStatusAction.bind(null, s.id, "CERRADA")}>
                <button className="btn-secondary text-xs">Cerrar</button>
              </form>
            ) : (
              <form action={setAlertSessionStatusAction.bind(null, s.id, "ABIERTA")}>
                <button className="btn-primary text-xs">Reabrir</button>
              </form>
            )}
          </div>
        }
      />

      <div className="card p-5 grid grid-cols-1 md:grid-cols-[auto_1fr] gap-5 items-center">
        {qr && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={qr} alt="Código QR" className="w-40 h-40 rounded-lg border" />
        )}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            {s.status === "ABIERTA" ? <Badge color="green">Abierta</Badge> : <Badge color="slate">Cerrada</Badge>}
          </div>
          <p className="text-sm text-slate-600">Los docentes registran a sus estudiantes en:</p>
          <p className="font-mono text-sm bg-slate-100 rounded px-3 py-2 break-all select-all">{link}</p>
          <p className="text-sm text-slate-600">
            O en <span className="font-semibold">{publicBaseUrl().replace(/^https?:\/\//, "")}/al</span> con el código{" "}
            <span className="font-mono text-lg font-bold tracking-widest">{s.access_code}</span>
          </p>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="p-4 border-b bg-slate-50">
          <h3 className="text-sm font-semibold text-slate-800">Estudiantes en alerta</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Descarga la ficha de notificación formal de cada estudiante para entregarla al DECE dentro de las 48
            horas laborables, o para llevarla en físico.
          </p>
        </div>
        {entries.length === 0 ? (
          <div className="p-6 text-sm text-slate-500">Todavía no llega ningún registro. Comparte el enlace o el código con los docentes.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Nombre del estudiante</th>
                  <th>Riesgo psicosocial</th>
                  <th>Descripción</th>
                  <th>Docente que alerta</th>
                  <th>Fecha</th>
                  <th>Ficha de notificación</th>
                  {canManage && <th className="text-right">Acciones</th>}
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id}>
                    <td className="text-sm font-semibold text-slate-900">{e.student_name}</td>
                    <td className="text-xs text-slate-700">{RISK_TYPE_LABELS[e.risk_type as RiskType] || e.risk_type}</td>
                    <td className="text-xs text-slate-600 max-w-xs truncate" title={e.description || ""}>{e.description || "—"}</td>
                    <td className="text-xs text-slate-600">{e.teacher_name}</td>
                    <td className="text-xs text-slate-500 whitespace-nowrap">{formatDate(e.created_at)}</td>
                    <td>
                      <a
                        href={`/api/alertas-identificacion/entries/${e.id}/export-notificacion`}
                        className="text-xs text-brand-700 hover:underline font-semibold whitespace-nowrap"
                      >
                        📥 Descargar
                      </a>
                    </td>
                    {canManage && (
                      <td className="text-right">
                        <DeleteButton
                          onDelete={async () => {
                            "use server";
                            return await deleteAlertEntryAction(e.id, s.id);
                          }}
                          confirmMessage="¿Eliminar este registro del acta?"
                          label="Eliminar"
                        />
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {canManage && (
        <>
          <AlertSessionEditForm
            session={s}
            reportingTeachers={Array.from(new Set(entries.map((e) => e.teacher_name.trim()).filter(Boolean)))}
          />

          <div className="flex justify-end">
            <DeleteButton
              onDelete={async () => {
                "use server";
                return await deleteAlertSessionAction(s.id);
              }}
              confirmMessage="¿Eliminar esta acta y todos los estudiantes registrados? Esta acción no se puede deshacer."
              label="🗑️ Eliminar acta"
              redirectTo="/alertas-identificacion"
            />
          </div>
        </>
      )}
    </div>
  );
}
