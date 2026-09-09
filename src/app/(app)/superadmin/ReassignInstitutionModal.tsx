"use client";

import { useState, useTransition } from "react";
import { reassignUserInstitutionAction } from "./subscription-actions";

export default function ReassignInstitutionModal({
  user,
  institutions,
}: {
  user: { id: string; name: string; email: string; institution_id: string | null };
  institutions: { id: string; name: string; active?: number }[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedInstId, setSelectedInstId] = useState<string>(user.institution_id || "");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const activeInstitutions = institutions.filter((i) => i.active !== 0);
  const inactiveInstitutions = institutions.filter((i) => i.active === 0);

  const handleReassign = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const res = await reassignUserInstitutionAction({
        userId: user.id,
        newInstitutionId: selectedInstId || null,
        reason: reason.trim() || undefined,
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
        className="px-2 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded text-xs font-semibold transition"
        title="Reubicar profesional a otra institución manteniendo su suscripción intacta"
      >
        🏛️ Reubicar
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <span>🏛️</span> Reubicación de Profesional DECE
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

            {/* AVISO CRÍTICO DE PROTECCIÓN DE SUSCRIPCIÓN */}
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-950 flex items-start gap-2">
              <span className="text-base">🛡️</span>
              <p className="leading-relaxed">
                <strong>Protección de Suscripción:</strong> Al reubicar este profesional, su estado de pago individual, paquete asignado y fecha de vencimiento se mantendrán <strong>100% intactos</strong>. No depende del estado de la institución de destino.
              </p>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleReassign} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nueva Institución de Destino:
                </label>
                <select
                  value={selectedInstId}
                  onChange={(e) => setSelectedInstId(e.target.value)}
                  className="input text-xs w-full py-2 bg-white text-slate-900 border border-slate-300"
                >
                  <option value="">(Ninguna - Nivel Central / Distrito)</option>
                  {activeInstitutions.length > 0 && (
                    <optgroup label="🟢 Instituciones Activas / Operativas">
                      {activeInstitutions.map((i) => (
                        <option key={i.id} value={i.id}>
                          🟢 {i.name}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {inactiveInstitutions.length > 0 && (
                    <optgroup label="⏸️ Instituciones Suspendidas / Inactivas">
                      {inactiveInstitutions.map((i) => (
                        <option key={i.id} value={i.id}>
                          ⏸️ {i.name} (Suspendida)
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Motivo del traslado (opcional)
                </label>
                <input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Ej. Disposición distrital por optimización de talento humano"
                  className="input text-xs w-full bg-white text-slate-900 placeholder:text-slate-400 border border-slate-300"
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
                  {isPending ? "Reubicando..." : "Confirmar Traslado"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
