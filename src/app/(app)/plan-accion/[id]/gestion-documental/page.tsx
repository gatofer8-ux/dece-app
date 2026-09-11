import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { PageHeader, Badge } from "@/components/ui";
import { parseActionPlanItems, parseActionPlanAnalysts, calculatePlanStats } from "@/lib/actionPlan";
import type { ActionPlanRow, ActionPlanItem } from "@/lib/types";

export default async function PlanAccionGestionDocumentalPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await requireRole(["ADMIN", "DECE", "AUTORIDAD", "DISTRITO"]);
  const institutionId = session.user.role === "DISTRITO" ? null : requireInstitutionId(session);

  const plan = db
    .prepare(
      `SELECT ap.*, i.name as institution_name, i.seal_image, i.amie_code
       FROM action_plans ap
       JOIN institutions i ON i.id = ap.institution_id
       WHERE ap.id = ? ${institutionId ? "AND ap.institution_id = ?" : ""}`
    )
    .get(...(institutionId ? [params.id, institutionId] : [params.id])) as
    | (ActionPlanRow & { institution_name: string; seal_image?: string | null; amie_code?: string | null })
    | undefined;

  if (!plan) {
    notFound();
  }

  const items = parseActionPlanItems(plan.items_data);
  const analysts = parseActionPlanAnalysts(plan.analysts_data);
  const stats = calculatePlanStats(items);

  // Estadísticas de evidencias reales registradas en la base de datos para esta institución
  const activitiesCount = (
    db.prepare("SELECT COUNT(*) as count FROM activities WHERE institution_id = ?").get(plan.institution_id) as any
  )?.count || 0;

  const circlesCount = (
    db.prepare("SELECT COUNT(*) as count FROM restorative_circles WHERE institution_id = ?").get(plan.institution_id) as any
  )?.count || 0;

  const casesCount = (
    db.prepare("SELECT COUNT(*) as count FROM case_files WHERE institution_id = ?").get(plan.institution_id) as any
  )?.count || 0;

  const actsCount = (
    db.prepare("SELECT COUNT(*) as count FROM socialization_acts WHERE institution_id = ?").get(plan.institution_id) as any
  )?.count || 0;

  const ovpCount = (
    db.prepare("SELECT COUNT(*) as count FROM ovp_applications WHERE institution_id = ?").get(plan.institution_id) as any
  )?.count || 0;

  // Agrupar items por dimensión
  const dimensionsMap = new Map<string, ActionPlanItem[]>();
  for (const item of items) {
    const dim = item.dimension || "DIMENSIÓN NO ESPECIFICADA";
    if (!dimensionsMap.has(dim)) {
      dimensionsMap.set(dim, []);
    }
    dimensionsMap.get(dim)!.push(item);
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Cabecera y Navegación */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            <Link href="/plan-accion" className="hover:text-slate-800 transition-colors">
              Plan de Acción Anual
            </Link>
            <span>/</span>
            <span className="text-cyan-600">Gestión Documental y Evidencias</span>
          </div>
          <PageHeader
            title={`Gestión Documental del POA · Año Lectivo ${plan.school_year_text}`}
            description="Vinculación operativa y respaldo de evidencias documentales de cada estándar y actividad planificada en SADEX."
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/plan-accion/${plan.id}/imprimir`}
            className="btn-secondary text-xs px-3 py-2 flex items-center gap-1.5"
          >
            <span>🖨️</span>
            <span>Imprimir POA</span>
          </Link>
          <Link
            href={`/plan-accion/${plan.id}/editar`}
            className="btn-primary text-xs px-3.5 py-2 flex items-center gap-1.5"
          >
            <span>✏️</span>
            <span>Editar Plan</span>
          </Link>
        </div>
      </div>

      {/* Resumen Ejecutivo de Evidencias en SADEX */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="card p-4 bg-gradient-to-br from-slate-900 to-[#0c1322] text-white border-slate-800 shadow-md">
          <div className="text-[11px] font-semibold text-cyan-300 uppercase tracking-wider">Actividades y Talleres</div>
          <div className="text-2xl font-black mt-1 text-white">{activitiesCount}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Informes técnicos registrados</div>
          <Link
            href="/actividades"
            className="mt-2.5 inline-flex items-center gap-1 text-[11px] font-bold text-cyan-400 hover:text-cyan-300"
          >
            <span>Ver talleres</span>
            <span>→</span>
          </Link>
        </div>

        <div className="card p-4 bg-white border-slate-200/80 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Círculos Restaurativos</div>
          <div className="text-2xl font-black mt-1 text-slate-900">{circlesCount}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Fichas de convivencia de paz</div>
          <Link
            href="/circulos-restaurativos"
            className="mt-2.5 inline-flex items-center gap-1 text-[11px] font-bold text-slate-700 hover:text-slate-900"
          >
            <span>Ver círculos</span>
            <span>→</span>
          </Link>
        </div>

        <div className="card p-4 bg-white border-slate-200/80 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Expedientes DECE</div>
          <div className="text-2xl font-black mt-1 text-slate-900">{casesCount}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Casos en seguimiento</div>
          <Link
            href="/casos"
            className="mt-2.5 inline-flex items-center gap-1 text-[11px] font-bold text-slate-700 hover:text-slate-900"
          >
            <span>Ver casos</span>
            <span>→</span>
          </Link>
        </div>

        <div className="card p-4 bg-white border-slate-200/80 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Actas de Socialización</div>
          <div className="text-2xl font-black mt-1 text-slate-900">{actsCount}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Firmas docentes registradas</div>
          <Link
            href="/casos"
            className="mt-2.5 inline-flex items-center gap-1 text-[11px] font-bold text-slate-700 hover:text-slate-900"
          >
            <span>Ver actas</span>
            <span>→</span>
          </Link>
        </div>

        <div className="card p-4 bg-white border-slate-200/80 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Procesos OVP</div>
          <div className="text-2xl font-black mt-1 text-slate-900">{ovpCount}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Orientación vocacional</div>
          <Link
            href="/ovp"
            className="mt-2.5 inline-flex items-center gap-1 text-[11px] font-bold text-slate-700 hover:text-slate-900"
          >
            <span>Ver OVP</span>
            <span>→</span>
          </Link>
        </div>
      </div>

      {/* Matriz de Gestión Documental por Actividad */}
      <div className="space-y-8">
        {Array.from(dimensionsMap.entries()).map(([dimensionName, dimItems], dIndex) => (
          <div key={dIndex} className="card overflow-hidden border border-slate-200 shadow-xs">
            <div className="bg-slate-900 text-white px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="font-bold text-sm tracking-wide text-slate-100 uppercase">
                {dimensionName}
              </div>
              <span className="text-xs bg-slate-800 text-cyan-300 font-semibold px-2.5 py-0.5 rounded-full border border-slate-700">
                {dimItems.length} estándar(es) planificado(s)
              </span>
            </div>

            <div className="divide-y divide-slate-200/80">
              {dimItems.map((item, iIndex) => {
                const isPrevention =
                  item.component.toUpperCase().includes("PREVENCIÓN") ||
                  item.action.toUpperCase().includes("RIESGO") ||
                  item.action.toUpperCase().includes("PREVENCION");

                const isOvp = item.action.toUpperCase().includes("VOCACIONAL") || item.action.toUpperCase().includes("OVP");
                const isCircle = item.action.toUpperCase().includes("CONVIVENCIA") || item.action.toUpperCase().includes("PAZ");
                const isCase = item.action.toUpperCase().includes("VULNERABILIDAD") || item.action.toUpperCase().includes("ATENCIÓN");

                return (
                  <div key={item.id || iIndex} className="p-5 hover:bg-slate-50/70 transition-colors">
                    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                      <div className="space-y-2 flex-1 min-w-0">
                        {/* Cabecera del estándar */}
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-black px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-800 rounded">
                            {item.expected_goal_standard?.split("\n")[0] || "ESTÁNDAR MINEDUC"}
                          </span>
                          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                            {item.component}
                          </span>
                          {isPrevention && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-50 text-cyan-700 border border-cyan-200">
                              Acuerdo 044-A
                            </span>
                          )}
                        </div>

                        {/* Acción */}
                        <p className="text-xs font-semibold text-slate-800 leading-snug">
                          {item.action}
                        </p>

                        {/* Actividades planificadas */}
                        <div className="text-xs text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-200/70 whitespace-pre-wrap leading-relaxed">
                          {item.activities || "Sin actividades redactadas aún."}
                        </div>

                        {/* Metadatos de ejecución */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 pt-1">
                          <div>
                            <span className="font-semibold text-slate-500">Población:</span>{" "}
                            <span>{item.target_population || "Por definir"}</span>
                          </div>
                          <div>
                            <span className="font-semibold text-slate-500">Plazo:</span>{" "}
                            <span className="font-medium text-slate-800">{item.execution_term || "Todo el año lectivo"}</span>
                          </div>
                          <div>
                            <span className="font-semibold text-slate-500">Responsable:</span>{" "}
                            <span className="font-bold text-slate-900">{item.responsible || "Equipo DECE"}</span>
                          </div>
                        </div>
                      </div>

                      {/* Botones de Gestión Documental en SADEX */}
                      <div className="flex flex-col sm:flex-row lg:flex-col gap-2 shrink-0 lg:w-56 pt-2 lg:pt-0">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Respaldar en SADEX:
                        </span>

                        {isPrevention && (
                          <>
                            <Link
                              href="/actividades/nueva"
                              className="btn-primary text-xs py-1.5 px-3 flex items-center justify-center gap-1.5 bg-cyan-700 hover:bg-cyan-800 text-white rounded-lg shadow-xs"
                              title="Registrar actividad oficial y generar informe con base legal LOEI Art. 73"
                            >
                              <span>📋</span>
                              <span>Crear Informe Taller</span>
                            </Link>
                            <Link
                              href="/esquelas/nueva"
                              className="btn-secondary text-xs py-1.5 px-3 flex items-center justify-center gap-1.5 rounded-lg"
                              title="Generar esquelas de citación oficiales para estudiantes o representantes"
                            >
                              <span>✉️</span>
                              <span>Emitir Esquelas</span>
                            </Link>
                          </>
                        )}

                        {isCircle && (
                          <Link
                            href="/circulos-restaurativos/fichas/nueva"
                            className="btn-primary text-xs py-1.5 px-3 flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg"
                            title="Elaborar ficha oficial de círculo restaurativo y acuerdo de convivencia"
                          >
                            <span>🕊️</span>
                            <span>Ficha Restaurativa</span>
                          </Link>
                        )}

                        {isOvp && (
                          <Link
                            href="/ovp"
                            className="btn-primary text-xs py-1.5 px-3 flex items-center justify-center gap-1.5 bg-indigo-700 hover:bg-indigo-800 text-white rounded-lg"
                            title="Administrar batería de intereses vocacionales IPPJ y toma de decisión"
                          >
                            <span>🧭</span>
                            <span>Módulo OVP</span>
                          </Link>
                        )}

                        {isCase && (
                          <Link
                            href="/casos"
                            className="btn-secondary text-xs py-1.5 px-3 flex items-center justify-center gap-1.5 rounded-lg"
                            title="Ver expedientes y actas de socialización con firmas"
                          >
                            <span>📁</span>
                            <span>Expedientes y Actas</span>
                          </Link>
                        )}

                        {!isPrevention && !isCircle && !isOvp && !isCase && (
                          <Link
                            href="/actividades/nueva"
                            className="btn-secondary text-xs py-1.5 px-3 flex items-center justify-center gap-1.5 rounded-lg"
                          >
                            <span>📝</span>
                            <span>Registrar Evidencia</span>
                          </Link>
                        )}

                        <div className="text-[10px] text-slate-500 italic bg-slate-100/70 p-2 rounded border border-slate-200">
                          {item.observations || "INFORME TÉCNICO REGISTRADO EN SADEX"}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
