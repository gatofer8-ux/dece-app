"use client";

import { useState, useTransition } from "react";
import { assignUserSubscriptionAction } from "./subscription-actions";

interface PackageData {
  id: string;
  name: string;
  price: number;
  duration_months: number;
}

export default function AssignUserSubscriptionModal({
  user,
  packages,
}: {
  user: { id: string; name: string; email: string; institution_name?: string | null };
  packages: PackageData[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<"prueba" | "paquete" | "personalizado">("prueba");
  
  // Parámetros manuales de tiempo y precio para demo/prueba
  const [trialDays, setTrialDays] = useState<number>(30);
  const [trialPrice, setTrialPrice] = useState<number>(0);

  // Parámetros para paquete
  const [packageId, setPackageId] = useState<string>(packages[0]?.id || "pkg-anual");
  const [customPrice, setCustomPrice] = useState<number>(packages[0]?.price || 25);
  const [customMonths, setCustomMonths] = useState<number>(packages[0]?.duration_months || 1);

  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handlePackageChange = (id: string) => {
    setPackageId(id);
    const p = packages.find((pkg) => pkg.id === id);
    if (p) {
      setCustomPrice(p.price);
      setCustomMonths(p.duration_months);
    }
  };

  const handleAssign = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const res = await assignUserSubscriptionAction({
        userId: user.id,
        mode,
        packageId: mode === "paquete" ? packageId : undefined,
        trialDays: mode === "prueba" ? trialDays : undefined,
        trialPrice: mode === "prueba" ? trialPrice : undefined,
        customPrice: mode !== "prueba" ? customPrice : trialPrice,
        customMonths: mode !== "prueba" ? customMonths : undefined,
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
        className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded text-xs font-semibold transition flex items-center gap-1"
      >
        <span>🎁</span> Asignar Plan
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <span>🎁</span> Asignar / Cambiar Suscripción
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

            <form onSubmit={handleAssign} className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                <label
                  className={`flex flex-col p-2.5 rounded-lg border text-center cursor-pointer transition text-xs ${
                    mode === "prueba"
                      ? "bg-blue-50 border-blue-400 text-blue-900 font-bold shadow-xs"
                      : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <input
                    type="radio"
                    name="mode_opt"
                    checked={mode === "prueba"}
                    onChange={() => setMode("prueba")}
                    className="sr-only"
                  />
                  <span>🎁 Demo / Prueba</span>
                  <span className="text-[10px] font-normal text-slate-500 mt-0.5">Tiempo & precio</span>
                </label>

                <label
                  className={`flex flex-col p-2.5 rounded-lg border text-center cursor-pointer transition text-xs ${
                    mode === "paquete"
                      ? "bg-indigo-50 border-indigo-400 text-indigo-900 font-bold shadow-xs"
                      : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <input
                    type="radio"
                    name="mode_opt"
                    checked={mode === "paquete"}
                    onChange={() => setMode("paquete")}
                    className="sr-only"
                  />
                  <span>📦 Paquete</span>
                  <span className="text-[10px] font-normal text-slate-500 mt-0.5">Catálogo</span>
                </label>

                <label
                  className={`flex flex-col p-2.5 rounded-lg border text-center cursor-pointer transition text-xs ${
                    mode === "personalizado"
                      ? "bg-purple-50 border-purple-400 text-purple-900 font-bold shadow-xs"
                      : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <input
                    type="radio"
                    name="mode_opt"
                    checked={mode === "personalizado"}
                    onChange={() => setMode("personalizado")}
                    className="sr-only"
                  />
                  <span>⚙️ A Medida</span>
                  <span className="text-[10px] font-normal text-slate-500 mt-0.5">Personalizado</span>
                </label>
              </div>

              {/* MODIFICACIÓN MANUAL DEL TIEMPO Y PRECIO DE LA DEMO */}
              {mode === "prueba" && (
                <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-950">Ajuste Manual de Tiempo y Precio:</span>
                    <span className="text-[10px] text-blue-700 font-semibold bg-blue-100 px-2 py-0.5 rounded">
                      Demo / Prueba
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Tiempo de Demo (Días) *
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={trialDays}
                        onChange={(e) => setTrialDays(Math.max(1, Number(e.target.value) || 1))}
                        className="input text-xs w-full font-mono font-bold"
                        required
                      />
                      <div className="flex items-center gap-1 flex-wrap pt-1">
                        {[7, 15, 30, 45, 60, 90].map((d) => (
                          <button
                            key={d}
                            type="button"
                            onClick={() => setTrialDays(d)}
                            className={`px-1.5 py-0.5 rounded text-[10px] border transition ${
                              trialDays === d
                                ? "bg-blue-600 text-white border-blue-600 font-bold"
                                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                            }`}
                          >
                            {d}d
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Precio de Demo ($ USD) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min={0}
                        value={trialPrice}
                        onChange={(e) => setTrialPrice(Math.max(0, Number(e.target.value) || 0))}
                        className="input text-xs w-full font-mono font-bold"
                        required
                      />
                      <div className="flex items-center gap-1 flex-wrap pt-1">
                        <button
                          type="button"
                          onClick={() => setTrialPrice(0)}
                          className={`px-1.5 py-0.5 rounded text-[10px] border transition ${
                            trialPrice === 0
                              ? "bg-emerald-600 text-white border-emerald-600 font-bold"
                              : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          Gratis
                        </button>
                        {[5, 10, 20].map((p) => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setTrialPrice(p)}
                            className={`px-1.5 py-0.5 rounded text-[10px] border transition ${
                              trialPrice === p
                                ? "bg-indigo-600 text-white border-indigo-600 font-bold"
                                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                            }`}
                          >
                            ${p}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="p-2 bg-white rounded border border-blue-100 text-[11px] text-blue-900 flex items-center justify-between">
                    <span>Vencimiento programado:</span>
                    <span className="font-semibold">
                      {(() => {
                        const d = new Date();
                        d.setDate(d.getDate() + trialDays);
                        return d.toISOString().split("T")[0];
                      })()} ({trialDays} días · ${trialPrice.toFixed(2)} USD)
                    </span>
                  </div>
                </div>
              )}

              {/* PAQUETE COMERCIAL CON PRECIO Y DURACIÓN EDITABLES */}
              {mode === "paquete" && (
                <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-200 space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Seleccionar paquete base:</label>
                    <select
                      value={packageId}
                      onChange={(e) => handlePackageChange(e.target.value)}
                      className="input text-xs w-full py-2"
                    >
                      {packages.map((pkg) => (
                        <option key={pkg.id} value={pkg.id}>
                          {pkg.name} — ${pkg.price.toFixed(2)} USD ({pkg.duration_months}m)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1 border-t border-indigo-100">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Precio Fijo ($ USD):</label>
                      <input
                        type="number"
                        step="0.01"
                        min={0}
                        value={customPrice}
                        onChange={(e) => setCustomPrice(Math.max(0, Number(e.target.value) || 0))}
                        className="input text-xs w-full font-mono font-bold"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Duración (Meses):</label>
                      <input
                        type="number"
                        min={1}
                        value={customMonths}
                        onChange={(e) => setCustomMonths(Math.max(1, Number(e.target.value) || 1))}
                        className="input text-xs w-full font-mono font-bold"
                        required
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* MODO PERSONALIZADO */}
              {mode === "personalizado" && (
                <div className="grid grid-cols-2 gap-3 p-3 bg-purple-50/50 rounded-xl border border-purple-200">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Precio ($ USD):</label>
                    <input
                      type="number"
                      step="0.01"
                      value={customPrice}
                      onChange={(e) => setCustomPrice(Number(e.target.value))}
                      className="input text-xs w-full font-mono font-bold"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Duración (meses):</label>
                    <input
                      type="number"
                      min={1}
                      value={customMonths}
                      onChange={(e) => setCustomMonths(Number(e.target.value))}
                      className="input text-xs w-full font-mono font-bold"
                      required
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Notas o justificación:</label>
                <input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ej. Periodo de prueba extendido de mutuo acuerdo"
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
                  {isPending ? "Asignando..." : "Guardar Suscripción"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
