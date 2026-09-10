"use client";

import { useRef, useState } from "react";
import VoiceDictationButton from "@/components/VoiceDictationButton";
import { draftActivityReportField } from "../report-actions";
import {
  createActivityReport,
  createStandaloneActivityReport,
  updateActivityReport,
} from "../report-actions";
import { ACTIVITY_REPORT_AXIS_OPTIONS } from "@/lib/activityReport";
import { PREVENTION_THEME_OPTIONS, type ActivityReportRow } from "@/lib/types";

type Prefill = Record<string, string | number | null>;

const AI_FIELDS = [
  "legal_basis",
  "objective_general",
  "objectives_specific",
  "development_analysis",
  "advances",
  "critical_nodes",
  "conclusions",
  "recommendations",
] as const;

function AiButton({
  fieldKey,
  targetId,
  getCtx,
}: {
  fieldKey: (typeof AI_FIELDS)[number];
  targetId: string;
  getCtx: () => { tema?: string; theme?: string; beneficiaries?: string; participants?: string };
}) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function run() {
    const el = document.getElementById(targetId) as HTMLTextAreaElement | HTMLInputElement | null;
    if (!el) return;
    setLoading(true);
    setErr(null);
    try {
      const res = await draftActivityReportField(fieldKey, el.value, getCtx());
      if (res.error) setErr(res.error);
      else if (res.text) {
        el.value = res.text;
        el.dispatchEvent(new Event("input", { bubbles: true }));
      }
    } catch {
      setErr("Error al conectar con la IA.");
    } finally {
      setLoading(false);
    }
  }
  return (
    <span className="inline-flex items-center gap-1">
      <button
        type="button"
        onClick={run}
        disabled={loading}
        className="inline-flex items-center gap-1 rounded-full border bg-violet-50 border-violet-300 text-violet-700 hover:bg-violet-100 disabled:opacity-60 text-[11px] px-2 py-0.5 font-medium"
      >
        ✨ {loading ? "Redactando…" : "IA"}
      </button>
      {err && <span className="text-[11px] text-red-600">{err}</span>}
    </span>
  );
}

export default function ActivityReportForm({
  mode,
  activityId,
  reportId,
  prefill,
  initialData,
}: {
  mode: "create-from-activity" | "create-standalone" | "edit";
  activityId?: string;
  reportId?: string;
  prefill: Prefill;
  initialData?: ActivityReportRow;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const v = (k: string): string => {
    const fromInitial = initialData ? (initialData as unknown as Record<string, unknown>)[k] : undefined;
    if (fromInitial != null) return String(fromInitial);
    const p = prefill[k];
    return p == null ? "" : String(p);
  };

  const getCtx = () => ({
    tema: (document.getElementById("f-tema") as HTMLTextAreaElement | null)?.value || v("tema"),
    beneficiaries:
      (document.getElementById("f-activity_beneficiaries") as HTMLInputElement | null)?.value || v("activity_beneficiaries"),
    participants:
      (document.getElementById("f-participants_count") as HTMLInputElement | null)?.value ||
      v("participants_count"),
  });

  const action =
    mode === "edit"
      ? updateActivityReport.bind(null, reportId!)
      : mode === "create-standalone"
      ? createStandaloneActivityReport
      : createActivityReport.bind(null, activityId!);

  const Label = ({ children }: { children: React.ReactNode }) => (
    <label className="label text-xs">{children}</label>
  );

  const TA = ({ name, rows = 3, ai }: { name: string; rows?: number; ai?: (typeof AI_FIELDS)[number] }) => (
    <>
      <div className="flex items-center justify-between mb-1">
        <Label>{LABELS[name] || name}</Label>
        <div className="flex items-center gap-2">
          <VoiceDictationButton targetId={`f-${name}`} />
          {ai && <AiButton fieldKey={ai} targetId={`f-${name}`} getCtx={getCtx} />}
        </div>
      </div>
      <textarea id={`f-${name}`} name={name} rows={rows} defaultValue={v(name)} className="textarea text-sm" />
    </>
  );

  const IN = ({ name, type = "text", w }: { name: string; type?: string; w?: string }) => (
    <div className={w}>
      <div className="flex items-center justify-between">
        <Label>{LABELS[name] || name}</Label>
        {type === "text" && <VoiceDictationButton targetId={`f-${name}`} />}
      </div>
      <input id={`f-${name}`} name={name} type={type} defaultValue={v(name)} className="input text-sm" />
    </div>
  );

  return (
    <form ref={formRef} action={action} className="card p-6 space-y-6 max-w-4xl">
      {mode !== "create-standalone" && initialData?.report_number && (
        <p className="text-xs text-slate-500">
          N° de Informe: <span className="font-mono font-semibold">{initialData.report_number}</span>
        </p>
      )}
      {mode !== "edit" && (
        <p className="text-xs text-slate-500">
          El N° de Informe se asigna automáticamente al guardar (formato oficial MinEduc).
        </p>
      )}

      <section>
        <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">Datos generales</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {IN({ name: "report_date", type: "date" })}
          {IN({ name: "school_year_text" })}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
          <div className="border rounded-lg p-3 space-y-2">
            <p className="text-xs font-semibold text-slate-600">Funcionario responsable del informe</p>
            {IN({ name: "responsible_name" })}
            {IN({ name: "responsible_role" })}
            {IN({ name: "responsible_phone_ext" })}
            {IN({ name: "responsible_email", type: "email" })}
          </div>
          <div className="border rounded-lg p-3 space-y-2">
            <p className="text-xs font-semibold text-slate-600">Informe dirigido a</p>
            {IN({ name: "directed_to_name" })}
            {IN({ name: "directed_to_role" })}
            {IN({ name: "directed_to_phone_ext" })}
            {IN({ name: "directed_to_email", type: "email" })}
          </div>
        </div>
      </section>

      <section>
        <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">Tema</h3>
        {TA({ name: "tema", rows: 2 })}
      </section>

      <section>
        <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">Antecedentes</h3>
        <div className="space-y-4">
          {TA({ name: "legal_basis", rows: 5, ai: "legal_basis" })}
          {TA({ name: "scope_text", rows: 2 })}
          {TA({ name: "objective_general", rows: 3, ai: "objective_general" })}
          {TA({ name: "objectives_specific", rows: 4, ai: "objectives_specific" })}
        </div>
      </section>

      <section>
        <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">Desarrollo o análisis</h3>
        {TA({ name: "development_analysis", rows: 8, ai: "development_analysis" })}
      </section>

      <section>
        <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">Actividad</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {IN({ name: "activity_name" })}
          <div>
            <Label>Eje</Label>
            <select name="activity_axis" defaultValue={v("activity_axis") || ACTIVITY_REPORT_AXIS_OPTIONS[0]} className="select text-sm">
              {ACTIVITY_REPORT_AXIS_OPTIONS.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>
          {IN({ name: "activity_date", type: "date" })}
          {IN({ name: "activity_responsible" })}
          {IN({ name: "activity_beneficiaries", w: "sm:col-span-2" })}
        </div>
        {mode === "create-standalone" && (
          <div className="mt-3">
            <Label>Tema de prevención (para la actividad)</Label>
            <select name="prevention_theme" defaultValue={v("prevention_theme")} className="select text-sm">
              <option value="">— Sin especificar —</option>
              {PREVENTION_THEME_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        )}
      </section>

      <section>
        <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">Resultados</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {IN({ name: "participants_count", type: "number" })}
        </div>
        <div className="space-y-4 mt-3">
          {TA({ name: "advances", rows: 5, ai: "advances" })}
          {TA({ name: "critical_nodes", rows: 4, ai: "critical_nodes" })}
        </div>
      </section>

      <section>
        <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">Conclusiones y recomendaciones</h3>
        <div className="space-y-4">
          {TA({ name: "conclusions", rows: 5, ai: "conclusions" })}
          {TA({ name: "recommendations", rows: 5, ai: "recommendations" })}
        </div>
      </section>

      <section>
        <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">Firmas</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="border rounded-lg p-3 space-y-2">
            <p className="text-xs font-semibold text-slate-600">Desarrollo del documento (elabora)</p>
            {IN({ name: "elaborated_by_name" })}
            {IN({ name: "elaborated_by_role" })}
            {IN({ name: "elaborated_date", type: "date" })}
          </div>
          <div className="border rounded-lg p-3 space-y-2">
            <p className="text-xs font-semibold text-slate-600">Aprobación del documento (autoridad)</p>
            {IN({ name: "approved_by_name" })}
            {IN({ name: "approved_by_role" })}
            {IN({ name: "approved_date", type: "date" })}
          </div>
        </div>
      </section>

      <div className="flex justify-end">
        <button type="submit" className="btn-primary">
          {mode === "edit" ? "Guardar cambios" : "Guardar y ver informe"}
        </button>
      </div>
      {mode !== "edit" && (
        <p className="text-xs text-slate-400 text-right">Podrás subir el registro fotográfico después de guardar, en «Editar».</p>
      )}
    </form>
  );
}

const LABELS: Record<string, string> = {
  report_date: "Fecha de informe",
  school_year_text: "Año lectivo",
  responsible_name: "Nombre",
  responsible_role: "Cargo",
  responsible_phone_ext: "Extensión telefónica",
  responsible_email: "Correo electrónico",
  directed_to_name: "Nombre",
  directed_to_role: "Cargo",
  directed_to_phone_ext: "Extensión telefónica",
  directed_to_email: "Correo electrónico",
  tema: "Tema del informe",
  legal_basis: "Base legal",
  scope_text: "Alcance",
  objective_general: "Objetivo general",
  objectives_specific: "Objetivos específicos (uno por línea)",
  development_analysis: "Desarrollo o análisis",
  activity_name: "Actividad",
  activity_date: "Fecha de la actividad",
  activity_responsible: "Responsable",
  activity_beneficiaries: "Beneficiarios",
  participants_count: "Número de participantes",
  advances: "Avances (uno por línea)",
  critical_nodes: "Nudos críticos (uno por línea)",
  conclusions: "Conclusiones (una por línea)",
  recommendations: "Recomendaciones (una por línea)",
  elaborated_by_name: "Nombre",
  elaborated_by_role: "Cargo",
  elaborated_date: "Fecha",
  approved_by_name: "Nombre",
  approved_by_role: "Cargo",
  approved_date: "Fecha",
};
