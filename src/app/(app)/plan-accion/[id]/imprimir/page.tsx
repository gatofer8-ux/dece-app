import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { parseActionPlanItems, parseActionPlanAnalysts, parseActionPlanSignatories } from "@/lib/actionPlan";
import type { ActionPlanRow, ActionPlanItem, ActionPlanAnalyst, ActionPlanSignatory } from "@/lib/types";
import PrintButton from "@/components/PrintButton";

export default async function ImprimirPlanAccionPage({ params }: { params: { id: string } }) {
  const session = await requireRole(["ADMIN", "DECE", "AUTORIDAD", "DISTRITO"]);
  const institutionId = session.user.role === "DISTRITO" ? null : requireInstitutionId(session);

  let query = "SELECT ap.*, i.name as inst_name, i.amie_code as inst_amie FROM action_plans ap JOIN institutions i ON i.id = ap.institution_id WHERE ap.id = ?";
  const queryParams: any[] = [params.id];

  if (institutionId) {
    query += " AND ap.institution_id = ?";
    queryParams.push(institutionId);
  }

  const plan = db.prepare(query).get(...queryParams) as (ActionPlanRow & { inst_name: string; inst_amie: string }) | undefined;

  if (!plan) notFound();

  const items = parseActionPlanItems(plan.items_data);
  const analysts = parseActionPlanAnalysts(plan.analysts_data);
  const elaboratedList = parseActionPlanSignatories(plan.elaborated_by);
  const reviewed = plan.reviewed_by ? (JSON.parse(plan.reviewed_by) as ActionPlanSignatory) : null;
  const approved = plan.approved_by ? (JSON.parse(plan.approved_by) as ActionPlanSignatory) : null;

  return (
    <div className="bg-white min-h-screen text-slate-900 print:p-0">
      {/* Barra de Herramientas (Oculta al imprimir) */}
      <div className="no-print sticky top-0 z-30 bg-slate-900 text-white px-6 py-3 shadow-md flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/plan-accion"
            className="text-xs text-slate-300 hover:text-white bg-slate-800 px-3 py-1.5 rounded-md transition-colors"
          >
            ← Volver a Planes de Acción
          </Link>
          <span className="text-xs text-slate-400 font-mono">
            Plan de Acción DECE {plan.school_year_text} ({items.length} filas)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={`/api/plan-accion/${plan.id}/export-excel`}
            download
            className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-3 py-1.5 rounded-md flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <span>📊</span>
            <span>Descargar Excel (.xlsx)</span>
          </a>

          <a
            href={`/api/plan-accion/${plan.id}/export-word`}
            download
            className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold px-3 py-1.5 rounded-md flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <span>📝</span>
            <span>Descargar Word (.docx)</span>
          </a>

          <PrintButton />
        </div>
      </div>

      {/* Contenedor del Documento Oficial (Hoja A4 Horizontal) */}
      <div className="max-w-[1400px] mx-auto p-4 sm:p-8 print:p-0 print:max-w-none print:w-full print:m-0 text-[11px] font-sans leading-tight">
        {/* Encabezado Institucional */}
        <div className="text-center pb-3 border-b-2 border-slate-900 space-y-1">
          <div className="text-xs font-bold uppercase tracking-widest text-slate-600">
            Ministerio de Educación del Ecuador
          </div>
          <div className="text-base sm:text-lg font-black tracking-tight text-slate-900 uppercase">
            PLAN DE ACCIÓN DEL DEPARTAMENTO DE CONSEJERÍA ESTUDIANTIL (DECE)
          </div>
          <div className="text-xs font-bold text-slate-700">
            AÑO LECTIVO {plan.school_year_text}
          </div>
        </div>

        {/* Tabla Informativa de Cabecera Oficial */}
        <table className="w-full mt-3 border-collapse border border-slate-900 text-xs">
          <tbody>
            <tr>
              <td className="border border-slate-900 p-2 font-bold bg-slate-100 w-1/4">
                Nombre de la Institución Educativa:
              </td>
              <td colSpan={3} className="border border-slate-900 p-2 font-extrabold uppercase">
                {plan.inst_name}
              </td>
            </tr>
            <tr>
              <td rowSpan={2} className="border border-slate-900 p-2 font-bold bg-slate-100 align-top">
                Personal responsable de la planificación:
              </td>
              <td className="border border-slate-900 p-2 font-bold bg-slate-50 w-1/3">
                Coordinador(a)
              </td>
              <td colSpan={2} className="border border-slate-900 p-2 font-bold bg-slate-50">
                Analistas DECE
              </td>
            </tr>
            <tr>
              <td className="border border-slate-900 p-2 align-top">
                {plan.coordinator_name || "Psc. Ed. Ana María Albán"}
              </td>
              <td colSpan={2} className="border border-slate-900 p-2 align-top">
                {analysts.length > 0 ? (
                  <ol className="list-decimal list-inside space-y-0.5">
                    {analysts.map((a, i) => (
                      <li key={i}>{a.name}</li>
                    ))}
                  </ol>
                ) : (
                  "Equipo DECE Institucional"
                )}
              </td>
            </tr>
            <tr>
              <td className="border border-slate-900 p-2 font-bold bg-slate-100">
                Período lectivo:
              </td>
              <td className="border border-slate-900 p-2 font-semibold">
                {plan.school_year_text}
              </td>
              <td className="border border-slate-900 p-2 font-bold bg-slate-100 w-1/4">
                Número de estudiantes a atender:
              </td>
              <td className="border border-slate-900 p-2 font-bold">
                {plan.students_count}
              </td>
            </tr>
            {plan.available_resources && (
              <tr>
                <td className="border border-slate-900 p-2 font-bold bg-slate-100">
                  Suministros y recursos:
                </td>
                <td colSpan={3} className="border border-slate-900 p-2 text-[11px]">
                  {plan.available_resources}
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Matriz Completa de Actividades */}
        <table className="w-full mt-4 border-collapse border border-slate-900 text-[10px] leading-snug">
          <thead>
            <tr className="bg-[#1B365D] text-white text-center font-bold uppercase text-[10px]">
              <th className="border border-slate-900 p-2 w-[18%]">Acción</th>
              <th className="border border-slate-900 p-2 w-[24%]">Actividades</th>
              <th className="border border-slate-900 p-2 w-[13%]">Población Objetivo</th>
              <th className="border border-slate-900 p-2 w-[17%]">Logro esperado (Estándar)</th>
              <th className="border border-slate-900 p-2 w-[8%]">Plazo de ejecución</th>
              <th className="border border-slate-900 p-2 w-[10%]">Insumos</th>
              <th className="border border-slate-900 p-2 w-[8%]">Responsable</th>
              <th className="border border-slate-900 p-2 w-[8%]">Observación</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => {
              const isFirstOfDimension =
                idx === 0 || items[idx - 1].dimension !== item.dimension;
              const isFirstOfComponent =
                idx === 0 || items[idx - 1].component !== item.component;

              return (
                <FragmentWrapper key={item.id}>
                  {isFirstOfDimension && (
                    <tr className="bg-[#1B365D] text-white font-extrabold text-[11px]">
                      <td colSpan={8} className="border border-slate-900 px-3 py-1.5 uppercase tracking-wide">
                        {item.dimension}
                      </td>
                    </tr>
                  )}
                  {isFirstOfComponent && (
                    <tr className="bg-[#D9E1F2] text-slate-900 font-bold text-[10px]">
                      <td colSpan={8} className="border border-slate-900 px-3 py-1.5 uppercase">
                        {item.component}
                      </td>
                    </tr>
                  )}
                  <tr className="hover:bg-slate-50">
                    <td className="border border-slate-900 p-1.5 align-top whitespace-pre-wrap font-medium">
                      {item.action}
                    </td>
                    <td className="border border-slate-900 p-1.5 align-top whitespace-pre-wrap">
                      {item.activities}
                    </td>
                    <td className="border border-slate-900 p-1.5 align-top whitespace-pre-wrap">
                      {item.target_population}
                    </td>
                    <td className="border border-slate-900 p-1.5 align-top whitespace-pre-wrap font-sans text-[9.5px]">
                      {item.expected_goal_standard}
                    </td>
                    <td className="border border-slate-900 p-1.5 align-top whitespace-pre-wrap text-center">
                      {item.execution_term}
                    </td>
                    <td className="border border-slate-900 p-1.5 align-top whitespace-pre-wrap">
                      {item.supplies_inputs}
                    </td>
                    <td className="border border-slate-900 p-1.5 align-top whitespace-pre-wrap text-center font-semibold">
                      {item.responsible}
                    </td>
                    <td className="border border-slate-900 p-1.5 align-top whitespace-pre-wrap text-[9px]">
                      {item.observations}
                    </td>
                  </tr>
                </FragmentWrapper>
              );
            })}
          </tbody>
        </table>

        {/* Sección: Evaluación y Ajustes */}
        {plan.evaluation_notes && (
          <div className="mt-4 border border-slate-900 rounded-none p-3 text-xs bg-slate-50 space-y-1">
            <div className="font-bold text-slate-900 uppercase">
              Evaluación y Ajustes:
            </div>
            <div className="whitespace-pre-wrap text-slate-800 text-[10.5px] leading-relaxed">
              {plan.evaluation_notes}
            </div>
          </div>
        )}

        {/* Firmas de Responsabilidad Oficiales (3 Columnas) */}
        <div className="mt-6 page-break-inside-avoid">
          <table className="w-full border-collapse border border-slate-900 text-center text-xs">
            <thead>
              <tr className="bg-slate-100 font-bold uppercase">
                <th className="border border-slate-900 p-1.5 w-1/3">ELABORACIÓN</th>
                <th className="border border-slate-900 p-1.5 w-1/3">REVISIÓN</th>
                <th className="border border-slate-900 p-1.5 w-1/3">APROBACIÓN</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                {/* Columna Elaboración */}
                <td className="border border-slate-900 p-3 align-top text-left space-y-4">
                  {elaboratedList.map((sig, i) => (
                    <div key={i} className="border-b border-slate-200 pb-2 last:border-0 last:pb-0">
                      <div className="font-bold">{sig.name}</div>
                      <div className="text-[10px] text-slate-600 uppercase">{sig.role}</div>
                      <div className="h-10 mt-2 border-b border-dashed border-slate-400"></div>
                      <div className="text-[9px] text-slate-500 mt-1">Fecha: {sig.date || "2025-09-08"}</div>
                    </div>
                  ))}
                </td>

                {/* Columna Revisión */}
                <td className="border border-slate-900 p-3 align-top text-left space-y-2">
                  <div className="font-bold">{reviewed?.name || plan.coordinator_name}</div>
                  <div className="text-[10px] text-slate-600 uppercase">{reviewed?.role || "COORDINADORA DECE"}</div>
                  <div className="h-16 mt-6 border-b border-dashed border-slate-400"></div>
                  <div className="text-[9px] text-slate-500 mt-1">Fecha: {reviewed?.date || "2025-10-30"}</div>
                </td>

                {/* Columna Aprobación */}
                <td className="border border-slate-900 p-3 align-top text-left space-y-2">
                  <div className="font-bold">{approved?.name || "Mg. Rectora / Autoridad"}</div>
                  <div className="text-[10px] text-slate-600 uppercase">{approved?.role || "RECTORA DE LA INSTITUCIÓN"}</div>
                  <div className="h-16 mt-6 border-b border-dashed border-slate-400"></div>
                  <div className="text-[9px] text-slate-500 mt-1">Fecha: {approved?.date || "2025-10-30"}</div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function FragmentWrapper({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
