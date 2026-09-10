"use client";

import { useState } from "react";
import VoiceDictationButton from "@/components/VoiceDictationButton";
import { createCircleFicha, updateCircleFicha, draftFichaField, suggestCircleQuestions } from "../actions";
import { CIRCLE_TYPES, CIRCLE_MODALITIES, QUESTION_STAGES, type AiFieldKey } from "@/lib/restorativeCircleFicha";
import type { RestorativeCircleFichaRow } from "@/lib/types";

type Prefill = Record<string, string>;

function getVal(id: string): string {
  const el = document.getElementById(id) as HTMLInputElement | HTMLTextAreaElement | null;
  return el?.value || "";
}
function setVal(id: string, value: string) {
  const el = document.getElementById(id) as HTMLInputElement | HTMLTextAreaElement | null;
  if (!el) return;
  el.value = value;
  el.dispatchEvent(new Event("input", { bubbles: true }));
}
function ctx() {
  return {
    problematica: getVal("f-problematica"),
    participantType: getVal("f-participant_type"),
    circleType: getVal("f-circle_type"),
    circleDate: getVal("f-circle_date"),
    circleTime: getVal("f-circle_time"),
  };
}

function AiButton({ fieldKey, targetId }: { fieldKey: AiFieldKey; targetId: string }) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function run() {
    setLoading(true);
    setErr(null);
    try {
      const res = await draftFichaField(fieldKey, getVal(targetId), ctx());
      if (res.error) setErr(res.error);
      else if (res.text) setVal(targetId, res.text);
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

const STAGE_LABELS: Record<string, string> = {
  q_icebreaker: "Preguntas para romper el hielo",
  q_intro: "Preguntas para introducir la temática",
  q_develop: "Preguntas para desarrollar la temática",
  q_actions: "Preguntas para definir acciones y compromisos",
};

function QuestionGenerator({ caseFileId }: { caseFileId?: string }) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [banks, setBanks] = useState<Record<string, string[]>>({});
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  async function generate() {
    setLoading(true);
    setErr(null);
    try {
      const res = await suggestCircleQuestions(getVal("f-problematica"), {
        circleType: getVal("f-circle_type"),
        participantType: getVal("f-participant_type"),
        modality: getVal("f-circle_modality"),
        participantsCount: getVal("f-participants_count"),
        caseFileId: caseFileId || undefined,
      });
      if ("error" in res) setErr(res.error);
      else {
        setBanks(res.questions);
        setChecked({});
      }
    } catch {
      setErr("Error al conectar con la IA.");
    } finally {
      setLoading(false);
    }
  }

  function addSelected(stageKey: string) {
    const picked = (banks[stageKey] || []).filter((_, i) => checked[`${stageKey}:${i}`]);
    if (picked.length === 0) return;
    const targetId = `f-${stageKey}`;
    const cur = getVal(targetId).trim();
    const existing = new Set(cur.split("\n").map((s) => s.trim()));
    const merged = [...cur.split("\n").filter(Boolean), ...picked.filter((p) => !existing.has(p.trim()))];
    setVal(targetId, merged.join("\n"));
    // Limpiar los marcados de esa fase
    setChecked((prev) => {
      const next = { ...prev };
      (banks[stageKey] || []).forEach((_, i) => delete next[`${stageKey}:${i}`]);
      return next;
    });
  }

  const hasBanks = Object.values(banks).some((a) => a.length > 0);

  return (
    <div className="border border-violet-200 bg-violet-50/40 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-violet-900">Generar preguntas con IA</p>
          <p className="text-xs text-slate-500">
            Escribe la problemática arriba y la IA propone preguntas restaurativas (enfoque de la
            ley: LOEI, Código de la Niñez, prácticas restaurativas). Marca las que quieras usar.
          </p>
        </div>
        <button
          type="button"
          onClick={generate}
          disabled={loading}
          className="shrink-0 inline-flex items-center gap-1 rounded-full border bg-violet-600 border-violet-600 text-white hover:bg-violet-700 disabled:opacity-60 text-xs px-3 py-1.5 font-semibold"
        >
          ✨ {loading ? "Generando…" : "Generar preguntas"}
        </button>
      </div>
      {err && <p className="text-xs text-red-600">⚠️ {err}</p>}

      {hasBanks &&
        QUESTION_STAGES.map((stage) => {
          const list = banks[stage.key] || [];
          if (list.length === 0) return null;
          return (
            <div key={stage.key} className="rounded border border-violet-200 bg-white p-3">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-xs font-semibold text-slate-700">{STAGE_LABELS[stage.key]}</p>
                <button
                  type="button"
                  onClick={() => addSelected(stage.key)}
                  className="text-[11px] font-semibold text-violet-700 hover:underline"
                >
                  + Agregar seleccionadas
                </button>
              </div>
              <ul className="space-y-1">
                {list.map((q, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs">
                    <input
                      type="checkbox"
                      className="mt-0.5"
                      checked={!!checked[`${stage.key}:${i}`]}
                      onChange={(e) =>
                        setChecked((prev) => ({ ...prev, [`${stage.key}:${i}`]: e.target.checked }))
                      }
                    />
                    <span className="text-slate-700">{q}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
    </div>
  );
}

export default function FichaCirculoForm({
  mode,
  fichaId,
  prefill,
  initialData,
}: {
  mode: "create" | "edit";
  fichaId?: string;
  prefill: Prefill;
  initialData?: RestorativeCircleFichaRow;
}) {
  const v = (k: string): string => {
    const fromInitial = initialData ? (initialData as unknown as Record<string, unknown>)[k] : undefined;
    if (fromInitial != null) return String(fromInitial);
    const p = prefill[k];
    return p == null ? "" : String(p);
  };

  const action = mode === "edit" ? updateCircleFicha.bind(null, fichaId!) : createCircleFicha;

  const Label = ({ children }: { children: React.ReactNode }) => (
    <label className="label text-xs">{children}</label>
  );

  const IN = ({ name, type = "text", w, voice }: { name: string; type?: string; w?: string; voice?: boolean }) => (
    <div className={w}>
      <div className="flex items-center justify-between">
        <Label>{LABELS[name] || name}</Label>
        {voice && <VoiceDictationButton targetId={`f-${name}`} />}
      </div>
      <input id={`f-${name}`} name={name} type={type} defaultValue={v(name)} className="input text-sm" />
    </div>
  );

  const TA = ({
    name,
    rows = 4,
    ai,
    hint,
  }: {
    name: string;
    rows?: number;
    ai?: AiFieldKey;
    hint?: string;
  }) => (
    <div>
      <div className="flex items-center justify-between mb-1">
        <Label>{LABELS[name] || name}</Label>
        <div className="flex items-center gap-2">
          <VoiceDictationButton targetId={`f-${name}`} />
          {ai && <AiButton fieldKey={ai} targetId={`f-${name}`} />}
        </div>
      </div>
      <textarea id={`f-${name}`} name={name} rows={rows} defaultValue={v(name)} className="textarea text-sm" />
      {hint && <p className="text-[11px] text-slate-400 mt-0.5">{hint}</p>}
    </div>
  );

  return (
    <form action={action} className="card p-6 space-y-6 max-w-4xl">
      <input type="hidden" name="case_file_id" defaultValue={v("case_file_id")} />
      <input type="hidden" name="student_id" defaultValue={v("student_id")} />
      <input type="hidden" name="ficha_code" defaultValue={v("ficha_code")} />

      {mode === "create" && (
        <p className="text-xs text-slate-500">
          El código de la ficha se asigna automáticamente al guardar.
          {v("case_file_id") && " Esta ficha quedará vinculada al caso."}
        </p>
      )}

      <section>
        <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">Datos generales</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {IN({ name: "center_name", voice: true })}
          {IN({ name: "district_name", voice: true })}
          {IN({ name: "facilitator_name", voice: true })}
          <div>
            <Label>{LABELS.circle_type}</Label>
            <select
              id="f-circle_type"
              name="circle_type"
              defaultValue={v("circle_type") || "Reactivo"}
              className="select text-sm"
            >
              {CIRCLE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>{LABELS.circle_modality}</Label>
            <select
              id="f-circle_modality"
              name="circle_modality"
              defaultValue={v("circle_modality") || "grupal"}
              className="select text-sm"
            >
              {CIRCLE_MODALITIES.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Define si la IA formula preguntas para el grupo o dirigidas por rol (quien causó el daño / quien fue afectado).
            </p>
          </div>
          {IN({ name: "participants_count" })}
          {IN({ name: "participant_type", voice: true })}
          {IN({ name: "circle_date", type: "date" })}
          {IN({ name: "circle_time", type: "time" })}
        </div>
        <div className="mt-3">
          <div className="flex items-center justify-between mb-1">
            <Label>{LABELS.problematica}</Label>
            <VoiceDictationButton targetId="f-problematica" />
          </div>
          <input id="f-problematica" name="problematica" defaultValue={v("problematica")} className="input text-sm" />
          <p className="text-[11px] text-slate-400 mt-0.5">
            Ej.: Acoso escolar, conflicto entre pares, violencia entre estudiantes, convivencia de aula.
          </p>
        </div>
      </section>

      <section>
        <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">1) Diágnostico de la problemática</h3>
        {TA({ name: "diagnostico", rows: 6, ai: "diagnostico" })}
      </section>

      <section>
        <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">2) Objetivo(s) del círculo restaurativo</h3>
        {TA({ name: "objetivos", rows: 3, ai: "objetivos", hint: "Un objetivo por línea." })}
      </section>

      <section>
        <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">
          3) Declaración afectiva / declaración inicial
        </h3>
        {TA({ name: "declaracion_inicial", rows: 6, ai: "declaracion_inicial" })}
      </section>

      <section>
        <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">4) Preguntas restaurativas</h3>
        <QuestionGenerator caseFileId={v("case_file_id") || undefined} />
        <div className="space-y-4 mt-4">
          {QUESTION_STAGES.map((stage) => (
            <div key={stage.key}>
              <div className="flex items-center justify-between mb-1">
                <Label>
                  {stage.numeral}. {stage.title}
                </Label>
                <VoiceDictationButton targetId={`f-${stage.key}`} />
              </div>
              <textarea
                id={`f-${stage.key}`}
                name={stage.key}
                rows={stage.key === "q_develop" ? 6 : 3}
                defaultValue={v(stage.key)}
                className="textarea text-sm"
              />
              <p className="text-[11px] text-slate-400 mt-0.5">Una pregunta por línea.</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">5) Declaración de cierre</h3>
        {TA({ name: "declaracion_cierre", rows: 4, ai: "declaracion_cierre" })}
      </section>

      <section>
        <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">6) Informe del círculo realizado</h3>
        {TA({ name: "informe_circulo", rows: 7, ai: "informe_circulo" })}
      </section>

      <section>
        <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">
          7) Conclusión de la información recolectada
        </h3>
        {TA({ name: "conclusion", rows: 5, ai: "conclusion", hint: "Una conclusión por línea." })}
      </section>

      <div className="flex justify-end">
        <button type="submit" className="btn-primary">
          {mode === "edit" ? "Guardar cambios" : "Guardar y ver ficha"}
        </button>
      </div>
    </form>
  );
}

const LABELS: Record<string, string> = {
  center_name: "Centro educativo",
  district_name: "Distrito educativo",
  facilitator_name: "Facilitador / facilitadora",
  circle_type: "Tipo de círculo restaurativo",
  circle_modality: "Modalidad del círculo",
  participants_count: "N.º participantes",
  participant_type: "Tipo de participantes",
  problematica: "Problemática",
  circle_date: "Fecha del círculo restaurativo",
  circle_time: "Horario del círculo restaurativo",
  diagnostico: "Diágnostico de la problemática",
  objetivos: "Objetivo(s) del círculo restaurativo",
  declaracion_inicial: "Declaración afectiva / declaración inicial",
  declaracion_cierre: "Declaración de cierre",
  informe_circulo: "Informe del círculo realizado",
  conclusion: "Conclusión de la información recolectada",
};
