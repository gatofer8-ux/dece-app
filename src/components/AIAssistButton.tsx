"use client";

import { useState, useRef } from "react";
import { executeAiContextEngineAction } from "@/lib/aiContextAction";
import type { EngineStrategy } from "@/lib/aiContextEngine";

export interface AIAssistButtonProps {
  targetId: string;
  caseId?: string;
  fieldLabel: string;
  documentType?: string;
  sectionPurpose?: string;
  customContext?: string;
  institutionalRules?: string[];
  relatedFieldIds?: string[];
  onResult?: (text: string) => void;
  compact?: boolean;
}

export default function AIAssistButton({
  targetId,
  caseId,
  fieldLabel,
  documentType,
  sectionPurpose,
  customContext,
  institutionalRules,
  relatedFieldIds,
  onResult,
  compact = false,
}: AIAssistButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estados del contenido
  const [currentText, setCurrentText] = useState("");
  const [selectedText, setSelectedText] = useState("");
  const [selectionRange, setSelectionRange] = useState<{ start: number; end: number } | null>(null);
  const [userInstruction, setUserInstruction] = useState("");

  // Estados del resultado de la IA
  const [aiProposal, setAiProposal] = useState<string | null>(null);
  const [appliedStrategy, setAppliedStrategy] = useState<EngineStrategy | null>(null);
  const [detectedIntentLabel, setDetectedIntentLabel] = useState<string>("");
  const [appliedConstraints, setAppliedConstraints] = useState<string[]>([]);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [heightened, setHeightened] = useState(false);

  // Referencias
  const instructionInputRef = useRef<HTMLInputElement>(null);

  // Abre el modal inspeccionando el estado del elemento objetivo
  function handleOpenModal() {
    const target = document.getElementById(targetId) as HTMLTextAreaElement | HTMLInputElement | null;
    if (!target) return;

    const fullVal = target.value || "";
    setCurrentText(fullVal);

    let sel = "";
    let range: { start: number; end: number } | null = null;
    if (typeof target.selectionStart === "number" && typeof target.selectionEnd === "number") {
      if (target.selectionEnd > target.selectionStart) {
        sel = fullVal.substring(target.selectionStart, target.selectionEnd);
        range = { start: target.selectionStart, end: target.selectionEnd };
      }
    }
    setSelectedText(sel);
    setSelectionRange(range);

    // Resetear estados de propuesta previa
    setAiProposal(null);
    setUserInstruction("");
    setError(null);
    setWarningMessage(null);
    setIsOpen(true);

    setTimeout(() => {
      instructionInputRef.current?.focus();
    }, 100);
  }

  // Recolecta secciones relacionadas para coherencia cruzada
  function collectRelatedSections(target: HTMLElement | null): Record<string, string> {
    const related: Record<string, string> = {};

    if (relatedFieldIds && relatedFieldIds.length > 0) {
      for (const id of relatedFieldIds) {
        const otherEl = document.getElementById(id) as HTMLTextAreaElement | HTMLInputElement | null;
        if (otherEl && otherEl.value?.trim()) {
          const lbl = otherEl.getAttribute("aria-label") || otherEl.getAttribute("placeholder") || id;
          related[lbl] = otherEl.value.trim();
        }
      }
    } else if (target && "form" in target && (target as any).form) {
      const form = (target as any).form as HTMLFormElement;
      const inputs = form.querySelectorAll("textarea, input[type='text']");
      let count = 0;
      inputs.forEach((inputEl: any) => {
        if (inputEl.id !== targetId && inputEl.value && inputEl.value.trim().length > 10 && count < 6) {
          const lbl = inputEl.getAttribute("aria-label") || inputEl.name || inputEl.id;
          related[lbl] = inputEl.value.trim().slice(0, 400);
          count++;
        }
      });
    }

    return related;
  }

  // Ejecuta la llamada al motor universal
  async function handleExecuteAi(customInst?: string) {
    const target = document.getElementById(targetId) as HTMLTextAreaElement | HTMLInputElement | null;
    const finalInstruction = customInst !== undefined ? customInst : userInstruction;

    setLoading(true);
    setError(null);
    setWarningMessage(null);

    try {
      const related = collectRelatedSections(target);

      const res = await executeAiContextEngineAction({
        caseId,
        documentType,
        section: fieldLabel,
        sectionPurpose,
        currentContent: currentText,
        selectedText: selectedText || undefined,
        userInstruction: finalInstruction.trim() || undefined,
        relatedSections: Object.keys(related).length > 0 ? related : undefined,
        customContext,
        institutionalRules,
      });

      if (res.error) {
        setError(res.error);
        return;
      }

      setAiProposal(res.text);
      setAppliedStrategy(res.strategy);
      setDetectedIntentLabel(res.detectedIntent);
      setAppliedConstraints(res.extractedConstraints || []);
      setWarningMessage(res.warning || null);
      setHeightened(Boolean(res.heightenedConfidentiality));
    } catch {
      setError("Ocurrió un error al conectar con el Motor Inteligente de IA.");
    } finally {
      setLoading(false);
    }
  }

  // Aplica los cambios al campo respetando eventos DOM y selección
  function handleApplyChanges(mode: "replace" | "append" = "replace") {
    const target = document.getElementById(targetId) as HTMLTextAreaElement | HTMLInputElement | null;
    if (!target || aiProposal == null) return;

    let newFinalValue = "";

    if (mode === "append") {
      newFinalValue = target.value ? `${target.value.trim()}\n\n${aiProposal.trim()}` : aiProposal.trim();
    } else if (selectionRange && selectedText) {
      // Reemplazo exclusivo del fragmento seleccionado
      const before = target.value.substring(0, selectionRange.start);
      const after = target.value.substring(selectionRange.end);
      newFinalValue = `${before}${aiProposal}${after}`;
    } else {
      // Reemplazo del campo completo
      newFinalValue = aiProposal;
    }

    // Inyección compatible con React y validadores DOM
    const prototype = target instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const valueSetter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
    if (valueSetter) {
      valueSetter.call(target, newFinalValue);
    } else {
      target.value = newFinalValue;
    }

    target.dispatchEvent(new Event("input", { bubbles: true }));
    target.dispatchEvent(new Event("change", { bubbles: true }));
    target.focus();

    if (onResult) {
      onResult(newFinalValue);
    }

    setIsOpen(false);
  }

  // Presets rápidos de instrucción
  const quickPresets = [
    { label: "⚡ Más técnico y formal", prompt: "Hazlo más técnico, formal y con lenguaje institucional del DECE." },
    { label: "📖 Ampliar redacción", prompt: "Amplía la información desarrollando las ideas con mayor profundidad pedagógica." },
    { label: "✂️ Sintetizar", prompt: "Resume en un texto conciso y directo lo más sustancial." },
    { label: "✍️ Corregir ortografía", prompt: "Corrige únicamente ortografía, puntuación y estilo sin cambiar los hechos." },
    { label: "🛡️ Enfoque de derechos", prompt: "Asegura enfoque de derechos y principio de no revictimización." },
    { label: "🚫 Sin diagnósticos", prompt: "No menciones diagnósticos clínicos ni etiquetas patologizantes." },
  ];

  return (
    <>
      {/* Botón activador */}
      <span className="inline-flex items-center gap-1.5">
        <button
          type="button"
          onClick={handleOpenModal}
          className={`inline-flex items-center gap-1 rounded-full border transition-all bg-gradient-to-r from-violet-50 to-indigo-50 border-violet-300 text-violet-700 hover:from-violet-100 hover:to-indigo-100 hover:border-violet-400 disabled:opacity-60 font-medium shadow-xs ${
            compact ? "text-[11px] px-2 py-0.5" : "text-xs px-2.5 py-1"
          }`}
          title="Abrir Asistente de IA Contextual (Generar, Mejorar o Modificar selección)"
        >
          <span aria-hidden className="text-violet-600">✨</span>
          <span>Ayuda de IA</span>
        </button>
      </span>

      {/* Modal Universal de Asistencia IA Contextual */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden text-slate-800"
            role="dialog"
            aria-modal="true"
          >
            {/* Encabezado */}
            <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-violet-50/40 flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-violet-600 text-white text-sm shadow-xs">
                    ✨
                  </span>
                  <h3 className="font-semibold text-slate-900 text-base">
                    Asistente de IA Contextual
                  </h3>
                </div>
                <p className="text-xs text-slate-600 mt-1">
                  Apartado: <span className="font-medium text-slate-800">{fieldLabel}</span>
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
                title="Cerrar modal"
              >
                ✕
              </button>
            </div>

            {/* Contenido scrolleable */}
            <div className="p-5 space-y-4 overflow-y-auto flex-1 text-sm">
              {/* Indicador de estado del campo */}
              <div className="flex flex-wrap items-center gap-2">
                {selectedText ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-900 border border-amber-200">
                    <span>✂️</span> Modificando selección específica ({selectedText.length} caracteres)
                  </span>
                ) : currentText.trim().length > 0 ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-900 border border-blue-200">
                    <span>📝</span> Mejorar redacción existente (preserva hechos)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-900 border border-emerald-200">
                    <span>💡</span> Generar nuevo borrador desde contexto
                  </span>
                )}

                {heightened && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-900 border border-purple-200">
                    🔒 Caso delicado (datos seudonimizados)
                  </span>
                )}
              </div>

              {/* Si hay fragmento seleccionado, mostrar previsualización */}
              {selectedText && (
                <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3 text-xs">
                  <span className="font-semibold text-amber-900 block mb-1">
                    Fragmento seleccionado a modificar:
                  </span>
                  <p className="text-slate-700 italic line-clamp-3">"{selectedText}"</p>
                </div>
              )}

              {/* Instrucción personalizada y presets rápidos */}
              <div className="space-y-2 bg-slate-50/80 p-3.5 rounded-xl border border-slate-200">
                <label className="block text-xs font-semibold text-slate-700">
                  Instrucción personalizada para la IA (opcional):
                </label>
                <div className="flex gap-2">
                  <input
                    ref={instructionInputRef}
                    type="text"
                    value={userInstruction}
                    onChange={(e) => setUserInstruction(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !loading) {
                        e.preventDefault();
                        handleExecuteAi();
                      }
                    }}
                    placeholder="Ej. 'Hazlo más técnico', 'No menciones diagnósticos', 'Resume en 2 párrafos'..."
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 text-slate-900"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => handleExecuteAi()}
                    disabled={loading}
                    className="px-4 py-2 text-xs font-medium rounded-lg text-white bg-violet-600 hover:bg-violet-700 transition-colors shrink-0 disabled:opacity-60 flex items-center gap-1.5 shadow-xs"
                  >
                    {loading ? (
                      <>
                        <span className="animate-spin text-sm">⏳</span>
                        <span>Procesando…</span>
                      </>
                    ) : (
                      <>
                        <span>✨</span>
                        <span>{aiProposal ? "Regenerar" : "Generar con IA"}</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Chips rápidos */}
                <div className="pt-1">
                  <span className="text-[11px] text-slate-500 block mb-1.5">Sugerencias rápidas:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {quickPresets.map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => {
                          setUserInstruction(preset.prompt);
                          handleExecuteAi(preset.prompt);
                        }}
                        disabled={loading}
                        className="text-[11px] px-2.5 py-1 rounded-full bg-white hover:bg-violet-50 border border-slate-200 hover:border-violet-300 text-slate-700 hover:text-violet-700 transition-colors disabled:opacity-50"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Mensajes de error o advertencias */}
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
                  <span>⚠️</span>
                  <span>{error}</span>
                </div>
              )}

              {warningMessage && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
                  <span>ℹ️</span>
                  <span>{warningMessage}</span>
                </div>
              )}

              {/* REGLA DE NO SOBRESCRITURA: VISTA PREVIA COMPARATIVA */}
              {aiProposal != null && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <span>📋</span> Propuesta de la IA
                    </h4>
                    {detectedIntentLabel && (
                      <span className="text-[11px] font-medium text-violet-700 bg-violet-50 px-2 py-0.5 rounded-md border border-violet-200">
                        {detectedIntentLabel}
                      </span>
                    )}
                  </div>

                  {/* Comparativa si ya existía contenido */}
                  {(selectedText || currentText.trim().length > 0) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {/* Texto Original */}
                      <div className="border border-slate-200 bg-slate-50/80 rounded-xl p-3">
                        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                          {selectedText ? "Texto seleccionado original" : "Texto actual"}
                        </span>
                        <div className="text-xs text-slate-700 whitespace-pre-wrap max-h-48 overflow-y-auto font-sans leading-relaxed">
                          {selectedText || currentText}
                        </div>
                      </div>

                      {/* Propuesta de la IA (editable) */}
                      <div className="border border-violet-300 bg-violet-50/20 rounded-xl p-3 relative ring-2 ring-violet-500/10">
                        <span className="text-[11px] font-semibold text-violet-700 uppercase tracking-wider block mb-1">
                          Propuesta mejorada (editable)
                        </span>
                        <textarea
                          rows={6}
                          value={aiProposal}
                          onChange={(e) => setAiProposal(e.target.value)}
                          className="w-full text-xs p-2 rounded-lg border border-violet-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/30 leading-relaxed font-sans"
                        />
                      </div>
                    </div>
                  )}

                  {/* Si el campo estaba vacío, solo mostrar la propuesta generada */}
                  {!selectedText && currentText.trim().length === 0 && (
                    <div className="border border-violet-300 bg-violet-50/10 rounded-xl p-3">
                      <span className="text-[11px] font-semibold text-violet-700 uppercase tracking-wider block mb-1">
                        Borrador técnico generado (puedes ajustarlo antes de aplicar):
                      </span>
                      <textarea
                        rows={8}
                        value={aiProposal}
                        onChange={(e) => setAiProposal(e.target.value)}
                        className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/30 leading-relaxed font-sans"
                      />
                    </div>
                  )}

                  {/* Restricciones cumplidas */}
                  {appliedConstraints.length > 0 && (
                    <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-1.5">
                      <span className="font-semibold">Restricciones aplicadas:</span>
                      {appliedConstraints.map((c, i) => (
                        <span key={i} className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700">
                          ✓ {c}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Pie de modal con botones decisorios (Regla de No Sobrescritura) */}
            <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-200/70 rounded-lg transition-colors"
              >
                {aiProposal ? "Descartar cambios" : "Cancelar"}
              </button>

              <div className="flex items-center gap-2">
                {aiProposal != null && (
                  <>
                    {!selectedText && currentText.trim().length > 0 && (
                      <button
                        type="button"
                        onClick={() => handleApplyChanges("append")}
                        className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Agrega la propuesta al final sin borrar el texto existente"
                      >
                        ➕ Insertar al final
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleApplyChanges("replace")}
                      className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-xs flex items-center gap-1.5"
                    >
                      <span>✅</span>
                      <span>
                        {selectedText ? "Reemplazar selección" : "Aplicar cambios"}
                      </span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
