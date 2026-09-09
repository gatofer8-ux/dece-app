"use client";

import { useState, useTransition } from "react";
import { resetUserPasswordSuperadmin } from "./actions";

export default function ResetPasswordModal({
  userId,
  userName,
}: {
  userId: string;
  userName: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleReset = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    startTransition(async () => {
      const res = await resetUserPasswordSuperadmin(userId, password);
      if (res.error) {
        setError(res.error);
      } else {
        setSuccess(true);
        setTimeout(() => {
          setIsOpen(false);
          setSuccess(false);
          setPassword("");
        }, 1200);
      }
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setIsOpen(true);
          setPassword("");
          setError(null);
          setSuccess(false);
        }}
        className="text-xs text-brand-700 hover:underline"
      >
        Clave
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-5 space-y-3 border border-slate-200">
            <h4 className="font-bold text-sm text-slate-800">
              Restablecer contraseña para {userName}
            </h4>
            {error && (
              <div className="p-2 bg-red-50 text-red-700 rounded text-xs">{error}</div>
            )}
            {success && (
              <div className="p-2 bg-green-50 text-green-700 rounded text-xs font-semibold">
                ¡Contraseña actualizada con éxito!
              </div>
            )}
            <form onSubmit={handleReset} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Nueva contraseña *
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  required
                  autoFocus
                  className="input text-xs w-full"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
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
                  disabled={isPending || password.length < 6}
                  className="btn-primary text-xs"
                >
                  {isPending ? "Guardando..." : "Guardar clave"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
