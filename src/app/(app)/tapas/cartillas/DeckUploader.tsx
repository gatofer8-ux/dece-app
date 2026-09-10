"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { uploadTapasDeck } from "./actions";

export default function DeckUploader() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    setErr(null);
    try {
      const fd = new FormData(e.currentTarget);
      const res = await uploadTapasDeck(fd);
      if (!res.ok) {
        setErr(res.error);
      } else {
        const r = res.result;
        let m = `Se cargaron ${r.matched} de ${r.total} cartillas.`;
        if (r.missingArchetypes.length) m += ` Faltan: ${r.missingArchetypes.slice(0, 8).join(", ")}${r.missingArchetypes.length > 8 ? "…" : ""}.`;
        if (r.unmatchedPages.length) m += ` No se reconocieron ${r.unmatchedPages.length} páginas.`;
        setMsg(m);
        router.refresh();
      }
    } catch {
      setErr("No se pudo procesar el archivo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card p-6 space-y-4 max-w-2xl">
      <div>
        <label className="label text-xs">Archivo PDF oficial de «Tarjetas de arquetipos» (una cartilla por página)</label>
        <input type="file" name="deck" accept="application/pdf,.pdf" required className="text-sm w-full" />
        <p className="text-[11px] text-slate-400 mt-1">
          Descarga la herramienta gratuita en <span className="font-mono">ecuador.vvob.org/herramientas-TAPAS</span> y súbela aquí.
          El sistema la procesa en una imagen por arquetipo, guardada solo para tu institución.
        </p>
      </div>
      <div>
        <label className="label text-xs">Nota de origen (opcional)</label>
        <input name="source_note" className="input text-sm" placeholder="Ej. Herramientas TaPas, VVOB, 1.ª ed. 2021" />
      </div>
      {err && <p className="text-sm text-rose-600">⚠️ {err}</p>}
      {msg && <p className="text-sm text-emerald-700">✅ {msg}</p>}
      <button type="submit" disabled={busy} className="btn-primary disabled:opacity-60">
        {busy ? "Procesando…" : "Cargar cartillas"}
      </button>
    </form>
  );
}
