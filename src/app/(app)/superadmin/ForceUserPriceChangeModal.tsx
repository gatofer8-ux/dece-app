"use client";

import { useState, useTransition } from "react";
import { forceUpdateUserSubscriptionAction } from "./subscription-actions";

interface PackageData {
  id: string;
  name: string;
  price: number;
  duration_months: number;
}

export default function ForceUserPriceChangeModal({
  user,
  subscription,
  packages,
}: {
  user: { id: string; name: string; email: string };
  subscription: {
    frozen_price: number;
    frozen_duration_months?: number;
    end_date: string | null;
    package_name: string;
  };
  packages: PackageData[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPkgId, setSelectedPkgId] = useState<string>("");
  const [customPrice, setCustomPrice] = useState<number>(subscription.frozen_price);
  const [durationType, setDurationType] = useState<"meses" | "dias" | "fecha">("meses");
  const [customMonths, setCustomMonths] = useState<number>(subscription.frozen_duration_months || 12);
  const [customDays, setCustomDays] = useState<number>(30);
  const [customEndDate, setCustomEndDate] = useState<string>(subscription.end_date || "");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleForce = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (reason.trim().length < 5) {
      setError("Debes ingresar una justificación explícita de al menos 5 caracteres.");
      return;
    }

    startTransition(async () => {
      const res = await forceUpdateUserSubscriptionAction({
        userId: user.id,
        packageId: selectedPkgId || undefined,
        customPrice,
        customDurationMonths: durationType === "meses" ? customMonths : undefined,
        customDurationDays: durationType === "dias" ? customDays : undefined,
        customEndDate: durationType === "fecha" ? customEndDate : undefined,
        reason: reason.trim(),
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
        className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded text-xs font-semibold transition"
        title="Modificar manualmente el precio o tiempo (días/meses) de este usuario"
      >
        ✏️ Editar Precio / Tiempo
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 border border-amber-300 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <span className="text-amber-600">✏️</span> Modificar Tiempo y Precio Manualmente
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

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 leading-relaxed">
              <strong>Modificación Manual Directa:</strong> Puedes alterar inmediatamente el precio congelado y el tiempo de vigencia (en días para demos o en meses para planes) de este usuario.
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleForce} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Opcional: precargar desde catálogo
                </label>
                <select
                  value={selectedPkgId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setSelectedPkgId(id);
                    const p = packages.find((pkg) => pkg.id === id);
                    if (p) {
                      setCustomPrice(p.price);
                      setCustomMonths(p.duration_months);
                      setDurationType("meses");
                    }
                  }}
                  className="input text-xs w-full py-1.5"
                >
                  <option value="">-- Valores personalizados manuales --</option>
                  {packages.map((pkg) => (
                    <option key={pkg.id} value={pkg.id}>
                      {pkg.name} (${pkg.price.toFixed(2)} USD · {pkg.duration_months}m)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Precio Fijo / Cuota Manual ($ USD) *
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    value={customPrice}
                    onChange={(e) => setCustomPrice(Math.max(0, Number(e.target.value) || 0))}
                    required
                    className="input text-xs w-full font-mono font-bold"
                  />
                  <button
                    type="button"
                    onClick={() => setCustomPrice(0)}
                    className="px-2 py-1.5 bg-slate-100 hover:bg-slate-200 rounded text-xs font-semibold shrink-0"
                  >
                    $0 (Demo/Gratis)
                  </button>
                </div>
              </div>

              {/* SELECCIÓN DE UNIDAD DE TIEMPO: DÍAS (DEMO) O MESES (PLAN) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Unidad de Tiempo a Modificar:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setDurationType("dias")}
                    className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition ${
                      durationType === "dias"
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    Días (Demo/Prueba)
                  </button>
                  <button
                    type="button"
                    onClick={() => setDurationType("meses")}
                    className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition ${
                      durationType === "meses"
                        ? "bg-indigo-600 text-white border-indigo-600"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    Meses (Plan)
                  </button>
                  <button
                    type="button"
                    onClick={() => setDurationType("fecha")}
                    className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition ${
                      durationType === "fecha"
                        ? "bg-purple-600 text-white border-purple-600"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    Fecha Exacta
                  </button>
                </div>
              </div>

              {durationType === "dias" && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Duración en Días *
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={customDays}
                    onChange={(e) => setCustomDays(Math.max(1, Number(e.target.value) || 1))}
                    className="input text-xs w-full font-mono font-bold"
                    required
                  />
                  <div className="flex items-center gap-1 pt-1">
                    {[7, 15, 30, 45, 60, 90].map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setCustomDays(d)}
                        className={`px-1.5 py-0.5 rounded text-[10px] border ${
                          customDays === d
                            ? "bg-blue-600 text-white border-blue-600 font-bold"
                            : "bg-slate-50 text-slate-600 border-slate-200"
                        }`}
                      >
                        {d}d
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {durationType === "meses" && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Duración en Meses *
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={customMonths}
                    onChange={(e) => setCustomMonths(Math.max(1, Number(e.target.value) || 1))}
                    className="input text-xs w-full font-mono font-bold"
                    required
                  />
                </div>
              )}

              {durationType === "fecha" && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Fecha de Vencimiento Manual (YYYY-MM-DD) *
                  </label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="input text-xs w-full font-mono font-bold"
                    required
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Justificación obligatoria del ajuste *
                </label>
                <textarea
                  rows={2}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Explica el motivo del ajuste manual de tiempo y/o precio..."
                  required
                  minLength={5}
                  className="input text-xs w-full resize-none"
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
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition"
                >
                  {isPending ? "Guardando cambios..." : "Aplicar Ajuste Manual"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
