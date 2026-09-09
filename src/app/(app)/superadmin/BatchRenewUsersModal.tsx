"use client";

import { useState, useTransition } from "react";
import { batchRenewUserSubscriptionsAction } from "./subscription-actions";

interface PackageData {
  id: string;
  name: string;
  price: number;
  duration_months: number;
}

export default function BatchRenewUsersModal({
  selectedUsers,
  packages,
  onClearSelection,
}: {
  selectedUsers: {
    id: string;
    name: string;
    email: string;
    institution_name?: string | null;
    package_name?: string;
    frozen_price?: number;
  }[];
  packages: PackageData[];
  onClearSelection: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPkgId, setSelectedPkgId] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const count = selectedUsers.length;
  if (count === 0) return null;

  const targetPkg = packages.find((p) => p.id === selectedPkgId);
  const totalAmount = targetPkg
    ? targetPkg.price * count
    : selectedUsers.reduce((sum, u) => sum + (u.frozen_price || 0), 0);

  const handleBatchRenew = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const res = await batchRenewUserSubscriptionsAction({
        userIds: selectedUsers.map((u) => u.id),
        packageId: selectedPkgId || undefined,
        notes: notes.trim() || "Renovación en lote por superadmin",
      });

      if (res?.error) {
        setError(res.error);
      } else {
        setIsOpen(false);
        onClearSelection();
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
        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5"
      >
        <span>⚡</span> Renovar Selección ({count})
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-4 border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <span>⚡</span> Renovación en Lote ({count} Usuarios)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Ejecuta renovaciones individuales para todos los usuarios seleccionados en una sola operación.
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

            <form onSubmit={handleBatchRenew} className="space-y-4">
              {/* Lista compacta de usuarios a renovar */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Usuarios incluidos en la renovación:
                </label>
                <div className="max-h-36 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-slate-50/50 p-1">
                  {selectedUsers.map((u) => (
                    <div key={u.id} className="p-2 text-xs flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-slate-900">{u.name}</div>
                        <div className="text-[11px] text-slate-400">{u.email} · {u.institution_name || "Sin inst."}</div>
                      </div>
                      <div className="text-right font-mono text-[11px] text-slate-600">
                        {u.package_name || "Plan actual"}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Selección del paquete */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Asignación de paquete para el lote:
                </label>
                <select
                  value={selectedPkgId}
                  onChange={(e) => setSelectedPkgId(e.target.value)}
                  className="input text-xs w-full py-2"
                >
                  <option value="">-- Renovar el paquete actual de cada uno individualmente --</option>
                  {packages.map((pkg) => (
                    <option key={pkg.id} value={pkg.id}>
                      Asignar a todos: {pkg.name} (${pkg.price.toFixed(2)} USD · {pkg.duration_months}m)
                    </option>
                  ))}
                </select>
              </div>

              {/* Total consolidado */}
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-emerald-950 block">Monto Consolidado a Liquidar</span>
                  <span className="text-[11px] text-emerald-700">{count} cuentas renovadas simultáneamente</span>
                </div>
                <div className="text-right">
                  <span className="font-mono text-xl font-extrabold text-emerald-900">${totalAmount.toFixed(2)}</span>
                  <span className="text-[10px] text-emerald-600 block">USD</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Motivo o referencia del pago
                </label>
                <input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ej. Pago consolidado institucional periodo 2026"
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
                  {isPending ? "Renovando lote..." : `Confirmar Renovación (${count} Usuarios)`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
