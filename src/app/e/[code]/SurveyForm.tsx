"use client";

import { useMemo, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { submitEneisSurveyAction, type SurveyActionState } from "./actions";
import type { SurveyQuestion } from "@/lib/eneis/eneisSurveyInstrument";

const initialState: SurveyActionState = { error: null };

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending || disabled} className="btn-primary w-full disabled:opacity-50">
      {pending ? "Enviando..." : "Enviar respuestas"}
    </button>
  );
}

export default function SurveyForm({ code, questions }: { code: string; questions: SurveyQuestion[] }) {
  const [state, formAction] = useFormState(submitEneisSurveyAction.bind(null, code), initialState);
  const [answers, setAnswers] = useState<(number | null)[]>(() => questions.map(() => null));

  const allAnswered = useMemo(() => answers.every((a) => a !== null), [answers]);
  const answersJson = useMemo(() => JSON.stringify(answers.map((a) => a ?? -1)), [answers]);

  function pick(qi: number, oi: number) {
    setAnswers((prev) => prev.map((v, i) => (i === qi ? oi : v)));
  }

  return (
    <form action={formAction} className="space-y-5">
      {state.error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-lg text-xs font-medium">⚠️ {state.error}</div>
      )}
      <input type="hidden" name="answers" value={answersJson} />

      {questions.map((q, qi) => (
        <div key={qi} className="space-y-2">
          <p className="text-sm font-semibold text-slate-800">
            {qi + 1}. {q.text}
          </p>
          <div className="space-y-1.5">
            {q.options.map((opt, oi) => (
              <label
                key={oi}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm cursor-pointer transition ${
                  answers[qi] === oi
                    ? "bg-brand-50 border-brand-300 text-brand-800 font-medium"
                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                <input
                  type="radio"
                  name={`q_${qi}`}
                  checked={answers[qi] === oi}
                  onChange={() => pick(qi, oi)}
                  className="accent-brand-600"
                />
                {opt}
              </label>
            ))}
          </div>
        </div>
      ))}

      <SubmitButton disabled={!allAnswered} />
      {!allAnswered && <p className="text-[11px] text-slate-400 text-center">Responde todas las preguntas para poder enviar.</p>}
    </form>
  );
}
