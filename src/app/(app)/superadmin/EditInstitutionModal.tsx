"use client";

import { useState, useTransition } from "react";
import { updateInstitutionAction } from "./actions";

export default function EditInstitutionModal({
  institution,
}: {
  institution: {
    id: string;
    name: string;
    amie_code: string | null;
    district: string | null;
    circuit: string | null;
    zona: string | null;
    address?: string | null;
    active: number;
  };
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState<number>(institution.active);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleOpen = () => {
    setStatus(institution.active);
    setError(null);
    setIsOpen(true);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setError(null);

    startTransition(async () => {
      const res = await updateInstitutionAction(formData);
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
        onClick={handleOpen}
        className="px-2.5 py-1 bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 rounded text-xs font-semibold transition flex items-center gap-1"
        title="Editar todos los datos de la institución"
      >
        <span>✏️</span> Editar
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-4 border border-slate-200 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <span>✏️</span> Modificar Datos de Institución
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Actualiza nombre, código AMIE, distrito, circuito, zona, dirección y estado.
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
              <input type="hidden" name="id" value={institution.id} />

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nombre de la Institución *
                </label>
                <input
                  name="name"
                  defaultValue={institution.name}
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
                    defaultValue={institution.amie_code || ""}
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
                    defaultValue={institution.district || ""}
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
                    defaultValue={institution.circuit || ""}
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
                    defaultValue={institution.zona || ""}
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
                  defaultValue={institution.address || ""}
                  placeholder="Av. Amazonas y Colón"
                  className="input text-xs w-full bg-white text-slate-900 placeholder:text-slate-400 border border-slate-300"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Estado Institucional *
                </label>
                <select
                  name="active"
                  value={status}
                  onChange={(e) => setStatus(Number(e.target.value))}
                  className="input text-xs w-full bg-white text-slate-900 border border-slate-300"
                >
                  <option value={1}>🟢 Activa (Operativa y disponible en el sistema)</option>
                  <option value={0}>⏸️ Suspendida / Inactiva</option>
                </select>
                <p className="text-[10px] text-slate-400 mt-1">
                  Suspender la institución conserva todos sus expedientes, estudiantes y usuarios históricos intactos.
                </p>
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
                  {isPending ? "Guardando Cambios..." : "Guardar Cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
