"use client";

import { useState, useTransition } from "react";
import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { createRestitutionPlan, updateRestitutionPlan, type ActionState } from "../../../actions";
import {
  VIOLENCE_TYPE_OPTIONS,
  VIOLENCE_MODALITY_OPTIONS,
  LEGAL_INSTANCE_CATEGORIES,
  ACCOMPANIMENT_ACTION_CATEGORIES,
  DEFAULT_ACCOMPANIMENT_ACTIONS,
  RISK_FACTORS_CATALOG,
  PERPETRATOR_RELATION_OPTIONS,
  PERPETRATOR_ROLE_OPTIONS,
  NORMATIVE_TEXT,
  OBJECTIVE_GENERAL_TEXT,
  OBJECTIVES_SPECIFIC_TEXT,
  parseJsonArray,
  type VictimEntry,
  type PerpetratorEntry,
  type LegalInstanceEntry,
  type AccompanimentActionEntry,
} from "@/lib/restitutionPlan";
import type { CaseRestitutionPlanRow, StudentRow, InstitutionRow, SchoolYearRow } from "@/lib/types";
import VoiceDictationButton from "@/components/VoiceDictationButton";
import AIAssistButton from "@/components/AIAssistButton";

const initialState: ActionState = { error: null };

function SubmitButton({ isEdit }: { isEdit: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="btn-primary flex items-center gap-2 px-6 py-2.5 shadow-sm text-sm font-semibold disabled:opacity-60"
    >
      {pending ? (
        <>
          <span className="inline-block animate-spin">⌛</span>
          <span>Guardando...</span>
        </>
      ) : isEdit ? (
        "💾 Guardar cambios del plan"
      ) : (
        "💾 Guardar plan de acompañamiento"
      )}
    </button>
  );
}

function calculateAge(birthDate: string | null | undefined): string {
  if (!birthDate) return "";
  const d = new Date(birthDate);
  if (isNaN(d.getTime())) return "";
  const diff = Date.now() - d.getTime();
  const ageDate = new Date(diff);
  return Math.abs(ageDate.getUTCFullYear() - 1970).toString();
}

function getInitials(fullName: string | null | undefined): string {
  if (!fullName) return "";
  return fullName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0]?.toUpperCase() + ".")
    .join(" ");
}

export default function RestitutionPlanForm({
  caseId,
  institutionName,
  defaultPreparedBy,
  student,
  institution,
  activeYear,
  initialData,
}: {
  caseId: string;
  institutionName: string;
  defaultPreparedBy: string;
  student?: StudentRow | null;
  institution?: InstitutionRow | null;
  activeYear?: SchoolYearRow | null;
  initialData?: CaseRestitutionPlanRow | null;
}) {
  const isEdit = Boolean(initialData);
  const actionFn = isEdit
    ? updateRestitutionPlan.bind(null, initialData!.id, caseId)
    : createRestitutionPlan.bind(null, caseId);

  const [state, formAction] = useFormState(actionFn, initialState);

  // Parse initial arrays or compute preloaded defaults
  const parsedViolenceTypes = initialData ? parseJsonArray<string>(initialData.violence_types) : [];
  const parsedViolenceModality = initialData ? parseJsonArray<string>(initialData.violence_modality) : [];

  const defaultVictimList: VictimEntry[] = initialData
    ? parseJsonArray<VictimEntry>(initialData.victims)
    : [
        {
          iniciales: student ? getInitials(student.full_name) : "",
          cedula: student?.document_id || "",
          edad: calculateAge(student?.birth_date),
          genero: student?.gender || "",
          nivel_instruccion: student
            ? `${student.course || ""} ${student.parallel || ""} - Jornada ${student.jornada || "Matutina"}`.trim()
            : "",
        },
      ];

  const defaultPerpList: PerpetratorEntry[] = initialData
    ? parseJsonArray<PerpetratorEntry>(initialData.perpetrators)
    : [{ nombre: "", edad: "", sexo: "Masculino", cargo_funcion: "Docente" }];

  const defaultLegalInstances: LegalInstanceEntry[] = initialData
    ? parseJsonArray<LegalInstanceEntry>(initialData.legal_instances)
    : LEGAL_INSTANCE_CATEGORIES.map((cat) => ({
        instancia: cat.value,
        fecha_denuncia: "",
        numero_denuncia: "",
        medidas: "",
        estado: "",
      }));

  const defaultAccompActions: AccompanimentActionEntry[] = initialData
    ? parseJsonArray<AccompanimentActionEntry>(initialData.accompaniment_actions)
    : DEFAULT_ACCOMPANIMENT_ACTIONS;

  // Local state
  const [riskFactorsText, setRiskFactorsText] = useState(
    initialData?.risk_factors ||
      `Factores de riesgo individual:\n- \n\nFactores de riesgo familiar:\n- \n\nFactores de riesgo escolar:\n- \n\nFactores de riesgo comunitario:\n- `
  );
  const [activeRiskTab, setActiveRiskTab] = useState<"individual" | "familiar" | "escolar" | "comunitario">("individual");
  const [perpetratorRelation, setPerpetratorRelation] = useState(initialData?.perpetrator_relation || "Docente");

  const [victims, setVictims] = useState<VictimEntry[]>(defaultVictimList.length > 0 ? defaultVictimList : [{ iniciales: "", cedula: "", edad: "", genero: "", nivel_instruccion: "" }]);
  const [perpetrators, setPerpetrators] = useState<PerpetratorEntry[]>(defaultPerpList.length > 0 ? defaultPerpList : [{ nombre: "", edad: "", sexo: "Masculino", cargo_funcion: "" }]);
  const [legalInstances, setLegalInstances] = useState<LegalInstanceEntry[]>(defaultLegalInstances);
  const [accompanimentActions, setAccompanimentActions] = useState<AccompanimentActionEntry[]>(defaultAccompActions);
  const [preparedByRole, setPreparedByRole] = useState<string>(initialData?.prepared_by_role || "Analista DECE");

  // Helper to toggle risk factor chip into riskFactorsText
  const handleToggleRiskChip = (chip: string, category: "individual" | "familiar" | "escolar" | "comunitario") => {
    const headerMap = {
      individual: "Factores de riesgo individual:",
      familiar: "Factores de riesgo familiar:",
      escolar: "Factores de riesgo escolar:",
      comunitario: "Factores de riesgo comunitario:",
    };
    const targetHeader = headerMap[category];

    setRiskFactorsText((prev) => {
      // Check if already in text
      if (prev.includes(chip)) {
        // Remove line containing chip
        const lines = prev.split("\n");
        const filtered = lines.filter((l) => !l.includes(chip));
        return filtered.join("\n");
      }

      // Add to section if header exists
      if (prev.includes(targetHeader)) {
        const parts = prev.split(targetHeader);
        const before = parts[0] + targetHeader;
        const after = parts.slice(1).join(targetHeader);
        return `${before}\n- ${chip}${after}`;
      }

      // If header doesn't exist, append
      return `${prev}\n\n${targetHeader}\n- ${chip}`;
    });
  };

  const addVictim = () => {
    setVictims((prev) => [...prev, { iniciales: "", cedula: "", edad: "", genero: "", nivel_instruccion: "" }]);
  };

  const removeVictim = (index: number) => {
    if (victims.length <= 1) return;
    setVictims((prev) => prev.filter((_, i) => i !== index));
  };

  const updateVictim = (index: number, field: keyof VictimEntry, value: string) => {
    setVictims((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const addPerpetrator = () => {
    setPerpetrators((prev) => [...prev, { nombre: "", edad: "", sexo: "Masculino", cargo_funcion: "" }]);
  };

  const removePerpetrator = (index: number) => {
    if (perpetrators.length <= 1) return;
    setPerpetrators((prev) => prev.filter((_, i) => i !== index));
  };

  const updatePerpetrator = (index: number, field: keyof PerpetratorEntry, value: string) => {
    setPerpetrators((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  return (
    <form action={formAction} className="card p-6 md:p-8 space-y-8 max-w-5xl mx-auto shadow-md">
      {state.error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-start gap-2">
          <span>⚠️</span>
          <span>{state.error}</span>
        </div>
      )}

      {/* 1. Encabezado institucional y diagnóstico */}
      <div className="border-b border-slate-200 pb-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
              MINISTERIO DE EDUCACIÓN · DECE
            </span>
            <h2 className="text-xl font-bold text-slate-800 mt-1">
              {isEdit ? "Editar Plan de Acompañamiento y Restitución" : "Nuevo Plan de Acompañamiento y Restitución"}
            </h2>
            <p className="text-xs text-slate-500">
              Formato oficial fiel para casos de presuntas situaciones de violencia escolar.
            </p>
          </div>
          <Link href={`/casos/${caseId}`} className="btn-secondary text-xs">
            ← Volver al caso
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-2">
          <div>
            <label className="label text-xs font-semibold text-slate-600">Institución Educativa</label>
            <input
              value={institution?.name || institutionName}
              readOnly
              className="input bg-slate-50 font-medium text-slate-700"
            />
          </div>
          <div>
            <label className="label text-xs font-semibold text-slate-600">Año Lectivo</label>
            <input
              name="school_year"
              defaultValue={initialData?.school_year || activeYear?.name || "2025 - 2026"}
              placeholder="Ej. 2025 - 2026"
              className="input"
              required
            />
          </div>
          <div>
            <label className="label text-xs font-semibold text-slate-600">Fecha de Elaboración</label>
            <input
              type="date"
              name="elaboration_date"
              defaultValue={initialData?.elaboration_date || new Date().toISOString().slice(0, 10)}
              className="input font-medium"
              required
            />
          </div>
          <div>
            <label className="label text-xs font-semibold text-slate-600">Correo Electrónico Institucional</label>
            <input
              name="prepared_by_email"
              defaultValue={initialData?.prepared_by_email || (institution as any)?.email || "marlon.jacome@educacion.gob.ec"}
              placeholder="correo.profesional@educacion.gob.ec"
              className="input font-medium"
            />
          </div>
        </div>
      </div>

      {/* 2. Factores de Riesgo con Pestañas y Catálogo Oficial */}
      <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <span>📋</span> Factores de Riesgo (Manual de Rutas y Protocolos 3ra Edición)
            </h3>
            <p className="text-xs text-slate-500">
              Seleccione pestañas y haga clic en las opciones para agregarlas o quitarlas automáticamente de la descripción.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <VoiceDictationButton targetId="restitution-risk-factors" />
            <AIAssistButton
              targetId="restitution-risk-factors"
              caseId={caseId}
              fieldLabel="Factores de riesgo individual, familiar, escolar y comunitario"
            />
          </div>
        </div>

        {/* Pestañas de categorías */}
        <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
          {(
            [
              { id: "individual", label: "👤 Individual", count: RISK_FACTORS_CATALOG.individual.length },
              { id: "familiar", label: "👨‍👩‍👧 Familiar", count: RISK_FACTORS_CATALOG.familiar.length },
              { id: "escolar", label: "🏫 Escolar", count: RISK_FACTORS_CATALOG.escolar.length },
              { id: "comunitario", label: "🌐 Comunitario", count: RISK_FACTORS_CATALOG.comunitario.length },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveRiskTab(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                activeRiskTab === tab.id
                  ? "bg-brand-600 text-white shadow-xs font-semibold"
                  : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  activeRiskTab === tab.id ? "bg-white/30 text-white" : "bg-slate-100 text-slate-600"
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Chips de opciones para la pestaña activa */}
        <div className="p-3 bg-white rounded-lg border border-slate-200">
          <p className="text-[11px] font-medium text-slate-500 mb-2 uppercase tracking-wide">
            Opciones del Manual ({activeRiskTab}): Haga clic para agregar o retirar
          </p>
          <div className="flex flex-wrap gap-1.5">
            {RISK_FACTORS_CATALOG[activeRiskTab].map((option) => {
              const isSelected = riskFactorsText.includes(option);
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => handleToggleRiskChip(option, activeRiskTab)}
                  className={`text-xs px-2.5 py-1 rounded-full text-left transition-all flex items-center gap-1.5 border ${
                    isSelected
                      ? "bg-brand-50 text-brand-800 border-brand-300 font-medium shadow-2xs"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  <span className={isSelected ? "text-brand-600 font-bold" : "text-slate-400"}>
                    {isSelected ? "✓" : "+"}
                  </span>
                  <span>{option}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Textarea de Factores de Riesgo */}
        <div>
          <label className="label text-xs font-semibold text-slate-700">
            Descripción consolidada de factores de riesgo:
          </label>
          <textarea
            id="restitution-risk-factors"
            name="risk_factors"
            rows={7}
            value={riskFactorsText}
            onChange={(e) => setRiskFactorsText(e.target.value)}
            className="textarea font-mono text-xs leading-relaxed"
            placeholder="Describir los factores de riesgo de acuerdo con la situación de violencia identificada..."
            required
          />
        </div>
      </div>

      {/* 3. Presunta Situación de Violencia Reportada */}
      <div className="border border-slate-200 rounded-xl p-5 space-y-5">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 border-b border-slate-200 pb-2">
          <span>⚖️</span> Presunta Situación de Violencia Reportada
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Tipo de violencia */}
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
            <p className="text-xs font-bold text-slate-700 uppercase mb-2">Tipo de Violencia</p>
            <div className="grid grid-cols-2 gap-2">
              {VIOLENCE_TYPE_OPTIONS.map((o) => (
                <label key={o.value} className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    name="violence_types"
                    value={o.value}
                    defaultChecked={parsedViolenceTypes.includes(o.value)}
                    className="rounded text-brand-600 focus:ring-brand-500"
                  />
                  <span>{o.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Modalidad de violencia */}
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
            <p className="text-xs font-bold text-slate-700 uppercase mb-2">Modalidad de Violencia</p>
            <div className="grid grid-cols-2 gap-2">
              {VIOLENCE_MODALITY_OPTIONS.map((o) => (
                <label key={o.value} className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    name="violence_modality"
                    value={o.value}
                    defaultChecked={parsedViolenceModality.includes(o.value)}
                    className="rounded text-brand-600 focus:ring-brand-500"
                  />
                  <span>{o.label}</span>
                </label>
              ))}
            </div>
            <input
              name="violence_modality_other"
              defaultValue={initialData?.violence_modality_other || ""}
              placeholder="Especificar si seleccionó 'Otros'"
              className="input mt-3 text-xs"
            />
          </div>
        </div>

        {/* Relación con agresor con opciones del manual */}
        <div className="space-y-2 pt-2">
          <label className="label text-xs font-bold text-slate-700">
            Relación de la presunta persona agresora con quien sufrió la agresión:
          </label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {PERPETRATOR_RELATION_OPTIONS.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setPerpetratorRelation(opt)}
                className={`text-xs px-2.5 py-1 rounded-md border transition-all ${
                  perpetratorRelation === opt
                    ? "bg-brand-600 text-white border-brand-600 font-semibold"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
          <input
            name="perpetrator_relation"
            value={perpetratorRelation}
            onChange={(e) => setPerpetratorRelation(e.target.value)}
            placeholder="Por ejemplo: Docente, familiar, autoridad..."
            className="input text-xs"
            required
          />
        </div>
      </div>

      {/* 4. Presuntas Víctimas (Datos prellenados de estudiante con confidencialidad) */}
      <div className="border border-slate-200 rounded-xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
          <div>
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <span>🛡️</span> N°- de Presuntas Víctimas ({victims.length})
            </h3>
            <p className="text-xs text-slate-500">
              Registrar únicamente con <strong>iniciales</strong>, no nombres completos por principio de confidencialidad.
            </p>
          </div>
          <button
            type="button"
            onClick={addVictim}
            className="btn-secondary text-xs flex items-center gap-1 text-brand-700 border-brand-300 hover:bg-brand-50"
          >
            <span>+</span> Agregar otra víctima
          </button>
        </div>

        <div className="space-y-3">
          {victims.map((v, i) => (
            <div key={i} className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3 relative">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                <span>Víctima #{i + 1} {i === 0 && student && <span className="text-brand-600">(Estudiante del caso prellenado)</span>}</span>
                {victims.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeVictim(i)}
                    className="text-red-500 hover:text-red-700 text-xs"
                  >
                    ✕ Eliminar
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                <div>
                  <label className="label text-[11px] font-semibold">Datos de la víctima (ingresar solo las iniciales de la presunta víctima): *</label>
                  <input
                    name="victim_iniciales"
                    value={v.iniciales}
                    onChange={(e) => updateVictim(i, "iniciales", e.target.value)}
                    placeholder="Ej. M. P."
                    className="input text-xs font-bold text-slate-800"
                    required
                  />
                </div>
                <div>
                  <label className="label text-[11px]">No. de Cédula</label>
                  <input
                    name="victim_cedula"
                    value={v.cedula}
                    onChange={(e) => updateVictim(i, "cedula", e.target.value)}
                    placeholder="180..."
                    className="input text-xs"
                  />
                </div>
                <div>
                  <label className="label text-[11px]">Edad</label>
                  <input
                    name="victim_edad"
                    value={v.edad}
                    onChange={(e) => updateVictim(i, "edad", e.target.value)}
                    placeholder="Ej. 16"
                    className="input text-xs"
                  />
                </div>
                <div>
                  <label className="label text-[11px]">Sexo / Género</label>
                  <input
                    name="victim_genero"
                    value={v.genero}
                    onChange={(e) => updateVictim(i, "genero", e.target.value)}
                    placeholder="Femenino / Masculino"
                    className="input text-xs"
                  />
                </div>
                <div>
                  <label className="label text-[11px]">Nivel instrucción / jornada</label>
                  <input
                    name="victim_nivel_instruccion"
                    value={v.nivel_instruccion}
                    onChange={(e) => updateVictim(i, "nivel_instruccion", e.target.value)}
                    placeholder="Curso/paralelo/jornada"
                    className="input text-xs"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Narrativa del relato de los hechos */}
        <div className="pt-2">
          <div className="flex items-center justify-between mb-1">
            <label className="label text-xs font-bold text-slate-700">
              Relato de los hechos identificados / Narrativa del caso:
            </label>
            <div className="flex items-center gap-2">
              <VoiceDictationButton targetId="restitution-narrative" />
              <AIAssistButton
                targetId="restitution-narrative"
                caseId={caseId}
                fieldLabel="Relato de los hechos y narrativa del caso de violencia"
              />
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mb-1.5">
            (De acuerdo con la información obtenida a través de la persona denunciante, informe técnico del DECE si existiere o persona que conoció del hecho).
          </p>
          <textarea
            id="restitution-narrative"
            name="report_narrative"
            rows={4}
            defaultValue={initialData?.report_narrative || ""}
            placeholder="Escriba o dicte el relato detallado de los hechos conocidos..."
            className="textarea text-xs leading-relaxed"
            required
          />
        </div>
      </div>

      {/* 5. Datos de la Presunta Persona Implicada */}
      <div className="border border-slate-200 rounded-xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
          <div>
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <span>👤</span> Datos de la Presunta Persona Implicada
            </h3>
            <p className="text-xs text-slate-500">
              Si no se dispone de todos los datos registrar &quot;Desconoce&quot; o información de referencia.
            </p>
          </div>
          <button
            type="button"
            onClick={addPerpetrator}
            className="btn-secondary text-xs flex items-center gap-1 text-brand-700 border-brand-300 hover:bg-brand-50"
          >
            <span>+</span> Agregar persona implicada
          </button>
        </div>

        <div className="space-y-4">
          {perpetrators.map((p, i) => (
            <div key={i} className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                <span>Persona implicada #{i + 1}</span>
                {perpetrators.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removePerpetrator(i)}
                    className="text-red-500 hover:text-red-700 text-xs"
                  >
                    ✕ Eliminar
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-2">
                  <label className="label text-[11px]">Nombres y Apellidos completos *</label>
                  <input
                    name="perpetrator_nombre"
                    value={p.nombre}
                    onChange={(e) => updatePerpetrator(i, "nombre", e.target.value)}
                    placeholder="Nombres completos o referencia"
                    className="input text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="label text-[11px]">Edad</label>
                  <input
                    name="perpetrator_edad"
                    value={p.edad}
                    onChange={(e) => updatePerpetrator(i, "edad", e.target.value)}
                    placeholder="Ej. 47 o Desconoce"
                    className="input text-xs"
                  />
                </div>
                <div>
                  <label className="label text-[11px]">Sexo</label>
                  <select
                    name="perpetrator_sexo"
                    value={p.sexo || "Masculino"}
                    onChange={(e) => updatePerpetrator(i, "sexo", e.target.value)}
                    className="input text-xs"
                  >
                    <option value="Masculino">Masculino</option>
                    <option value="Femenino">Femenino</option>
                    <option value="Desconoce">Desconoce</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="label text-[11px]">Cargo, función o actividad:</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {PERPETRATOR_ROLE_OPTIONS.map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => updatePerpetrator(i, "cargo_funcion", role)}
                      className={`text-[11px] px-2 py-0.5 rounded border transition-colors ${
                        p.cargo_funcion === role
                          ? "bg-brand-600 text-white border-brand-600 font-semibold"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {role}
                    </button>
                  ))}
                </div>
                <input
                  name="perpetrator_cargo"
                  value={p.cargo_funcion}
                  onChange={(e) => updatePerpetrator(i, "cargo_funcion", e.target.value)}
                  placeholder="Ej. Docente, Autoridad, Estudiante..."
                  className="input text-xs"
                  required
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 6. Aspecto Normativo y Objetivos (Texto oficial integrado) */}
      <details className="border border-blue-200 rounded-xl bg-blue-50/40 p-4">
        <summary className="text-xs font-bold text-blue-900 uppercase cursor-pointer flex items-center justify-between">
          <span>📜 1.- Plan de Acompañamiento y Restitución — Aspecto normativo y Objetivos</span>
          <span className="text-xs text-blue-600">Ver texto oficial transcrito ▼</span>
        </summary>
        <div className="mt-3 text-xs text-slate-600 space-y-2.5 pt-2 border-t border-blue-200/60 leading-relaxed">
          <p className="font-semibold text-slate-800">Aspecto normativo: (Constitución de la República, LOEI, Código de la Niñez y Adolescencia)</p>
          <p className="whitespace-pre-wrap">{NORMATIVE_TEXT}</p>
          <p className="font-semibold text-slate-800 pt-1">Objetivo General:</p>
          <p>{OBJECTIVE_GENERAL_TEXT}</p>
          <p className="font-semibold text-slate-800 pt-1">Objetivos Específicos:</p>
          <ul className="list-disc pl-5 space-y-1">
            {OBJECTIVES_SPECIFIC_TEXT.map((t, idx) => (
              <li key={idx}>{t}</li>
            ))}
          </ul>
        </div>
      </details>

      {/* 7. c.- Acompañamiento Legal — Instancias Administrativas y Judiciales */}
      <div className="border border-slate-200 rounded-xl p-5 space-y-4">
        <div>
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
            <span>🏛️</span> c.- Acompañamiento Legal: Instancias Administrativas y Judiciales
          </h3>
          <p className="text-xs text-slate-500">
            Registre las acciones legales en el Distrito Educativo, Fiscalía, Junta Cantonal u otras instancias.
          </p>
        </div>

        <div className="space-y-3">
          {LEGAL_INSTANCE_CATEGORIES.map((cat, idx) => {
            const entry = legalInstances.find((e) => e.instancia === cat.value) || {
              instancia: cat.value,
              fecha_denuncia: "",
              numero_denuncia: "",
              medidas: "",
              estado: "",
              total: "",
            };

            return (
              <div key={cat.value} className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                <p className="text-xs font-bold text-brand-900">{cat.label}</p>
                <input type="hidden" name="legal_instancia" value={cat.value} />
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                  <div>
                    <label className="label text-[11px]">Fecha de la denuncia</label>
                    <input
                      type="date"
                      name="legal_fecha_denuncia"
                      defaultValue={entry.fecha_denuncia}
                      className="input text-xs"
                    />
                  </div>
                  <div>
                    <label className="label text-[11px]">N°- de la denuncia / oficio</label>
                    <input
                      name="legal_numero_denuncia"
                      defaultValue={entry.numero_denuncia}
                      placeholder="Ej. Oficio No. 045-2026"
                      className="input text-xs"
                    />
                  </div>
                  <div>
                    <label className="label text-[11px]">Medidas adoptadas</label>
                    <input
                      name="legal_medidas"
                      defaultValue={entry.medidas}
                      placeholder="Ej. Medidas de protección..."
                      className="input text-xs"
                    />
                  </div>
                  <div>
                    <label className="label text-[11px]">Estado actual del caso</label>
                    <input
                      name="legal_estado"
                      defaultValue={entry.estado}
                      placeholder="Ej. En investigación / Notificado"
                      className="input text-xs"
                    />
                  </div>
                  <div>
                    <label className="label text-[11px]">Total</label>
                    <input
                      name="legal_total"
                      defaultValue={(entry as any).total || (entry.numero_denuncia || entry.fecha_denuncia ? "1" : "No aplica")}
                      placeholder="Ej. 1 o No aplica"
                      className="input text-xs font-bold text-slate-800"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 8. 2.- Acciones de Acompañamiento y Restitución (Tabla oficial de 8 procesos) */}
      <div className="border border-slate-200 rounded-xl p-5 space-y-4">
        <div>
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
            <span>🤝</span> 2.- Acciones de Acompañamiento y Restitución (describir brevemente los puntos señalados)
          </h3>
          <p className="text-xs text-slate-500">
            Los 8 procesos reglamentarios de intervención y seguimiento integral según normativa oficial.
          </p>
        </div>

        <div className="space-y-3">
          {ACCOMPANIMENT_ACTION_CATEGORIES.map((cat, idx) => {
            const entry = accompanimentActions.find((a) => a.categoria === cat.value) || {
              categoria: cat.value,
              ejecutor: "",
              num_personas: "1",
              fecha_inicio: "",
              fecha_fin: "",
            };

            return (
              <div key={cat.value} className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-slate-800">
                    {idx + 1}. {cat.label}
                  </p>
                  <input type="hidden" name="accomp_categoria" value={cat.value} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <div className="sm:col-span-2">
                    <label className="label text-[11px]">¿QUIÉNES EJECUTARÁN? <span className="text-slate-500 font-normal">(mencione la institución que brindará el servicio)</span></label>
                    <input
                      name="accomp_ejecutor"
                      defaultValue={entry.ejecutor}
                      placeholder="Ej. DECE / Directivos / Centro de Salud"
                      className="input text-xs"
                    />
                  </div>
                  <div>
                    <label className="label text-[11px]">NÚMERO DE PERSONAS QUE RECIBIRÁN EL ACOMPAÑAMIENTO <span className="text-slate-500 font-normal">(mencione el N° de personas que recibirán el servicio)</span></label>
                    <input
                      name="accomp_num_personas"
                      defaultValue={entry.num_personas}
                      placeholder="Ej. 1, Paralelo..."
                      className="input text-xs"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <div>
                      <label className="label text-[11px]">FECHA DE INICIO <span className="text-slate-500 font-normal">(mencione la fecha de inicio del servicio)</span></label>
                      <input
                        name="accomp_fecha_inicio"
                        defaultValue={entry.fecha_inicio}
                        placeholder="Ej. 01-09-2025"
                        className="input text-xs"
                      />
                    </div>
                    <div>
                      <label className="label text-[11px]">FECHA DE FINALIZACIÓN <span className="text-slate-500 font-normal">(mencione la fecha de finalización del servicio)</span></label>
                      <input
                        name="accomp_fecha_fin"
                        defaultValue={entry.fecha_fin}
                        placeholder="Ej. Finalización del año lectivo"
                        className="input text-xs"
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 9. Firmas de Responsabilidad */}
      <div className="border border-slate-200 rounded-xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
            <span>✍️</span> Firmas de Responsabilidad Institucional
          </h3>
          <span className="text-xs text-slate-500">
            {preparedByRole === "Analista DECE" ? "4 firmas requeridas" : "3 firmas requeridas"}
          </span>
        </div>

        {/* Selector de rol de quien elabora */}
        <div className="bg-slate-100/70 p-3 rounded-lg border border-slate-200 flex flex-wrap items-center gap-4">
          <span className="text-xs font-bold text-slate-700">Elabora el informe:</span>
          <label className="flex items-center gap-1.5 text-xs font-medium text-slate-800 cursor-pointer">
            <input
              type="radio"
              name="prepared_by_role"
              value="Analista DECE"
              checked={preparedByRole === "Analista DECE"}
              onChange={() => setPreparedByRole("Analista DECE")}
              className="text-brand-600 focus:ring-brand-500"
            />
            <span><strong>Analista DECE</strong> (Genera 4 firmas: Elaborado por Analista, Revisado por Coordinador DECE, Revisado por Autoridad, Aprobado por DECE Distrital)</span>
          </label>
          <label className="flex items-center gap-1.5 text-xs font-medium text-slate-800 cursor-pointer">
            <input
              type="radio"
              name="prepared_by_role"
              value="Coordinador/a DECE"
              checked={preparedByRole === "Coordinador/a DECE"}
              onChange={() => setPreparedByRole("Coordinador/a DECE")}
              className="text-brand-600 focus:ring-brand-500"
            />
            <span><strong>Coordinador/a DECE</strong> (Genera 3 firmas: Elaborado por Coordinador DECE, Revisado por Autoridad, Aprobado por DECE Distrital)</span>
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Fila 1: Elaborado por */}
          <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
            <p className="text-xs font-bold text-slate-700">
              Elaborado por: {preparedByRole === "Analista DECE" ? "Analista DECE" : "Coordinador/a DECE"}
            </p>
            <input
              name="prepared_by_name"
              defaultValue={initialData?.prepared_by_name || defaultPreparedBy}
              placeholder="Nombre y título del profesional que elabora"
              className="input text-xs font-medium"
              required
            />
            <div>
              <label className="label text-[11px]">Fecha de elaboración</label>
              <input
                type="date"
                name="prepared_date"
                defaultValue={initialData?.prepared_date || initialData?.elaboration_date || new Date().toISOString().slice(0, 10)}
                className="input text-xs"
              />
            </div>
          </div>

          {/* Fila 2: Revisado por Coordinador DECE (Solo si elabora Analista DECE) */}
          {preparedByRole === "Analista DECE" && (
            <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
              <p className="text-xs font-bold text-slate-700">Revisado por: Coordinador/a DECE</p>
              <input
                name="reviewed_coordinator_name"
                defaultValue={initialData?.reviewed_coordinator_name || "Mg. Marlon Jácome"}
                placeholder="Nombre Coordinador/a DECE"
                className="input text-xs font-medium"
                required
              />
              <div>
                <label className="label text-[11px]">Fecha de revisión</label>
                <input
                  type="date"
                  name="reviewed_coordinator_date"
                  defaultValue={initialData?.reviewed_coordinator_date || initialData?.elaboration_date || new Date().toISOString().slice(0, 10)}
                  className="input text-xs"
                />
              </div>
            </div>
          )}

          {/* Fila 3: Revisado por la Autoridad Educativa */}
          <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
            <p className="text-xs font-bold text-slate-700">Revisado por: Autoridad Institucional (Rector/a)</p>
            <input
              name="reviewed_authority_name"
              defaultValue={initialData?.reviewed_authority_name || (institution as any)?.rector_name || ""}
              placeholder="Nombre de la Rectora / Director"
              className="input text-xs font-medium"
              required
            />
            <div>
              <label className="label text-[11px]">Fecha de revisión por autoridad</label>
              <input
                type="date"
                name="reviewed_authority_date"
                defaultValue={initialData?.reviewed_authority_date || initialData?.elaboration_date || new Date().toISOString().slice(0, 10)}
                className="input text-xs"
              />
            </div>
          </div>

          {/* Fila 4: Aprobado por: Profesional de Apoyo al DECE (Distrito) */}
          <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
            <p className="text-xs font-bold text-slate-700">Aprobado por: Profesional de Apoyo al DECE (Distrito)</p>
            <input
              name="approved_by_name"
              defaultValue={initialData?.approved_by_name || "Psic. Silvia Paredes"}
              placeholder="Nombre del Profesional de Apoyo (Distrito)"
              className="input text-xs font-medium"
              required
            />
            <div>
              <label className="label text-[11px]">Fecha de aprobación</label>
              <input
                type="date"
                name="approved_date"
                defaultValue={initialData?.approved_date || initialData?.elaboration_date || new Date().toISOString().slice(0, 10)}
                className="input text-xs"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Botones de acción */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-200">
        <Link href={`/casos/${caseId}`} className="btn-secondary text-sm">
          Cancelar
        </Link>
        <SubmitButton isEdit={isEdit} />
      </div>
    </form>
  );
}
