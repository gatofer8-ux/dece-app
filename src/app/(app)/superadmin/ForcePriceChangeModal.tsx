"use client";

import { useState, useTransition } from "react";
import { forceUpdateInstitutionSubscriptionAction } from "./subscription-actions";

export default function ForcePriceChangeModal({
  institution,
  subscription,
  packages,
}: {
  institution: { id: string; name: string };
  subscription: {
    id: string;
    package_name: string;
    total_amount: number;
    frozen_duration_months: number;
    end_date: string;
  };
  packages: { id: string; name: string; price: number; duration_months: number }[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPkgId, setSelectedPkgId] = useState("");
  const [customPrice, setCustomPrice] = useState<string>(String(subscription.total_amount));
  const [customDuration, setCustomDuration] = useState<string>(String(subscription.frozen_duration_months));
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleForce = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!reason || reason.trim().length < 5) {
      setError("Debes ingresar una justificación obligatoria de al menos 5 caracteres.");
      return;
    }

    startTransition(async () => {
      const res = await forceUpdateInstitutionSubscriptionAction({
        institutionId: institution.id,
        packageId: selectedPkgId || undefined,
        customPrice: customPrice ? Number(customPrice) : undefined,
        customDurationMonths: customDuration ? Number(customDuration) : undefined,
        reason,
      });

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
          setError(null);
          setReason("");
        }}
        className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded text-xs font-semibold transition"
      >
        Forzar Tarifa
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-amber-300">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="h-10 w-10 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center text-xl shrink-0">
                ⚠️
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  Forzar Cambio de Tarifa a Institución
                </h3>
                <p className="text-xs text-slate-500 truncate max-w-xs">{institution.name}</p>
              </div>
            </div>

            {error && (
              <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-medium">
                {error}
              </div>
            )}

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1 text-xs text-amber-900">
              <div className="font-bold flex items-center gap-1.5">
                <span>⚠️</span> Excepción Única Manual:
              </div>
              <p className="leading-tight">
                Esta acción altera los valores congelados de esta institución <strong>antes de su fecha de vencimiento</strong>. Requiere motivo explícito para registro en auditoría.
              </p>
            </div>

            <form onSubmit={handleForce} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nuevo Monto Congelado ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={customPrice}
                    onChange={(e) => setCustomPrice(e.target.value)}
                    required
                    className="input text-xs w-full font-mono font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Duración (Meses)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={customDuration}
                    onChange={(e) => setCustomDuration(e.target.value)}
                    required
                    className="input text-xs w-full font-mono font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Vincular a Paquete Específico (opcional)
                </label>
                <select
                  value={selectedPkgId}
                  onChange={(e) => {
                    setSelectedPkgId(e.target.value);
                    const p = packages.find((pkg) => pkg.id === e.target.value);
                    if (p) {
                      setCustomPrice(String(p.price));
                      setCustomDuration(String(p.duration_months));
                    }
                  }}
                  className="input text-xs w-full"
                >
                  <option value="">-- Personalizado / Mantener paquete actual --</option>
                  {packages.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (${p.price.toFixed(2)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Justificación obligatoria *
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  required
                  rows={2}
                  placeholder="Ej. Descuento especial aprobado por convenio ministerial / Ajuste extraordinario..."
                  className="input text-xs w-full"
                />
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
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs rounded-lg transition disabled:opacity-50 shadow-xs"
                >
                  {isPending ? "Guardando..." : "Confirmar Cambio Forzado"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
