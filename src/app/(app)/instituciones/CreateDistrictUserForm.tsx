"use client";

import { useFormState, useFormStatus } from "react-dom";
import { createDistrictUser, type ActionState } from "./actions";

const initialState: ActionState = { error: null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-secondary disabled:opacity-60">
      {pending ? "Creando..." : "+ Crear"}
    </button>
  );
}

export default function CreateDistrictUserForm() {
  const [state, formAction] = useFormState(createDistrictUser, initialState);

  return (
    <form action={formAction} className="card p-4 flex flex-wrap gap-3 items-end max-w-3xl">
      {state.error && (
        <div className="w-full rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {state.error}
        </div>
      )}
      <div>
        <label className="label text-xs">Nombre</label>
        <input name="name" required className="input" />
      </div>
      <div>
        <label className="label text-xs">Correo</label>
        <input type="email" name="email" required className="input" />
      </div>
      <div>
        <label className="label text-xs">Contraseña temporal</label>
        <input type="password" name="password" required minLength={6} className="input" />
      </div>
      <SubmitButton />
    </form>
  );
}
