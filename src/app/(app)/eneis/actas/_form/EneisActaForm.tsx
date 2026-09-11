"use client";

import { useState } from "react";
import VoiceDictationButton from "@/components/VoiceDictationButton";
import { createEneisActaAction, updateEneisActaAction } from "../actions";
import {
  parseEneisActaParticipants,
  parseEneisActaCompromisos,
  type EneisActaParticipant,
  type EneisActaCompromiso,
} from "@/lib/eneis/eneisActas";
import type { EneisActaRow } from "@/lib/types";

type Prefill = Record<string, string>;

export default function EneisActaForm({
  mode,
  actaId,
  prefill,
  initialData,
}: {
  mode: "create" | "edit";
  actaId?: string;
  prefill: Prefill;
  initialData?: EneisActaRow;
}) {
  const v = (k: string): string => {
    const fromInitial = initialData ? (initialData as unknown as Record<string, unknown>)[k] : undefined;
    if (fromInitial != null) return String(fromInitial);
    const p = prefill[k];
    return p == null ? "" : String(p);
  };

  const [participants, setParticipants] = useState<EneisActaParticipant[]>(
    initialData ? parseEneisActaParticipants(initialData.participants_json) : []
  );
  const [compromisos, setCompromisos] = useState<EneisActaCompromiso[]>(
    initialData ? parseEneisActaCompromisos(initialData.compromisos_json) : [{ compromiso: "", responsable: "", fecha: "" }]
  );

  const action = mode === "edit" ? updateEneisActaAction.bind(null, actaId!) : createEneisActaAction;

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

  return (
    <form action={action} className="card p-6 space-y-6 max-w-4xl">
      <p className="text-xs text-slate-500">
        El número del acta y el encabezado institucional se asignan automáticamente al guardar.
      </p>

      <section>
        <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">Datos generales</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {IN({ name: "ciudad" })}
          {IN({ name: "meeting_date", type: "date" })}
          {IN({ name: "lugar", voice: true })}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
          {IN({ name: "tema", voice: true, w: "sm:col-span-1" })}
          {IN({ name: "hora_inicio", type: "time" })}
          {IN({ name: "hora_fin", type: "time" })}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold text-slate-500 uppercase">Personas convocadas</h3>
          <button
            type="button"
            onClick={() => setParticipants((a) => [...a, { nombre: "", cargo: "" }])}
            className="text-xs bg-slate-200 px-2 py-1 rounded font-semibold"
          >
            + Persona
          </button>
        </div>
        <p className="text-[11px] text-slate-400 mb-2">
          Esta misma lista se usa también en la tabla de firmas de responsabilidad del acta.
        </p>
        <div className="space-y-2">
          {participants.map((p, i) => (
            <div key={i} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2 items-center">
              <input name="p_nombre" defaultValue={p.nombre} placeholder="Nombres y apellidos" className="input text-sm" />
              <input name="p_cargo" defaultValue={p.cargo} placeholder="Cargo" className="input text-sm" />
              <button
                type="button"
                onClick={() => setParticipants((arr) => arr.filter((_, j) => j !== i))}
                className="text-red-600 text-xs px-2"
              >
                quitar
              </button>
            </div>
          ))}
          {participants.length === 0 && (
            <p className="text-xs text-slate-400">Sin personas registradas. El acta reservará filas en blanco.</p>
          )}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-1">
          <Label>Desarrollo de la reunión</Label>
          <VoiceDictationButton targetId="f-desarrollo" />
        </div>
        <p className="text-[11px] text-slate-400 mb-1">
          Reportes, avances, observaciones y nudos críticos de la reunión.
        </p>
        <textarea id="f-desarrollo" name="desarrollo" rows={6} defaultValue={v("desarrollo")} className="textarea text-sm" />
      </section>

      <section>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold text-slate-500 uppercase">Compromisos</h3>
          <button
            type="button"
            onClick={() => setCompromisos((c) => [...c, { compromiso: "", responsable: "", fecha: "" }])}
            className="text-xs bg-slate-200 px-2 py-1 rounded font-semibold"
          >
            + Compromiso
          </button>
        </div>
        <div className="space-y-3">
          {compromisos.map((c, i) => (
            <div key={i} className="border rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Compromiso {i + 1}</span>
                {compromisos.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setCompromisos((arr) => arr.filter((_, j) => j !== i))}
                    className="text-red-600 text-xs"
                  >
                    quitar
                  </button>
                )}
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <Label>Compromiso</Label>
                  <VoiceDictationButton targetId={`f-c_compromiso_${i}`} />
                </div>
                <textarea
                  id={`f-c_compromiso_${i}`}
                  name="c_compromiso"
                  rows={2}
                  defaultValue={c.compromiso}
                  className="textarea text-sm"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <Label>Responsable</Label>
                  <input name="c_responsable" defaultValue={c.responsable} className="input text-sm" />
                </div>
                <div>
                  <Label>Fecha tentativa</Label>
                  <input name="c_fecha" type="date" defaultValue={c.fecha} className="input text-sm" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="flex justify-end">
        <button type="submit" className="btn-primary">
          {mode === "edit" ? "Guardar cambios" : "Guardar y ver acta"}
        </button>
      </div>
    </form>
  );
}

const LABELS: Record<string, string> = {
  ciudad: "Ciudad",
  meeting_date: "Fecha de la reunión",
  lugar: "Lugar",
  tema: "Tema de la reunión",
  hora_inicio: "Hora inicial",
  hora_fin: "Hora final",
};
