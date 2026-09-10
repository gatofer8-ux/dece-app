"use client";

import { useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { updateOwnProfile, type ProfileState } from "./actions";
import { useToast, useToastOnChange } from "@/components/Toast";

const initialState: ProfileState = { error: null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary text-xs disabled:opacity-60">
      {pending ? "Guardando…" : "Guardar mis datos"}
    </button>
  );
}

export default function ProfileForm({
  user,
}: {
  user: {
    name: string;
    email: string;
    title_prefix: string | null;
    job_title: string | null;
    document_id: string | null;
    phone: string | null;
    phone_ext: string | null;
  };
}) {
  const [state, formAction] = useFormState(updateOwnProfile, initialState);
  const toast = useToast();
  useToastOnChange(state.error, "error");
  const okSeen = useRef(false);
  useEffect(() => {
    if (state.ok && !okSeen.current) {
      okSeen.current = true;
      toast.success("Perfil guardado.");
    }
    if (!state.ok) okSeen.current = false;
  }, [state.ok, toast]);

  return (
    <form action={formAction} className="card p-6 space-y-4 max-w-2xl">
      {state.error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{state.error}</div>
      )}
      {state.ok && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
          Datos guardados. Se usarán en los próximos documentos.
        </div>
      )}

      <p className="text-[11px] text-slate-500">
        Estos datos se precargan automáticamente en las firmas de los informes, actas y fichas que elabores.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="label text-xs">Título académico</label>
          <input type="text" name="title_prefix" defaultValue={user.title_prefix || ""} placeholder="Psic. Cl. / Lcda. / Msc." className="input text-xs" />
        </div>
        <div className="sm:col-span-2">
          <label className="label text-xs">Nombres y apellidos *</label>
          <input type="text" name="name" defaultValue={user.name} required className="input text-xs" />
        </div>
        <div className="sm:col-span-2">
          <label className="label text-xs">Cargo</label>
          <input type="text" name="job_title" defaultValue={user.job_title || ""} placeholder="ANALISTA DECE / COORDINADOR/A DECE / TRABAJADOR/A SOCIAL" className="input text-xs" />
        </div>
        <div>
          <label className="label text-xs">Cédula</label>
          <input type="text" name="document_id" defaultValue={user.document_id || ""} placeholder="1800000000" className="input text-xs" />
        </div>
        <div>
          <label className="label text-xs">Teléfono</label>
          <input type="text" name="phone" defaultValue={user.phone || ""} placeholder="0990000000" className="input text-xs" />
        </div>
        <div>
          <label className="label text-xs">Extensión</label>
          <input type="text" name="phone_ext" defaultValue={user.phone_ext || ""} placeholder="Ej. 102" className="input text-xs" />
        </div>
        <div>
          <label className="label text-xs">Correo (no editable aquí)</label>
          <input type="text" value={user.email} disabled className="input text-xs bg-slate-100 text-slate-500" />
        </div>
      </div>

      <div className="pt-1 flex justify-end">
        <SubmitButton />
      </div>
    </form>
  );
}
