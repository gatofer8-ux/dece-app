import Link from "next/link";
import { db } from "@/lib/db";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { PageHeader, Badge } from "@/components/ui";
import {
  calculateBianualPlanStats,
  parseBianualAxisItems,
  parseBianualAnalysts,
  parseBianualSpecificObjectives,
} from "@/lib/strategicPlanBianual";
import type { StrategicBianualPlanRow } from "@/lib/types";
import DeleteButton from "@/components/DeleteButton";
import { deleteStrategicBianualPlan } from "./actions";

export default async function PlanEstrategicoBianualPage() {
  const session = await requireRole(["ADMIN", "DECE", "AUTORIDAD", "DISTRITO", "SUPERADMIN"]);
  const institutionId = session.user.role === "DISTRITO" ? null : requireInstitutionId(session);

  let plans: (StrategicBianualPlanRow & { institution_name?: string })[] = [];

  if (institutionId) {
    plans = db
      .prepare(
        `SELECT sp.*, i.name as institution_name
         FROM strategic_plans_bianual sp
         JOIN institutions i ON i.id = sp.institution_id
         WHERE sp.institution_id = ?
         ORDER BY sp.created_at DESC`
      )
      .all(institutionId) as any[];
  } else {
    plans = db
      .prepare(
        `SELECT sp.*, i.name as institution_name
         FROM strategic_plans_bianual sp
         JOIN institutions i ON i.id = sp.institution_id
         ORDER BY sp.created_at DESC LIMIT 100`
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
            title="Plan Estratégico Bianual DECE"
            description="Planificación estratégica a dos años del Departamento de Consejería Estudiantil. De este plan se desprende cada Plan de Acción Anual (POA)."
          />
        </div>
        {canEdit && (
          <Link
            href="/plan-estrategico-bianual/nuevo"
            className="btn-primary flex items-center justify-center gap-2 self-start sm:self-auto shadow-sm"
          >
            <span>✨</span>
            <span>Nuevo Plan Bianual</span>
          </Link>
        )}
      </div>

      {/* Relación con el POA anual */}
      <div className="card p-4 bg-indigo-50/60 border border-indigo-200 text-xs text-indigo-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <span className="text-base shrink-0">🔗</span>
          <p className="leading-relaxed">
            El <strong>Plan de Acción Anual (POA)</strong> se desprende de este plan
            bianual: cuando existe un plan estratégico registrado, su objetivo general,
            sus objetivos específicos y las metas de cada eje se usan como contexto para
            la generación asistida del POA.
          </p>
        </div>
        <Link
          href="/plan-accion"
          className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5 shrink-0 self-start sm:self-auto"
        >
          <span>🎯</span>
          <span>Ir al Plan de Acción (POA)</span>
        </Link>
      </div>

      {plans.length === 0 ? (
        <div className="card p-8 text-center space-y-4">
          <div className="text-5xl">🧭</div>
          <h3 className="text-lg font-bold text-slate-800">
            Aún no has registrado el Plan Estratégico Bianual
          </h3>
          <p className="text-sm text-slate-600 max-w-xl mx-auto">
            El Plan Estratégico Bianual contiene el objetivo general, los objetivos
            específicos y las metas de los 4 ejes de acción del DECE (Consejería,
            Promoción y Prevención, Inclusión Socioeducativa y Atención Psicosocial),
            cubriendo las 8 temáticas del eje de prevención del Acuerdo Ministerial
            MINEDUC-044-A. Puedes crearlo con un solo clic prellenado con el formato
            oficial y asistido por Inteligencia Artificial.
          </p>
          {canEdit && (
            <div className="pt-2">
              <Link
                href="/plan-estrategico-bianual/nuevo"
                className="btn-primary inline-flex items-center gap-2"
              >
                <span>➕</span>
                <span>Crear Plan Estratégico Bianual Oficial</span>
              </Link>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {plans.map((plan) => {
            const items = parseBianualAxisItems(plan.axis_items_data);
            const analysts = parseBianualAnalysts(plan.analysts_data);
            const objectives = parseBianualSpecificObjectives(plan.specific_objectives);
            const stats = calculateBianualPlanStats(items);
            const fullCoverage =
              stats.preventionThemesCovered >= stats.preventionThemesTotal;

            return (
              <div
                key={plan.id}
                className="card p-5 hover:border-brand-300 transition-all shadow-xs border border-slate-200 flex flex-col md:flex-row justify-between gap-6"
              >
                <div className="space-y-3 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <span className="text-xl">🧭</span>
                      <span>Periodo Bianual {plan.period_text}</span>
                    </span>
                    <Badge color="blue">{plan.students_count} estudiantes</Badge>
                    <Badge color={fullCoverage ? "emerald" : "amber"}>
                      {stats.preventionThemesCovered}/{stats.preventionThemesTotal} temáticas 044-A
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
                      <div
                        className="font-semibold text-slate-800 truncate"
                        title={plan.coordinator_name}
                      >
                        {plan.coordinator_name || "No asignado"}
                      </div>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      <div className="text-slate-400 font-medium">Equipo DECE</div>
                      <div
                        className="font-semibold text-slate-800 truncate"
                        title={analysts.map((a) => a.name).join(", ")}
                      >
                        {plan.professionals_count > 0
                          ? `${plan.professionals_count} profesional(es)`
                          : analysts.length > 0
                            ? `${analysts.length} analista(s)`
                            : "No registrados"}
                      </div>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      <div className="text-slate-400 font-medium">Metas</div>
                      <div className="font-semibold text-slate-800">
                        {stats.totalItems} metas ({stats.actionsCount} acciones)
                      </div>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      <div className="text-slate-400 font-medium">Objetivos / Ejes</div>
                      <div className="font-semibold text-slate-800">
                        {objectives.length} objetivos · {stats.axesCount} ejes
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap sm:flex-col justify-center items-end gap-2 shrink-0 border-t sm:border-t-0 sm:border-l border-slate-100 pt-3 sm:pt-0 sm:pl-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/plan-estrategico-bianual/${plan.id}/imprimir`}
                      prefetch={false}
                      className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5"
                    >
                      <span>🖨️</span>
                      <span>Imprimir</span>
                    </Link>

                    {canEdit && (
                      <Link
                        href={`/plan-estrategico-bianual/${plan.id}/editar`}
                        className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1.5"
                      >
                        <span>✏️</span>
                        <span>Editar</span>
                      </Link>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <a
                      href={`/api/plan-estrategico-bianual/${plan.id}/export-word`}
                      download
                      className="text-xs text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md px-2.5 py-1 flex items-center gap-1 font-medium transition-colors"
                    >
                      <span>📝</span>
                      <span>Word (.docx)</span>
                    </a>

                    {canEdit && (
                      <DeleteButton
                        onDelete={deleteStrategicBianualPlan.bind(null, plan.id)}
                        confirmMessage="¿Estás seguro de eliminar este Plan Estratégico Bianual? Esta acción no se puede deshacer."
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
