"use client";

import { useState, useTransition } from "react";
import { createInstitutionAction } from "./actions";

export default function CreateInstitutionModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setError(null);

    startTransition(async () => {
      const res = await createInstitutionAction(formData);
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
        className="btn-primary text-xs flex items-center gap-1.5"
      >
        <span>🏫</span> + Nueva Institución
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-4 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <span>🏫</span> Registrar Nueva Institución
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Crea una nueva institución educativa con su código AMIE y localización.
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

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nombre de la Institución *
                </label>
                <input
                  name="name"
                  required
                  placeholder="Ej. U.E. Juan Montalvo"
                  className="input text-xs w-full bg-white text-slate-900 placeholder:text-slate-400 border border-slate-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Código AMIE
                  </label>
                  <input
                    name="amie_code"
                    placeholder="Ej. 17H00123"
                    className="input text-xs w-full bg-white text-slate-900 placeholder:text-slate-400 border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Distrito Educativo
                  </label>
                  <input
                    name="district"
                    placeholder="Ej. 17D06"
                    className="input text-xs w-full bg-white text-slate-900 placeholder:text-slate-400 border border-slate-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Circuito
                  </label>
                  <input
                    name="circuit"
                    placeholder="Ej. 17D06C01"
                    className="input text-xs w-full bg-white text-slate-900 placeholder:text-slate-400 border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Zona
                  </label>
                  <input
                    name="zona"
                    placeholder="Ej. ZONA 9"
                    className="input text-xs w-full bg-white text-slate-900 placeholder:text-slate-400 border border-slate-300"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Dirección
                </label>
                <input
                  name="address"
                  placeholder="Av. Amazonas y Colón"
                  className="input text-xs w-full bg-white text-slate-900 placeholder:text-slate-400 border border-slate-300"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Estado Inicial *
                </label>
                <select
                  name="active"
                  defaultValue="1"
                  className="input text-xs w-full bg-white text-slate-900 border border-slate-300"
                >
                  <option value="1">🟢 Activa (Operativa y disponible)</option>
                  <option value="0">⏸️ Suspendida / Inactiva</option>
                </select>
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
                  {isPending ? "Guardando..." : "Crear Institución"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
