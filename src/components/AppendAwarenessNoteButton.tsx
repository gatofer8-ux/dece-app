"use client";

import { useState } from "react";
import { REPRESENTATIVE_AWARENESS_NOTE } from "@/lib/interviewDefaults";

export default function AppendAwarenessNoteButton({ targetId }: { targetId: string }) {
  const [copied, setCopied] = useState(false);

  function appendNote() {
    const el = document.getElementById(targetId) as HTMLTextAreaElement | null;
    if (!el) return;
    const current = el.value.trim();
    if (current.includes("NOTA DE CONOCIMIENTO Y CORRESPONSABILIDAD") || current.includes("plena toma de conocimiento")) {
      // Ya está presente, evitamos duplicar
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      return;
    }
    el.value = current ? `${current}\n\n${REPRESENTATIVE_AWARENESS_NOTE}` : REPRESENTATIVE_AWARENESS_NOTE;
    el.dispatchEvent(new Event("input", { bubbles: true }));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={appendNote}
      title="Anexar nota técnica de toma de conocimiento y corresponsabilidad del representante"
      className="inline-flex items-center gap-1 rounded-full border border-sky-300 bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-800 hover:bg-sky-100 transition-colors"
    >
      📝 {copied ? "¡Nota anexada!" : "Anexar nota de corresponsabilidad"}
    </button>
  );
}
