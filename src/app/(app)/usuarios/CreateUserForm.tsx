"use client";

import { useFormState, useFormStatus } from "react-dom";
import { createUser, type ActionState } from "./actions";
import { ROLE_LABELS } from "@/lib/types";

const initialState: ActionState = { error: null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary disabled:opacity-60">
      {pending ? "Creando..." : "Crear usuario"}
    </button>
  );
}

export default function CreateUserForm() {
  const [state, formAction] = useFormState(createUser, initialState);

  return (
    <form action={formAction} className="card p-6 space-y-4 max-w-xl">
      {state.error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      )}
      <div>
        <label className="label">Nombre completo *</label>
        <input name="name" required className="input" />
      </div>
      <div>
        <label className="label">Correo institucional *</label>
        <input type="email" name="email" required className="input" />
      </div>
      <div>
        <label className="label">Teléfono</label>
        <input name="phone" className="input" />
      </div>
      <div>
        <label className="label">Rol *</label>
        <select name="role" required className="select">
          {Object.entries(ROLE_LABELS)
            .filter(([k]) => k !== "DISTRITO")
            .map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
        </select>
      </div>
      <div>
        <label className="label">Contraseña temporal *</label>
        <input type="password" name="password" required minLength={6} className="input" />
        <p className="text-xs text-slate-400 mt-1">Mínimo 6 caracteres. El usuario podrá cambiarla luego.</p>
      </div>
      <div className="flex justify-end">
        <SubmitButton />
      </div>
    </form>
  );
}
