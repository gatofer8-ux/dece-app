"use client";

import { useState, useTransition, useMemo } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useToastOnChange } from "@/components/Toast";
import Link from "next/link";
import { createActionPlan, updateActionPlan, type ActionState } from "./actions";
import { generateActionPlanAiSuggestion, generateActionPlanGlobalAiSuggestion } from "./ai-actions";
import type { ActionPlanItem, ActionPlanAnalyst, ActionPlanSignatory } from "@/lib/types";
import { currentSchoolYearSpaced } from "@/lib/schoolYearText";
import { DECE_QUALITY_STANDARDS, calculatePlanStats } from "@/lib/actionPlan";
import VoiceDictationButton from "@/components/VoiceDictationButton";
import AIAssistButton from "@/components/AIAssistButton";

const initialState: ActionState = { error: null };

function SubmitButton({ isEditing }: { isEditing: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="btn-primary disabled:opacity-60 text-sm px-5 py-2.5 shadow-sm font-semibold flex items-center gap-2"
    >
      {pending ? (
        <>
          <span className="animate-spin">⏳</span>
          <span>Guardando plan...</span>
        </>
      ) : (
        <>
          <span>💾</span>
          <span>{isEditing ? "Actualizar Plan de Acción" : "Guardar Plan de Acción Oficial"}</span>
        </>
      )}
    </button>
  );
}

export default function ActionPlanForm({
  planId,
  institutionId,
  institutionName,
  schoolYears,
  defaultSchoolYearId,
  defaultSchoolYearText,
  defaultStudentsCount,
  defaultCoordinatorName,
  defaultAnalysts,
  defaultAvailableResources,
  defaultItems,
  defaultEvaluationNotes,
  defaultElaboratedBy,
  defaultReviewedBy,
  defaultApprovedBy,
  deceStaffNames = [],
  defaultDeceResponsibleName,
  isEditing = false,
}: {
  planId?: string;
  institutionId: string;
  institutionName: string;
  schoolYears: { id: string; name: string }[];
  defaultSchoolYearId: string;
  defaultSchoolYearText: string;
  defaultStudentsCount: number;
  defaultCoordinatorName: string;
  defaultAnalysts: ActionPlanAnalyst[];
  defaultAvailableResources: string;
  defaultItems: ActionPlanItem[];
  defaultEvaluationNotes?: string;
  defaultElaboratedBy?: ActionPlanSignatory[];
  defaultReviewedBy?: ActionPlanSignatory;
  defaultApprovedBy?: ActionPlanSignatory;
  deceStaffNames: string[];
  defaultDeceResponsibleName?: string;
  isEditing: boolean;
}) {
  const actionToUse = isEditing ? updateActionPlan.bind(null, planId!) : createActionPlan;
  const [state, formAction] = useFormState(actionToUse, initialState);
  useToastOnChange(state.error, "error");

  // Estados de cabecera institucional
  const [schoolYearId, setSchoolYearId] = useState(defaultSchoolYearId);
  const [schoolYearText, setSchoolYearText] = useState(defaultSchoolYearText);
  const [studentsCount, setStudentsCount] = useState<number>(defaultStudentsCount);
  const [coordinatorName, setCoordinatorName] = useState(defaultCoordinatorName);
  const [analysts, setAnalysts] = useState<ActionPlanAnalyst[]>(
    defaultAnalysts.length > 0 ? defaultAnalysts : [{ name: "", role: "Analista DECE" }]
  );
  const [availableResources, setAvailableResources] = useState(defaultAvailableResources || "");

  // Lista de items de la matriz (34 filas oficiales - sin asignación automática)
  const [items, setItems] = useState<ActionPlanItem[]>(() => {
    return defaultItems.map((item) => {
      let resp = item.responsible || "";
      // Limpiar cualquier residuo de borradores antiguos si existiera
      if (resp.toUpperCase().includes("SANTIAGO")) {
        resp = "";
      }
      return { ...item, responsible: resp };
    });
  });

  // Filtro por dimensión para trabajar cómodamente
  const [dimensionFilter, setDimensionFilter] = useState<string>("TODAS");

  // Evaluación y ajustes
  const [evaluationNotes, setEvaluationNotes] = useState(defaultEvaluationNotes || "");

  // Firmas
  const [elaboratedList, setElaboratedList] = useState<ActionPlanSignatory[]>(
    defaultElaboratedBy && defaultElaboratedBy.length > 0
      ? defaultElaboratedBy
      : deceStaffNames.map((name) => ({
          name,
          role: name.toLowerCase().includes("coord") ? "COORDINADORA DECE" : "PROFESIONAL DECE",
          date: new Date().toISOString().slice(0, 10),
        }))
  );
  const [reviewedSignatory, setReviewedSignatory] = useState<ActionPlanSignatory>(
    defaultReviewedBy || {
      name: coordinatorName,
      role: "COORDINADORA DECE",
      date: new Date().toISOString().slice(0, 10),
    }
  );
  const [approvedSignatory, setApprovedSignatory] = useState<ActionPlanSignatory>(
    defaultApprovedBy || {
      name: "Mg. Rectora / Autoridad Institucional",
      role: "RECTORA DE LA INSTITUCIÓN",
      date: new Date().toISOString().slice(0, 10),
    }
  );

  // Estados de IA
  const [generatingItemAi, setGeneratingItemAi] = useState<string | null>(null);
  const [aiItemError, setAiItemError] = useState<string | null>(null);
  const [isPendingAiGlobal, startTransitionAiGlobal] = useTransition();

  // Estadísticas en tiempo real
  const stats = calculatePlanStats(items);

  // Modificar un campo de un item específico
  const updateItemField = (id: string, field: keyof ActionPlanItem, value: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  // Agregar nuevo analista
  const addAnalyst = () => {
    setAnalysts((prev) => [...prev, { name: "", role: "Analista DECE" }]);
  };

  const removeAnalyst = (idx: number) => {
    setAnalysts((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateAnalyst = (idx: number, field: keyof ActionPlanAnalyst, value: string) => {
    setAnalysts((prev) =>
      prev.map((a, i) => (i === idx ? { ...a, [field]: value } : a))
    );
  };

  // Agregar nueva fila personalizada
  const addItem = (dimension: string, component: string) => {
    const newItem: ActionPlanItem = {
      id: "custom_" + Date.now(),
      dimension,
      component,
      action: "Actividad complementaria institucional",
      activities: "",
      target_population: `Estudiantes (${studentsCount} total)`,
      expected_goal_standard: "",
      execution_term: "Todo el año lectivo",
      supplies_inputs: "Registro de asistencia y actas",
      responsible: coordinatorName || "TODOS",
      observations: "INFORME TÉCNICO",
    };
    setItems((prev) => [...prev, newItem]);
  };

  // Eliminar fila
  const removeItem = (id: string) => {
    if (confirm("¿Estás seguro de eliminar esta actividad del plan?")) {
      setItems((prev) => prev.filter((it) => it.id !== id));
    }
  };

  // Asistente IA para una fila
  const handleAiItemDraft = async (item: ActionPlanItem) => {
    setGeneratingItemAi(item.id);
    setAiItemError(null);

    const profList = analysts.map((a) => a.name).filter(Boolean);
    if (coordinatorName && !profList.includes(coordinatorName)) {
      profList.unshift(coordinatorName);
    }
    deceStaffNames.forEach((n) => {
      if (!profList.includes(n)) profList.push(n);
    });

    try {
      const res = await generateActionPlanAiSuggestion({
        dimension: item.dimension,
        component: item.component,
        action: item.action,
        expected_goal_standard: item.expected_goal_standard,
        institutionName,
        studentsCount,
        availableResources,
        professionalsList: profList,
        currentActivities: item.activities,
        currentTargetPopulation: item.target_population,
        currentSupplies: item.supplies_inputs,
        currentExecutionTerm: item.execution_term,
        currentResponsible: item.responsible,
      });

      if ("error" in res) {
        setAiItemError(res.error);
      } else {
        setItems((prev) =>
          prev.map((it) =>
            it.id === item.id
              ? {
                  ...it,
                  activities: res.activities || it.activities,
                  target_population: res.target_population || it.target_population,
                  execution_term: res.execution_term || it.execution_term,
                  supplies_inputs: res.supplies_inputs || it.supplies_inputs,
                  responsible: it.responsible || res.responsible || "",
                  observations: res.observations || it.observations,
                }
              : it
          )
        );
      }
    } catch (err: any) {
      setAiItemError(err?.message || "Ocurrió un error al contactar la IA.");
    } finally {
      setGeneratingItemAi(null);
    }
  };

  // Asistente IA Global para Evaluación y Ajustes
  const handleAiGlobalEvaluation = () => {
    startTransitionAiGlobal(async () => {
      const profList = analysts.map((a) => a.name).filter(Boolean);
      if (coordinatorName && !profList.includes(coordinatorName)) {
        profList.unshift(coordinatorName);
      }

      const res = await generateActionPlanGlobalAiSuggestion({
        institutionName,
        schoolYear: schoolYearText,
        studentsCount,
        availableResources,
        professionalsList: profList,
        coordinatorName,
      });

      if ("error" in res) {
        alert(res.error);
      } else if (res.evaluation_notes) {
        setEvaluationNotes(res.evaluation_notes);
      }
    });
  };

  // Lista unificada y sin duplicados de profesionales DECE de la institución
  const availableProfessionals = useMemo(() => {
    const list: string[] = [];
    if (coordinatorName?.trim() && !list.includes(coordinatorName.trim())) {
      list.push(coordinatorName.trim());
    }
    analysts.forEach((a) => {
      if (a.name?.trim() && !list.includes(a.name.trim())) {
        list.push(a.name.trim());
      }
    });
    deceStaffNames.forEach((n) => {
      if (n?.trim() && !list.includes(n.trim())) {
        list.push(n.trim());
      }
    });
    if (defaultDeceResponsibleName?.trim() && !list.includes(defaultDeceResponsibleName.trim())) {
      list.push(defaultDeceResponsibleName.trim());
    }
    return list;
  }, [coordinatorName, analysts, deceStaffNames, defaultDeceResponsibleName]);

  // Filtro por responsable ("TODAS" | "A_CARGO_TODOS" | "UN_PROFESIONAL" | "SIN_ASIGNAR")
  const [responsibleFilter, setResponsibleFilter] = useState<string>("TODAS");

  // Conteos para pestañas de responsable
  const countTodos = useMemo(() => items.filter((it) => it.responsible === "TODOS").length, [items]);
  const countSingle = useMemo(
    () => items.filter((it) => it.responsible && it.responsible !== "TODOS").length,
    [items]
  );
  const countUnassigned = useMemo(() => items.filter((it) => !it.responsible?.trim()).length, [items]);

  // Asignación rápida en bloque (a todas las actividades visibles)
  const bulkAssignResponsible = (responsibleValue: string) => {
    setItems((prev) =>
      prev.map((item) => {
        if (dimensionFilter !== "TODAS" && item.dimension !== dimensionFilter) {
          return item;
        }
        return { ...item, responsible: responsibleValue };
      })
    );
  };

  // Lista de dimensiones únicas para pestañas
  const dimensions = Array.from(new Set(items.map((it) => it.dimension)));

  // Items visibles filtrados por dimensión y por responsable
  const visibleItems = useMemo(() => {
    return items.filter((it) => {
      if (dimensionFilter !== "TODAS" && it.dimension !== dimensionFilter) {
        return false;
      }
      if (responsibleFilter === "A_CARGO_TODOS") {
        return it.responsible === "TODOS";
      }
      if (responsibleFilter === "UN_PROFESIONAL") {
        return it.responsible && it.responsible !== "TODOS";
      }
      if (responsibleFilter === "SIN_ASIGNAR") {
        return !it.responsible?.trim();
      }
      return true;
    });
  }, [items, dimensionFilter, responsibleFilter]);

  return (
    <form action={formAction} className="space-y-8">
      {/* Hidden inputs para server action */}
      <input type="hidden" name="school_year_id" value={schoolYearId} />
      <input type="hidden" name="school_year_text" value={schoolYearText} />
      <input type="hidden" name="students_count" value={studentsCount} />
      <input type="hidden" name="coordinator_name" value={coordinatorName} />
      <input type="hidden" name="analysts_data" value={JSON.stringify(analysts)} />
      <input type="hidden" name="available_resources" value={availableResources} />
      <input type="hidden" name="items_data" value={JSON.stringify(items)} />
      <input type="hidden" name="evaluation_notes" value={evaluationNotes} />
      <input type="hidden" name="elaborated_by" value={JSON.stringify(elaboratedList)} />
      <input type="hidden" name="reviewed_by" value={JSON.stringify(reviewedSignatory)} />
      <input type="hidden" name="approved_by" value={JSON.stringify(approvedSignatory)} />

      {/* Alerta de Error de envío */}
      {state.error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800 flex items-start gap-3">
          <span className="text-xl">⚠️</span>
          <div>
            <div className="font-bold">Error al guardar el plan de acción</div>
            <div>{state.error}</div>
          </div>
        </div>
      )}

      {/* Cabecera Principal */}
      <div className="card p-6 bg-gradient-to-br from-brand-900 via-brand-850 to-brand-800 text-white rounded-2xl shadow-md border-0">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full text-xs font-semibold text-brand-100 uppercase tracking-wider">
              <span>🏛️</span>
              <span>{institutionName}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              PLAN DE ACCIÓN ANUAL DECE (POA)
            </h1>
            <p className="text-xs sm:text-sm text-brand-200 max-w-3xl leading-relaxed">
              Formato oficial articulado a los 14 Estándares de Calidad y 4 Dimensiones de la gestión DECE.
              Ajustado a la población real de estudiantes, recursos disponibles y equipo profesional asignado.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 self-start lg:self-center">
            <Link
              href="/plan-accion"
              className="px-4 py-2 text-xs font-semibold text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
            >
              Cancelar
            </Link>
            <SubmitButton isEditing={isEditing} />
          </div>
        </div>

        {/* Barra de progreso de asignación */}
        <div className="mt-6 pt-6 border-t border-white/15 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <div className="bg-white/10 p-3 rounded-xl backdrop-blur-xs">
            <div className="text-xs text-brand-200">Actividades Totales</div>
            <div className="text-xl sm:text-2xl font-black text-white">{stats.totalItems}</div>
            <div className="text-[10px] text-brand-300">({stats.activitiesCount} acciones específicas)</div>
          </div>
          <div className="bg-white/10 p-3 rounded-xl backdrop-blur-xs">
            <div className="text-xs text-brand-200">Estudiantes a Atender</div>
            <div className="text-xl sm:text-2xl font-black text-white">{studentsCount}</div>
            <div className="text-[10px] text-brand-300">Matrícula institucional</div>
          </div>
          <div className="bg-white/10 p-3 rounded-xl backdrop-blur-xs">
            <div className="text-xs text-brand-200">Estándares MINEDUC</div>
            <div className="text-xl sm:text-2xl font-black text-emerald-300">14 / 14</div>
            <div className="text-[10px] text-emerald-200">100% articulados</div>
          </div>
          <div className="bg-white/10 p-3 rounded-xl backdrop-blur-xs">
            <div className="text-xs text-brand-200">Responsables Asignados</div>
            <div className="text-xl sm:text-2xl font-black text-white">{stats.completionPercent}%</div>
            <div className="text-[10px] text-brand-300">{stats.itemsWithResponsible} de {stats.totalItems} filas</div>
          </div>
        </div>
      </div>

      {/* Datos Institucionales y de Planificación */}
      <div className="card p-6 space-y-6 shadow-xs border border-slate-200">
        <h2 className="text-base font-bold text-slate-800 flex items-center gap-2 border-b pb-3">
          <span>📋</span>
          <span>1. Información General y Recursos Institucionales</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Año Lectivo */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Año Lectivo *
            </label>
            {schoolYears.length > 0 ? (
              <select
                value={schoolYearId}
                onChange={(e) => {
                  setSchoolYearId(e.target.value);
                  const sy = schoolYears.find((y) => y.id === e.target.value);
                  if (sy) setSchoolYearText(sy.name);
                }}
                className="select w-full text-sm"
              >
                {schoolYears.map((sy) => (
                  <option key={sy.id} value={sy.id}>
                    {sy.name}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={schoolYearText}
                onChange={(e) => setSchoolYearText(e.target.value)}
                className="input w-full text-sm"
                placeholder={currentSchoolYearSpaced()}
              />
            )}
          </div>

          {/* Número de estudiantes a atender */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Número de Estudiantes a Atender *
            </label>
            <div className="relative">
              <input
                type="number"
                value={studentsCount}
                onChange={(e) => setStudentsCount(parseInt(e.target.value, 10) || 0)}
                className="input w-full text-sm pr-12 font-semibold text-slate-800"
                min={0}
              />
              <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-medium">
                alumnos
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              La IA calculará el alcance de las actividades basándose en esta cifra ({studentsCount} estudiantes).
            </p>
          </div>

          {/* Coordinador DECE */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Coordinador(a) DECE *
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={coordinatorName}
                onChange={(e) => setCoordinatorName(e.target.value)}
                className="input w-full text-sm"
                placeholder="Psc. Ed. Ana María Albán"
              />
              <VoiceDictationButton
                targetId="dictation_target" compact
                onResult={(text) => setCoordinatorName(text)}
              />
            </div>
            {deceStaffNames.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {deceStaffNames.map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setCoordinatorName(name)}
                    className="text-[10px] bg-slate-100 hover:bg-brand-50 text-slate-700 hover:text-brand-700 px-2 py-0.5 rounded border border-slate-200 transition-colors"
                  >
                    {name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Analistas DECE */}
        <div className="space-y-3 pt-3 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-700">
              Analistas / Profesionales DECE Responsables
            </label>
            <button
              type="button"
              onClick={addAnalyst}
              className="text-xs text-brand-700 hover:text-brand-900 font-semibold flex items-center gap-1"
            >
              <span>➕</span>
              <span>Agregar Analista</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {analysts.map((analyst, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-lg"
              >
                <div className="flex-1 space-y-1">
                  <input
                    type="text"
                    value={analyst.name}
                    onChange={(e) => updateAnalyst(idx, "name", e.target.value)}
                    placeholder="Nombre del analista (ej. Psc. Marlon Jácome)"
                    className="input w-full text-xs py-1.5"
                  />
                  <input
                    type="text"
                    value={analyst.role}
                    onChange={(e) => updateAnalyst(idx, "role", e.target.value)}
                    placeholder="Cargo / Rol (ej. Analista DECE)"
                    className="input w-full text-[11px] py-1 text-slate-500"
                  />
                </div>
                {analysts.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeAnalyst(idx)}
                    className="text-red-500 hover:text-red-700 p-1 text-xs"
                    title="Quitar analista"
                  >
                    ✖
                  </button>
                )}
              </div>
            ))}
          </div>

          {deceStaffNames.length > 0 && (
            <div className="text-xs text-slate-500 flex items-center gap-2 pt-1">
              <span>Sugerencias del equipo:</span>
              <div className="flex flex-wrap gap-1">
                {deceStaffNames.map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => {
                      if (!analysts.some((a) => a.name === name)) {
                        setAnalysts((prev) => [...prev, { name, role: "Analista DECE" }]);
                      }
                    }}
                    className="text-[10px] bg-brand-50 text-brand-700 px-2 py-0.5 rounded border border-brand-200 hover:bg-brand-100"
                  >
                    + {name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Recursos y Suministros Disponibles */}
        <div className="pt-3 border-t border-slate-100">
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-semibold text-slate-700">
              Suministros y Recursos Disponibles en la Institución *
            </label>
            <VoiceDictationButton
              targetId="dictation_target" compact
              onResult={(t) =>
                setAvailableResources((prev) => (prev ? prev + " " + t : t))
              }
            />
          </div>
          <textarea
            value={availableResources}
            onChange={(e) => setAvailableResources(e.target.value)}
            rows={2}
            className="textarea w-full text-xs"
            placeholder="Detalla los recursos materiales y logísticos disponibles (ej. Hojas de papel bond, computadoras, proyectores de aula, reactivos OVP impresos, actas de compromiso, matrices digitales)..."
          />
          <p className="text-[11px] text-slate-500 mt-1">
            💡 La IA utilizará estos suministros reales para no proponer insumos inaccesibles o irreales en las actividades.
          </p>
        </div>
      </div>

      {/* Matriz del Plan de Acción (Dimensiones y Estándares) */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span>🎯</span>
              <span>2. Matriz Operativa de Actividades (4 Dimensiones y 14 Estándares)</span>
            </h2>
            <p className="text-xs text-slate-500">
              Cada actividad cuenta con dictado por voz (🎤) y asistencia de IA (✨) fundamentada en los Estándares de Calidad.
            </p>
          </div>

          {/* Selector de Pestañas de Dimensión */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setDimensionFilter("TODAS")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                dimensionFilter === "TODAS"
                  ? "bg-white text-brand-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Todas ({items.length})
            </button>
            {dimensions.map((dim, i) => {
              const count = items.filter((it) => it.dimension === dim).length;
              const shortName = dim.replace("DIMENSIÓN: ", "").toLowerCase();
              return (
                <button
                  key={dim}
                  type="button"
                  onClick={() => setDimensionFilter(dim)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg capitalize transition-all ${
                    dimensionFilter === dim
                      ? "bg-white text-brand-900 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {i + 1}. {shortName.split(" ")[0]} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Barra de Pestañas para Escoger Responsables y Asignación Rápida */}
        <div className="bg-gradient-to-r from-slate-50 to-blue-50/40 border border-slate-200 p-3.5 rounded-xl space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            {/* Pestañas de Filtrado por Tipo de Responsable */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <span>📑</span>
                <span>Pestañas por Responsable:</span>
              </span>
              <div className="flex flex-wrap items-center gap-1 bg-white p-1 rounded-lg border border-slate-200 text-xs shadow-2xs">
                <button
                  type="button"
                  onClick={() => setResponsibleFilter("TODAS")}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                    responsibleFilter === "TODAS"
                      ? "bg-slate-900 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  Todas ({items.length})
                </button>
                <button
                  type="button"
                  onClick={() => setResponsibleFilter("A_CARGO_TODOS")}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-all flex items-center gap-1 ${
                    responsibleFilter === "A_CARGO_TODOS"
                      ? "bg-purple-700 text-white shadow-xs"
                      : "text-purple-700 hover:bg-purple-50"
                  }`}
                >
                  <span>👥</span>
                  <span>A cargo de TODOS ({countTodos})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setResponsibleFilter("UN_PROFESIONAL")}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-all flex items-center gap-1 ${
                    responsibleFilter === "UN_PROFESIONAL"
                      ? "bg-blue-700 text-white shadow-xs"
                      : "text-blue-700 hover:bg-blue-50"
                  }`}
                >
                  <span>👤</span>
                  <span>Un solo profesional ({countSingle})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setResponsibleFilter("SIN_ASIGNAR")}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-all flex items-center gap-1 ${
                    responsibleFilter === "SIN_ASIGNAR"
                      ? "bg-amber-600 text-white shadow-xs"
                      : "text-amber-700 hover:bg-amber-50"
                  }`}
                >
                  <span>⚠️</span>
                  <span>Sin asignar ({countUnassigned})</span>
                </button>
              </div>
            </div>

            {/* Asignación Rápida en Bloque */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <span>⚡</span>
                <span>Asignar en bloque:</span>
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    if (confirm(`¿Deseas asignar "TODOS" a las ${visibleItems.length} actividades de esta vista?`)) {
                      bulkAssignResponsible("TODOS");
                    }
                  }}
                  className="px-2.5 py-1 text-xs font-bold rounded-lg text-purple-700 bg-purple-100/80 hover:bg-purple-200 border border-purple-200 transition-all flex items-center gap-1"
                  title="Asignar 'TODOS' a las actividades visibles"
                >
                  <span>👥</span>
                  <span>Todas a "TODOS"</span>
                </button>

                {availableProfessionals.length === 1 ? (
                  <button
                    type="button"
                    onClick={() => {
                      const prof = availableProfessionals[0];
                      if (confirm(`¿Deseas asignar las ${visibleItems.length} actividades a ${prof}?`)) {
                        bulkAssignResponsible(prof);
                      }
                    }}
                    className="px-2.5 py-1 text-xs font-bold rounded-lg text-blue-700 bg-blue-100/80 hover:bg-blue-200 border border-blue-200 transition-all flex items-center gap-1"
                  >
                    <span>👤</span>
                    <span>Todas a {availableProfessionals[0].split(" ")[0]}</span>
                  </button>
                ) : (
                  <select
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val) {
                        if (confirm(`¿Deseas asignar las ${visibleItems.length} actividades visibles a ${val}?`)) {
                          bulkAssignResponsible(val);
                        }
                        e.target.value = "";
                      }
                    }}
                    defaultValue=""
                    className="select select-xs text-xs font-bold border-blue-300 text-blue-800 bg-blue-50 py-1"
                  >
                    <option value="" disabled>👤 Asignar todas a un profesional...</option>
                    {availableProfessionals.map((p) => (
                      <option key={p} value={p}>👤 {p}</option>
                    ))}
                  </select>
                )}

                <button
                  type="button"
                  onClick={() => {
                    if (confirm(`¿Deseas dejar sin asignar las ${visibleItems.length} actividades visibles?`)) {
                      bulkAssignResponsible("");
                    }
                  }}
                  className="text-xs text-slate-500 hover:text-red-600 px-2 py-1 font-medium underline"
                  title="Dejar actividades sin asignar"
                >
                  Limpiar
                </button>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <span>💡</span>
            <span>
              <strong>Sin asignación automática</strong>: puedes asignar cada actividad individualmente con la pestaña de cada tarjeta, o usar los botones rápidos para asignar todo el bloque a <em>TODOS</em> o a <em>un solo profesional</em>.
            </span>
          </div>
        </div>

        {aiItemError && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center justify-between">
            <span>⚠️ {aiItemError}</span>
            <button
              type="button"
              onClick={() => setAiItemError(null)}
              className="text-red-500 font-bold"
            >
              ✖
            </button>
          </div>
        )}

        {/* Lista de Filas */}
        <div className="space-y-6">
          {visibleItems.map((item, idx) => {
            const isFirstOfComponent =
              idx === 0 || visibleItems[idx - 1].component !== item.component;
            const isFirstOfDimension =
              idx === 0 || visibleItems[idx - 1].dimension !== item.dimension;
            const standardCodeMatch = item.expected_goal_standard.match(/E.Dd+.[A-Z0-9.]+/);
            const standardCode = standardCodeMatch ? standardCodeMatch[0] : "";
            const standardInfo = DECE_QUALITY_STANDARDS.find(
              (s) => s.code === standardCode || standardCode.startsWith(s.code)
            );
            const isAiLoading = generatingItemAi === item.id;

            return (
              <div key={item.id} className="space-y-3">
                {/* Banner de Dimensión si corresponde */}
                {isFirstOfDimension && (
                  <div className="bg-brand-900 text-white px-5 py-3 rounded-xl shadow-xs flex items-center justify-between">
                    <span className="font-extrabold text-sm tracking-wide">
                      {item.dimension}
                    </span>
                    <span className="text-xs bg-white/20 px-2.5 py-0.5 rounded-full font-medium">
                      Dimensión Oficial
                    </span>
                  </div>
                )}

                {/* Banner de Componente si corresponde */}
                {isFirstOfComponent && (
                  <div className="bg-brand-50 border-l-4 border-brand-600 text-brand-950 px-4 py-2.5 rounded-r-lg font-bold text-xs uppercase tracking-wider flex items-center justify-between">
                    <span>{item.component}</span>
                    <button
                      type="button"
                      onClick={() => addItem(item.dimension, item.component)}
                      className="text-[11px] text-brand-700 hover:text-brand-900 font-semibold lowercase bg-white px-2 py-0.5 rounded border border-brand-200"
                    >
                      + agregar fila a este componente
                    </button>
                  </div>
                )}

                {/* Tarjeta de la Fila del Plan */}
                <div className="card p-5 border border-slate-200 hover:border-brand-300 transition-colors shadow-xs space-y-4">
                  {/* Encabezado de la Fila */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3 border-b border-slate-100">
                    <div className="space-y-1 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="bg-slate-800 text-white text-[11px] font-bold px-2 py-0.5 rounded">
                          Fila #{items.indexOf(item) + 1}
                        </span>
                        {standardInfo && (
                          <span
                            className="bg-emerald-100 text-emerald-800 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-emerald-300 flex items-center gap-1"
                            title={standardInfo.description}
                          >
                            <span>🎯</span>
                            <span>{standardInfo.code}</span>
                            <span className="hidden md:inline font-normal text-emerald-700">
                              - {standardInfo.name}
                            </span>
                          </span>
                        )}
                        {item.responsible === "TODOS" ? (
                          <span className="bg-purple-100 text-purple-800 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-purple-200 flex items-center gap-1 shadow-2xs">
                            <span>👥</span>
                            <span>A cargo de: TODOS</span>
                          </span>
                        ) : item.responsible ? (
                          <span className="bg-blue-100 text-blue-800 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-blue-200 flex items-center gap-1 shadow-2xs">
                            <span>👤</span>
                            <span>A cargo de: {item.responsible}</span>
                          </span>
                        ) : (
                          <span className="bg-amber-100 text-amber-800 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-amber-300 flex items-center gap-1 shadow-2xs">
                            <span>⚠️</span>
                            <span>Sin asignar</span>
                          </span>
                        )}
                      </div>
                      <div className="text-sm font-bold text-slate-900 pt-1">
                        {item.action}
                      </div>
                    </div>

                    {/* Botones de Acción de Fila */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        disabled={isAiLoading}
                        onClick={() => handleAiItemDraft(item)}
                        className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5 text-brand-700 border-brand-200 bg-brand-50 hover:bg-brand-100 font-semibold shadow-2xs"
                        title="La IA ajustará las actividades al número de estudiantes (1922), suministros y DECE institucional"
                      >
                        {isAiLoading ? (
                          <>
                            <span className="animate-spin">⏳</span>
                            <span>Generando...</span>
                          </>
                        ) : (
                          <>
                            <span>✨</span>
                            <span>Ayuda IA (Estándar)</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="text-slate-400 hover:text-red-600 p-1 text-xs"
                        title="Eliminar esta fila"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  {/* Campos Editables */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Columna Izquierda: Actividades y Población */}
                    <div className="space-y-4">
                      {/* Actividades */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-bold text-slate-700">
                            Actividades Detalladas y Metodología *
                          </label>
                          <VoiceDictationButton
                            targetId="dictation_target" compact
                            onResult={(t) =>
                              updateItemField(
                                item.id,
                                "activities",
                                item.activities ? item.activities + "\n" + t : t
                              )
                            }
                          />
                        </div>
                        <textarea
                          rows={4}
                          value={item.activities}
                          onChange={(e) =>
                            updateItemField(item.id, "activities", e.target.value)
                          }
                          className="textarea w-full text-xs font-mono text-slate-800 leading-relaxed"
                          placeholder="1. Taller de sensibilización...\n2. Aplicación de reactivos..."
                        />
                      </div>

                      {/* Población Objetivo */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-semibold text-slate-700">
                            Población Objetivo *
                          </label>
                          <VoiceDictationButton
                            targetId="dictation_target" compact
                            onResult={(t) =>
                              updateItemField(
                                item.id,
                                "target_population",
                                item.target_population ? item.target_population + " " + t : t
                              )
                            }
                          />
                        </div>
                        <textarea
                          rows={2}
                          value={item.target_population}
                          onChange={(e) =>
                            updateItemField(item.id, "target_population", e.target.value)
                          }
                          className="textarea w-full text-xs"
                          placeholder="Estudiantes de 10mo EGB y 3ro BGU, Docentes Tutores, Familias..."
                        />
                      </div>
                    </div>

                    {/* Columna Derecha: Logro Esperado, Plazo, Insumos, Responsable */}
                    <div className="space-y-4">
                      {/* Logro esperado / Estándar */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Logro Esperado / Código Estándar de Calidad
                        </label>
                        <textarea
                          rows={2}
                          value={item.expected_goal_standard}
                          onChange={(e) =>
                            updateItemField(item.id, "expected_goal_standard", e.target.value)
                          }
                          className="textarea w-full text-xs bg-slate-50 text-slate-700"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Plazo de ejecución */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-xs font-semibold text-slate-700">
                              Plazo de Ejecución
                            </label>
                            <VoiceDictationButton
                              targetId="dictation_target" compact
                              onResult={(t) =>
                                updateItemField(item.id, "execution_term", t)
                              }
                            />
                          </div>
                          <input
                            type="text"
                            value={item.execution_term}
                            onChange={(e) =>
                              updateItemField(item.id, "execution_term", e.target.value)
                            }
                            className="input w-full text-xs"
                            placeholder="Octubre 2025 o Todo el año"
                          />
                          <div className="flex flex-wrap gap-1 mt-1">
                            {["1er Trimestre", "2do Trimestre", "3er Trimestre", "Todo el año"].map(
                              (t) => (
                                <button
                                  key={t}
                                  type="button"
                                  onClick={() => updateItemField(item.id, "execution_term", t)}
                                  className="text-[9px] bg-slate-100 hover:bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded"
                                >
                                  {t}
                                </button>
                              )
                            )}
                          </div>
                        </div>

                        {/* Pestaña / Selector para escoger Responsable (Un solo profesional o TODOS) */}
                        <div className="space-y-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                              <span>👤</span>
                              <span>Responsable de la Actividad *</span>
                            </label>
                            {!item.responsible ? (
                              <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold border border-amber-300 flex items-center gap-1">
                                <span>⚠️</span>
                                <span>Sin asignar</span>
                              </span>
                            ) : item.responsible === "TODOS" ? (
                              <span className="text-[10px] bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full font-bold border border-purple-200 flex items-center gap-1">
                                <span>👥</span>
                                <span>TODOS</span>
                              </span>
                            ) : (
                              <span
                                className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-bold border border-blue-200 flex items-center gap-1 truncate max-w-[150px]"
                                title={item.responsible}
                              >
                                <span>👤</span>
                                <span>{item.responsible}</span>
                              </span>
                            )}
                          </div>

                          {/* Pestañas para escoger: TODOS o Un solo profesional */}
                          <div className="grid grid-cols-2 gap-1.5 p-1 bg-white border border-slate-200 rounded-lg">
                            <button
                              type="button"
                              onClick={() => updateItemField(item.id, "responsible", "TODOS")}
                              className={`py-1.5 px-2 text-xs font-bold rounded-md flex items-center justify-center gap-1.5 transition-all ${
                                item.responsible === "TODOS"
                                  ? "bg-purple-600 text-white shadow-xs"
                                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                              }`}
                            >
                              <span>👥</span>
                              <span>TODOS (Equipo)</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                if (item.responsible === "TODOS" || !item.responsible) {
                                  const defaultProf = availableProfessionals[0] || "Profesional DECE";
                                  updateItemField(item.id, "responsible", defaultProf);
                                }
                              }}
                              className={`py-1.5 px-2 text-xs font-bold rounded-md flex items-center justify-center gap-1.5 transition-all ${
                                item.responsible && item.responsible !== "TODOS"
                                  ? "bg-blue-600 text-white shadow-xs"
                                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                              }`}
                            >
                              <span>👤</span>
                              <span>Un solo profesional</span>
                            </button>
                          </div>

                          {/* Contenido según la pestaña activa */}
                          {item.responsible === "TODOS" ? (
                            <div className="flex items-center justify-between text-xs text-purple-900 bg-purple-50/80 p-2.5 rounded-lg border border-purple-200">
                              <div className="flex items-center gap-1.5">
                                <span className="text-purple-600 font-bold">✓</span>
                                <span>Asignada a <strong>todo el equipo DECE</strong> institucional.</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => updateItemField(item.id, "responsible", "")}
                                className="text-[11px] text-purple-700 hover:text-purple-900 font-semibold underline shrink-0 ml-2"
                                title="Dejar sin asignar"
                              >
                                Desmarcar
                              </button>
                            </div>
                          ) : item.responsible && item.responsible !== "TODOS" ? (
                            <div className="space-y-2 bg-blue-50/50 p-2.5 rounded-lg border border-blue-200">
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] font-semibold text-blue-900">
                                  Selecciona el profesional a cargo:
                                </span>
                                <button
                                  type="button"
                                  onClick={() => updateItemField(item.id, "responsible", "")}
                                  className="text-[11px] text-slate-500 hover:text-red-600 underline"
                                  title="Dejar sin asignar"
                                >
                                  Desmarcar
                                </button>
                              </div>

                              {/* Pestaña desplegable (Select) */}
                              <select
                                value={availableProfessionals.includes(item.responsible) ? item.responsible : "__CUSTOM__"}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (val && val !== "__CUSTOM__") {
                                    updateItemField(item.id, "responsible", val);
                                  }
                                }}
                                className="select select-sm w-full text-xs font-semibold border-blue-300 focus:border-blue-500 bg-white"
                              >
                                {availableProfessionals.map((prof) => (
                                  <option key={prof} value={prof}>
                                    👤 {prof}
                                  </option>
                                ))}
                                <option value="__CUSTOM__">✏️ Escribir otro nombre a mano...</option>
                              </select>

                              {/* Botones rápidos directos si hay varios profesionales */}
                              {availableProfessionals.length > 1 && (
                                <div className="flex flex-wrap items-center gap-1 pt-0.5">
                                  <span className="text-[10px] text-slate-500 font-medium">Asignar a:</span>
                                  {availableProfessionals.map((prof) => (
                                    <button
                                      key={prof}
                                      type="button"
                                      onClick={() => updateItemField(item.id, "responsible", prof)}
                                      className={`text-[10px] px-2 py-0.5 rounded-md border font-medium transition-all ${
                                        item.responsible === prof
                                          ? "bg-blue-600 text-white border-blue-600 font-bold shadow-2xs"
                                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                                      }`}
                                    >
                                      {prof.split(" ")[0]} {prof.split(" ")[1] || ""}
                                    </button>
                                  ))}
                                </div>
                              )}

                              {/* Input manual si no está en la lista o eligió escribir a mano */}
                              {(!availableProfessionals.includes(item.responsible) || item.responsible === "__CUSTOM__") && (
                                <input
                                  type="text"
                                  value={item.responsible === "__CUSTOM__" ? "" : item.responsible}
                                  onChange={(e) => updateItemField(item.id, "responsible", e.target.value)}
                                  placeholder="Nombre del profesional o entidad responsable..."
                                  className="input input-sm w-full text-xs bg-white"
                                  autoFocus
                                />
                              )}
                            </div>
                          ) : (
                            /* Estado: Sin asignar */
                            <div className="flex items-center justify-between text-xs text-slate-500 bg-white p-2.5 rounded-lg border border-dashed border-slate-300">
                              <span>Elige una opción arriba: <strong>TODOS</strong> o <strong>Un solo profesional</strong>.</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
{/* Insumos / Suministros */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-xs font-semibold text-slate-700">
                              Insumos y Suministros
                            </label>
                            <VoiceDictationButton
                              targetId="dictation_target" compact
                              onResult={(t) =>
                                updateItemField(
                                  item.id,
                                  "supplies_inputs",
                                  item.supplies_inputs ? item.supplies_inputs + " " + t : t
                                )
                              }
                            />
                          </div>
                          <textarea
                            rows={2}
                            value={item.supplies_inputs}
                            onChange={(e) =>
                              updateItemField(item.id, "supplies_inputs", e.target.value)
                            }
                            className="textarea w-full text-xs"
                            placeholder="Registros de asistencia, reactivos OVP, actas..."
                          />
                        </div>

                        {/* Observaciones */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-xs font-semibold text-slate-700">
                              Observaciones Técnicas
                            </label>
                            <VoiceDictationButton
                              targetId="dictation_target" compact
                              onResult={(t) =>
                                updateItemField(item.id, "observations", t)
                              }
                            />
                          </div>
                          <textarea
                            rows={2}
                            value={item.observations}
                            onChange={(e) =>
                              updateItemField(item.id, "observations", e.target.value)
                            }
                            className="textarea w-full text-xs"
                            placeholder="INFORME TÉCNICO DEL CUMPLIMIENTO AL ESTÁNDAR"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sección: Evaluación y Ajustes */}
      <div className="card p-6 space-y-4 shadow-xs border border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b pb-3">
          <div>
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <span>📊</span>
              <span>3. Evaluación y Ajustes del Plan de Acción</span>
            </h2>
            <p className="text-xs text-slate-500">
              Resultados alcanzados, nudos críticos y recomendaciones técnicas de ajuste trimestral.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isPendingAiGlobal}
              onClick={handleAiGlobalEvaluation}
              className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5 text-brand-700 bg-brand-50 border-brand-200 hover:bg-brand-100 font-semibold"
            >
              {isPendingAiGlobal ? (
                <>
                  <span className="animate-spin">⏳</span>
                  <span>Redactando evaluación...</span>
                </>
              ) : (
                <>
                  <span>✨</span>
                  <span>Generar Evaluación IA</span>
                </>
              )}
            </button>
            <VoiceDictationButton
              targetId="dictation_target" compact
              onResult={(t) =>
                setEvaluationNotes((prev) => (prev ? prev + "\n" + t : t))
              }
            />
          </div>
        </div>

        <textarea
          rows={5}
          value={evaluationNotes}
          onChange={(e) => setEvaluationNotes(e.target.value)}
          className="textarea w-full text-xs font-mono leading-relaxed"
          placeholder="• Resultados alcanzados en relación con los indicadores de evaluación de la planificación estratégica...&#10;• Nudos críticos en relación con la gestión técnica u organizacional...&#10;• Recomendaciones y compromisos para el ajuste continuo en los tres trimestres escolares..."
        />
      </div>

      {/* Sección: Firmas de Responsabilidad */}
      <div className="card p-6 space-y-6 shadow-xs border border-slate-200">
        <h2 className="text-base font-bold text-slate-800 flex items-center gap-2 border-b pb-3">
          <span>✍️</span>
          <span>4. Firmas de Responsabilidad Oficiales</span>
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ELABORACIÓN */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <div className="font-extrabold text-xs text-slate-700 uppercase tracking-wider pb-1 border-b border-slate-200 flex items-center justify-between">
              <span>ELABORACIÓN</span>
              <span className="text-[10px] text-brand-600 font-bold">Equipo DECE</span>
            </div>
            <div className="space-y-2">
              {elaboratedList.map((sig, i) => (
                <div key={i} className="space-y-1 bg-white p-2 rounded border border-slate-100">
                  <input
                    type="text"
                    value={sig.name}
                    onChange={(e) => {
                      const updated = [...elaboratedList];
                      updated[i].name = e.target.value;
                      setElaboratedList(updated);
                    }}
                    placeholder="Nombre completo"
                    className="input w-full text-xs font-medium"
                  />
                  <input
                    type="text"
                    value={sig.role}
                    onChange={(e) => {
                      const updated = [...elaboratedList];
                      updated[i].role = e.target.value;
                      setElaboratedList(updated);
                    }}
                    placeholder="Cargo"
                    className="input w-full text-[11px] text-slate-500"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* REVISIÓN */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <div className="font-extrabold text-xs text-slate-700 uppercase tracking-wider pb-1 border-b border-slate-200 flex items-center justify-between">
              <span>REVISIÓN</span>
              <span className="text-[10px] text-brand-600 font-bold">Coordinación</span>
            </div>
            <div className="space-y-2 bg-white p-2.5 rounded border border-slate-100">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600">Nombres y Apellidos</label>
                <input
                  type="text"
                  value={reviewedSignatory.name}
                  onChange={(e) =>
                    setReviewedSignatory((prev) => ({ ...prev, name: e.target.value }))
                  }
                  className="input w-full text-xs mt-1"
                  placeholder="Coordinador(a) DECE"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600">Cargo / Rol</label>
                <input
                  type="text"
                  value={reviewedSignatory.role}
                  onChange={(e) =>
                    setReviewedSignatory((prev) => ({ ...prev, role: e.target.value }))
                  }
                  className="input w-full text-xs mt-1"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600">Fecha de Revisión</label>
                <input
                  type="date"
                  value={reviewedSignatory.date}
                  onChange={(e) =>
                    setReviewedSignatory((prev) => ({ ...prev, date: e.target.value }))
                  }
                  className="input w-full text-xs mt-1"
                />
              </div>
            </div>
          </div>

          {/* APROBACIÓN */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <div className="font-extrabold text-xs text-slate-700 uppercase tracking-wider pb-1 border-b border-slate-200 flex items-center justify-between">
              <span>APROBACIÓN</span>
              <span className="text-[10px] text-brand-600 font-bold">Autoridad</span>
            </div>
            <div className="space-y-2 bg-white p-2.5 rounded border border-slate-100">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600">Nombres y Apellidos</label>
                <input
                  type="text"
                  value={approvedSignatory.name}
                  onChange={(e) =>
                    setApprovedSignatory((prev) => ({ ...prev, name: e.target.value }))
                  }
                  className="input w-full text-xs mt-1"
                  placeholder="Máxima Autoridad Institucional"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600">Cargo / Rol</label>
                <input
                  type="text"
                  value={approvedSignatory.role}
                  onChange={(e) =>
                    setApprovedSignatory((prev) => ({ ...prev, role: e.target.value }))
                  }
                  className="input w-full text-xs mt-1"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600">Fecha de Aprobación</label>
                <input
                  type="date"
                  value={approvedSignatory.date}
                  onChange={(e) =>
                    setApprovedSignatory((prev) => ({ ...prev, date: e.target.value }))
                  }
                  className="input w-full text-xs mt-1"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Barra Inferior Flotante de Guardado */}
      <div className="sticky bottom-4 z-20 bg-white/95 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-slate-200 flex items-center justify-between gap-4 max-w-4xl mx-auto">
        <div className="flex items-center gap-3">
          <span className="text-xl">💾</span>
          <div className="text-xs">
            <span className="font-bold text-slate-900">
              {items.length} actividades planificadas
            </span>
            <span className="text-slate-500 block">
              {stats.completionPercent}% con profesional asignado
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/plan-accion"
            className="btn-secondary text-xs px-4 py-2"
          >
            Volver a la lista
          </Link>
          <SubmitButton isEditing={isEditing} />
        </div>
      </div>
    </form>
  );
}
