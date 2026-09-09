"use client";

import { useEffect } from "react";

/**
 * Antes, cualquier error inesperado dentro del sistema (por ejemplo, un
 * dato repetido o inválido en un formulario que no usa `useFormState`)
 * hacía que Next.js mostrara su pantalla de error genérica, sin ninguna
 * explicación en español — para el usuario se veía como que "el sistema
 * se rompió". Este archivo atrapa esos errores dentro del panel principal
 * (el menú lateral sigue visible) y muestra un mensaje claro con la opción
 * de reintentar.
 */
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex items-center justify-center py-16">
      <div className="card max-w-md w-full p-6 text-center space-y-3">
        <div className="mx-auto h-10 w-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-lg">
          !
        </div>
        <h2 className="text-sm font-semibold text-slate-800">Ocurrió un problema</h2>
        <p className="text-sm text-slate-600">
          {error.message || "Algo no salió como se esperaba. Puedes intentarlo de nuevo."}
        </p>
        <button onClick={() => reset()} className="btn-primary text-sm">
          Reintentar
        </button>
      </div>
    </div>
  );
}
