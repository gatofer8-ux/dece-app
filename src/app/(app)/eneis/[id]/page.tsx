import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession, requireInstitutionId } from "@/lib/session";
import { canManageStudents } from "@/lib/permissions";
import { PageHeader, Badge, formatDate } from "@/components/ui";
import DeleteButton from "@/components/DeleteButton";
import { generateQrDataUrl } from "@/lib/pasantes";
import { publicBaseUrl } from "@/lib/ovp/publicUrl";
import { getEneisSession, listFichasForSession } from "@/lib/eneis/eneisSessions";
import { ENEIS_MATERIALES } from "@/lib/eneis/eneisMaterialesCatalog";
import { setEneisSessionStatusAction, deleteEneisSessionAction, deleteEneisFichaAction } from "../actions";

export default async function EneisSessionDetailPage({ params }: { params: { id: string } }) {
  const session = await requireSession();
  const institutionId = requireInstitutionId(session);
  const canManage = canManageStudents(session.user.role);

  const s = getEneisSession(params.id, institutionId);
  if (!s) notFound();

  const fichas = listFichasForSession(s.id);
  const link = `${publicBaseUrl()}/f/${s.access_code}`;
  const qr = await generateQrDataUrl(link);

  const docentesDistintos = new Set(fichas.map((f) => f.docente_nombre.trim().toUpperCase())).size;
  const totalEstudiantes = fichas.reduce((a, f) => a + (f.num_estudiantes_capacitados || 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title={s.title}
        description={`${fichas.length} ficha(s) recibida(s) · ${docentesDistintos} docente(s) · ${totalEstudiantes} estudiantes alcanzados`}
        action={
          <div className="flex items-center gap-2">
            <Link href="/eneis" className="btn-secondary text-xs">← Todas</Link>
            {s.status === "ABIERTA" ? (
              <form action={setEneisSessionStatusAction.bind(null, s.id, "CERRADA")}>
                <button className="btn-secondary text-xs">Cerrar</button>
              </form>
            ) : (
              <form action={setEneisSessionStatusAction.bind(null, s.id, "ABIERTA")}>
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
            {(s.opens_at || s.closes_at) && (
              <span className="text-xs text-slate-500">
                {s.opens_at ? `Desde ${formatDate(s.opens_at)}` : ""} {s.closes_at ? `· Hasta ${formatDate(s.closes_at)}` : ""}
              </span>
            )}
          </div>
          <p className="text-sm text-slate-600">Los docentes entregan su ficha en:</p>
          <p className="font-mono text-sm bg-slate-100 rounded px-3 py-2 break-all select-all">{link}</p>
          <p className="text-sm text-slate-600">
            O en <span className="font-semibold">{publicBaseUrl().replace(/^https?:\/\//, "")}/f</span> con el código{" "}
            <span className="font-mono text-lg font-bold tracking-widest">{s.access_code}</span>
          </p>
          <p className="text-[11px] text-slate-400">No necesitan cuenta. Pueden entregar más de una ficha durante el período.</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <a href={`/api/eneis/${s.id}/export-recepcion`} className="btn-primary flex items-center gap-1.5">
          <span>⬇️</span> Descargar recepción de fichas
        </a>
        {fichas.length > 0 && (
          <a
            href={`/api/eneis/${s.id}/export-fichas`}
            className="px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-semibold flex items-center gap-1.5"
          >
            <span>📄</span> Descargar todas las fichas
          </a>
        )}
      </div>

      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
          <h3 className="text-sm font-bold text-slate-800">Fichas recibidas</h3>
        </div>
        {fichas.length === 0 ? (
          <div className="p-6 text-sm text-slate-500">Todavía no llega ninguna ficha para esta convocatoria.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Docente</th>
                  <th>Asignatura</th>
                  <th>Curso</th>
                  <th>Tema</th>
                  <th>Material</th>
                  <th>Fecha</th>
                  <th>Estudiantes</th>
                  <th className="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {fichas.map((f) => (
                  <tr key={f.id}>
                    <td className="text-sm font-medium text-slate-800">{f.docente_nombre}</td>
                    <td className="text-xs text-slate-600">{f.asignatura}</td>
                    <td className="text-xs text-slate-600">
                      {f.curso} {f.paralelo ? `"${f.paralelo}"` : ""}
                    </td>
                    <td className="text-xs text-slate-600">{f.nombre_ficha || "—"}</td>
                    <td className="text-xs text-slate-600">
                      {ENEIS_MATERIALES.find((m) => m.id === f.material_id)?.short || "—"}
                    </td>
                    <td className="text-xs text-slate-500 whitespace-nowrap">
                      {formatDate(f.fecha_hasta || f.fecha_desde || f.created_at)}
                    </td>
                    <td className="text-xs text-slate-600">{f.num_estudiantes_capacitados ?? "—"}</td>
                    <td className="text-right">
                      <div className="inline-flex items-center gap-3">
                        <a
                          href={`/api/eneis/ficha/${f.id}/export-word`}
                          className="text-xs font-medium text-brand-700 hover:underline"
                        >
                          Descargar
                        </a>
                        {canManage && (
                          <DeleteButton
                            onDelete={async () => {
                              "use server";
                              return await deleteEneisFichaAction(s.id, f.id);
                            }}
                            confirmMessage="¿Eliminar esta ficha? Esta acción no se puede deshacer."
                            label="🗑️"
                            className="text-xs text-red-600 hover:underline"
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {canManage && (
        <div className="flex justify-end">
          <DeleteButton
            onDelete={async () => {
              "use server";
              return await deleteEneisSessionAction(s.id);
            }}
            confirmMessage="¿Eliminar esta convocatoria y todas sus fichas recibidas? Esta acción no se puede deshacer."
            label="🗑️ Eliminar convocatoria"
            redirectTo="/eneis"
          />
        </div>
      )}
    </div>
  );
}
