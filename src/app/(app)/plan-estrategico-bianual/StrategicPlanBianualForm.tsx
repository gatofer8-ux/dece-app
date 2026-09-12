"use client";

import { useState, useMemo } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useToast, useToastOnChange } from "@/components/Toast";
import Link from "next/link";
import {
  createStrategicBianualPlan,
  updateStrategicBianualPlan,
  type ActionState,
} from "./actions";
import {
  generateBianualRowAiSuggestion,
  generateAutonomousBianualPlanAiSuggestion,
} from "./ai-actions";
import type {
  StrategicBianualAxisItem,
  ActionPlanAnalyst,
  ActionPlanSignatory,
} from "@/lib/types";
import { PREVENTION_AXIS_THEMES } from "@/lib/actionPlan";
import {
  STRATEGIC_BIANUAL_AXES,
  DEFAULT_GENERAL_OBJECTIVE,
  calculateBianualPlanStats,
  detectPreventionThemes,
  buildPeriodText,
} from "@/lib/strategicPlanBianual";
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
          <span>
            {isEditing
              ? "Actualizar Plan Estratégico Bianual"
              : "Guardar Plan Estratégico Bianual"}
          </span>
        </>
      )}
    </button>
  );
}

export default function StrategicPlanBianualForm({
  planId,
  institutionName,
  defaultPeriodStartYear,
  defaultPeriodEndYear,
  defaultDistrictCode,
  defaultDistrictName,
  defaultCoordinatorName,
  defaultAnalysts,
  defaultStudentsCount,
  defaultProfessionalsCount,
  defaultAvailableResources,
  defaultSocioeconomicCondition,
  defaultGeneralObjective,
  defaultSpecificObjectives,
  defaultItems,
  defaultElaboratedBy,
  defaultReviewedBy,
  defaultApprovedBy,
  deceStaffNames = [],
  isEditing = false,
}: {
  planId?: string;
  institutionName: string;
  defaultPeriodStartYear: string;
  defaultPeriodEndYear: string;
  defaultDistrictCode?: string;
  defaultDistrictName?: string;
  defaultCoordinatorName: string;
  defaultAnalysts: ActionPlanAnalyst[];
  defaultStudentsCount: number;
  defaultProfessionalsCount: number;
  defaultAvailableResources: string;
  defaultSocioeconomicCondition?: string;
  defaultGeneralObjective?: string;
  defaultSpecificObjectives: string[];
  defaultItems: StrategicBianualAxisItem[];
  defaultElaboratedBy?: ActionPlanSignatory[];
  defaultReviewedBy?: ActionPlanSignatory;
  defaultApprovedBy?: ActionPlanSignatory;
  deceStaffNames: string[];
  isEditing: boolean;
}) {
  const actionToUse = isEditing
    ? updateStrategicBianualPlan.bind(null, planId!)
    : createStrategicBianualPlan;
  const [state, formAction] = useFormState(actionToUse, initialState);
  useToastOnChange(state.error, "error");

  // Datos informativos
  const [startYear, setStartYear] = useState(defaultPeriodStartYear);
  const [endYear, setEndYear] = useState(defaultPeriodEndYear);
  const [districtCode, setDistrictCode] = useState(defaultDistrictCode || "");
  const [districtName, setDistrictName] = useState(defaultDistrictName || "");
  const [coordinatorName, setCoordinatorName] = useState(defaultCoordinatorName);
  const [analysts, setAnalysts] = useState<ActionPlanAnalyst[]>(
    defaultAnalysts.length > 0 ? defaultAnalysts : [{ name: "", role: "Analista DECE" }]
  );
  const [studentsCount, setStudentsCount] = useState<number>(defaultStudentsCount);
  const [professionalsCount, setProfessionalsCount] = useState<number>(
    defaultProfessionalsCount
  );
  const [availableResources, setAvailableResources] = useState(
    defaultAvailableResources || ""
  );
  const [socioeconomicCondition, setSocioeconomicCondition] = useState(
    defaultSocioeconomicCondition || ""
  );

  // Planificación estratégica
  const [generalObjective, setGeneralObjective] = useState(
    defaultGeneralObjective || DEFAULT_GENERAL_OBJECTIVE
  );
  const [specificObjectives, setSpecificObjectives] = useState<string[]>(
    defaultSpecificObjectives.length > 0 ? defaultSpecificObjectives : [""]
  );

  // Matriz de ejes de acción
  const [items, setItems] = useState<StrategicBianualAxisItem[]>(defaultItems);
  const [axisFilter, setAxisFilter] = useState<string>("TODOS");

  // Firmas
  const [elaboratedList, setElaboratedList] = useState<ActionPlanSignatory[]>(
    defaultElaboratedBy && defaultElaboratedBy.length > 0
      ? defaultElaboratedBy
      : deceStaffNames.map((name) => ({
          name,
          role: name.toLowerCase().includes("coord")
            ? "COORDINADORA DECE"
            : "PROFESIONAL DECE",
          date: new Date().toISOString().slice(0, 10),
        }))
  );
  const [reviewedSignatory, setReviewedSignatory] = useState<ActionPlanSignatory>(
    defaultReviewedBy || {
      name: defaultCoordinatorName,
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
  const toast = useToast();
  const [generatingRowAi, setGeneratingRowAi] = useState<string | null>(null);
  const [aiRowError, setAiRowError] = useState<string | null>(null);
  const [isAutonomousModalOpen, setIsAutonomousModalOpen] = useState(false);
  const [autonomousScope, setAutonomousScope] = useState<"PREVENCION" | "TODO">("TODO");
  const [isGeneratingAutonomous, setIsGeneratingAutonomous] = useState(false);

  const periodText = buildPeriodText(startYear, endYear);
  const stats = calculateBianualPlanStats(items);

  // Lista unificada de profesionales DECE de la institución
  const availableProfessionals = useMemo(() => {
    const list: string[] = [];
    if (coordinatorName?.trim()) list.push(coordinatorName.trim());
    analysts.forEach((a) => {
      if (a.name?.trim() && !list.includes(a.name.trim())) list.push(a.name.trim());
    });
    deceStaffNames.forEach((n) => {
      if (n?.trim() && !list.includes(n.trim())) list.push(n.trim());
    });
    return list;
  }, [coordinatorName, analysts, deceStaffNames]);

  const professionalsForAi = useMemo(() => {
    return availableProfessionals.length > 0
      ? availableProfessionals
      : ["Equipo DECE institucional"];
  }, [availableProfessionals]);

  // ── Analistas ──
  const addAnalyst = () =>
    setAnalysts((prev) => [...prev, { name: "", role: "Analista DECE" }]);
  const removeAnalyst = (idx: number) =>
    setAnalysts((prev) => prev.filter((_, i) => i !== idx));
  const updateAnalyst = (idx: number, field: keyof ActionPlanAnalyst, value: string) =>
    setAnalysts((prev) => prev.map((a, i) => (i === idx ? { ...a, [field]: value } : a)));

  // ── Objetivos específicos ──
  const addSpecificObjective = () => setSpecificObjectives((prev) => [...prev, ""]);
  const removeSpecificObjective = (idx: number) =>
    setSpecificObjectives((prev) => prev.filter((_, i) => i !== idx));
  const updateSpecificObjective = (idx: number, value: string) =>
    setSpecificObjectives((prev) => prev.map((o, i) => (i === idx ? value : o)));

  // ── Matriz ──
  const updateItemField = (
    id: string,
    field: keyof StrategicBianualAxisItem,
    value: string
  ) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const addItem = (axis: string) => {
    const newItem: StrategicBianualAxisItem = {
      id: "custom_" + Date.now(),
      axis,
      goal: "",
      actions: "",
      responsible: coordinatorName || "Equipo DECE",
      evaluation_indicator: "",
      execution_term: `Periodo bianual ${periodText}`,
    };
    // La fila nueva se ubica al final del bloque de su eje para conservar el
    // agrupamiento por banner que se imprime en el documento oficial.
    setItems((prev) => {
      const lastIdx = prev.reduce((acc, it, i) => (it.axis === axis ? i : acc), -1);
      if (lastIdx === -1) return [...prev, newItem];
      return [...prev.slice(0, lastIdx + 1), newItem, ...prev.slice(lastIdx + 1)];
    });
  };

  const removeItem = (id: string) => {
    if (confirm("¿Estás seguro de eliminar esta meta del plan estratégico bianual?")) {
      setItems((prev) => prev.filter((it) => it.id !== id));
    }
  };

  // ── IA por fila ──
  const handleAiRowDraft = async (item: StrategicBianualAxisItem) => {
    setGeneratingRowAi(item.id);
    setAiRowError(null);

    try {
      const res = await generateBianualRowAiSuggestion({
        axis: item.axis,
        goal: item.goal,
        institutionName,
        periodText,
        studentsCount,
        professionalsList: professionalsForAi,
        availableResources,
        socioeconomicCondition,
        currentActions: item.actions,
        currentResponsible: item.responsible,
        currentIndicator: item.evaluation_indicator,
        currentExecutionTerm: item.execution_term,
      });

      if ("error" in res) {
        setAiRowError(res.error);
      } else {
        setItems((prev) =>
          prev.map((it) =>
            it.id === item.id
              ? {
                  ...it,
                  goal: res.goal || it.goal,
                  actions: res.actions || it.actions,
                  responsible: it.responsible || res.responsible || "",
                  evaluation_indicator:
                    res.evaluation_indicator || it.evaluation_indicator,
                  execution_term: res.execution_term || it.execution_term,
                }
              : it
          )
        );
      }
    } catch (err: any) {
      setAiRowError(err?.message || "Ocurrió un error al contactar la IA.");
    } finally {
      setGeneratingRowAi(null);
    }
  };

  // ── Generación autónoma del plan bianual (Acuerdo 044-A) ──
  const handleAutonomousPlanGeneration = async () => {
    setIsGeneratingAutonomous(true);
    try {
      const res = await generateAutonomousBianualPlanAiSuggestion({
        institutionName,
        periodText,
        periodStartYear: startYear,
        periodEndYear: endYear,
        studentsCount,
        professionalsList: professionalsForAi,
        availableResources,
        socioeconomicCondition,
        targetScope: autonomousScope,
        currentItems: items,
      });

      setIsGeneratingAutonomous(false);
      if ("error" in res) {
        toast.error(res.error || "No se pudo generar el plan bianual autónomo.");
      } else {
        setItems(res.updatedItems);
        setIsAutonomousModalOpen(false);
        toast.success(
          `¡Plan bianual estructurado! Se calibraron ${res.appliedCount} metas${
            res.addedCount > 0
              ? ` y se agregaron ${res.addedCount} fila(s) para completar las ${PREVENTION_AXIS_THEMES.length} temáticas del Acuerdo 044-A`
              : ""
          }.`
        );
      }
    } catch (err: any) {
      setIsGeneratingAutonomous(false);
      toast.error(err.message || "Error al procesar la propuesta de IA.");
    }
  };

  // Ejes presentes y filas visibles
  const axes = useMemo(() => {
    const present = Array.from(new Set(items.map((it) => it.axis)));
    // Se respeta el orden oficial de los 4 ejes y se añaden los personalizados.
    const ordered = STRATEGIC_BIANUAL_AXES.filter((a) => present.includes(a));
    present.forEach((a) => {
      if (!ordered.includes(a)) ordered.push(a);
    });
    return ordered;
  }, [items]);

  const visibleItems = useMemo(() => {
    if (axisFilter === "TODOS") return items;
    return items.filter((it) => it.axis === axisFilter);
  }, [items, axisFilter]);

  const missingThemes = useMemo(
    () => PREVENTION_AXIS_THEMES.filter((t) => !stats.coveredThemeCodes.includes(t.code)),
    [stats.coveredThemeCodes]
  );

  return (
    <form action={formAction} className="space-y-8">
      {/* Hidden inputs para server action */}
      <input type="hidden" name="period_start_year" value={startYear} />
      <input type="hidden" name="period_end_year" value={endYear} />
      <input type="hidden" name="period_text" value={periodText} />
      <input type="hidden" name="district_code" value={districtCode} />
      <input type="hidden" name="district_name" value={districtName} />
      <input type="hidden" name="coordinator_name" value={coordinatorName} />
      <input type="hidden" name="analysts_data" value={JSON.stringify(analysts)} />
      <input type="hidden" name="students_count" value={studentsCount} />
      <input type="hidden" name="professionals_count" value={professionalsCount} />
      <input type="hidden" name="available_resources" value={availableResources} />
      <input
        type="hidden"
        name="socioeconomic_condition"
        value={socioeconomicCondition}
      />
      <input type="hidden" name="general_objective" value={generalObjective} />
      <input
        type="hidden"
        name="specific_objectives"
        value={JSON.stringify(specificObjectives.filter((o) => o.trim()))}
      />
      <input type="hidden" name="axis_items_data" value={JSON.stringify(items)} />
      <input type="hidden" name="elaborated_by" value={JSON.stringify(elaboratedList)} />
      <input type="hidden" name="reviewed_by" value={JSON.stringify(reviewedSignatory)} />
      <input type="hidden" name="approved_by" value={JSON.stringify(approvedSignatory)} />

      {state.error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800 flex items-start gap-3">
          <span className="text-xl">⚠️</span>
          <div>
            <div className="font-bold">Error al guardar el plan estratégico bianual</div>
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
              PLAN ESTRATÉGICO BIANUAL DEL DECE
            </h1>
            <p className="text-xs sm:text-sm text-brand-200 max-w-3xl leading-relaxed">
              Planificación estratégica a dos años ({periodText}) enmarcada en el Acuerdo
              Ministerial MINEDUC-044-A y en los Estándares de Calidad DECE. De este plan
              se desprende cada Plan de Acción Anual (POA).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 self-start lg:self-center">
            <Link
              href="/plan-estrategico-bianual"
              className="px-4 py-2 text-xs font-semibold text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
            >
              Cancelar
            </Link>
            <SubmitButton isEditing={isEditing} />
          </div>
        </div>

        {/* Barra de estadísticas */}
        <div className="mt-6 pt-6 border-t border-white/15 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <div className="bg-white/10 p-3 rounded-xl backdrop-blur-xs">
            <div className="text-xs text-brand-200">Metas Bianuales</div>
            <div className="text-xl sm:text-2xl font-black text-white">
              {stats.totalItems}
            </div>
            <div className="text-[10px] text-brand-300">
              ({stats.actionsCount} acciones específicas)
            </div>
          </div>
          <div className="bg-white/10 p-3 rounded-xl backdrop-blur-xs">
            <div className="text-xs text-brand-200">Ejes de Acción</div>
            <div className="text-xl sm:text-2xl font-black text-white">
              {stats.axesCount} / {STRATEGIC_BIANUAL_AXES.length}
            </div>
            <div className="text-[10px] text-brand-300">Consejería · Prevención · Inclusión · Psicosocial</div>
          </div>
          <div className="bg-white/10 p-3 rounded-xl backdrop-blur-xs">
            <div className="text-xs text-brand-200">Temáticas 044-A</div>
            <div
              className={`text-xl sm:text-2xl font-black ${
                stats.preventionThemesCovered >= stats.preventionThemesTotal
                  ? "text-emerald-300"
                  : "text-amber-300"
              }`}
            >
              {stats.preventionThemesCovered} / {stats.preventionThemesTotal}
            </div>
            <div className="text-[10px] text-brand-300">Eje de estrategias de prevención</div>
          </div>
          <div className="bg-white/10 p-3 rounded-xl backdrop-blur-xs">
            <div className="text-xs text-brand-200">Responsables Asignados</div>
            <div className="text-xl sm:text-2xl font-black text-white">
              {stats.completionPercent}%
            </div>
            <div className="text-[10px] text-brand-300">
              {stats.itemsWithResponsible} de {stats.totalItems} metas
            </div>
          </div>
        </div>
      </div>

      {/* 1. Información General */}
      <div className="card p-6 space-y-6 shadow-xs border border-slate-200">
        <h2 className="text-base font-bold text-slate-800 flex items-center gap-2 border-b pb-3">
          <span>📋</span>
          <span>1. Datos Informativos y Realidad Institucional</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Institución (solo lectura) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Institución Educativa
            </label>
            <input
              type="text"
              value={institutionName}
              readOnly
              className="input w-full text-sm bg-slate-50 text-slate-600 font-semibold"
            />
          </div>

          {/* Periodo bianual */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Periodo Bianual *
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={startYear}
                onChange={(e) => setStartYear(e.target.value)}
                className="input w-full text-sm font-semibold text-slate-800"
                placeholder="2026"
                min={2000}
                max={2100}
              />
              <span className="text-slate-400 font-bold">—</span>
              <input
                type="number"
                value={endYear}
                onChange={(e) => setEndYear(e.target.value)}
                className="input w-full text-sm font-semibold text-slate-800"
                placeholder="2028"
                min={2000}
                max={2100}
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Periodo registrado: <strong>{periodText}</strong> (dos años lectivos).
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
                targetId="dictation_target"
                compact
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

        <div className="grid grid-cols-1 md:grid-cols-4 gap-5 pt-3 border-t border-slate-100">
          {/* Distrito */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Código del Distrito Educativo
            </label>
            <input
              type="text"
              value={districtCode}
              onChange={(e) => setDistrictCode(e.target.value)}
              className="input w-full text-sm"
              placeholder="18D02"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nombre del Distrito Educativo
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={districtName}
                onChange={(e) => setDistrictName(e.target.value)}
                className="input w-full text-sm"
                placeholder="Ambato 2"
              />
              <VoiceDictationButton
                targetId="dictation_target"
                compact
                onResult={(text) => setDistrictName(text)}
              />
            </div>
          </div>

          {/* Estudiantes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Número de Estudiantes *
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
          </div>

          {/* Profesionales */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Número de Profesionales DECE *
            </label>
            <div className="relative">
              <input
                type="number"
                value={professionalsCount}
                onChange={(e) =>
                  setProfessionalsCount(parseInt(e.target.value, 10) || 0)
                }
                className="input w-full text-sm pr-12 font-semibold text-slate-800"
                min={0}
              />
              <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-medium">
                prof.
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Ratio ~
              {Math.round((studentsCount || 0) / Math.max(1, professionalsCount || 1))}{" "}
              estudiantes por profesional.
            </p>
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

        {/* Recursos institucionales */}
        <div className="pt-3 border-t border-slate-100">
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-semibold text-slate-700">
              Recursos Institucionales Disponibles *
            </label>
            <VoiceDictationButton
              targetId="dictation_target"
              compact
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
            placeholder="Detalla los recursos materiales y logísticos reales (ej. proyectores de aula, computadoras, conexión a internet, papelería, espacios para talleres, transporte institucional)..."
          />
          <p className="text-[11px] text-slate-500 mt-1">
            💡 La IA usará estos recursos reales para no proponer insumos inaccesibles.
          </p>
        </div>

        {/* Condición socioeconómica */}
        <div className="pt-3 border-t border-slate-100">
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-semibold text-slate-700">
              Condición Socioeconómica de la Institución y su Comunidad *
            </label>
            <VoiceDictationButton
              targetId="dictation_target"
              compact
              onResult={(t) =>
                setSocioeconomicCondition((prev) => (prev ? prev + " " + t : t))
              }
            />
          </div>
          <textarea
            value={socioeconomicCondition}
            onChange={(e) => setSocioeconomicCondition(e.target.value)}
            rows={3}
            className="textarea w-full text-xs"
            placeholder="Ej. Nivel socioeconómico medio-bajo, sector rural, alta tasa de migración de padres de familia, estudiantes que trabajan en jornadas alternas, limitada conectividad en los hogares..."
          />
          <p className="text-[11px] text-slate-500 mt-1">
            🎯 Dato clave: junto al número de estudiantes, los profesionales y los
            recursos, la IA lo usa para proponer <strong>objetivos reales que se puedan
            cumplir</strong> en este contexto.
          </p>
        </div>
      </div>

      {/* 2. Planificación Estratégica */}
      <div className="card p-6 space-y-6 shadow-xs border border-slate-200">
        <h2 className="text-base font-bold text-slate-800 flex items-center gap-2 border-b pb-3">
          <span>🧭</span>
          <span>2. Planificación Estratégica</span>
        </h2>

        {/* Objetivo General */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1">
            <label className="text-xs font-bold text-slate-700">
              Objetivo General *
            </label>
            <div className="flex items-center gap-2">
              <AIAssistButton
                targetId="bianual_general_objective"
                fieldLabel="Objetivo general del Plan Estratégico Bianual DECE"
                documentType="Plan Estratégico Bianual DECE"
                sectionPurpose="Redactar el objetivo general del plan estratégico bianual del Departamento de Consejería Estudiantil, en un solo párrafo formal alineado al Modelo de Gestión DECE y al Acuerdo Ministerial MINEDUC-044-A."
                customContext={`Institución: ${institutionName}. Periodo bianual: ${periodText}. Estudiantes: ${studentsCount}. Profesionales DECE: ${professionalsCount}. Recursos: ${availableResources}. Condición socioeconómica: ${socioeconomicCondition}.`}
                compact
                onResult={(t) => setGeneralObjective(t)}
              />
              <VoiceDictationButton
                targetId="bianual_general_objective"
                compact
                onResult={(t) =>
                  setGeneralObjective((prev) => (prev ? prev + " " + t : t))
                }
              />
            </div>
          </div>
          <textarea
            id="bianual_general_objective"
            rows={4}
            value={generalObjective}
            onChange={(e) => setGeneralObjective(e.target.value)}
            className="textarea w-full text-xs leading-relaxed"
            placeholder="Acompañar el proceso educativo mediante la promoción de derechos, la prevención de problemáticas sociales..."
          />
          {generalObjective.trim() !== DEFAULT_GENERAL_OBJECTIVE && (
            <button
              type="button"
              onClick={() => setGeneralObjective(DEFAULT_GENERAL_OBJECTIVE)}
              className="text-[11px] text-brand-700 hover:text-brand-900 font-semibold underline mt-1"
            >
              Restaurar la redacción oficial del objetivo general
            </button>
          )}
        </div>

        {/* Objetivos Específicos */}
        <div className="pt-4 border-t border-slate-100 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700">
              Objetivos Específicos * ({specificObjectives.filter((o) => o.trim()).length})
            </label>
            <button
              type="button"
              onClick={addSpecificObjective}
              className="text-xs text-brand-700 hover:text-brand-900 font-semibold flex items-center gap-1"
            >
              <span>➕</span>
              <span>Agregar objetivo específico</span>
            </button>
          </div>

          <div className="space-y-2">
            {specificObjectives.map((objective, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-lg"
              >
                <span className="bg-brand-900 text-white text-[11px] font-bold px-2 py-0.5 rounded shrink-0 mt-1">
                  {idx + 1}
                </span>
                <textarea
                  id={`bianual_specific_objective_${idx}`}
                  rows={2}
                  value={objective}
                  onChange={(e) => updateSpecificObjective(idx, e.target.value)}
                  className="textarea w-full text-xs"
                  placeholder="Ej. Identificar riesgos psicosociales en la población estudiantil."
                />
                <div className="flex flex-col items-center gap-1 shrink-0">
                  <AIAssistButton
                    targetId={`bianual_specific_objective_${idx}`}
                    fieldLabel={`Objetivo específico ${idx + 1} del Plan Estratégico Bianual DECE`}
                    documentType="Plan Estratégico Bianual DECE"
                    sectionPurpose="Redactar un objetivo específico medible y alcanzable del plan estratégico bianual DECE, coherente con el objetivo general y con los ejes de acción del departamento."
                    customContext={`Objetivo general: ${generalObjective}. Institución: ${institutionName}. Periodo bianual: ${periodText}. Estudiantes: ${studentsCount}. Profesionales DECE: ${professionalsCount}. Condición socioeconómica: ${socioeconomicCondition}.`}
                    compact
                    onResult={(t) => updateSpecificObjective(idx, t)}
                  />
                  <VoiceDictationButton
                    targetId={`bianual_specific_objective_${idx}`}
                    compact
                    onResult={(t) =>
                      updateSpecificObjective(idx, objective ? objective + " " + t : t)
                    }
                  />
                  {specificObjectives.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeSpecificObjective(idx)}
                      className="text-slate-400 hover:text-red-600 p-1 text-xs"
                      title="Quitar objetivo específico"
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Matriz de Ejes de Acción */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span>🎯</span>
              <span>3. Matriz de Ejes de Acción (Metas Bianuales)</span>
            </h2>
            <p className="text-xs text-slate-500">
              Cada meta cuenta con dictado por voz (🎤) y asistencia de IA (✨) fundamentada
              en el Acuerdo 044-A y los Estándares de Calidad DECE.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/plan-accion"
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 shadow-xs flex items-center gap-1.5 transition-all"
              title="El Plan de Acción Anual (POA) se desprende de este plan bianual"
            >
              <span>🎯</span>
              <span>Plan de Acción (POA)</span>
            </Link>
            <button
              type="button"
              onClick={() => setIsAutonomousModalOpen(true)}
              className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-xs flex items-center gap-1.5 transition-all"
            >
              <span>⚡</span>
              <span>Generar Plan Bianual con IA (044-A)</span>
            </button>
          </div>
        </div>

        {/* Cobertura temática del Acuerdo 044-A */}
        <div
          className={`p-3.5 rounded-xl border text-xs space-y-2 ${
            missingThemes.length === 0
              ? "bg-emerald-50/70 border-emerald-200"
              : "bg-amber-50/70 border-amber-200"
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="font-bold text-slate-800 flex items-center gap-1.5">
              <span>{missingThemes.length === 0 ? "✅" : "⚠️"}</span>
              <span>
                Cobertura del eje de estrategias de prevención (Acuerdo 044-A):{" "}
                {stats.preventionThemesCovered} de {stats.preventionThemesTotal} temáticas
              </span>
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {PREVENTION_AXIS_THEMES.map((theme) => {
              const covered = stats.coveredThemeCodes.includes(theme.code);
              return (
                <span
                  key={theme.code}
                  title={theme.description}
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                    covered
                      ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                      : "bg-white text-slate-500 border-dashed border-slate-300"
                  }`}
                >
                  {covered ? "✓" : "○"} {theme.label}
                </span>
              );
            })}
          </div>
          {missingThemes.length > 0 && (
            <p className="text-[11px] text-amber-900">
              Faltan temáticas obligatorias. Usa el botón{" "}
              <strong>⚡ Generar Plan Bianual con IA (044-A)</strong>: agregará
              automáticamente las filas necesarias para no saltar ninguna.
            </p>
          )}
        </div>

        {/* Pestañas por eje de acción */}
        <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setAxisFilter("TODOS")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                axisFilter === "TODOS"
                  ? "bg-white text-brand-900 shadow-xs border border-slate-200"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Todos ({items.length})
            </button>
            {axes.map((axis, i) => {
              const count = items.filter((it) => it.axis === axis).length;
              const shortName = axis.replace("EJE DE ACCIÓN:", "").trim().toLowerCase();
              return (
                <button
                  key={axis}
                  type="button"
                  onClick={() => setAxisFilter(axis)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg capitalize transition-all ${
                    axisFilter === axis
                      ? "bg-white text-brand-900 shadow-xs border border-slate-200"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {i + 1}. {shortName} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {aiRowError && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center justify-between">
            <span>⚠️ {aiRowError}</span>
            <button
              type="button"
              onClick={() => setAiRowError(null)}
              className="text-red-500 font-bold"
            >
              ✖
            </button>
          </div>
        )}

        {/* Filas de la matriz agrupadas por eje */}
        <div className="space-y-6">
          {visibleItems.map((item, idx) => {
            const isFirstOfAxis = idx === 0 || visibleItems[idx - 1].axis !== item.axis;
            const isAiLoading = generatingRowAi === item.id;
            const itemThemes = detectPreventionThemes(
              item.goal,
              item.actions,
              item.evaluation_indicator
            );
            const standardCodes = Array.from(
              new Set(
                (item.evaluation_indicator || "").match(/E\.D\d+\.C\d+\.DE\d+(\.[a-z])?/g) || []
              )
            );

            return (
              <div key={item.id} className="space-y-3">
                {/* Banner del Eje de Acción */}
                {isFirstOfAxis && (
                  <div className="bg-brand-900 text-white px-5 py-3 rounded-xl shadow-xs flex flex-wrap items-center justify-between gap-2">
                    <span className="font-extrabold text-sm tracking-wide">
                      {item.axis}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-white/20 px-2.5 py-0.5 rounded-full font-medium">
                        Eje Oficial DECE
                      </span>
                      <button
                        type="button"
                        onClick={() => addItem(item.axis)}
                        className="text-[11px] text-brand-900 hover:text-brand-950 font-semibold bg-white px-2 py-0.5 rounded border border-brand-200"
                      >
                        + agregar meta a este eje
                      </button>
                    </div>
                  </div>
                )}

                {/* Tarjeta de la Meta */}
                <div className="card p-5 border border-slate-200 hover:border-brand-300 transition-colors shadow-xs space-y-4">
                  {/* Encabezado */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3 border-b border-slate-100">
                    <div className="space-y-1 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="bg-slate-800 text-white text-[11px] font-bold px-2 py-0.5 rounded">
                          Meta #{items.indexOf(item) + 1}
                        </span>
                        {standardCodes.map((code) => (
                          <span
                            key={code}
                            className="bg-emerald-100 text-emerald-800 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-emerald-300 flex items-center gap-1"
                            title="Estándar de Calidad DECE citado en el indicador de evaluación"
                          >
                            <span>🎯</span>
                            <span>{code}</span>
                          </span>
                        ))}
                        {itemThemes.map((theme) => (
                          <span
                            key={theme.code}
                            className="bg-indigo-100 text-indigo-800 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border border-indigo-200 flex items-center gap-1"
                            title={theme.description}
                          >
                            <span>🛡️</span>
                            <span>{theme.label}</span>
                          </span>
                        ))}
                        {item.responsible?.trim() ? (
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
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        disabled={isAiLoading}
                        onClick={() => handleAiRowDraft(item)}
                        className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5 text-brand-700 border-brand-200 bg-brand-50 hover:bg-brand-100 font-semibold shadow-2xs"
                        title="La IA ajustará acciones, responsables, indicador y plazos a los estudiantes, profesionales, recursos y condición socioeconómica reales"
                      >
                        {isAiLoading ? (
                          <>
                            <span className="animate-spin">⏳</span>
                            <span>Generando...</span>
                          </>
                        ) : (
                          <>
                            <span>✨</span>
                            <span>Ayuda IA (Meta)</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="text-slate-400 hover:text-red-600 p-1 text-xs"
                        title="Eliminar esta meta"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  {/* Campos editables */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Columna izquierda: Metas y Acciones */}
                    <div className="space-y-4">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-bold text-slate-700">
                            Meta *
                          </label>
                          <VoiceDictationButton
                            targetId="dictation_target"
                            compact
                            onResult={(t) =>
                              updateItemField(
                                item.id,
                                "goal",
                                item.goal ? item.goal + " " + t : t
                              )
                            }
                          />
                        </div>
                        <textarea
                          rows={3}
                          value={item.goal}
                          onChange={(e) => updateItemField(item.id, "goal", e.target.value)}
                          className="textarea w-full text-xs leading-relaxed"
                          placeholder="Meta medible a dos años (ej. Lograr que el 100% de estudiantes de básica superior participen en talleres de prevención...)"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-bold text-slate-700">
                            Acciones *
                          </label>
                          <VoiceDictationButton
                            targetId="dictation_target"
                            compact
                            onResult={(t) =>
                              updateItemField(
                                item.id,
                                "actions",
                                item.actions ? item.actions + "\n" + t : t
                              )
                            }
                          />
                        </div>
                        <textarea
                          rows={5}
                          value={item.actions}
                          onChange={(e) =>
                            updateItemField(item.id, "actions", e.target.value)
                          }
                          className="textarea w-full text-xs font-mono text-slate-800 leading-relaxed"
                          placeholder={"1. Planificar...\n2. Ejecutar...\n3. Evaluar..."}
                        />
                      </div>
                    </div>

                    {/* Columna derecha: Responsables, Indicador, Plazos */}
                    <div className="space-y-4">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-semibold text-slate-700">
                            Responsables *
                          </label>
                          <VoiceDictationButton
                            targetId="dictation_target"
                            compact
                            onResult={(t) => updateItemField(item.id, "responsible", t)}
                          />
                        </div>
                        <textarea
                          rows={2}
                          value={item.responsible}
                          onChange={(e) =>
                            updateItemField(item.id, "responsible", e.target.value)
                          }
                          className="textarea w-full text-xs"
                          placeholder="Equipo DECE, docentes tutores, autoridad institucional..."
                        />
                        {availableProfessionals.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            <button
                              type="button"
                              onClick={() =>
                                updateItemField(
                                  item.id,
                                  "responsible",
                                  "Equipo DECE (Coordinación y Analistas)"
                                )
                              }
                              className="text-[10px] bg-purple-50 text-purple-700 px-2 py-0.5 rounded border border-purple-200 hover:bg-purple-100"
                            >
                              👥 Equipo DECE
                            </button>
                            {availableProfessionals.map((prof) => (
                              <button
                                key={prof}
                                type="button"
                                onClick={() =>
                                  updateItemField(item.id, "responsible", prof)
                                }
                                className="text-[10px] bg-slate-100 hover:bg-brand-50 text-slate-700 hover:text-brand-700 px-2 py-0.5 rounded border border-slate-200 transition-colors"
                              >
                                👤 {prof}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-semibold text-slate-700">
                            Indicador de Evaluación *
                          </label>
                          <VoiceDictationButton
                            targetId="dictation_target"
                            compact
                            onResult={(t) =>
                              updateItemField(
                                item.id,
                                "evaluation_indicator",
                                item.evaluation_indicator
                                  ? item.evaluation_indicator + " " + t
                                  : t
                              )
                            }
                          />
                        </div>
                        <textarea
                          rows={3}
                          value={item.evaluation_indicator}
                          onChange={(e) =>
                            updateItemField(item.id, "evaluation_indicator", e.target.value)
                          }
                          className="textarea w-full text-xs bg-slate-50 text-slate-700"
                          placeholder="E.D2.C2.DE9.c. Número de espacios de sensibilización ejecutados sobre los planificados..."
                        />
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Cita el código del Estándar de Calidad DECE que corresponda.
                        </p>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-semibold text-slate-700">
                            Plazos de Ejecución *
                          </label>
                          <VoiceDictationButton
                            targetId="dictation_target"
                            compact
                            onResult={(t) => updateItemField(item.id, "execution_term", t)}
                          />
                        </div>
                        <textarea
                          rows={2}
                          value={item.execution_term}
                          onChange={(e) =>
                            updateItemField(item.id, "execution_term", e.target.value)
                          }
                          className="textarea w-full text-xs"
                          placeholder={`Ej. Hasta junio de ${startYear} y octubre de ${endYear}`}
                        />
                        <div className="flex flex-wrap gap-1 mt-1">
                          {[
                            `Todo el periodo ${periodText}`,
                            `Primer año lectivo (${startYear})`,
                            `Segundo año lectivo (${endYear})`,
                            `Primer quimestre de cada año del bianio`,
                          ].map((t) => (
                            <button
                              key={t}
                              type="button"
                              onClick={() =>
                                updateItemField(item.id, "execution_term", t)
                              }
                              className="text-[9px] bg-slate-100 hover:bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded"
                            >
                              {t}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Agregar meta cuando el eje no tiene filas todavía */}
        <div className="bg-slate-50 border border-dashed border-slate-300 rounded-xl p-3.5 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-600">
            Agregar meta a un eje:
          </span>
          {STRATEGIC_BIANUAL_AXES.map((axis) => (
            <button
              key={axis}
              type="button"
              onClick={() => addItem(axis)}
              className="text-[11px] bg-white text-brand-700 px-2.5 py-1 rounded-lg border border-brand-200 hover:bg-brand-50 font-semibold transition-colors"
            >
              ➕ {axis.replace("EJE DE ACCIÓN:", "").trim()}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Firmas */}
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
              <button
                type="button"
                onClick={() =>
                  setElaboratedList((prev) => [
                    ...prev,
                    {
                      name: "",
                      role: "PROFESIONAL DECE",
                      date: new Date().toISOString().slice(0, 10),
                    },
                  ])
                }
                className="text-[10px] text-brand-600 font-bold hover:text-brand-800"
              >
                ➕ Agregar
              </button>
            </div>
            <div className="space-y-2">
              {elaboratedList.map((sig, i) => (
                <div
                  key={i}
                  className="space-y-1 bg-white p-2 rounded border border-slate-100"
                >
                  <input
                    type="text"
                    value={sig.name}
                    onChange={(e) => {
                      const updated = [...elaboratedList];
                      updated[i] = { ...updated[i], name: e.target.value };
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
                      updated[i] = { ...updated[i], role: e.target.value };
                      setElaboratedList(updated);
                    }}
                    placeholder="Cargo"
                    className="input w-full text-[11px] text-slate-500"
                  />
                  <div className="flex items-center gap-1">
                    <input
                      type="date"
                      value={sig.date}
                      onChange={(e) => {
                        const updated = [...elaboratedList];
                        updated[i] = { ...updated[i], date: e.target.value };
                        setElaboratedList(updated);
                      }}
                      className="input w-full text-[11px]"
                    />
                    {elaboratedList.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          setElaboratedList((prev) => prev.filter((_, k) => k !== i))
                        }
                        className="text-slate-400 hover:text-red-600 p-1 text-xs shrink-0"
                        title="Quitar firmante"
                      >
                        ✖
                      </button>
                    )}
                  </div>
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
                <label className="block text-[11px] font-semibold text-slate-600">
                  Nombres y Apellidos
                </label>
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
                <label className="block text-[11px] font-semibold text-slate-600">
                  Cargo / Rol
                </label>
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
                <label className="block text-[11px] font-semibold text-slate-600">
                  Fecha de Revisión
                </label>
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
                <label className="block text-[11px] font-semibold text-slate-600">
                  Nombres y Apellidos
                </label>
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
                <label className="block text-[11px] font-semibold text-slate-600">
                  Cargo / Rol
                </label>
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
                <label className="block text-[11px] font-semibold text-slate-600">
                  Fecha de Aprobación
                </label>
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

      {/* Barra inferior flotante de guardado */}
      <div className="sticky bottom-4 z-20 bg-white/95 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-slate-200 flex items-center justify-between gap-4 max-w-4xl mx-auto">
        <div className="flex items-center gap-3">
          <span className="text-xl">💾</span>
          <div className="text-xs">
            <span className="font-bold text-slate-900">
              {items.length} metas bianuales · {periodText}
            </span>
            <span className="text-slate-500 block">
              {stats.preventionThemesCovered}/{stats.preventionThemesTotal} temáticas 044-A
              cubiertas
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/plan-estrategico-bianual" className="btn-secondary text-xs px-4 py-2">
            Volver a la lista
          </Link>
          <SubmitButton isEditing={isEditing} />
        </div>
      </div>

      {/* Modal de Generación Autónoma con IA (Acuerdo 044-A) */}
      {isAutonomousModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-xl shadow-md">
                  ⚡
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Plan Bianual Autónomo con IA (Acuerdo MINEDUC-044-A)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Metas contextualizadas a la realidad institucional y anexadas a los
                    Estándares de Calidad DECE.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => !isGeneratingAutonomous && setIsAutonomousModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg p-1"
                disabled={isGeneratingAutonomous}
              >
                ✕
              </button>
            </div>

            {/* Calibración de realidad institucional */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-2.5">
              <div className="font-semibold text-slate-700 flex items-center gap-1.5">
                <span>📊</span>
                <span>Calibración de Realidad Operativa:</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-slate-600">
                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <div className="text-[10px] uppercase font-bold text-slate-400">
                    Población Estudiantil
                  </div>
                  <div className="text-sm font-extrabold text-slate-800">
                    {studentsCount || 0} estudiantes
                  </div>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <div className="text-[10px] uppercase font-bold text-slate-400">
                    Equipo DECE
                  </div>
                  <div className="text-sm font-extrabold text-slate-800">
                    {professionalsCount || professionalsForAi.length} profesionales (~
                    {Math.round(
                      (studentsCount || 0) /
                        Math.max(1, professionalsCount || professionalsForAi.length)
                    )}{" "}
                    est/prof)
                  </div>
                </div>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-slate-600">
                <div className="text-[10px] uppercase font-bold text-slate-400">
                  Recursos Institucionales Reportados
                </div>
                <div className="text-xs font-medium text-slate-700 line-clamp-2">
                  {availableResources.trim() ||
                    "No reportados (la IA propondrá acciones de bajo costo)"}
                </div>
              </div>
              <div
                className={`p-2.5 rounded-lg border text-slate-600 ${
                  socioeconomicCondition.trim()
                    ? "bg-white border-slate-200"
                    : "bg-amber-50 border-amber-200"
                }`}
              >
                <div className="text-[10px] uppercase font-bold text-slate-400">
                  Condición Socioeconómica
                </div>
                <div className="text-xs font-medium text-slate-700 line-clamp-2">
                  {socioeconomicCondition.trim() ||
                    "⚠️ Sin registrar. Complétala en la sección 1 para que las metas se ajusten mejor a tu contexto real."}
                </div>
              </div>
            </div>

            {/* Alcance */}
            <div className="space-y-2.5">
              <label className="text-xs font-bold text-slate-700 block">
                Selecciona el alcance de la propuesta:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setAutonomousScope("TODO")}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    autonomousScope === "TODO"
                      ? "border-emerald-500 bg-emerald-50/70 ring-2 ring-emerald-500/20"
                      : "border-slate-200 bg-white hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                      <span>📋</span>
                      <span>Plan Integral (4 Ejes)</span>
                    </span>
                    {autonomousScope === "TODO" && (
                      <span className="text-[10px] font-extrabold bg-emerald-200 text-emerald-800 px-1.5 py-0.5 rounded">
                        Recomendado
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Estructura las metas de los 4 ejes de acción (Consejería, Promoción y
                    Prevención, Inclusión Socioeducativa y Atención Psicosocial) para todo
                    el bianio.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setAutonomousScope("PREVENCION")}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    autonomousScope === "PREVENCION"
                      ? "border-emerald-500 bg-emerald-50/70 ring-2 ring-emerald-500/20"
                      : "border-slate-200 bg-white hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <span>🛡️</span>
                      <span>Solo Promoción y Prevención</span>
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Calibra únicamente el eje de prevención con las{" "}
                    {PREVENTION_AXIS_THEMES.length} temáticas del 044-A, respetando las
                    metas ya redactadas en los otros tres ejes.
                  </p>
                </button>
              </div>
            </div>

            {/* Aviso de cobertura íntegra */}
            <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
              <span className="text-base shrink-0">💡</span>
              <p className="text-[11px] leading-relaxed">
                La IA cubrirá las <strong>{PREVENTION_AXIS_THEMES.length} temáticas
                completas</strong> del eje de estrategias de prevención (violencias, acoso
                y ciberacoso, drogas, suicidio y salud mental, ENEIS y embarazo adolescente,
                convivencia restaurativa, vínculo familiar y alertas por ausentismo){" "}
                <strong>sin saltar ninguna</strong>, y anexará cada indicador a los
                Estándares de Calidad DECE.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsAutonomousModalOpen(false)}
                disabled={isGeneratingAutonomous}
                className="btn-secondary text-xs px-4 py-2"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleAutonomousPlanGeneration}
                disabled={isGeneratingAutonomous}
                className="btn-primary text-xs px-5 py-2.5 flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
              >
                {isGeneratingAutonomous ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    <span>Analizando realidad y generando metas...</span>
                  </>
                ) : (
                  <>
                    <span>⚡</span>
                    <span>Generar Plan Bianual</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
