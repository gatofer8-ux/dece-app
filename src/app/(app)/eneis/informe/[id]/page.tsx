import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession, requireInstitutionId } from "@/lib/session";
import { canManageStudents } from "@/lib/permissions";
import { PageHeader, Badge, formatDate } from "@/components/ui";
import DeleteButton from "@/components/DeleteButton";
import { getInforme, parseTablas } from "@/lib/eneis/eneisInformes";
import { deleteEneisInformeAction, refreshEneisInformeTablasAction } from "../actions";

export default async function EneisInformeDetailPage({ params }: { params: { id: string } }) {
  const session = await requireSession();
  const institutionId = requireInstitutionId(session);
  const canManage = canManageStudents(session.user.role);

  const informe = getInforme(params.id, institutionId);
  if (!informe) notFound();

  const tablas = parseTablas(informe.tablas_json);

  return (
    <div className="space-y-6">
      <PageHeader
        title={informe.titulo}
        description={`${informe.tipo} · Período ${formatDate(informe.periodo_desde)} — ${formatDate(informe.periodo_hasta)} · ${tablas.totalFichas} ficha(s) consideradas`}
        action={
          <div className="flex items-center gap-2">
            <Link href="/eneis/informe" className="btn-secondary text-xs">← Todos</Link>
            <a href={`/api/eneis/informe/${informe.id}/export-word`} className="btn-primary flex items-center gap-1.5">
              <span>⬇️</span> Descargar Word
            </a>
          </div>
        }
      />

      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">
          Las tablas se calcularon al generar el informe. Si cargaste más fichas después, puedes recalcularlas.
        </p>
        <form action={refreshEneisInformeTablasAction.bind(null, informe.id)}>
          <button type="submit" className="btn-secondary text-xs">🔄 Recalcular tablas</button>
        </form>
      </div>

      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
          <h3 className="text-sm font-bold text-slate-800">Actividades realizadas por docentes</h3>
        </div>
        {tablas.actividadesDocentes.length === 0 ? (
          <div className="p-6 text-sm text-slate-500">No hay fichas de aplicación registradas en este período.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Área/Materia</th>
                  <th>N° planificaciones</th>
                  <th>Mes</th>
                  <th>Población</th>
                </tr>
              </thead>
              <tbody>
                {tablas.actividadesDocentes.map((a, i) => (
                  <tr key={i}>
                    <td className="text-sm text-slate-800">{a.area}</td>
                    <td className="text-xs text-slate-600">{a.nroPlanificaciones}</td>
                    <td className="text-xs text-slate-600">{a.mes}</td>
                    <td className="text-xs text-slate-600">{a.poblacion || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card p-5">
        <h3 className="text-sm font-bold text-slate-800 mb-3">Cobertura</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <div className="text-2xl font-bold text-brand-700">{tablas.cobertura.estudiantesAlcanzados}</div>
            <div className="text-[11px] text-slate-500">Estudiantes alcanzados</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-brand-700">{tablas.cobertura.docentesAlcanzados}</div>
            <div className="text-[11px] text-slate-500">Docentes alcanzados</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-brand-700">{tablas.cobertura.docentesOportunidades}</div>
            <div className="text-[11px] text-slate-500">Docentes que aplican Oportunidades Curriculares</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-800">{informe.padres_alcanzados ?? "—"}</div>
            <div className="text-[11px] text-slate-500">Padres/representantes alcanzados</div>
          </div>
        </div>
      </div>

      <div className="card p-5 space-y-3 text-sm text-slate-700">
        <div>
          <Badge color="slate">Desarrollo</Badge>
          <p className="mt-1 whitespace-pre-wrap">{informe.desarrollo_resumen || "—"}</p>
        </div>
        <div>
          <Badge color="slate">Actividades DECE</Badge>
          <p className="mt-1 whitespace-pre-wrap">{informe.actividades_dece || "—"}</p>
        </div>
        <div>
          <Badge color="green">Buenas prácticas</Badge>
          <p className="mt-1 whitespace-pre-wrap">{informe.buenas_practicas || "—"}</p>
        </div>
        <div>
          <Badge color="amber">Nudos críticos</Badge>
          <p className="mt-1 whitespace-pre-wrap">{informe.nudos_criticos || "—"}</p>
        </div>
        <div>
          <Badge color="slate">Conclusiones</Badge>
          <p className="mt-1 whitespace-pre-wrap">{informe.conclusiones || "—"}</p>
        </div>
        <div>
          <Badge color="slate">Recomendaciones</Badge>
          <p className="mt-1 whitespace-pre-wrap">{informe.recomendaciones || "—"}</p>
        </div>
      </div>

      {canManage && (
        <div className="flex justify-end">
          <DeleteButton
            onDelete={async () => {
              "use server";
              return await deleteEneisInformeAction(informe.id);
            }}
            confirmMessage="¿Eliminar este informe? Esta acción no se puede deshacer."
            label="🗑️ Eliminar informe"
            redirectTo="/eneis/informe"
          />
        </div>
      )}
    </div>
  );
}
