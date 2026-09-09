"use client";

import { useState, useTransition } from "react";
import { updateUserAction } from "./actions";
import { type Role } from "@/lib/types";

export default function EditUserModal({
  user,
  institutions,
}: {
  user: {
    id: string;
    name: string;
    email: string;
    role: Role;
    institution_id: string | null;
    phone: string | null;
    active: number;
  };
  institutions: { id: string; name: string; active?: number }[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [role, setRole] = useState<Role>(user.role);
  const [selectedInstId, setSelectedInstId] = useState<string>(user.institution_id || "");
  const [status, setStatus] = useState<number>(user.active);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isInstitutional = ["ADMIN", "DECE", "AUTORIDAD", "DOCENTE"].includes(role);

  const activeInstitutions = institutions.filter((i) => i.active !== 0);
  const inactiveInstitutions = institutions.filter((i) => i.active === 0);

  const handleOpen = () => {
    setRole(user.role);
    setSelectedInstId(user.institution_id || "");
    setStatus(user.active);
    setError(null);
    setIsOpen(true);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setError(null);

    startTransition(async () => {
      const res = await updateUserAction(formData);
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
        title="Editar todos los datos del usuario"
      >
        <span>✏️</span> Editar
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-4 border border-slate-200 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <span>✏️</span> Modificar Datos de Usuario
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Actualiza nombre, correo, rol, teléfono, institución, contraseña y estado.
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
              <input type="hidden" name="id" value={user.id} />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nombre Completo *
                  </label>
                  <input
                    name="name"
                    defaultValue={user.name}
                    required
                    placeholder="Ej. Dra. María Gómez"
                    className="input text-xs w-full bg-white text-slate-900 placeholder:text-slate-400 border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Correo Electrónico *
                  </label>
                  <input
                    type="email"
                    name="email"
                    defaultValue={user.email}
                    required
                    placeholder="maria.gomez@educacion.gob.ec"
                    className="input text-xs w-full bg-white text-slate-900 placeholder:text-slate-400 border border-slate-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Rol en el sistema *
                  </label>
                  <select
                    name="role"
                    value={role}
                    onChange={(e) => setRole(e.target.value as Role)}
                    className="input text-xs w-full bg-white text-slate-900 border border-slate-300"
                  >
                    <option value="DECE">DECE (Profesional)</option>
                    <option value="ADMIN">ADMIN (Coordinador Institucional)</option>
                    <option value="AUTORIDAD">AUTORIDAD (Rector/Director)</option>
                    <option value="DOCENTE">DOCENTE (Docente tutor)</option>
                    <option value="DISTRITO">DISTRITO (Técnico Distrital)</option>
                    <option value="SUPERADMIN">SUPERADMIN (Superadministrador)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Teléfono
                  </label>
                  <input
                    name="phone"
                    defaultValue={user.phone || ""}
                    placeholder="0991234567"
                    className="input text-xs w-full bg-white text-slate-900 placeholder:text-slate-400 border border-slate-300"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Institución asignada {isInstitutional && "*"}
                </label>
                <select
                  name="institution_id"
                  value={selectedInstId}
                  onChange={(e) => setSelectedInstId(e.target.value)}
                  required={isInstitutional}
                  className="input text-xs w-full bg-white text-slate-900 border border-slate-300"
                >
                  <option value="">
                    {isInstitutional ? "-- Selecciona una institución --" : "(Ninguna - Nivel Central / Distrito)"}
                  </option>
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
                {!isInstitutional && (
                  <p className="text-[11px] text-slate-400 mt-1">
                    Los roles DISTRITO y SUPERADMIN operan a nivel global sin estar atados a una institución única.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Estado de la Cuenta *
                  </label>
                  <select
                    name="active"
                    value={status}
                    onChange={(e) => setStatus(Number(e.target.value))}
                    className="input text-xs w-full bg-white text-slate-900 border border-slate-300"
                  >
                    <option value={1}>🟢 Activo (Acceso habilitado)</option>
                    <option value={0}>⏸️ Suspendido / Inactivo (Acceso bloqueado)</option>
                  </select>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Suspender conserva todos los casos, firmas y documentos históricos intactos.
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nueva Contraseña (Opcional)
                  </label>
                  <input
                    type="password"
                    name="new_password"
                    minLength={6}
                    placeholder="Dejar en blanco para no cambiar"
                    className="input text-xs w-full bg-white text-slate-900 placeholder:text-slate-400 border border-slate-300"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Solo completa si deseas restablecer la clave del usuario.
                  </p>
                </div>
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
