"use client";

import { useState } from "react";
import VoiceDictationButton from "@/components/VoiceDictationButton";
import { createEneisInformeDeceAction, updateEneisInformeDeceAction } from "../actions";
import { ENEIS_INFORME_DECE_ACTIVIDADES_REQUERIDAS, parseEneisInformeDeceActividades } from "@/lib/eneis/eneisInformeDece";
import type { EneisInformeDeceRow } from "@/lib/types";

export default function EneisInformeDeceForm({
  mode,
  informeId,
  defaultPeriodo,
  initialData,
}: {
  mode: "create" | "edit";
  informeId?: string;
  defaultPeriodo: string;
  initialData?: EneisInformeDeceRow;
}) {
  const actividades = initialData ? parseEneisInformeDeceActividades(initialData.actividades_json) : [];
  const [removeFoto, setRemoveFoto] = useState<boolean[]>(ENEIS_INFORME_DECE_ACTIVIDADES_REQUERIDAS.map(() => false));
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(formData: FormData) {
    setError(null);
    setPending(true);
    const action = mode === "edit" ? updateEneisInformeDeceAction.bind(null, informeId!) : createEneisInformeDeceAction;
    const res = await action(formData);
    if (res?.error) {
      setError(res.error);
      setPending(false);
    }
  }

  return (
    <form action={onSubmit} className="card p-6 space-y-6 max-w-4xl">
      {error && <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-lg text-xs font-medium">⚠️ {error}</div>}
      <p className="text-xs text-slate-500">
        El número de informe, la institución y el código AMIE se completan automáticamente al generar el documento.
      </p>

      <div>
        <label className="label text-xs">Mes y año</label>
        <input
          type="month"
          name="periodo"
          defaultValue={initialData?.periodo || defaultPeriodo}
          className="input text-sm max-w-[220px]"
          required
        />
      </div>

      <div className="space-y-4">
        {ENEIS_INFORME_DECE_ACTIVIDADES_REQUERIDAS.map((req, i) => {
          const a = actividades[i];
          return (
            <div key={i} className="border rounded-lg p-4 space-y-3">
              <p className="text-xs font-semibold text-slate-600">Actividad requerida {i + 1}</p>
              <p className="text-xs text-slate-500 italic">{req}</p>

              <div>
                <div className="flex items-center justify-between">
                  <label className="label text-xs">Actividad ejecutada</label>
                  <VoiceDictationButton targetId={`f-a_ejecutada_${i}`} />
                </div>
                <textarea id={`f-a_ejecutada_${i}`} name="a_ejecutada" rows={2} defaultValue={a?.ejecutada || ""} className="textarea text-sm" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="label text-xs">Fecha</label>
                  <input type="date" name="a_fecha" defaultValue={a?.fecha || ""} className="input text-sm" />
                </div>
                <div>
                  <label className="label text-xs">Nº de beneficiados</label>
                  <input name="a_beneficiarios" defaultValue={a?.beneficiarios || ""} placeholder="Ej. 45 estudiantes" className="input text-sm" />
                </div>
              </div>

              <div>
                <label className="label text-xs">Registro fotográfico (una sola foto, no collage)</label>
                {a?.foto && !removeFoto[i] && (
                  <div className="flex items-center gap-2 mt-1 mb-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={a.foto} alt="Foto actual" className="w-20 h-16 object-cover rounded border" />
                    <button
                      type="button"
                      onClick={() => setRemoveFoto((arr) => arr.map((v, j) => (j === i ? true : v)))}
                      className="text-xs text-red-600"
                    >
                      quitar foto
                    </button>
                  </div>
                )}
                <input type="hidden" name={`a_foto_${i}_remove`} value={removeFoto[i] ? "1" : "0"} />
                <input type="file" name={`a_foto_${i}`} accept="image/*" className="text-xs" />
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-end">
        <button type="submit" disabled={pending} className="btn-primary disabled:opacity-50">
          {pending ? "Guardando…" : mode === "edit" ? "Guardar cambios" : "Guardar y ver informe"}
        </button>
      </div>
    </form>
  );
}
