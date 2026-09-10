"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

type ToastKind = "success" | "error" | "info";
interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ToastContextValue {
  toast: (message: string, kind?: ToastKind) => void;
  success: (message: string) => void;
  error: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

/** Hook para mostrar notificaciones flotantes. Requiere <ToastProvider> en el layout. */
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Fallback silencioso: nunca romper una vista por falta de provider.
    return {
      toast: () => {},
      success: () => {},
      error: () => {},
    };
  }
  return ctx;
}

/**
 * Muestra un toast cada vez que `message` cambia a un valor no vacío.
 * Útil para el `state.error` / `state.ok` de un `useFormState`.
 */
export function useToastOnChange(message: string | null | undefined, kind: ToastKind = "error") {
  const toast = useToast();
  const seen = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    if (message && message !== seen.current) {
      seen.current = message;
      toast.toast(message, kind);
    }
  }, [message, kind, toast]);
}

const STYLES: Record<ToastKind, { bar: string; icon: string }> = {
  success: { bar: "border-emerald-500", icon: "✓" },
  error: { bar: "border-red-500", icon: "⚠️" },
  info: { bar: "border-brand-500", icon: "ℹ️" },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const push = useCallback(
    (message: string, kind: ToastKind = "info") => {
      const id = Date.now() + Math.random();
      setToasts((t) => [...t, { id, kind, message }]);
      setTimeout(() => remove(id), kind === "error" ? 6000 : 3500);
    },
    [remove]
  );

  const value: ToastContextValue = {
    toast: push,
    success: (m) => push(m, "success"),
    error: (m) => push(m, "error"),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex w-[min(92vw,22rem)] flex-col gap-2 no-print">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onClose={() => remove(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const s = STYLES[toast.kind];
  useEffect(() => {
    const t = setTimeout(onClose, toast.kind === "error" ? 6000 : 3500);
    return () => clearTimeout(t);
  }, [onClose, toast.kind]);

  return (
    <div
      role="status"
      className={`animate-toast-in flex items-start gap-2.5 rounded-lg border-l-4 ${s.bar} bg-white px-3.5 py-2.5 text-sm text-slate-800 shadow-lg ring-1 ring-slate-200`}
    >
      <span aria-hidden className="mt-0.5">{s.icon}</span>
      <span className="flex-1 leading-snug">{toast.message}</span>
      <button
        type="button"
        onClick={onClose}
        aria-label="Cerrar"
        className="text-slate-400 hover:text-slate-700"
      >
        ×
      </button>
    </div>
  );
}
