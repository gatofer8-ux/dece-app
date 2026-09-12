import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireRole, requireInstitutionId } from "@/lib/session";
import {
  parseBianualAxisItems,
  parseBianualAnalysts,
  parseBianualSignatories,
  parseBianualSpecificObjectives,
} from "@/lib/strategicPlanBianual";
import type { StrategicBianualPlanRow, ActionPlanSignatory } from "@/lib/types";
import PrintButton from "@/components/PrintButton";

export default async function ImprimirPlanEstrategicoBianualPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await requireRole(["ADMIN", "DECE", "AUTORIDAD", "DISTRITO"]);
  const institutionId = session.user.role === "DISTRITO" ? null : requireInstitutionId(session);

  let query =
    "SELECT sp.*, i.name as inst_name, i.amie_code as inst_amie FROM strategic_plans_bianual sp JOIN institutions i ON i.id = sp.institution_id WHERE sp.id = ?";
  const queryParams: any[] = [params.id];

  if (institutionId) {
    query += " AND sp.institution_id = ?";
    queryParams.push(institutionId);
  }

  const plan = db.prepare(query).get(...queryParams) as
    | (StrategicBianualPlanRow & { inst_name: string; inst_amie: string })
    | undefined;

  if (!plan) notFound();

  const items = parseBianualAxisItems(plan.axis_items_data);
  const analysts = parseBianualAnalysts(plan.analysts_data);
  const objectives = parseBianualSpecificObjectives(plan.specific_objectives);
  const elaboratedList = parseBianualSignatories(plan.elaborated_by);
  const reviewed = plan.reviewed_by
    ? (JSON.parse(plan.reviewed_by) as ActionPlanSignatory)
    : null;
  const approved = plan.approved_by
    ? (JSON.parse(plan.approved_by) as ActionPlanSignatory)
    : null;

  return (
    <div className="bg-white min-h-screen text-slate-900 print:p-0">
      {/* Barra de herramientas (oculta al imprimir) */}
      <div className="no-print sticky top-0 z-30 bg-slate-900 text-white px-6 py-3 shadow-md flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/plan-estrategico-bianual"
            className="text-xs text-slate-300 hover:text-white bg-slate-800 px-3 py-1.5 rounded-md transition-colors"
          >
            ← Volver a Planes Bianuales
          </Link>
          <span className="text-xs text-slate-400 font-mono">
            Plan Estratégico Bianual {plan.period_text} ({items.length} metas)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={`/api/plan-estrategico-bianual/${plan.id}/export-word`}
            download
            className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold px-3 py-1.5 rounded-md flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <span>📝</span>
            <span>Descargar Word (.docx)</span>
          </a>

          <PrintButton />
        </div>
      </div>

      {/* Documento oficial */}
      <div className="max-w-[1400px] mx-auto p-4 sm:p-8 print:p-0 print:max-w-none print:w-full print:m-0 text-[11px] font-sans leading-tight">
        {/* Encabezado */}
        <div className="text-center pb-3 border-b-2 border-slate-900 space-y-1">
          <div className="text-xs font-bold uppercase tracking-widest text-slate-600">
            Ministerio de Educación del Ecuador
          </div>
          <div className="text-base sm:text-lg font-black tracking-tight text-slate-900 uppercase">
            PLAN ESTRATÉGICO BIANUAL DEL DEPARTAMENTO DE CONSEJERÍA ESTUDIANTIL DECE
          </div>
          <div className="text-xs font-bold text-slate-700">
            PERIODO BIANUAL {plan.period_text}
          </div>
        </div>

        {/* Datos informativos */}
        <div className="mt-4">
          <div className="bg-[#1B365D] text-white font-bold uppercase text-[11px] px-3 py-1.5 border border-slate-900">
            Datos informativos
          </div>
          <table className="w-full border-collapse border border-slate-900 text-xs">
            <tbody>
              <tr>
                <td className="border border-slate-900 p-2 font-bold bg-slate-100 w-1/4">
                  Institución Educativa:
                </td>
                <td colSpan={3} className="border border-slate-900 p-2 font-extrabold uppercase">
                  {plan.inst_name}
                </td>
              </tr>
              <tr>
                <td className="border border-slate-900 p-2 font-bold bg-slate-100">
                  Periodo Bianual:
                </td>
                <td className="border border-slate-900 p-2 font-semibold">
                  {plan.period_text}
                </td>
                <td className="border border-slate-900 p-2 font-bold bg-slate-100 w-1/4">
                  Distrito Educativo:
                </td>
                <td className="border border-slate-900 p-2">
                  {[plan.district_code, plan.district_name].filter(Boolean).join(" - ") || "—"}
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
                  {plan.coordinator_name || "Coordinación DECE"}
                </td>
                <td colSpan={2} className="border border-slate-900 p-2 align-top">
                  {analysts.length > 0 ? (
                    <ol className="list-decimal list-inside space-y-0.5">
                      {analysts.map((a, i) => (
                        <li key={i}>
                          {a.name}
                          {a.role ? ` — ${a.role}` : ""}
                        </li>
                      ))}
                    </ol>
                  ) : (
                    "Equipo DECE Institucional"
                  )}
                </td>
              </tr>
              <tr>
                <td className="border border-slate-900 p-2 font-bold bg-slate-100">
                  Número de estudiantes:
                </td>
                <td className="border border-slate-900 p-2 font-bold">
                  {plan.students_count}
                </td>
                <td className="border border-slate-900 p-2 font-bold bg-slate-100">
                  Número de profesionales DECE:
                </td>
                <td className="border border-slate-900 p-2 font-bold">
                  {plan.professionals_count}
                </td>
              </tr>
              {plan.available_resources && (
                <tr>
                  <td className="border border-slate-900 p-2 font-bold bg-slate-100">
                    Recursos institucionales:
                  </td>
                  <td colSpan={3} className="border border-slate-900 p-2 text-[11px]">
                    {plan.available_resources}
                  </td>
                </tr>
              )}
              {plan.socioeconomic_condition && (
                <tr>
                  <td className="border border-slate-900 p-2 font-bold bg-slate-100">
                    Condición socioeconómica:
                  </td>
                  <td colSpan={3} className="border border-slate-900 p-2 text-[11px]">
                    {plan.socioeconomic_condition}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Planificación: objetivos */}
        <div className="mt-4">
          <div className="bg-[#1B365D] text-white font-bold uppercase text-[11px] px-3 py-1.5 border border-slate-900">
            Planificación
          </div>
          <table className="w-full border-collapse border border-slate-900 text-xs">
            <tbody>
              <tr>
                <td className="border border-slate-900 p-2 font-bold bg-slate-100 w-1/5 align-top">
                  Objetivo general
                </td>
                <td className="border border-slate-900 p-2 text-justify whitespace-pre-wrap">
                  {plan.general_objective || "—"}
                </td>
              </tr>
              <tr>
                <td className="border border-slate-900 p-2 font-bold bg-slate-100 align-top">
                  Objetivos específicos
                </td>
                <td className="border border-slate-900 p-2">
                  {objectives.length > 0 ? (
                    <ol className="list-decimal list-inside space-y-1">
                      {objectives.map((o, i) => (
                        <li key={i} className="text-justify">
                          {o}
                        </li>
                      ))}
                    </ol>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Matriz por ejes de acción */}
        <table className="w-full mt-4 border-collapse border border-slate-900 text-[10px] leading-snug">
          <thead>
            <tr className="bg-[#1B365D] text-white text-center font-bold uppercase text-[10px]">
              <th className="border border-slate-900 p-2 w-[22%]">Metas</th>
              <th className="border border-slate-900 p-2 w-[28%]">Acciones</th>
              <th className="border border-slate-900 p-2 w-[15%]">Responsables</th>
              <th className="border border-slate-900 p-2 w-[22%]">Indicador de evaluación</th>
              <th className="border border-slate-900 p-2 w-[13%]">Plazos de ejecución</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => {
              const isFirstOfAxis = idx === 0 || items[idx - 1].axis !== item.axis;

              return (
                <FragmentWrapper key={item.id}>
                  {isFirstOfAxis && (
                    <tr className="bg-[#D9E1F2] text-slate-900 font-extrabold text-[11px]">
                      <td colSpan={5} className="border border-slate-900 px-3 py-1.5 uppercase tracking-wide">
                        {item.axis}
                      </td>
                    </tr>
                  )}
                  <tr className="hover:bg-slate-50">
                    <td className="border border-slate-900 p-1.5 align-top whitespace-pre-wrap font-medium">
                      {item.goal}
                    </td>
                    <td className="border border-slate-900 p-1.5 align-top whitespace-pre-wrap">
                      {item.actions}
                    </td>
                    <td className="border border-slate-900 p-1.5 align-top whitespace-pre-wrap text-center">
                      {item.responsible}
                    </td>
                    <td className="border border-slate-900 p-1.5 align-top whitespace-pre-wrap text-[9.5px]">
                      {item.evaluation_indicator}
                    </td>
                    <td className="border border-slate-900 p-1.5 align-top whitespace-pre-wrap text-center">
                      {item.execution_term}
                    </td>
                  </tr>
                </FragmentWrapper>
              );
            })}
          </tbody>
        </table>

        {/* Firmas */}
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
                <td className="border border-slate-900 p-3 align-top text-left space-y-4">
                  {elaboratedList.map((sig, i) => (
                    <div key={i} className="border-b border-slate-200 pb-2 last:border-0 last:pb-0">
                      <div className="font-bold">{sig.name}</div>
                      <div className="text-[10px] text-slate-600 uppercase">{sig.role}</div>
                      <div className="h-10 mt-2 border-b border-dashed border-slate-400"></div>
                      <div className="text-[9px] text-slate-500 mt-1">Fecha: {sig.date || ""}</div>
                    </div>
                  ))}
                </td>

                <td className="border border-slate-900 p-3 align-top text-left space-y-2">
                  <div className="font-bold">{reviewed?.name || plan.coordinator_name}</div>
                  <div className="text-[10px] text-slate-600 uppercase">
                    {reviewed?.role || "COORDINADORA DECE"}
                  </div>
                  <div className="h-16 mt-6 border-b border-dashed border-slate-400"></div>
                  <div className="text-[9px] text-slate-500 mt-1">Fecha: {reviewed?.date || ""}</div>
                </td>

                <td className="border border-slate-900 p-3 align-top text-left space-y-2">
                  <div className="font-bold">{approved?.name || "Autoridad Institucional"}</div>
                  <div className="text-[10px] text-slate-600 uppercase">
                    {approved?.role || "RECTORA DE LA INSTITUCIÓN"}
                  </div>
                  <div className="h-16 mt-6 border-b border-dashed border-slate-400"></div>
                  <div className="text-[9px] text-slate-500 mt-1">Fecha: {approved?.date || ""}</div>
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
