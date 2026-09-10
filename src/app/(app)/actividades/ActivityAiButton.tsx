"use client";

import { useState } from "react";
import { generateActivityAiDraft } from "./ai-actions";

export default function ActivityAiButton({
  fieldKey,
  targetId,
}: {
  fieldKey: "description" | "evidence_notes";
  targetId: string;
}) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleClick() {
    const target = document.getElementById(targetId) as HTMLTextAreaElement | null;
    if (!target) return;

    // Obtener valores contextuales del formulario
    const titleInput = document.getElementById("act-title") as HTMLInputElement | null;
    const axisSelect = document.getElementById("act-axis") as HTMLSelectElement | null;
    const themeSelect = document.getElementById("act-theme") as HTMLSelectElement | null;
    const targetInput = document.getElementById("act-target") as HTMLInputElement | null;
    const coursesInput = document.getElementById("act-courses") as HTMLInputElement | null;

    setLoading(true);
    setErr(null);

    try {
      const res = await generateActivityAiDraft({
        fieldKey,
        title: titleInput?.value?.trim() || "",
        axis: axisSelect?.value || "",
        preventionTheme: themeSelect?.value || "",
        targetAudience: targetInput?.value?.trim() || "",
        courses: coursesInput?.value?.trim() || "",
        currentText: target.value || "",
      });

      if (res.error) {
        setErr(res.error);
      } else if (res.text) {
        target.value = res.text;
        target.dispatchEvent(new Event("input", { bubbles: true }));
        target.dispatchEvent(new Event("change", { bubbles: true }));
        target.focus();
      }
    } catch {
      setErr("Error al conectar con el servicio de IA.");
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
        className="inline-flex items-center gap-1 rounded-full border transition-colors bg-violet-50 border-violet-300 text-violet-700 hover:bg-violet-100 disabled:opacity-60 text-xs px-2.5 py-0.5 font-medium shadow-2xs"
        title="Redactar o enriquecer con ayuda de IA"
      >
        <span aria-hidden>✨</span> {loading ? "Redactando…" : "Ayuda de IA"}
      </button>
      {err && <span className="text-xs text-red-600 font-medium">{err}</span>}
    </span>
  );
}
