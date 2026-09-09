"use client";

import { useState, useTransition } from "react";
import { updateSubscriptionPackageAction } from "./subscription-actions";

export default function EditPackageModal({
  pkg,
}: {
  pkg: {
    id: string;
    name: string;
    description: string | null;
    price: number;
    duration_months: number;
    billing_period: string;
    max_users: number | null;
  };
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const res = await updateSubscriptionPackageAction(formData);
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
        }}
        className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs transition"
      >
        Editar Tarifa / Duración
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-4 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <span>📦</span> Configurar Paquete: {pkg.name}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Actualiza la tarifa comercial o duración establecida para este paquete.
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
            <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl space-y-1 text-xs text-blue-900">
              <div className="font-bold flex items-center gap-1.5 text-blue-800">
                <span>🛡️</span> Regla Crítica de Protección de Tarifas:
              </div>
              <p className="font-semibold text-blue-950 leading-relaxed">
                "Este cambio NO afectará a las instituciones con suscripción activa actualmente; se aplicará solo a partir de su próxima renovación."
              </p>
              <p className="text-[11px] text-blue-700">
                Cualquier institución ya suscrita a este paquete continuará con su precio y duración congelados.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <input type="hidden" name="id" value={pkg.id} />

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nombre del Paquete *
                </label>
                <input
                  name="name"
                  defaultValue={pkg.name}
                  required
                  className="input text-xs w-full font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tarifa del Paquete ($ USD) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    name="price"
                    defaultValue={pkg.price}
                    required
                    className="input text-xs w-full font-mono font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Duración (Meses) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    name="duration_months"
                    defaultValue={pkg.duration_months}
                    required
                    className="input text-xs w-full font-mono font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Modalidad / Periodo
                  </label>
                  <select
                    name="billing_period"
                    defaultValue={pkg.billing_period}
                    className="input text-xs w-full"
                  >
                    <option value="MENSUAL">Mensual</option>
                    <option value="TRIMESTRAL">Trimestral</option>
                    <option value="SEMESTRAL">Semestral</option>
                    <option value="ANUAL">Anual</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Límite de Usuarios (Vacío = Ilimitado)
                  </label>
                  <input
                    type="number"
                    min="1"
                    name="max_users"
                    defaultValue={pkg.max_users ?? ""}
                    placeholder="Ilimitado"
                    className="input text-xs w-full"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Descripción
                </label>
                <input
                  name="description"
                  defaultValue={pkg.description || ""}
                  placeholder="Ej. Cobertura completa anual"
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
                  className="btn-primary text-xs"
                >
                  {isPending ? "Guardando..." : "Guardar Cambios del Paquete"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
