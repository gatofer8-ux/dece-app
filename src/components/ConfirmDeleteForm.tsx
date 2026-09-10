"use client";

import { useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useToast } from "@/components/Toast";

type ActionState = { error: string | null };

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="text-xs text-red-600 hover:underline disabled:opacity-50 whitespace-nowrap">
      {pending ? "Eliminando..." : label}
    </button>
  );
}

/**
 * Botón de eliminar reutilizable: pide confirmación al usuario antes de
 * enviar, y muestra el mensaje de error inline si el servidor rechaza el
 * borrado (por ejemplo, porque el registro todavía tiene datos asociados).
 */
export default function ConfirmDeleteForm({
  action,
  confirmMessage,
  label = "Eliminar",
}: {
  action: (prevState: ActionState, formData: FormData) => Promise<ActionState>;
  confirmMessage: string;
  label?: string;
}) {
  const [state, formAction] = useFormState(action, { error: null });
  const toast = useToast();
  const seen = useRef<string | null>(null);

  useEffect(() => {
    if (state.error && state.error !== seen.current) {
      seen.current = state.error;
      toast.error(state.error);
    }
  }, [state.error, toast]);

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!window.confirm(confirmMessage)) e.preventDefault();
      }}
    >
      <SubmitButton label={label} />
      {state.error && <p className="text-xs text-red-600 mt-1 max-w-xs">{state.error}</p>}
    </form>
  );
}
