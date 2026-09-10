"use client";

import { useState } from "react";
import { draftTapasAreas } from "../../../actions";

export default function TapasAreasHelper({
  groups,
}: {
  groups: { name: string; archetypes: string[] }[];
}) {
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState("");
  const [err, setErr] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setErr(null);
    try {
      const res = await draftTapasAreas(groups);
      if (res.error) setErr(res.error);
      else setText(res.text || "");
    } catch {
      setErr("Error al conectar con la IA.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between gap-2 mb-2">
        <h3 className="text-sm font-semibold text-slate-700">Áreas de estudio sugeridas</h3>
        <button
          type="button"
          onClick={run}
          disabled={loading}
          className="inline-flex items-center gap-1 rounded-full border bg-violet-50 border-violet-300 text-violet-700 hover:bg-violet-100 disabled:opacity-60 text-[11px] px-2.5 py-1 font-medium"
        >
          ✨ {loading ? "Generando…" : text ? "Regenerar" : "Sugerir con IA"}
        </button>
      </div>
      {err && <p className="text-xs text-red-600">⚠️ {err}</p>}
      {text ? (
        <div className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{text}</div>
      ) : (
        <p className="text-xs text-slate-400">
          La IA propone áreas de estudio y campos ocupacionales a partir de los grupos de talentos del estudiante,
          para contrastarlos en la entrevista de orientación.
        </p>
      )}
    </div>
  );
}
