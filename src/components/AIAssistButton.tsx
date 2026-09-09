"use client";

import { useState } from "react";
import { generateAiDraft } from "@/app/(app)/casos/[id]/ai-actions";

/**
 * Botón de ayuda de IA para un campo de texto específico (textarea). Llama a
 * la API gratuita de Gemini con el contexto del caso para generar o mejorar
 * un borrador, y lo inserta en el campo indicado por targetId — el
 * profesional siempre revisa y edita el resultado antes de guardar, nunca se
 * guarda nada automáticamente.
 */
export default function AIAssistButton({
  targetId,
  caseId,
  fieldLabel,
  onResult,
  compact = false,
}: {
  targetId: string;
  caseId: string;
  fieldLabel: string;
  onResult?: (text: string) => void;
  compact?: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    const target = document.getElementById(targetId) as HTMLTextAreaElement | HTMLInputElement | null;
    if (!target) return;
    setLoading(true);
    setError(null);
    try {
      const result = await generateAiDraft(caseId, fieldLabel, target.value);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.text) {
        const prototype = target instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
        const valueSetter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
        if (valueSetter) {
          valueSetter.call(target, result.text);
        } else {
          target.value = result.text;
        }
        target.dispatchEvent(new Event("input", { bubbles: true }));
        target.dispatchEvent(new Event("change", { bubbles: true }));
        target.focus();
        if (onResult) {
          onResult(result.text);
        }
      }
    } catch {
      setError("Ocurrió un error al conectar con el servicio de IA.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className={`inline-flex items-center gap-1 rounded-full border transition-colors bg-violet-50 border-violet-300 text-violet-700 hover:bg-violet-100 disabled:opacity-60 font-medium ${
          compact ? "text-[11px] px-2 py-0.5" : "text-xs px-2.5 py-1"
        }`}
        title="Redactar o mejorar con ayuda de IA"
      >
        <span aria-hidden>✨</span> {loading ? "Redactando…" : "Ayuda de IA"}
      </button>
      {error && <span className="text-[11px] text-red-600 bg-red-50 border border-red-200 rounded px-1">{error}</span>}
    </span>
  );
}
