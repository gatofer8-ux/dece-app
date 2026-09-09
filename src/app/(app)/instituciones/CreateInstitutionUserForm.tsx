"use client";

import { useFormState, useFormStatus } from "react-dom";
import { createInstitutionUser, type ActionState } from "./actions";
import { ROLE_LABELS } from "@/lib/types";

const initialState: ActionState = { error: null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary text-sm disabled:opacity-60">
      {pending ? "Creando..." : "+ Crear usuario"}
    </button>
  );
}

export default function CreateInstitutionUserForm({ institutionId }: { institutionId: string }) {
  const createInstitutionUserForThisInstitution = createInstitutionUser.bind(null, institutionId);
  const [state, formAction] = useFormState(createInstitutionUserForThisInstitution, initialState);

  return (
    <form action={formAction} className="space-y-3">
      {state.error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {state.error}
        </div>
      )}
      <input name="name" required placeholder="Nombre completo" className="input" />
      <input type="email" name="email" required placeholder="Correo institucional" className="input" />
      <input name="phone" placeholder="Teléfono" className="input" />
      <select name="role" required defaultValue="ADMIN" className="select">
        {Object.entries(ROLE_LABELS)
          .filter(([k]) => k !== "DISTRITO")
          .map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
      </select>
      <input type="password" name="password" required minLength={6} placeholder="Contraseña temporal" className="input" />
      <SubmitButton />
    </form>
  );
}
