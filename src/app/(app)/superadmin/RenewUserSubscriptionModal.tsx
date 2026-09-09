"use client";

import { useState, useTransition } from "react";
import { renewUserSubscriptionAction } from "./subscription-actions";

interface PackageData {
  id: string;
  name: string;
  price: number;
  duration_months: number;
}

export default function RenewUserSubscriptionModal({
  user,
  subscription,
  packages,
}: {
  user: { id: string; name: string; email: string; institution_name?: string | null };
  subscription: {
    package_id?: string | null;
    package_name: string;
    frozen_price: number;
    frozen_duration_months?: number;
    end_date: string | null;
    status: string;
  };
  packages: PackageData[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPkgId, setSelectedPkgId] = useState<string>(
    subscription?.package_id || packages[0]?.id || "pkg-anual"
  );
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedPkg = packages.find((p) => p.id === selectedPkgId) || packages[0];

  const handleRenew = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const res = await renewUserSubscriptionAction({
        userId: user.id,
        packageId: selectedPkgId,
        notes: notes.trim() || undefined,
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
        type="button"
        onClick={() => {
          setIsOpen(true);
          setError(null);
        }}
        className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded text-xs font-semibold transition flex items-center gap-1"
        title="Renovar suscripción individual de este usuario"
      >
        <span>🔄</span> Renovar
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <span>🔄</span> Renovar Suscripción Individual
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {user.name} ({user.email})
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
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleRenew} className="space-y-4">
              {/* Información de estado previo */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 text-xs">
                <div className="text-slate-500 flex justify-between">
                  <span>Institución:</span>
                  <span className="font-medium text-slate-800">{user.institution_name || "Nivel Central / Distrito"}</span>
                </div>
                <div className="text-slate-500 flex justify-between">
                  <span>Plan actual:</span>
                  <span className="font-medium text-slate-800">{subscription.package_name}</span>
                </div>
                <div className="text-slate-500 flex justify-between">
                  <span>Tarifa congelada previa:</span>
                  <span className="font-mono font-bold text-slate-800">${subscription.frozen_price.toFixed(2)} USD</span>
                </div>
                <div className="text-slate-500 flex justify-between">
                  <span>Vencimiento actual:</span>
                  <span className="font-semibold text-slate-700">{subscription.end_date || "Sin fecha / Vencido"}</span>
                </div>
              </div>

              {/* Selección del nuevo paquete a congelar */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Paquete comercial para el nuevo periodo *
                </label>
                <select
                  value={selectedPkgId}
                  onChange={(e) => setSelectedPkgId(e.target.value)}
                  className="input text-xs w-full py-2"
                >
                  {packages.map((pkg) => (
                    <option key={pkg.id} value={pkg.id}>
                      {pkg.name} — ${pkg.price.toFixed(2)} USD ({pkg.duration_months} {pkg.duration_months === 1 ? "mes" : "meses"})
                    </option>
                  ))}
                </select>
              </div>

              {/* Banner de nuevo congelamiento (Regla 13) */}
              {selectedPkg && (
                <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl space-y-1 text-xs text-indigo-950">
                  <div className="font-bold flex items-center gap-1.5">
                    <span>🛡️</span> Monto y Duración que se Congelarán:
                  </div>
                  <div className="text-xs text-indigo-800 flex justify-between pt-1">
                    <span>Tarifa fija asignada:</span>
                    <span className="font-mono font-bold text-indigo-900">${selectedPkg.price.toFixed(2)} USD</span>
                  </div>
                  <div className="text-xs text-indigo-800 flex justify-between">
                    <span>Extensión de vigencia:</span>
                    <span className="font-semibold">{selectedPkg.duration_months} meses a partir de hoy o de su vencimiento</span>
                  </div>
                  <p className="text-[10px] text-indigo-600 mt-1 leading-tight">
                    Esta tarifa queda congelada e inmune para este usuario hasta que termine su nuevo periodo.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Notas de renovación (opcional)
                </label>
                <input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ej. Pago verificado mediante transferencia bancaria"
                  className="input text-xs w-full"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
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
                  {isPending ? "Congelando y renovando..." : "Confirmar Renovación Individual"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
