"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";

/**
 * Botón de borrado genérico con confirmación — usado para corregir
 * registros duplicados (estudiantes, documentos de un caso, atenciones
 * diarias, etc.). Recibe directamente la server action ya "atada" (bind)
 * al id del registro a borrar; siempre pide confirmación antes de actuar,
 * ya que borrar es irreversible.
 */
export default function DeleteButton({
  onDelete,
  label = "🗑️ Borrar",
  confirmMessage = "¿Borrar este registro? Esta acción no se puede deshacer.",
  className = "text-xs text-red-600 hover:underline whitespace-nowrap",
  redirectTo,
}: {
  /**
   * Server action ya "atada" al id del registro a borrar. Puede simplemente
   * borrar (Promise<void>) o, si necesita comunicar un error de negocio con
   * un mensaje específico (p. ej. "no se puede borrar porque tiene casos
   * asociados"), debe atrapar la excepción DENTRO de la propia server action
   * y devolver { error: "mensaje" } — en Next.js, en producción, un throw
   * dentro de una server action llega al cliente con el mensaje redactado
   * (solo un "digest" genérico), así que el mensaje real solo se preserva
   * si se devuelve explícitamente en vez de lanzarse.
   */
  onDelete: () => Promise<void | { error?: string }>;
  label?: string;
  confirmMessage?: string;
  className?: string;
  /**
   * Si se indica, tras borrar con éxito se navega a esta ruta en vez de
   * refrescar la página actual (necesario cuando el registro borrado es el
   * que la propia página muestra, p. ej. al borrar un estudiante desde su
   * ficha de detalle — refrescar esa página causaría un error "no encontrado").
   */
  redirectTo?: string;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const toast = useToast();

  async function handleClick() {
    if (!confirm(confirmMessage)) return;
    setPending(true);
    setError(null);
    try {
      const result = await onDelete();
      if (result && result.error) {
        setError(result.error);
        toast.error(result.error);
        return;
      }
      toast.success("Registro eliminado.");
      if (redirectTo) {
        router.push(redirectTo);
      } else {
        router.refresh();
      }
    } catch (err: any) {
      const msg = err?.message || "No se pudo borrar el registro.";
      setError(msg);
      toast.error(msg);
    } finally {
      setPending(false);
    }
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button type="button" onClick={handleClick} disabled={pending} className={`${className} disabled:opacity-50`}>
        {pending ? "Borrando..." : label}
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </span>
  );
}
