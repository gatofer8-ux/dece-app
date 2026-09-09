"use client";

import { useState, useTransition } from "react";
import { renewInstitutionSubscriptionAction } from "./subscription-actions";

export default function RenewSubscriptionModal({
  institution,
  subscription,
  packages,
}: {
  institution: { id: string; name: string };
  subscription?: {
    id: string;
    package_id: string | null;
    package_name: string;
    billing_mode: "paquete" | "por_usuario";
    total_amount: number;
    frozen_duration_months: number;
    end_date: string;
    status: string;
  } | null;
  packages: { id: string; name: string; price: number; duration_months: number }[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [billingMode, setBillingMode] = useState<"paquete" | "por_usuario">(
    subscription?.billing_mode || "paquete"
  );
  const [selectedPkgId, setSelectedPkgId] = useState(
    subscription?.package_id || (packages[0] ? packages[0].id : "")
  );
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleRenew = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const res = await renewInstitutionSubscriptionAction({
        institutionId: institution.id,
        billingMode,
        packageId: billingMode === "paquete" ? selectedPkgId : undefined,
        notes,
      });

      if (res?.error) {
        setError(res.error);
      } else {
        setIsOpen(false);
      }
    });
  };

  const selectedPkg = packages.find((p) => p.id === selectedPkgId);

  return (
    <>
      <button
        onClick={() => {
          setIsOpen(true);
          setError(null);
        }}
        className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded text-xs font-semibold transition flex items-center gap-1"
      >
        <span>🔄</span> Renovar
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-4 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <span>🔄</span> Renovar Suscripción Institucional
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">{institution.name}</p>
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

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-xs text-slate-700">
              <div className="font-semibold text-slate-900">Estado actual de la institución:</div>
              <div>Plan actual: <strong>{subscription?.package_name || "Sin suscripción previa"}</strong></div>
              <div>Vencimiento actual: <strong>{subscription?.end_date || "—"}</strong></div>
              <div>Monto congelado previo: <strong>${subscription?.total_amount ?? "0.00"}</strong></div>
            </div>

            <form onSubmit={handleRenew} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Modalidad para la Renovación *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label className={`p-2.5 rounded-lg border text-xs cursor-pointer flex items-center gap-2 ${
                    billingMode === "paquete" ? "border-brand-600 bg-brand-50/50 font-bold" : "border-slate-200"
                  }`}>
                    <input
                      type="radio"
                      name="renewBillingMode"
                      value="paquete"
                      checked={billingMode === "paquete"}
                      onChange={() => setBillingMode("paquete")}
                    />
                    Por Paquete Fijo
                  </label>

                  <label className={`p-2.5 rounded-lg border text-xs cursor-pointer flex items-center gap-2 ${
                    billingMode === "por_usuario" ? "border-brand-600 bg-brand-50/50 font-bold" : "border-slate-200"
                  }`}>
                    <input
                      type="radio"
                      name="renewBillingMode"
                      value="por_usuario"
                      checked={billingMode === "por_usuario"}
                      onChange={() => setBillingMode("por_usuario")}
                    />
                    Por Usuario Activo
                  </label>
                </div>
              </div>

              {billingMode === "paquete" ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Selecciona el paquete a renovar *
                  </label>
                  <select
                    value={selectedPkgId}
                    onChange={(e) => setSelectedPkgId(e.target.value)}
                    className="input text-xs w-full font-medium"
                  >
                    {packages.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} — ${p.price.toFixed(2)} ({p.duration_months} meses)
                      </option>
                    ))}
                  </select>
                  {selectedPkg && (
                    <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900 mt-2 space-y-0.5">
                      <div className="font-bold">Monto que se congelará para este nuevo periodo:</div>
                      <div className="text-sm font-mono font-bold text-emerald-800">${selectedPkg.price.toFixed(2)} USD</div>
                      <div className="text-[11px] text-emerald-700">
                        Duración: {selectedPkg.duration_months} meses a partir del término de la vigencia actual.
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-2.5 bg-brand-50 border border-brand-200 rounded-lg text-xs text-brand-900 space-y-1">
                  <div className="font-bold">Tarifa por usuario activo:</div>
                  <div>Se tomará la tarifa global vigente multiplicada por los usuarios activos de la institución.</div>
                  <div className="text-[11px] text-brand-700">El valor calculado quedará congelado hasta su próximo vencimiento.</div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Observaciones o número de comprobante (opcional)
                </label>
                <input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ej. Transferencia bancaria #9842 / Factura #120"
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
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg transition disabled:opacity-50 flex items-center gap-1 shadow-xs"
                >
                  {isPending ? "Procesando..." : "Ejecutar Renovación"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
