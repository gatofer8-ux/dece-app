"use client";

import { useState } from "react";
import Link from "next/link";
import VoiceDictationButton from "@/components/VoiceDictationButton";
import AIAssistButton from "@/components/AIAssistButton";
import { MAX_NARRATIVE, visibleStructure, type Answers, type InterviewStructure } from "@/lib/entrevistaPreguntas";
import { distributeNarrativeAi } from "./actions";

const NARRATIVE_ID = "interview-narrative";

/** Escribe en un campo no controlado de React y avisa del cambio. */
function setFieldValue(el: HTMLTextAreaElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
  if (setter) setter.call(el, value);
  else el.value = value;
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
}

export default function PreguntasInterviewForm({
  caseId,
  structure,
  answers,
  defaults,
  action,
  cancelHref,
  isEditing = false,
}: {
  caseId: string;
  structure: InterviewStructure;
  answers: Answers;
  defaults: { name: string; course: string; date: string };
  action: (formData: FormData) => Promise<void>;
  cancelHref: string;
  isEditing?: boolean;
}) {
  const vis = visibleStructure(structure);
  const [loading, setLoading] = useState(false);
  const [overwrite, setOverwrite] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [filled, setFilled] = useState<Set<string>>(new Set());

  async function distribute() {
    const narrative = (document.getElementById(NARRATIVE_ID) as HTMLTextAreaElement | null)?.value || "";
    const questions = vis.sections.flatMap((s) => s.questions.map((q) => ({ id: q.id, text: q.text })));
    setMessage(null);
    setLoading(true);
    try {
      const res = await distributeNarrativeAi(caseId, narrative, questions);
      if (res.error || !res.answers) {
        setMessage({ kind: "error", text: res.error || "No se pudo repartir el relato." });
        return;
      }
      let done = 0;
      let skipped = 0;
      const ids = new Set<string>();
      for (const [id, text] of Object.entries(res.answers)) {
        const el = document.getElementById(`ans_${id}`) as HTMLTextAreaElement | null;
        if (!el) continue;
        if (el.value.trim() && !overwrite) {
          skipped++;
          continue;
        }
        setFieldValue(el, text);
        ids.add(id);
        done++;
      }
      setFilled(ids);
      setMessage({
        kind: "ok",
        text:
          `Se completaron ${done} pregunta${done === 1 ? "" : "s"}.` +
          (skipped ? ` ${skipped} ya tenían texto y no se tocaron.` : "") +
          " Revisa cada respuesta antes de guardar.",
      });
    } catch {
      setMessage({ kind: "error", text: "No se pudo contactar a la IA. Intenta de nuevo." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form action={action} className="card p-6 space-y-6 max-w-3xl">
      <div>
        <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">Datos del estudiante</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label className="label text-xs">Nombres y apellidos</label>
            <input name="interviewee_name" required defaultValue={defaults.name} className="input" maxLength={200} />
          </div>
          <div>
            <label className="label text-xs">Curso / paralelo / jornada</label>
            <input name="course" defaultValue={defaults.course} className="input" maxLength={200} />
          </div>
          <div>
            <label className="label text-xs">Fecha</label>
            <input type="date" name="application_date" defaultValue={defaults.date} className="input" />
          </div>
        </div>
      </div>

      {/* Relato libre: se escribe o se dicta y la IA lo reparte en las preguntas */}
      <div className="rounded-xl border border-violet-200 dark:border-violet-900 bg-violet-50/50 dark:bg-violet-950/20 p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-xs font-semibold text-violet-800 dark:text-violet-300 uppercase">Relato de la entrevista (opcional)</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Escribe o dicta lo conversado, sin preocuparte por el orden. Luego la IA lo reparte en las preguntas de abajo, usando solo lo que dijiste.
            </p>
          </div>
          <VoiceDictationButton targetId={NARRATIVE_ID} compact />
        </div>
        <textarea
          id={NARRATIVE_ID}
          rows={6}
          maxLength={MAX_NARRATIVE}
          className="textarea"
          placeholder="Ej.: El estudiante refiere que se siente bien en el colegio, que tiene dos amigos con quienes comparte el recreo..."
        />
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={distribute}
            disabled={loading}
            className="btn-primary text-xs disabled:opacity-60"
          >
            {loading ? "⏳ Repartiendo en las preguntas..." : "✨ Repartir en las preguntas con IA"}
          </button>
          <label className="flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-300">
            <input type="checkbox" checked={overwrite} onChange={(e) => setOverwrite(e.target.checked)} />
            Reemplazar respuestas que ya escribí
          </label>
        </div>
        {message && (
          <p className={`text-xs ${message.kind === "ok" ? "text-emerald-700 dark:text-emerald-300" : "text-rose-600"}`}>
            {message.text}
          </p>
        )}
      </div>

      {vis.sections.map((sec) => (
        <div key={sec.id} className="space-y-3">
          <h3 className="text-xs font-semibold text-slate-500 uppercase border-b border-slate-200 pb-1">{sec.title}</h3>
          {sec.questions.map((qq) => (
            <div key={qq.id}>
              <div className="flex items-start justify-between gap-2">
                <label htmlFor={`ans_${qq.id}`} className="label text-xs flex-1">{qq.text}</label>
                <div className="flex items-center gap-1.5 shrink-0">
                  <VoiceDictationButton targetId={`ans_${qq.id}`} compact />
                  <AIAssistButton
                    targetId={`ans_${qq.id}`}
                    caseId={caseId}
                    fieldLabel={`Respuesta a la pregunta de la entrevista a estudiantes: ${qq.text}`}
                    compact
                  />
                </div>
              </div>
              <textarea
                id={`ans_${qq.id}`}
                name={`ans_${qq.id}`}
                rows={3}
                defaultValue={answers[qq.id] || ""}
                className={`textarea ${filled.has(qq.id) ? "ring-2 ring-violet-400" : ""}`}
                maxLength={5000}
              />
            </div>
          ))}
        </div>
      ))}

      <div className="flex justify-end gap-3 pt-2">
        <Link href={cancelHref} className="btn-secondary">Cancelar</Link>
        <button type="submit" className="btn-primary">{isEditing ? "Guardar cambios" : "Guardar entrevista"}</button>
      </div>
    </form>
  );
}
