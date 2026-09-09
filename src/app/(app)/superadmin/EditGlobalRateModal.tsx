"use client";

import { useState, useTransition } from "react";
import { updateGlobalUserRateAction } from "./subscription-actions";

export default function EditGlobalRateModal({ currentRate }: { currentRate: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [rate, setRate] = useState(currentRate);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const res = await updateGlobalUserRateAction(formData);
      if (res?.error) {
        setError(res.error);
      } else {
        setIsOpen(false);
      }
    });
  };

  return (
    <>
      <button
        onClick={() => {
          setIsOpen(true);
          setRate(currentRate);
          setError(null);
        }}
        className="px-2.5 py-1 bg-brand-50 hover:bg-brand-100 text-brand-700 border border-brand-200 rounded-lg text-xs font-semibold transition"
      >
        Modificar Tarifa Global
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <span>💲</span> Tarifa Global por Usuario
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Define el costo base por usuario mensual para instituciones en modalidad por usuario.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                ✕
              </button>
            </div>

            {error && (
              <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-medium">
                {error}
              </div>
            )}

            {/* AVISO OBLIGATORIO DE PROTECCIÓN DE SUSCRIPCIONES ACTIVAS (REGLA 13) */}
            <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl space-y-1.5 text-xs text-blue-900">
              <div className="font-bold flex items-center gap-1.5 text-blue-800">
                <span>🛡️</span> Regla de Protección de Suscripciones Activas:
              </div>
              <p className="font-semibold text-blue-950 leading-relaxed">
                "Este cambio NO afectará a las instituciones con suscripción activa actualmente; se aplicará solo a partir de su próxima renovación."
              </p>
              <p className="text-[11px] text-blue-700">
                El monto congelado de cada institución se mantiene intacto hasta su fecha de vencimiento.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nueva tarifa global por usuario ($ USD / mes) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    name="global_user_rate"
                    value={rate}
                    onChange={(e) => setRate(e.target.value)}
                    required
                    autoFocus
                    className="input text-xs w-full pl-7 font-mono font-semibold text-slate-800"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  disabled={isPending}
                  className="btn-secondary text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="btn-primary text-xs"
                >
                  {isPending ? "Guardando..." : "Confirmar y Guardar Tarifa"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
