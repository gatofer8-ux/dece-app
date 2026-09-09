"use client";

import { useState } from "react";
import { generateDailyAttentionAiDraft } from "./ai-actions";

/**
 * Igual que src/components/AIAssistButton.tsx pero para el Registro de
 * Atención Diaria, que no pertenece a ningún caso — llama a
 * generateDailyAttentionAiDraft en vez de la versión con contexto de caso.
 */
export default function AIAssistButton({ targetId, fieldLabel }: { targetId: string; fieldLabel: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    const target = document.getElementById(targetId) as HTMLTextAreaElement | HTMLInputElement | null;
    if (!target) return;
    setLoading(true);
    setError(null);
    try {
      const result = await generateDailyAttentionAiDraft(fieldLabel, target.value);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.text) {
        target.value = result.text;
        target.dispatchEvent(new Event("input", { bubbles: true }));
        target.focus();
      }
    } catch {
      setError("Ocurrió un error al conectar con el servicio de IA.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="inline-flex items-center gap-1 text-xs rounded-full px-2 py-1 border transition-colors bg-violet-50 border-violet-300 text-violet-700 hover:bg-violet-100 disabled:opacity-60"
        title="Redactar o mejorar con ayuda de IA"
      >
        <span aria-hidden>✨</span> {loading ? "Redactando…" : "Ayuda de IA"}
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </span>
  );
}
