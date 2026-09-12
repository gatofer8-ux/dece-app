import Link from "next/link";
import { db } from "@/lib/db";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { PageHeader, Badge, EmptyState, formatDate } from "@/components/ui";
import { calculatePlanStats, parseActionPlanItems, parseActionPlanAnalysts } from "@/lib/actionPlan";
import type { ActionPlanRow } from "@/lib/types";
import DeleteButton from "@/components/DeleteButton";
import { deleteActionPlan } from "./actions";

export default async function PlanAccionPage() {
  const session = await requireRole(["ADMIN", "DECE", "AUTORIDAD", "DISTRITO", "SUPERADMIN"]);
  const institutionId = session.user.role === "DISTRITO" ? null : requireInstitutionId(session);

  let plans: (ActionPlanRow & { institution_name?: string })[] = [];

  if (institutionId) {
    plans = db
      .prepare(
        `SELECT ap.*, i.name as institution_name
         FROM action_plans ap
         JOIN institutions i ON i.id = ap.institution_id
         WHERE ap.institution_id = ?
         ORDER BY ap.created_at DESC`
      )
      .all(institutionId) as any[];
  } else {
    plans = db
      .prepare(
        `SELECT ap.*, i.name as institution_name
         FROM action_plans ap
         JOIN institutions i ON i.id = ap.institution_id
         ORDER BY ap.created_at DESC LIMIT 100`
      )
      .all() as any[];
  }

  const canEdit =
    session.user.role === "ADMIN" ||
    session.user.role === "DECE" ||
    session.user.role === "SUPERADMIN" ||
    session.user.role === "AUTORIDAD";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <PageHeader
            title="Plan de Acción Anual DECE (POA)"
            description="Planificación operativa anual alineada a los 14 Estándares de Calidad y 4 Dimensiones de la gestión DECE."
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <Link
            href="/plan-estrategico-bianual"
            className="btn-secondary flex items-center justify-center gap-2 text-xs px-3 py-2 shadow-xs"
            title="El Plan de Acción Anual se desprende del Plan Estratégico Bianual"
          >
            <span>🧭</span>
            <span>Plan Estratégico Bianual</span>
          </Link>
          {canEdit && (
            <Link
              href="/plan-accion/nuevo"
              className="btn-primary flex items-center justify-center gap-2 shadow-sm"
            >
              <span>✨</span>
              <span>Nuevo Plan de Acción</span>
            </Link>
          )}
        </div>
      </div>

      {plans.length === 0 ? (
        <div className="card p-8 text-center space-y-4">
          <div className="text-5xl">🎯</div>
          <h3 className="text-lg font-bold text-slate-800">
            Aún no has registrado el Plan de Acción de este año lectivo
          </h3>
          <p className="text-sm text-slate-600 max-w-xl mx-auto">
            El Plan de Acción Anual DECE contiene las 4 Dimensiones obligatorias (Acompañamiento Psicosocial, Gestión Documental, Gestión y Convivencia) y los 14 Estándares de Calidad MINEDUC.
            Puedes crearlo con un solo clic prellenado con el formato oficial de la institución y asistido por Inteligencia Artificial.
          </p>
          {canEdit && (
            <div className="pt-2">
              <Link href="/plan-accion/nuevo" className="btn-primary inline-flex items-center gap-2">
                <span>➕</span>
                <span>Crear Plan de Acción Anual Oficial</span>
              </Link>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {plans.map((plan) => {
            const items = parseActionPlanItems(plan.items_data);
            const analysts = parseActionPlanAnalysts(plan.analysts_data);
            const stats = calculatePlanStats(items);

            return (
              <div
                key={plan.id}
                className="card p-5 hover:border-brand-300 transition-all shadow-xs border border-slate-200 flex flex-col md:flex-row justify-between gap-6"
              >
                <div className="space-y-3 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <span className="text-xl">🎯</span>
                      <span>Año Lectivo {plan.school_year_text}</span>
                    </span>
                    <Badge color="blue">{plan.students_count} estudiantes a atender</Badge>
                    <Badge color={stats.completionPercent >= 80 ? "emerald" : "amber"}>
                      {stats.completionPercent}% asignado
                    </Badge>
                  </div>

                  {plan.institution_name && (
                    <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                      🏫 {plan.institution_name}
                    </div>
                  )}

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      <div className="text-slate-400 font-medium">Coordinación</div>
                      <div className="font-semibold text-slate-800 truncate" title={plan.coordinator_name}>
                        {plan.coordinator_name || "No asignado"}
                      </div>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      <div className="text-slate-400 font-medium">Equipo DECE</div>
                      <div className="font-semibold text-slate-800 truncate" title={analysts.map(a => a.name).join(", ")}>
                        {analysts.length > 0 ? `${analysts.length} analista(s)` : "No registrados"}
                      </div>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      <div className="text-slate-400 font-medium">Actividades</div>
                      <div className="font-semibold text-slate-800">
                        {stats.totalItems} filas ({stats.activitiesCount} actividades)
                      </div>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      <div className="text-slate-400 font-medium">Dimensiones</div>
                      <div className="font-semibold text-slate-800">
                        {stats.dimensionsCount} cubiertas
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap sm:flex-col justify-center items-end gap-2 shrink-0 border-t sm:border-t-0 sm:border-l border-slate-100 pt-3 sm:pt-0 sm:pl-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/plan-accion/${plan.id}/gestion-documental`}
                      className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5 bg-cyan-50/80 hover:bg-cyan-100 text-cyan-900 border-cyan-200 font-semibold shadow-xs"
                      title="Ver y respaldar evidencias documentales de cada actividad en SADEX"
                    >
                      <span>📁</span>
                      <span>Gestión Documental</span>
                    </Link>

                    <Link
                      href={`/plan-accion/${plan.id}/imprimir`}
                      prefetch={false}
                      className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5"
                    >
                      <span>🖨️</span>
                      <span>Imprimir</span>
                    </Link>

                    {canEdit && (
                      <Link
                        href={`/plan-accion/${plan.id}/editar`}
                        className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1.5"
                      >
                        <span>✏️</span>
                        <span>Editar</span>
                      </Link>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <a
                      href={`/api/plan-accion/${plan.id}/export-excel`}
                      download
                      className="text-xs text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md px-2.5 py-1 flex items-center gap-1 font-medium transition-colors"
                    >
                      <span>📊</span>
                      <span>Excel (.xlsx)</span>
                    </a>

                    <a
                      href={`/api/plan-accion/${plan.id}/export-word`}
                      download
                      className="text-xs text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md px-2.5 py-1 flex items-center gap-1 font-medium transition-colors"
                    >
                      <span>📝</span>
                      <span>Word (.docx)</span>
                    </a>

                    {canEdit && (
                      <DeleteButton
                        onDelete={deleteActionPlan.bind(null, plan.id)}
                        confirmMessage="¿Estás seguro de eliminar este Plan de Acción Anual? Esta acción no se puede deshacer."
                        className="text-xs text-red-600 hover:text-red-800 ml-1 p-1 hover:bg-red-50 rounded"
                        label="🗑️"
                      />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
