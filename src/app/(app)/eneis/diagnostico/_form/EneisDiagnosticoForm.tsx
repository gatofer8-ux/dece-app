"use client";

import { useState } from "react";
import VoiceDictationButton from "@/components/VoiceDictationButton";
import { createEneisDiagnosticoAction, updateEneisDiagnosticoAction } from "../actions";
import {
  parseEneisDiagnosticoObjetivos,
  parseEneisDiagnosticoActividades,
  parseEneisDiagnosticoResultados,
  parseEneisDiagnosticoResponsables,
  type EneisDiagnosticoResultadoEje,
  type EneisDiagnosticoResponsable,
} from "@/lib/eneis/eneisDiagnostico";
import type { EneisDiagnosticoRow } from "@/lib/types";

type Prefill = Record<string, string>;
const emptyResultado: EneisDiagnosticoResultadoEje = { eje: "", componentes: "", fuente: "", dificultades: "", positivos: "", negativos: "", sesgados: "" };

export default function EneisDiagnosticoForm({
  mode,
  diagnosticoId,
  prefill,
  initialData,
}: {
  mode: "create" | "edit";
  diagnosticoId?: string;
  prefill: Prefill;
  initialData?: EneisDiagnosticoRow;
}) {
  const v = (k: string): string => {
    const fromInitial = initialData ? (initialData as unknown as Record<string, unknown>)[k] : undefined;
    if (fromInitial != null) return String(fromInitial);
    const p = prefill[k];
    return p == null ? "" : String(p);
  };

  const [objetivos, setObjetivos] = useState<string[]>(
    initialData ? parseEneisDiagnosticoObjetivos(initialData.objetivos_especificos_json) : [""]
  );
  const [actividades, setActividades] = useState<string[]>(
    initialData ? parseEneisDiagnosticoActividades(initialData.actividades_json) : [""]
  );
  const [resultados, setResultados] = useState<EneisDiagnosticoResultadoEje[]>(
    initialData ? parseEneisDiagnosticoResultados(initialData.resultados_json) : [emptyResultado]
  );
  const [responsables, setResponsables] = useState<EneisDiagnosticoResponsable[]>(
    initialData ? parseEneisDiagnosticoResponsables(initialData.responsables_json) : [{ nombre: "", cargo: "" }, { nombre: "", cargo: "" }]
  );

  const action = mode === "edit" ? updateEneisDiagnosticoAction.bind(null, diagnosticoId!) : createEneisDiagnosticoAction;

  const Label = ({ children }: { children: React.ReactNode }) => <label className="label text-xs">{children}</label>;

  const IN = ({ name, type = "text", w, voice }: { name: string; type?: string; w?: string; voice?: boolean }) => (
    <div className={w}>
      <div className="flex items-center justify-between">
        <Label>{LABELS[name] || name}</Label>
        {voice && <VoiceDictationButton targetId={`f-${name}`} />}
      </div>
      <input id={`f-${name}`} name={name} type={type} defaultValue={v(name)} className="input text-sm" />
    </div>
  );

  const TA = ({ name, rows = 5, voice = true }: { name: string; rows?: number; voice?: boolean }) => (
    <div>
      <div className="flex items-center justify-between">
        <Label>{LABELS[name] || name}</Label>
        {voice && <VoiceDictationButton targetId={`f-${name}`} />}
      </div>
      <textarea id={`f-${name}`} name={name} rows={rows} defaultValue={v(name)} className="textarea text-sm" />
    </div>
  );

  return (
    <form action={action} className="card p-6 space-y-6 max-w-5xl">
      <section>
        <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">Datos informativos</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {IN({ name: "zona" })}
          {IN({ name: "distrito" })}
          {IN({ name: "fecha", type: "date" })}
        </div>
      </section>

      <TA name="antecedentes" rows={6} />

      <section>
        <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">Objetivos</h3>
        <TA name="objetivo_general" rows={2} />
        <div className="mt-3">
          <div className="flex items-center justify-between mb-1">
            <Label>Objetivos específicos</Label>
            <button type="button" onClick={() => setObjetivos((a) => [...a, ""])} className="text-xs bg-slate-200 px-2 py-1 rounded font-semibold">
              + Objetivo
            </button>
          </div>
          {objetivos.map((o, i) => (
            <div key={i} className="flex gap-2 items-center mb-2">
              <input name="objetivo_especifico" defaultValue={o} className="input text-sm flex-1" />
              <button type="button" onClick={() => setObjetivos((arr) => arr.filter((_, j) => j !== i))} className="text-red-600 text-xs px-2">
                quitar
              </button>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-xs font-semibold text-slate-500 uppercase">Actividades realizadas</h3>
          <button type="button" onClick={() => setActividades((a) => [...a, ""])} className="text-xs bg-slate-200 px-2 py-1 rounded font-semibold">
            + Actividad
          </button>
        </div>
        {actividades.map((a, i) => (
          <div key={i} className="flex gap-2 items-center mb-2">
            <input name="actividad" defaultValue={a} className="input text-sm flex-1" />
            <button type="button" onClick={() => setActividades((arr) => arr.filter((_, j) => j !== i))} className="text-red-600 text-xs px-2">
              quitar
            </button>
          </div>
        ))}
      </section>

      <section>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold text-slate-500 uppercase">Resultados por eje</h3>
          <button type="button" onClick={() => setResultados((a) => [...a, { ...emptyResultado }])} className="text-xs bg-slate-200 px-2 py-1 rounded font-semibold">
            + Fila
          </button>
        </div>
        <div className="space-y-3">
          {resultados.map((row, i) => (
            <div key={i} className="border rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Fila {i + 1}</span>
                {resultados.length > 1 && (
                  <button type="button" onClick={() => setResultados((arr) => arr.filter((_, j) => j !== i))} className="text-red-600 text-xs">
                    quitar
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input name="r_eje" defaultValue={row.eje} placeholder="Eje asociado" className="input text-sm" />
                <input name="r_componentes" defaultValue={row.componentes} placeholder="Componentes" className="input text-sm" />
                <input name="r_fuente" defaultValue={row.fuente} placeholder="Fuente de información" className="input text-sm" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <textarea name="r_dificultades" defaultValue={row.dificultades} placeholder="Dificultades identificadas" rows={2} className="textarea text-sm" />
                <textarea name="r_positivos" defaultValue={row.positivos} placeholder="Aspectos positivos" rows={2} className="textarea text-sm" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <textarea name="r_negativos" defaultValue={row.negativos} placeholder="Aspectos negativos" rows={2} className="textarea text-sm" />
                <textarea name="r_sesgados" defaultValue={row.sesgados} placeholder="Aspectos sesgados" rows={2} className="textarea text-sm" />
              </div>
            </div>
          ))}
        </div>
      </section>

      <TA name="conclusiones" rows={5} />
      <TA name="recomendaciones" rows={5} />

      <section>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold text-slate-500 uppercase">Responsables (firmas)</h3>
          <button type="button" onClick={() => setResponsables((a) => [...a, { nombre: "", cargo: "" }])} className="text-xs bg-slate-200 px-2 py-1 rounded font-semibold">
            + Responsable
          </button>
        </div>
        <div className="space-y-2">
          {responsables.map((rp, i) => (
            <div key={i} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2 items-center">
              <input name="resp_nombre" defaultValue={rp.nombre} placeholder="Nombre" className="input text-sm" />
              <input name="resp_cargo" defaultValue={rp.cargo} placeholder="Cargo" className="input text-sm" />
              <button type="button" onClick={() => setResponsables((arr) => arr.filter((_, j) => j !== i))} className="text-red-600 text-xs px-2">
                quitar
              </button>
            </div>
          ))}
        </div>
      </section>

      <div className="flex justify-end">
        <button type="submit" className="btn-primary">
          {mode === "edit" ? "Guardar cambios" : "Guardar y ver informe"}
        </button>
      </div>
    </form>
  );
}

const LABELS: Record<string, string> = {
  zona: "Zona",
  distrito: "Distrito",
  fecha: "Fecha",
  antecedentes: "Antecedentes",
  objetivo_general: "Objetivo General",
  conclusiones: "Conclusiones",
  recomendaciones: "Recomendaciones",
};
