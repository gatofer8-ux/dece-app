"use client";

import { useState } from "react";
import VoiceDictationButton from "@/components/VoiceDictationButton";
import {
  createAccompanimentReport,
  updateAccompanimentReport,
  draftAccompanimentField,
} from "../acompanamiento-actions";
import {
  INDICATOR_SIGNOS_FISICOS,
  INDICATOR_SIGNOS_COMPORTAMIENTO,
  INDICATOR_CONDUCTAS_IE,
  FACTOR_PERSONALES_RIESGO,
  FACTOR_PERSONALES_PROTECCION,
  FACTOR_FAMILIARES_RIESGO,
  FACTOR_FAMILIARES_PROTECCION,
  FACTOR_SITUACIONALES_RIESGO,
  FACTOR_SITUACIONALES_PROTECCION,
  EXT_REFERRAL_INSTANCES,
  PSYCHOSOCIAL_REFERRAL_OPTIONS,
  parseIndicators,
  parseRiskProtection,
  parseExtReferral,
  parsePsychosocialReferral,
  type ACCOMPANIMENT_AI_LABELS,
} from "@/lib/accompanimentReport";
import type { CaseAccompanimentReportRow } from "@/lib/types";

type AiKey = keyof typeof ACCOMPANIMENT_AI_LABELS;

function AiBtn({ caseId, fieldKey, targetId }: { caseId: string; fieldKey: AiKey; targetId: string }) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function go() {
    const el = document.getElementById(targetId) as HTMLTextAreaElement | null;
    if (!el) return;
    setLoading(true);
    setErr(null);
    try {
      const res = await draftAccompanimentField(caseId, fieldKey, el.value);
      if (res.error) setErr(res.error);
      else if (res.text) {
        el.value = res.text;
        el.dispatchEvent(new Event("input", { bubbles: true }));
      }
    } catch {
      setErr("Error con la IA.");
    } finally {
      setLoading(false);
    }
  }
  return (
    <span className="inline-flex items-center gap-1">
      <button type="button" onClick={go} disabled={loading} className="rounded-full border bg-violet-50 border-violet-300 text-violet-700 hover:bg-violet-100 text-[11px] px-2 py-0.5 font-medium disabled:opacity-60">
        ✨ {loading ? "Redactando…" : "IA"}
      </button>
      {err && <span className="text-[11px] text-red-600">{err}</span>}
    </span>
  );
}

function CheckGroup({ name, title, options, selected }: { name: string; title: string; options: string[]; selected: string[] }) {
  return (
    <div>
      <p className="text-xs font-semibold text-slate-600 mb-1">{title}</p>
      <div className="space-y-1">
        {options.map((o) => (
          <label key={o} className="flex items-start gap-2 text-xs">
            <input type="checkbox" name={name} value={o} defaultChecked={selected.includes(o)} className="mt-0.5" />
            <span>{o}</span>
          </label>
        ))}
        <input name={`${name}_otros`} placeholder="Otros…" className="input !py-1 text-xs mt-1" />
      </div>
    </div>
  );
}

export default function AccompanimentReportForm({
  caseId,
  mode,
  reportId,
  prefill,
  restitutionPlans,
  initialData,
}: {
  caseId: string;
  mode: "create" | "edit";
  reportId?: string;
  prefill: Record<string, string>;
  restitutionPlans: { id: string; label: string }[];
  initialData?: CaseAccompanimentReportRow;
}) {
  const v = (k: string) =>
    initialData && (initialData as unknown as Record<string, unknown>)[k] != null
      ? String((initialData as unknown as Record<string, unknown>)[k])
      : prefill[k] || "";

  const ind = initialData ? parseIndicators(initialData.indicators_json) : parseIndicators(null);
  const rp = initialData ? parseRiskProtection(initialData.risk_protection_json) : parseRiskProtection(null);
  const ext = initialData ? parseExtReferral(initialData.ext_referral_json) : { selected: [] };
  const psy = initialData ? parsePsychosocialReferral(initialData.psychosocial_referral_json) : { entries: [] };
  const psyName = (opt: string) => psy.entries.find((e) => e.option === opt)?.name || "";

  const action = mode === "edit" ? updateAccompanimentReport.bind(null, reportId!, caseId) : createAccompanimentReport.bind(null, caseId);

  const IN = (name: string, label: string, type = "text", w = "") => (
    <div className={w}>
      <label className="label text-xs">{label}</label>
      <input name={name} type={type} defaultValue={v(name)} className="input !py-1 text-sm" />
    </div>
  );
  const TA = (name: string, label: string, ai?: AiKey, rows = 5) => (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="label text-xs">{label}</label>
        <div className="flex items-center gap-2">
          <VoiceDictationButton targetId={`f-${name}`} />
          {ai && <AiBtn caseId={caseId} fieldKey={ai} targetId={`f-${name}`} />}
        </div>
      </div>
      <textarea id={`f-${name}`} name={name} rows={rows} defaultValue={v(name)} className="textarea text-sm" />
    </div>
  );

  return (
    <form action={action} className="card p-6 space-y-7 max-w-4xl">
      {mode !== "edit" && (
        <p className="text-xs text-slate-500">El «Informe N°» se asigna automáticamente al guardar (numeración oficial MinEduc).</p>
      )}
      {initialData?.report_number && (
        <p className="text-xs text-slate-500">Informe N°: <span className="font-mono font-semibold">{initialData.report_number}</span></p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {IN("report_date", "Fecha de elaboración del informe", "date")}
        {IN("professional_managing", "Profesional DECE que maneja el caso", "text", "sm:col-span-2")}
      </div>

      {restitutionPlans.length > 0 && (
        <div>
          <label className="label text-xs">Vincular con el Plan de Acompañamiento y Restitución</label>
          <select name="restitution_plan_id" defaultValue={v("restitution_plan_id")} className="select text-sm">
            <option value="">— Sin vincular —</option>
            {restitutionPlans.map((pl) => (
              <option key={pl.id} value={pl.id}>{pl.label}</option>
            ))}
          </select>
          <p className="text-[11px] text-slate-400 mt-0.5">Al vincularlo, «Acciones de acompañamiento» ya trae un resumen del plan (editable).</p>
        </div>
      )}

      <section>
        <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">1. Datos de identificación del estudiante</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {IN("student_full_name", "Apellidos y nombres", "text", "sm:col-span-2")}
          {IN("student_birth_day", "Día nac.", "text")}
          {IN("student_birth_month", "Mes nac.", "text")}
          {IN("student_birth_year", "Año nac.", "text")}
          {IN("student_age", "Edad")}
          {IN("student_nationality", "Nacionalidad")}
          {IN("student_document_id", "N° cédula o pasaporte")}
          {IN("student_grade", "Grado o curso")}
          {IN("student_jornada", "Jornada")}
        </div>
      </section>

      <section>
        <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">2. Datos de la madre, padre y/o representante legal</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {IN("rep_full_name", "Nombres y apellidos", "text", "sm:col-span-2")}
          {IN("rep_document_id", "Número de cédula")}
          {IN("rep_relationship", "Vínculo con el/la estudiante")}
          {IN("rep_address", "Dirección del domicilio", "text", "sm:col-span-2")}
          {IN("rep_phone_cell", "Celular")}
          {IN("rep_phone_landline", "Convencional")}
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-xs font-semibold text-slate-500 uppercase">3. Contexto psicosocial y pedagógico</h3>
        {TA("family_situation", "Situación familiar (con quién vive, configuración y dinámica familiar)", "family_situation", 6)}

        <div>
          <p className="text-xs font-semibold text-slate-600 mb-2">Indicadores (sección 3.2.1 A del Manual de Rutas y Protocolos de Violencia, 3.ª edición)</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <CheckGroup name="signos_fisicos" title="Signos físicos" options={INDICATOR_SIGNOS_FISICOS} selected={ind.signos_fisicos} />
            <CheckGroup name="signos_comportamiento" title="Signos de comportamiento" options={INDICATOR_SIGNOS_COMPORTAMIENTO} selected={ind.signos_comportamiento} />
            <CheckGroup name="conductas_ie" title="Conductas que se identifican en la institución educativa" options={INDICATOR_CONDUCTAS_IE} selected={ind.conductas_ie} />
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-slate-600 mb-2">Factores de riesgo y protección (sección 3.2.1 B del mismo manual)</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-3">
              <p className="text-xs font-bold text-slate-700">PERSONALES (del NNA)</p>
              <CheckGroup name="personales_riesgo" title="Factores de riesgo" options={FACTOR_PERSONALES_RIESGO} selected={rp.personales_riesgo} />
              <CheckGroup name="personales_proteccion" title="Factores protector" options={FACTOR_PERSONALES_PROTECCION} selected={rp.personales_proteccion} />
            </div>
            <div className="space-y-3">
              <p className="text-xs font-bold text-slate-700">FAMILIARES</p>
              <CheckGroup name="familiares_riesgo" title="Factores de riesgo" options={FACTOR_FAMILIARES_RIESGO} selected={rp.familiares_riesgo} />
              <CheckGroup name="familiares_proteccion" title="Factores protector" options={FACTOR_FAMILIARES_PROTECCION} selected={rp.familiares_proteccion} />
            </div>
            <div className="space-y-3">
              <p className="text-xs font-bold text-slate-700">SITUACIONALES Y SOCIALES</p>
              <CheckGroup name="situacionales_riesgo" title="Factores de riesgo" options={FACTOR_SITUACIONALES_RIESGO} selected={rp.situacionales_riesgo} />
              <CheckGroup name="situacionales_proteccion" title="Factores protector" options={FACTOR_SITUACIONALES_PROTECCION} selected={rp.situacionales_proteccion} />
            </div>
          </div>
        </div>

        {TA("academic_performance", "Rendimiento académico (breve; dificultades o cambios dentro y fuera del aula)", "academic_performance", 4)}
      </section>

      <section>
        <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">4. Acciones de acompañamiento</h3>
        {TA("accompaniment_actions", "Resumen de acciones inmediatas de acompañamiento", "accompaniment_actions", 6)}
      </section>

      <section className="space-y-3">
        <h3 className="text-xs font-semibold text-slate-500 uppercase">Referencia externa</h3>
        <div>
          <p className="text-xs font-semibold text-slate-600 mb-1">Procedimiento de referencia a instancias externas (marcar una o más):</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
            {EXT_REFERRAL_INSTANCES.map((o) => (
              <label key={o} className="flex items-center gap-2 text-xs">
                <input type="checkbox" name="ext_referral" value={o} defaultChecked={ext.selected.includes(o)} /> {o}
              </label>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold text-slate-600 mb-1">Referencia externa para tratamiento psicológico-social (marcar y anotar el nombre):</p>
          <div className="space-y-1">
            {PSYCHOSOCIAL_REFERRAL_OPTIONS.map((o, i) => (
              <div key={o} className="flex flex-col sm:flex-row sm:items-center gap-2 text-xs">
                <label className="flex items-center gap-2 sm:w-72">
                  <input type="checkbox" name="psy_referral" value={o} defaultChecked={psy.entries.some((e) => e.option === o)} /> {o}
                </label>
                <input name={`psy_name_${i}`} defaultValue={psyName(o)} placeholder="Indicar nombre…" className="input !py-1 text-xs flex-1" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section>
        <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">Firma</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {IN("professional_signing", "Profesional DECE que elabora el informe")}
          {IN("signing_date", "Fecha de elaboración (firma)", "date")}
        </div>
      </section>

      <div className="flex justify-end">
        <button type="submit" className="btn-primary">{mode === "edit" ? "Guardar cambios" : "Guardar y ver informe"}</button>
      </div>
    </form>
  );
}
