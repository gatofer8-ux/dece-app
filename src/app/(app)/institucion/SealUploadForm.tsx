"use client";

import { useFormState, useFormStatus } from "react-dom";
import { updateOwnInstitutionSeal, type ActionState } from "../instituciones/actions";

const initialState: ActionState = { error: null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-secondary text-xs disabled:opacity-60">
      {pending ? "Subiendo..." : "Guardar sello"}
    </button>
  );
}

export default function SealUploadForm({ currentSeal }: { currentSeal: string | null }) {
  const [state, formAction] = useFormState(updateOwnInstitutionSeal, initialState);

  return (
    <form action={formAction} className="space-y-3">
      <label className="label text-xs">Logo / sello institucional</label>
      {state.error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{state.error}</div>
      )}
      <div className="flex items-center gap-3">
        {currentSeal && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={currentSeal} alt="Sello actual" className="h-16 w-16 object-contain border border-slate-200 rounded" />
        )}
        <input type="file" name="seal_image" accept="image/*" required className="input text-xs" />
      </div>
      <p className="text-xs text-slate-400">Formato PNG o JPG, máximo 800 KB.</p>
      <SubmitButton />
    </form>
  );
}
