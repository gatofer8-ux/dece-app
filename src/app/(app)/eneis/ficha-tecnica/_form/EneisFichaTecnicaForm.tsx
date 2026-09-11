"use client";

import { useState } from "react";
import VoiceDictationButton from "@/components/VoiceDictationButton";
import { createEneisFichaTecnicaAction, updateEneisFichaTecnicaAction } from "../actions";
import {
  ENEIS_NIVELES_PREPARACION,
  ENEIS_TEMAS_EIS,
  ENEIS_RECURSOS_INSTITUCIONALES,
  ENEIS_FIRMAS_ESCOLARES_ROLES,
  ENEIS_FIRMAS_DISTRITALES_ROLES,
  parseFuncionarios,
  parseTemasSeleccionados,
  parseRecursosSeleccionados,
  parseCronograma,
  parseAvances,
  buildFirmas,
  type EneisFichaTecnicaFuncionario,
  type EneisFichaTecnicaCronogramaItem,
  type EneisFichaTecnicaAvanceItem,
} from "@/lib/eneis/eneisFichaTecnica";
import type { EneisFichaTecnicaRow } from "@/lib/types";

export default function EneisFichaTecnicaForm({
  mode,
  fichaId,
  prefill,
  initialData,
}: {
  mode: "create" | "edit";
  fichaId?: string;
  prefill: Record<string, string>;
  initialData?: EneisFichaTecnicaRow;
}) {
  const v = (k: string): string => {
    const fromInitial = initialData ? (initialData as unknown as Record<string, unknown>)[k] : undefined;
    if (fromInitial != null) return String(fromInitial);
    return prefill[k] || "";
  };

  const [funcionarios, setFuncionarios] = useState<EneisFichaTecnicaFuncionario[]>(
    initialData ? parseFuncionarios(initialData.funcionarios_json) : [{ nombre: "", cargo: "" }]
  );
  const [nivelIndex, setNivelIndex] = useState<number | null>(initialData?.nivel_preparacion_index ?? null);
  const [temas, setTemas] = useState<Set<string>>(
    new Set(initialData ? parseTemasSeleccionados(initialData.temas_seleccionados_json) : [])
  );
  const [recursos, setRecursos] = useState<Set<number>>(
    new Set(initialData ? parseRecursosSeleccionados(initialData.recursos_seleccionados_json) : [])
  );
  const [cronograma, setCronograma] = useState<EneisFichaTecnicaCronogramaItem[]>(
    initialData ? parseCronograma(initialData.cronograma_json) : [{ actividad: "", poblacion: "", fecha: "", responsable: "" }]
  );
  const [avances, setAvances] = useState<EneisFichaTecnicaAvanceItem[]>(
    initialData ? parseAvances(initialData.avances_json) : [{ actividad: "", estado: "", poblacion: "" }]
  );
  const firmasEscolares = buildFirmas(initialData?.firmas_escolares_json, ENEIS_FIRMAS_ESCOLARES_ROLES);
  const firmasDistritales = buildFirmas(initialData?.firmas_distritales_json, ENEIS_FIRMAS_DISTRITALES_ROLES);

  const action = mode === "edit" ? updateEneisFichaTecnicaAction.bind(null, fichaId!) : createEneisFichaTecnicaAction;

  function toggleTema(id: string) {
    setTemas((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function toggleRecurso(i: number) {
    setRecursos((s) => {
      const next = new Set(s);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  const conceptos = Array.from(new Set(ENEIS_TEMAS_EIS.map((t) => t.concepto)));

  return (
    <form action={action} className="card p-6 space-y-6 max-w-5xl">
      <section>
        <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">Datos generales</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="label text-xs">Coordinación zonal / Distrito</label>
            <input name="coordinacion_zonal_distrito" defaultValue={v("coordinacion_zonal_distrito")} className="input text-sm" />
          </div>
          <div>
            <label className="label text-xs">Fecha de elaboración</label>
            <input type="date" name="fecha_elaboracion" defaultValue={v("fecha_elaboracion")} className="input text-sm" />
          </div>
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold text-slate-500 uppercase">Funcionarios que conforman el equipo escolar EIS</h3>
          <button type="button" onClick={() => setFuncionarios((a) => [...a, { nombre: "", cargo: "" }])} className="text-xs bg-slate-200 px-2 py-1 rounded font-semibold">
            + Funcionario
          </button>
        </div>
        <div className="space-y-2">
          {funcionarios.map((f, i) => (
            <div key={i} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2 items-center">
              <input name="func_nombre" defaultValue={f.nombre} placeholder="Nombre" className="input text-sm" />
              <input name="func_cargo" defaultValue={f.cargo} placeholder="Cargo" className="input text-sm" />
              <button type="button" onClick={() => setFuncionarios((arr) => arr.filter((_, j) => j !== i))} className="text-red-600 text-xs px-2">
                quitar
              </button>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h3 className="text-xs font-semibold text-slate-500 uppercase mb-1">Determinación del nivel de preparación de la comunidad educativa</h3>
        <p className="text-[11px] text-slate-400 mb-2">En función del diagnóstico realizado, selecciona uno.</p>
        <div className="space-y-1.5">
          {ENEIS_NIVELES_PREPARACION.map((n, i) => (
            <label key={i} className="flex items-start gap-2 text-sm p-2 rounded border border-slate-200 hover:bg-slate-50 cursor-pointer">
              <input
                type="radio"
                name="nivel_preparacion_index"
                value={i}
                defaultChecked={nivelIndex === i}
                onChange={() => setNivelIndex(i)}
                className="mt-0.5"
              />
              <span>
                <span className="font-medium">{n.etapa}</span>
                {n.objetivo && <span className="text-xs text-slate-500 block">{n.objetivo}</span>}
              </span>
            </label>
          ))}
        </div>
      </section>

      <section>
        <h3 className="text-xs font-semibold text-slate-500 uppercase mb-1">Priorización de temas de trabajo</h3>
        <p className="text-[11px] text-slate-400 mb-2">Selecciona al menos un tema por cada concepto clave.</p>
        <div className="space-y-3">
          {conceptos.map((concepto) => (
            <div key={concepto} className="border rounded-lg p-3">
              <p className="text-xs font-semibold text-slate-700 mb-1">{concepto}</p>
              <div className="space-y-1">
                {ENEIS_TEMAS_EIS.filter((t) => t.concepto === concepto).map((t) => (
                  <label key={t.id} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="tema_id" value={t.id} checked={temas.has(t.id)} onChange={() => toggleTema(t.id)} />
                    {t.id} {t.tema}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h3 className="text-xs font-semibold text-slate-500 uppercase mb-1">Selección de recursos institucionales</h3>
        <p className="text-[11px] text-slate-400 mb-2">Selecciona al menos una herramienta institucional.</p>
        <div className="space-y-1.5">
          {ENEIS_RECURSOS_INSTITUCIONALES.map((r, i) => (
            <label key={i} className="flex items-start gap-2 text-sm p-2 rounded border border-slate-200">
              <input type="checkbox" name="recurso_index" value={i} checked={recursos.has(i)} onChange={() => toggleRecurso(i)} className="mt-0.5" />
              <span>
                <span className="font-medium">{r.nombre}</span>
                <span className="text-xs text-slate-500 block">{r.poblacion}</span>
              </span>
            </label>
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold text-slate-500 uppercase">Planificación de actividades (cronograma)</h3>
          <button type="button" onClick={() => setCronograma((a) => [...a, { actividad: "", poblacion: "", fecha: "", responsable: "" }])} className="text-xs bg-slate-200 px-2 py-1 rounded font-semibold">
            + Actividad
          </button>
        </div>
        <div className="space-y-2">
          {cronograma.map((c, i) => (
            <div key={i} className="grid grid-cols-1 sm:grid-cols-[2fr_1.5fr_1fr_1fr_auto] gap-2 items-center border rounded-lg p-2">
              <input name="cr_actividad" defaultValue={c.actividad} placeholder="Actividad / Herramienta utilizada" className="input text-sm" />
              <input name="cr_poblacion" defaultValue={c.poblacion} placeholder="Población objetivo" className="input text-sm" />
              <input name="cr_fecha" type="date" defaultValue={c.fecha} className="input text-sm" />
              <input name="cr_responsable" defaultValue={c.responsable} placeholder="Responsable" className="input text-sm" />
              <button type="button" onClick={() => setCronograma((arr) => arr.filter((_, j) => j !== i))} className="text-red-600 text-xs">
                quitar
              </button>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold text-slate-500 uppercase">Reporte de avances y resultados</h3>
          <button type="button" onClick={() => setAvances((a) => [...a, { actividad: "", estado: "", poblacion: "" }])} className="text-xs bg-slate-200 px-2 py-1 rounded font-semibold">
            + Avance
          </button>
        </div>
        <div className="space-y-2">
          {avances.map((a, i) => (
            <div key={i} className="grid grid-cols-1 sm:grid-cols-[2fr_1fr_1.5fr_auto] gap-2 items-center border rounded-lg p-2">
              <input name="av_actividad" defaultValue={a.actividad} placeholder="Actividad / Herramienta utilizada" className="input text-sm" />
              <select name="av_estado" defaultValue={a.estado} className="select text-sm">
                <option value="">Estado…</option>
                <option value="Pendiente">Pendiente</option>
                <option value="En curso">En curso</option>
                <option value="Finalizado">Finalizado</option>
              </select>
              <input name="av_poblacion" defaultValue={a.poblacion} placeholder="Población alcanzada (resultados)" className="input text-sm" />
              <button type="button" onClick={() => setAvances((arr) => arr.filter((_, j) => j !== i))} className="text-red-600 text-xs">
                quitar
              </button>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-1">
          <label className="label text-xs">Nudos críticos</label>
          <VoiceDictationButton targetId="f-nudos_criticos" />
        </div>
        <textarea id="f-nudos_criticos" name="nudos_criticos" rows={3} defaultValue={v("nudos_criticos")} className="textarea text-sm" />
      </section>

      <section>
        <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">Firmas de responsabilidad — Equipo Escolar</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {firmasEscolares.map((f, i) => (
            <div key={i}>
              <label className="label text-xs">{f.role}</label>
              <input name="fe_nombre" defaultValue={f.nombre} placeholder="Nombre" className="input text-sm" />
            </div>
          ))}
        </div>
      </section>

      <section>
        <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">Firmas de responsabilidad — Equipo Distrital</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {firmasDistritales.map((f, i) => (
            <div key={i}>
              <label className="label text-xs">{f.role}</label>
              <input name="fd_nombre" defaultValue={f.nombre} placeholder="Nombre" className="input text-sm" />
            </div>
          ))}
        </div>
      </section>

      <div className="flex justify-end">
        <button type="submit" className="btn-primary">
          {mode === "edit" ? "Guardar cambios" : "Guardar y ver ficha"}
        </button>
      </div>
    </form>
  );
}
