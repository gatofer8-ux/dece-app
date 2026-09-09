"use client";

import { useFormState, useFormStatus } from "react-dom";
import { resetPassword, type ActionState } from "./actions";

const initialState: ActionState = { error: null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-secondary text-xs !py-1 disabled:opacity-60">
      {pending ? "Guardando..." : "Guardar"}
    </button>
  );
}

export default function ResetPasswordForm({ userId }: { userId: string }) {
  const resetPasswordForUser = resetPassword.bind(null, userId);
  const [state, formAction] = useFormState(resetPasswordForUser, initialState);

  return (
    <details className="relative">
      <summary className="text-xs text-brand-700 hover:underline cursor-pointer list-none">Restablecer clave</summary>
      <form
        action={formAction}
        className="absolute z-10 bg-white border border-slate-200 rounded-lg shadow-lg p-3 mt-1 flex flex-col gap-2 w-56"
      >
        {state.error && <p className="text-xs text-red-600">{state.error}</p>}
        <div className="flex gap-2 items-center">
          <input type="password" name="password" placeholder="Nueva clave" required minLength={6} className="input text-xs !py-1 w-32" />
          <SubmitButton />
        </div>
      </form>
    </details>
  );
}
