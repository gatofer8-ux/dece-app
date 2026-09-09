"use client";

import { useState, useTransition } from "react";
import { createCoordinatorDelegation } from "./delegation-actions";
import type { UserRow } from "@/lib/types";

export default function CoordinatorDelegationModal({
  users,
  currentUserId,
}: {
  users: UserRow[];
  currentUserId: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [delegatedUserId, setDelegatedUserId] = useState("");
  const [delegationType, setDelegationType] = useState<"TEMPORAL" | "PERMANENTE">("TEMPORAL");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Filtrar usuarios elegibles (activos, distintos al actual, rol DECE o afín)
  const eligibleUsers = users.filter(
    (u) => u.id !== currentUserId && u.active && u.role !== "SUPERADMIN" && u.role !== "DISTRITO"
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!delegatedUserId) {
      setError("Selecciona al usuario que recibirá la coordinación.");
      return;
    }
    if (!reason.trim()) {
      setError("Ingresa el motivo o justificación de la delegación.");
      return;
    }

    startTransition(async () => {
      const res = await createCoordinatorDelegation({
        delegatedUserId,
        delegationType,
        reason,
        startDate,
        endDate: delegationType === "TEMPORAL" && endDate ? endDate : undefined,
      });

      if (res.error) {
        setError(res.error);
      } else {
        setIsOpen(false);
        setReason("");
        setEndDate("");
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
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-semibold transition border border-indigo-200"
      >
        <span>🔄</span> Delegar Coordinación DECE
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4 border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span>🏛️</span> Delegación de Coordinación DECE
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Asigna las facultades de Coordinador/a institucional a otro profesional de tu equipo.
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

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Profesional destinatario *
                </label>
                <select
                  value={delegatedUserId}
                  onChange={(e) => setDelegatedUserId(e.target.value)}
                  required
                  className="input text-sm w-full"
                >
                  <option value="">-- Selecciona un profesional del equipo --</option>
                  {eligibleUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.email}) — Rol actual: {u.role}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Modalidad de delegación *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label
                    className={`flex items-start gap-2.5 p-3 rounded-lg border cursor-pointer transition ${
                      delegationType === "TEMPORAL"
                        ? "border-brand-600 bg-brand-50/50 text-brand-900"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="delegationType"
                      value="TEMPORAL"
                      checked={delegationType === "TEMPORAL"}
                      onChange={() => setDelegationType("TEMPORAL")}
                      className="mt-0.5"
                    />
                    <div>
                      <div className="text-xs font-bold">Temporal</div>
                      <div className="text-[11px] text-slate-500">
                        Por un período delimitado o hasta revertir.
                      </div>
                    </div>
                  </label>

                  <label
                    className={`flex items-start gap-2.5 p-3 rounded-lg border cursor-pointer transition ${
                      delegationType === "PERMANENTE"
                        ? "border-brand-600 bg-brand-50/50 text-brand-900"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="delegationType"
                      value="PERMANENTE"
                      checked={delegationType === "PERMANENTE"}
                      onChange={() => setDelegationType("PERMANENTE")}
                      className="mt-0.5"
                    />
                    <div>
                      <div className="text-xs font-bold">Permanente</div>
                      <div className="text-[11px] text-slate-500">
                        Transfiere la coordinación definitivamente.
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {delegationType === "TEMPORAL" ? (
                <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Fecha inicio *</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      required
                      className="input text-xs w-full bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Fecha fin (opcional)</label>
                    <input
                      type="date"
                      value={endDate}
                      min={startDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      placeholder="Hasta revertir"
                      className="input text-xs w-full bg-white"
                    />
                    <span className="text-[10px] text-slate-400">Si está vacía, durará hasta revertir</span>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-800 space-y-1">
                  <p className="font-bold flex items-center gap-1.5">
                    <span>⚠️</span> Transferencia permanente de coordinación
                  </p>
                  <p>
                    Al confirmar, el profesional seleccionado se convertirá en Administrador/Coordinador DECE
                    titular y tu cuenta pasará automáticamente al rol de profesional DECE.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Motivo / Justificación *
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={2}
                  required
                  placeholder="Ej. Encargo de coordinación por licencia médica / Delegación de funciones..."
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
                  className="btn-primary text-xs flex items-center gap-1"
                >
                  {isPending ? "Procesando..." : "Confirmar Delegación"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
