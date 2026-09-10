"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  IPPJ_ITEMS,
  IPPJ_LIKERT_OPTIONS,
  IPPJ_SURVEY_QUESTIONS,
  ESTUDIOS_OPTIONS,
  DECISION_OPTIONS,
} from "@/lib/ovp/ippjInstrument";
import { saveOvpProgress, finalizeOvpApplication } from "../actions";

const ITEMS_PER_PAGE = 10;
const ITEM_PAGES = Math.ceil(IPPJ_ITEMS.length / ITEMS_PER_PAGE); // 6

type SurveyState = Record<string, string | string[]>;
type AnswersState = Record<string, number>;

export default function RQuestionnaire({
  code,
  appId,
  studentName,
  initialSurvey,
  initialAnswers,
}: {
  code: string;
  appId: string;
  studentName: string;
  initialSurvey: SurveyState;
  initialAnswers: AnswersState;
}) {
  const router = useRouter();
  const storeKey = `ovp:${appId}`;
  const [page, setPage] = useState(0); // 0 = encuesta, 1..ITEM_PAGES = items, ITEM_PAGES+1 = revisión
  const [survey, setSurvey] = useState<SurveyState>(initialSurvey || {});
  const [answers, setAnswers] = useState<AnswersState>(initialAnswers || {});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const dirty = useRef(false);

  // Rehidratar desde localStorage (por si el servidor tenía menos que el dispositivo).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storeKey);
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved.answers && Object.keys(saved.answers).length >= Object.keys(initialAnswers || {}).length) {
          setAnswers(saved.answers);
        }
        if (saved.survey && Object.keys(saved.survey).length >= Object.keys(initialSurvey || {}).length) {
          setSurvey(saved.survey);
        }
      }
    } catch {
      /* almacenamiento no disponible */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Guardar en localStorage en cada cambio.
  useEffect(() => {
    try {
      localStorage.setItem(storeKey, JSON.stringify({ survey, answers }));
    } catch {
      /* noop */
    }
    dirty.current = true;
  }, [survey, answers, storeKey]);

  async function persist() {
    if (!dirty.current) return;
    try {
      await saveOvpProgress(code, appId, { survey, answers });
      dirty.current = false;
    } catch {
      /* se conserva en localStorage */
    }
  }

  const answeredCount = Object.values(answers).filter((v) => v >= 1 && v <= 5).length;
  const totalSteps = ITEM_PAGES + 2;
  const progress = Math.round(((page + 1) / totalSteps) * 100);

  const pageItems = useMemo(() => {
    if (page < 1 || page > ITEM_PAGES) return [];
    const start = (page - 1) * ITEMS_PER_PAGE;
    return IPPJ_ITEMS.slice(start, start + ITEMS_PER_PAGE);
  }, [page]);

  function surveyComplete() {
    return IPPJ_SURVEY_QUESTIONS.every((q) => {
      const v = survey[q.key];
      if (q.type === "list3") return Array.isArray(v) && v.some((x) => (x || "").trim());
      return typeof v === "string" && v.trim().length > 0;
    });
  }
  function pageItemsComplete() {
    return pageItems.every((it) => answers[it.n] >= 1 && answers[it.n] <= 5);
  }

  async function next() {
    setError(null);
    if (page === 0 && !surveyComplete()) {
      setError("Por favor responde todas las preguntas de la encuesta.");
      return;
    }
    if (page >= 1 && page <= ITEM_PAGES && !pageItemsComplete()) {
      setError("Responde todas las frases de esta página antes de continuar.");
      return;
    }
    await persist();
    setPage((p) => Math.min(p + 1, totalSteps - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function back() {
    setError(null);
    setPage((p) => Math.max(p - 1, 0));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submit() {
    setError(null);
    if (answeredCount < IPPJ_ITEMS.length) {
      setError(`Faltan ${IPPJ_ITEMS.length - answeredCount} frases por responder.`);
      return;
    }
    setSubmitting(true);
    try {
      const res = await finalizeOvpApplication(code, appId, { survey, answers });
      if (!res.ok) {
        setError(res.error || "No se pudo enviar. Intenta de nuevo.");
        setSubmitting(false);
        return;
      }
      try {
        localStorage.removeItem(storeKey);
      } catch {
        /* noop */
      }
      router.push(`/r/${code}/${appId}/gracias`);
    } catch {
      setError("No se pudo enviar. Revisa tu conexión e intenta de nuevo.");
      setSubmitting(false);
    }
  }

  const setSurveyVal = (key: string, val: string | string[]) => setSurvey((s) => ({ ...s, [key]: val }));
  const setList = (key: string, i: number, val: string) =>
    setSurvey((s) => {
      const arr = Array.isArray(s[key]) ? [...(s[key] as string[])] : ["", "", ""];
      arr[i] = val;
      return { ...s, [key]: arr };
    });

  return (
    <div className="min-h-screen bg-slate-50 py-6 px-4">
      <div className="max-w-lg mx-auto">
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>{studentName}</span>
            <span>
              {page === 0
                ? "Encuesta"
                : page <= ITEM_PAGES
                ? `Frases ${answeredCount}/${IPPJ_ITEMS.length}`
                : "Revisión"}
            </span>
          </div>
          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
            <div className="h-full bg-blue-600 transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 sm:p-6">
          {page === 0 && (
            <div className="space-y-5">
              <h2 className="font-bold text-slate-900">Encuesta previa</h2>
              {IPPJ_SURVEY_QUESTIONS.map((q) => (
                <div key={q.key}>
                  <label className="block text-sm font-medium text-slate-800 mb-1.5">{q.text}</label>
                  {q.type === "list3" && (
                    <div className="space-y-2">
                      {[0, 1, 2].map((i) => (
                        <input
                          key={i}
                          value={(Array.isArray(survey[q.key]) ? (survey[q.key] as string[])[i] : "") || ""}
                          onChange={(e) => setList(q.key, i, e.target.value)}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base"
                          placeholder={`${i + 1})`}
                        />
                      ))}
                    </div>
                  )}
                  {q.type === "text" && (
                    <textarea
                      value={(survey[q.key] as string) || ""}
                      onChange={(e) => setSurveyVal(q.key, e.target.value)}
                      rows={2}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base"
                    />
                  )}
                  {q.type === "select_estudios" && (
                    <select
                      value={(survey[q.key] as string) || ""}
                      onChange={(e) => setSurveyVal(q.key, e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base"
                    >
                      <option value="">— Selecciona —</option>
                      {ESTUDIOS_OPTIONS.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  )}
                  {q.type === "select_decision" && (
                    <select
                      value={(survey[q.key] as string) || ""}
                      onChange={(e) => setSurveyVal(q.key, e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base"
                    >
                      <option value="">— Selecciona —</option>
                      {DECISION_OPTIONS.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              ))}
            </div>
          )}

          {page >= 1 && page <= ITEM_PAGES && (
            <div className="space-y-5">
              <h2 className="font-bold text-slate-900">¿Hasta qué punto te describe cada frase?</h2>
              {pageItems.map((it) => (
                <div key={it.n} className="border-b border-slate-100 pb-4 last:border-0">
                  <p className="text-sm text-slate-800 mb-2">
                    <span className="text-slate-400 font-mono mr-1">{it.n}.</span>
                    {it.text}
                  </p>
                  <div className="flex gap-1.5">
                    {IPPJ_LIKERT_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setAnswers((a) => ({ ...a, [it.n]: opt.value }))}
                        className={`flex-1 rounded-lg border px-1 py-2 text-xs font-medium leading-tight ${
                          answers[it.n] === opt.value
                            ? "bg-blue-600 border-blue-600 text-white"
                            : "bg-white border-slate-300 text-slate-600 hover:border-blue-400"
                        }`}
                        title={opt.label}
                      >
                        {opt.value}
                      </button>
                    ))}
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                    <span>Totalmente en desacuerdo</span>
                    <span>Totalmente de acuerdo</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {page === totalSteps - 1 && (
            <div className="space-y-4">
              <h2 className="font-bold text-slate-900">Revisión</h2>
              {answeredCount < IPPJ_ITEMS.length ? (
                <p className="text-sm text-rose-600">
                  Te faltan {IPPJ_ITEMS.length - answeredCount} frases. Vuelve atrás para completarlas.
                </p>
              ) : (
                <p className="text-sm text-emerald-700">Respondiste todas las frases. Puedes enviar.</p>
              )}
              <p className="text-xs text-slate-500">
                Al enviar, tu perfil vocacional se calcula automáticamente y queda disponible para el DECE de tu
                institución.
              </p>
            </div>
          )}

          {error && <p className="mt-4 text-sm text-rose-600">{error}</p>}

          <div className="mt-6 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={back}
              disabled={page === 0 || submitting}
              className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-600 disabled:opacity-40"
            >
              Atrás
            </button>
            {page < totalSteps - 1 ? (
              <button
                type="button"
                onClick={next}
                className="rounded-lg bg-blue-700 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-800"
              >
                Continuar
              </button>
            ) : (
              <button
                type="button"
                onClick={submit}
                disabled={submitting || answeredCount < IPPJ_ITEMS.length}
                className="rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-40"
              >
                {submitting ? "Enviando…" : "Enviar"}
              </button>
            )}
          </div>
        </div>

        <p className="text-center text-[11px] text-slate-400 mt-3">
          Tus respuestas se guardan en este dispositivo mientras avanzas. Si cierras, vuelve al mismo enlace para
          continuar.
        </p>
      </div>
    </div>
  );
}
