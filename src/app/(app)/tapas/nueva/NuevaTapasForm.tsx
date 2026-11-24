"use client";

import { useMemo, useState } from "react";
import {
  TAPAS_INSTRUMENTS,
  TAPAS_INSTRUMENT_KEYS,
  TAPAS_NIVELES,
  TAPAS_NIVEL_KEYS,
  archetypesForNivel,
  suggestNivelFromCourse,
  type TapasInstrument,
  type TapasNivel,
} from "@/lib/tapas/niveles";
import { estimateMinutes, orderInstruments, suggestSchedule, totalMinutes, type TapasModo } from "@/lib/tapas/plan";

type Tipo = "UNA" | "PROCESO";

export default function NuevaTapasForm({
  action,
  courses,
  parallels,
}: {
  action: (formData: FormData) => void | Promise<void>;
  courses: string[];
  parallels: string[];
}) {
  const [nivel, setNivel] = useState<TapasNivel>("BACHILLERATO");
  const [tipo, setTipo] = useState<Tipo>("PROCESO");
  const [instrument, setInstrument] = useState<TapasInstrument>("ARQUETIPOS");
  const [selected, setSelected] = useState<TapasInstrument[]>(TAPAS_NIVELES.BACHILLERATO.instruments);
  const [modo, setModo] = useState<TapasModo>("VARIAS");
  const [minutosHora, setMinutosHora] = useState(40);
  const [suggested, setSuggested] = useState<TapasNivel | null>(null);
  const cfg = TAPAS_NIVELES[nivel];

  function pickNivel(n: TapasNivel) {
    setNivel(n);
    const allowed = TAPAS_NIVELES[n].instruments;
    if (!allowed.includes(instrument)) setInstrument("ARQUETIPOS");
    setSelected(allowed);
  }

  const planInstruments = useMemo(() => orderInstruments(selected.filter((i) => cfg.instruments.includes(i))), [selected, cfg]);
  const plan = useMemo(
    () => ({ instruments: planInstruments, open: planInstruments, modo, minutosHora }),
    [planInstruments, modo, minutosHora]
  );
  const schedule = useMemo(() => suggestSchedule(plan, nivel), [plan, nivel]);
  const total = totalMinutes(plan, nivel);

  return (
    <form action={action} className="card p-6 space-y-6 max-w-3xl">
      <section className="space-y-3">
        <div>
          <h3 className="text-sm font-bold text-slate-800">1. Nivel educativo</h3>
          <p className="text-[11px] text-slate-500">
            El lenguaje, la cantidad de tarjetas y lo que se pide cambian según la edad (el manual TaPas pide adaptar la actividad al grupo).
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {TAPAS_NIVEL_KEYS.map((n) => (
            <label key={n} className={`cursor-pointer rounded-xl border-2 p-3 ${nivel === n ? "border-brand-600 bg-brand-50" : "border-slate-200 bg-white"}`}>
              <input type="radio" name="nivel" value={n} checked={nivel === n} onChange={() => pickNivel(n)} className="sr-only" />
              <span className="block text-sm font-bold text-slate-900">{TAPAS_NIVELES[n].label}</span>
              <span className="block text-[11px] text-slate-500">
                {TAPAS_NIVELES[n].cursos} · {TAPAS_NIVELES[n].edades}
              </span>
              <span className="block text-[11px] text-slate-500 mt-1">{archetypesForNivel(n).length} tarjetas</span>
            </label>
          ))}
        </div>
        <p className="text-xs text-slate-600 rounded-lg bg-slate-50 border border-slate-200 p-3">{cfg.description}</p>
      </section>

      <section className="space-y-3">
        <div>
          <h3 className="text-sm font-bold text-slate-800">2. ¿Qué vas a aplicar?</h3>
          <p className="text-[11px] text-slate-500">Las herramientas básicas del Manual de uso (VVOB, 2021).</p>
        </div>
        <input type="hidden" name="tipo" value={tipo} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {(
            [
              ["PROCESO", "🗂️ Proceso TaPas (varias hojas)", "El estudiante entra una vez con el código y hace todas las hojas elegidas, en una o en varias horas de clase."],
              ["UNA", "📄 Una sola hoja", "Solo una herramienta (por ejemplo, solo las tarjetas de arquetipos)."],
            ] as const
          ).map(([v, label, help]) => (
            <label key={v} className={`cursor-pointer rounded-xl border-2 p-3 ${tipo === v ? "border-brand-600 bg-brand-50" : "border-slate-200"}`}>
              <input type="radio" checked={tipo === v} onChange={() => setTipo(v)} className="sr-only" />
              <span className="block text-sm font-bold text-slate-900">{label}</span>
              <span className="block text-[11px] text-slate-600">{help}</span>
            </label>
          ))}
        </div>

        <div className="space-y-2">
          {TAPAS_INSTRUMENT_KEYS.map((i) => {
            const allowed = cfg.instruments.includes(i);
            const checked = tipo === "PROCESO" ? selected.includes(i) && allowed : instrument === i;
            return (
              <label
                key={i}
                className={`flex gap-3 rounded-xl border-2 p-3 ${
                  !allowed ? "opacity-45 cursor-not-allowed border-slate-200" : checked ? "cursor-pointer border-brand-600 bg-brand-50" : "cursor-pointer border-slate-200"
                }`}
              >
                {tipo === "PROCESO" ? (
                  <input
                    type="checkbox"
                    name="instruments"
                    value={i}
                    checked={checked}
                    disabled={!allowed}
                    onChange={(e) => setSelected((s) => (e.target.checked ? [...s, i] : s.filter((x) => x !== i)))}
                    className="mt-1"
                  />
                ) : (
                  <input type="radio" name="instrument" value={i} checked={checked} disabled={!allowed} onChange={() => setInstrument(i)} className="mt-1" />
                )}
                <span className="flex-1">
                  <span className="block text-sm font-bold text-slate-900">
                    {TAPAS_INSTRUMENTS[i].emoji} {TAPAS_INSTRUMENTS[i].label}{" "}
                    <span className="text-[10px] font-normal text-slate-400">(manual {TAPAS_INSTRUMENTS[i].manualPages})</span>
                  </span>
                  <span className="block text-[11px] text-slate-600">{TAPAS_INSTRUMENTS[i].description}</span>
                  {allowed ? (
                    <span className="block text-[11px] text-slate-400 mt-0.5">
                      ≈ {estimateMinutes(i, nivel)} min{i === "EXPERIMENTO" ? " por sesión (dos sesiones, con una semana en medio)" : ""}
                    </span>
                  ) : (
                    <span className="block text-[11px] text-amber-700 mt-0.5">No disponible para {cfg.label}.</span>
                  )}
                </span>
              </label>
            );
          })}
        </div>
      </section>

      {tipo === "PROCESO" && (
        <section className="space-y-3">
          <h3 className="text-sm font-bold text-slate-800">3. ¿En cuántas sesiones?</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {(
              [
                ["UNA", "Todo en una sola sesión", "Todas las hojas quedan abiertas desde el inicio; cada estudiante avanza a su ritmo."],
                ["VARIAS", "En varias horas de clase", "Tú habilitas cada hoja en su hora de clase. El estudiante vuelve con el mismo código y continúa donde se quedó."],
              ] as const
            ).map(([v, label, help]) => (
              <label key={v} className={`cursor-pointer rounded-xl border-2 p-3 ${modo === v ? "border-brand-600 bg-brand-50" : "border-slate-200"}`}>
                <input type="radio" name="modo" value={v} checked={modo === v} onChange={() => setModo(v)} className="sr-only" />
                <span className="block text-sm font-bold text-slate-900">{label}</span>
                <span className="block text-[11px] text-slate-600">{help}</span>
              </label>
            ))}
          </div>
          <div className="flex items-center gap-2 text-sm">
            <label className="text-xs text-slate-600">Duración de tu hora de clase:</label>
            <input
              type="number"
              name="minutos_hora"
              min={20}
              max={120}
              step={5}
              value={minutosHora}
              onChange={(e) => setMinutosHora(Number(e.target.value) || 40)}
              className="input text-sm w-20"
            />
            <span className="text-xs text-slate-500">minutos</span>
          </div>

          {planInstruments.length > 0 && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold text-slate-700">
                Plan sugerido: {schedule.length} {schedule.length === 1 ? "sesión" : "sesiones"} de clase (≈ {total} min en total)
              </p>
              <ol className="mt-2 space-y-1.5">
                {schedule.map((ses) => (
                  <li key={ses.numero} className="text-xs text-slate-700">
                    <strong>Sesión {ses.numero}</strong> (≈ {ses.minutos} min){ses.nota ? ` — ${ses.nota}` : ""}:{" "}
                    {ses.bloques
                      .map((b) => `${TAPAS_INSTRUMENTS[b.instrument].emoji} ${TAPAS_INSTRUMENTS[b.instrument].label.split(":")[0]}${b.parte ? ` (${b.parte})` : ""}`)
                      .join(" + ")}
                  </li>
                ))}
              </ol>
              {modo === "UNA" && schedule.length > 1 && (
                <p className="text-[11px] text-amber-700 mt-2">
                  No alcanza en una hora: con «En varias horas de clase» el grupo avanza en orden. En una sola sesión también funciona, porque cada estudiante retoma donde se quedó.
                </p>
              )}
            </div>
          )}
        </section>
      )}

      <section className="space-y-4">
        <h3 className="text-sm font-bold text-slate-800">{tipo === "PROCESO" ? "4." : "3."} Grupo y fechas</h3>
        <div>
          <label className="label text-xs">Título / referencia</label>
          <input
            name="title"
            placeholder={tipo === "PROCESO" ? `Proceso TaPas — ${cfg.label}` : `${TAPAS_INSTRUMENTS[instrument].label} — ${cfg.label}`}
            className="input text-sm"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="label text-xs">Curso</label>
            <input
              name="course"
              list="tapas-courses"
              className="input text-sm"
              placeholder="Ej. 2º BGU"
              onBlur={(e) => {
                const s = suggestNivelFromCourse(e.target.value);
                setSuggested(s && s !== nivel ? s : null);
              }}
            />
            <datalist id="tapas-courses">{courses.map((c) => <option key={c} value={c} />)}</datalist>
          </div>
          <div>
            <label className="label text-xs">Paralelo</label>
            <input name="parallel" list="tapas-parallels" className="input text-sm" placeholder="Ej. A" />
            <datalist id="tapas-parallels">{parallels.map((p) => <option key={p} value={p} />)}</datalist>
          </div>
          <div>
            <label className="label text-xs">Jornada</label>
            <select name="jornada" defaultValue="" className="select text-sm">
              <option value="">—</option>
              <option value="Matutina">Matutina</option>
              <option value="Vespertina">Vespertina</option>
              <option value="Nocturna">Nocturna</option>
            </select>
          </div>
        </div>
        {suggested && (
          <p className="text-xs rounded-lg bg-amber-50 border border-amber-200 text-amber-900 p-2">
            Por el curso, parece corresponder el nivel <strong>{TAPAS_NIVELES[suggested].label}</strong>.{" "}
            <button type="button" onClick={() => { pickNivel(suggested); setSuggested(null); }} className="underline font-semibold">
              Usar ese nivel
            </button>
          </p>
        )}
        <p className="text-[11px] text-slate-400">
          Si defines curso y paralelo, el estudiante podrá elegir su nombre de la lista. Si los dejas en blanco, escribirá sus datos.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="label text-xs">Disponible desde (opcional)</label>
            <input type="date" name="opens_at" className="input text-sm" />
          </div>
          <div>
            <label className="label text-xs">Disponible hasta (opcional)</label>
            <input type="date" name="closes_at" className="input text-sm" />
          </div>
        </div>
      </section>

      <div className="flex justify-end">
        <button type="submit" disabled={tipo === "PROCESO" && planInstruments.length === 0} className="btn-primary disabled:opacity-40">
          Crear y obtener enlace
        </button>
      </div>
    </form>
  );
}
