"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import QuadrantPicker from "@/components/tapas/QuadrantPicker";
import QuadrantChart, { itemLabel } from "@/components/tapas/QuadrantChart";
import ReadAloudButton from "@/components/tapas/ReadAloudButton";
import {
  QUADRANTS,
  QUADRANT_ORDER,
  sanitizePerfilData,
  scorePerfil,
  validatePerfil,
  type PerfilData,
  type ProfileItem,
  type ProfileSet,
} from "@/lib/tapas/instruments";
import { INICIAL_PICTOGRAMS, TAPAS_NIVELES, type TapasNivel } from "@/lib/tapas/niveles";
import { saveTapasData, finalizeTapasInstrument } from "../actions";

const STUDY_SUBJECTS = [
  "Lengua y Literatura", "Matemática", "Ciencias Naturales", "Estudios Sociales", "Inglés", "Educación Física",
  "Educación Cultural y Artística", "Emprendimiento y Gestión", "Física", "Química", "Biología", "Historia",
  "Filosofía", "Informática",
];
const FREE_ACTIVITIES = [
  "Practicar un deporte", "Escuchar o tocar música", "Dibujar o pintar", "Leer", "Videojuegos", "Cocinar",
  "Ayudar en casa", "Salir con amigos", "Ver series o películas", "Cuidar animales", "Bailar", "Escribir",
  "Programar o armar cosas", "Voluntariado",
];

let counter = 0;
const newId = () => `i${Date.now().toString(36)}${(counter++).toString(36)}`;
const blank = (): ProfileItem => ({ id: newId(), text: "", x: null, y: null });

function emptyData(version: 1 | 2, min: number): PerfilData {
  const many = (n: number) => Array.from({ length: n }, blank);
  return version === 1
    ? { version: 1, own: many(min), other: [], closing: "" }
    : { version: 2, studies: many(min), free: many(min), relation: "", closing: "" };
}

function getSet(d: PerfilData, set: ProfileSet): ProfileItem[] {
  if (d.version === 1) return set === "own" ? d.own : set === "other" ? d.other : [];
  return set === "studies" ? d.studies : set === "free" ? d.free : [];
}
function withSet(d: PerfilData, set: ProfileSet, items: ProfileItem[]): PerfilData {
  if (d.version === 1) return set === "own" ? { ...d, own: items } : { ...d, other: items };
  return set === "studies" ? { ...d, studies: items } : { ...d, free: items };
}

type Step = { id: string; set?: ProfileSet; title: string };

function stepsFor(version: 1 | 2, nivel: TapasNivel): Step[] {
  if (version === 1) {
    return [
      { id: "own", set: "own", title: "Desde mi perspectiva" },
      { id: "other", set: "other", title: "Desde la perspectiva de otra persona" },
      { id: "cierre", title: nivel === "INICIAL" ? "Para terminar" : "Lo que descubrí" },
    ];
  }
  return [
    { id: "studies", set: "studies", title: "Estudios" },
    { id: "free", set: "free", title: "Tiempo libre" },
    { id: "cierre", title: "Lo que descubrí" },
  ];
}

export default function PerfilGame({
  code,
  appId,
  studentName,
  version,
  nivel,
  initialData,
  hubHref,
}: {
  code: string;
  appId: string;
  studentName: string;
  version: 1 | 2;
  nivel: TapasNivel;
  initialData: PerfilData | null;
  /** Enlace a «Mis hojas» cuando la hoja es parte de un proceso de varias hojas. */
  hubHref?: string;
}) {
  const router = useRouter();
  const cfg = TAPAS_NIVELES[nivel];
  const inicial = nivel === "INICIAL";
  const storeKey = `tapas-perfil:${appId}`;
  const steps = useMemo(() => stepsFor(version, nivel), [version, nivel]);

  const [data, setData] = useState<PerfilData>(() => {
    if (initialData && initialData.version === version) {
      const d = initialData;
      // asegura al menos las casillas mínimas en el conjunto principal
      if (d.version === 1 && d.own.length === 0) return { ...d, own: Array.from({ length: cfg.profile.min }, blank) };
      if (d.version === 2) {
        return {
          ...d,
          studies: d.studies.length ? d.studies : Array.from({ length: cfg.profile.min }, blank),
          free: d.free.length ? d.free : Array.from({ length: cfg.profile.min }, blank),
        };
      }
      return d;
    }
    return emptyData(version, cfg.profile.min);
  });
  const [stepIdx, setStepIdx] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const dirty = useRef(false);
  const step = steps[stepIdx];

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storeKey);
      if (raw) {
        const saved = JSON.parse(raw) as PerfilData;
        if (saved && saved.version === version) setData(saved);
      }
    } catch {
      /* noop */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(storeKey, JSON.stringify(data));
    } catch {
      /* noop */
    }
    dirty.current = true;
  }, [data, storeKey]);

  async function persist() {
    if (!dirty.current) return;
    try {
      await saveTapasData(code, appId, data);
      dirty.current = false;
    } catch {
      /* localStorage conserva */
    }
  }

  const clean = useMemo(() => sanitizePerfilData(data, version), [data, version]);
  const result = useMemo(() => scorePerfil(clean), [clean]);

  function setItems(set: ProfileSet, items: ProfileItem[]) {
    setData((d) => withSet(d, set, items));
  }

  /** Cambios del plano sobre los ítems con texto; se funden con las casillas vacías. */
  function onPlace(set: ProfileSet, placed: ProfileItem[]) {
    setData((d) => {
      const byId = new Map(placed.map((p) => [p.id, p]));
      return withSet(d, set, getSet(d, set).map((it) => byId.get(it.id) || it));
    });
  }

  function stepError(): string | null {
    if (!step.set) return null;
    const items = getSet(clean, step.set);
    const required = step.set === "other" ? 0 : cfg.profile.min;
    if (items.length < required) return `Escribe al menos ${required}.`;
    if (items.some((i) => i.x === null || i.y === null)) return "Ubica todas en el plano (toca una y luego el plano).";
    return null;
  }

  async function next() {
    const e = stepError();
    if (e) {
      setError(e);
      return;
    }
    setError(null);
    await persist();
    setStepIdx((i) => Math.min(steps.length - 1, i + 1));
    window.scrollTo({ top: 0 });
  }

  async function submit() {
    setError(null);
    const errs = validatePerfil(clean, nivel);
    if (errs.length) {
      setError(errs[0]);
      return;
    }
    if (cfg.requireReflection && !clean.closing.trim()) {
      setError("Escribe qué descubriste antes de enviar.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await finalizeTapasInstrument(code, appId, clean, { reflection: clean.closing });
      if (!res.ok) {
        setError(res.error || "No se pudo enviar.");
        setSubmitting(false);
        return;
      }
      try {
        localStorage.removeItem(storeKey);
      } catch {
        /* noop */
      }
      router.push(`/j/${code}/${appId}/gracias`);
    } catch {
      setError("No se pudo enviar. Revisa tu conexión.");
      setSubmitting(false);
    }
  }

  // ------------------------------------------------------------------ pasos de escritura + plano
  function SetStep({ set }: { set: ProfileSet }) {
    const items = getSet(data, set);
    const filled = items.filter((i) => i.text.trim());
    const isStudies = set === "studies";
    const optional = set === "other";
    const suggestions = set === "studies" ? STUDY_SUBJECTS : set === "free" ? FREE_ACTIVITIES : [];
    const minReq = optional ? 0 : cfg.profile.min;
    const max = version === 2 ? 12 : cfg.profile.max;

    const help: Record<ProfileSet, string> = {
      own: inicial
        ? "Toca los dibujos de lo que haces bien."
        : `Escribe de ${cfg.profile.min} a ${cfg.profile.max} cosas que haces bien o en las que te destacas, en el colegio o fuera de él: tu familia, tus amigos, tus pasatiempos, tus destrezas, tu forma de ser.`,
      other: inicial
        ? "Pregúntale a un adulto o a un amigo: ¿qué ves que hago bien? Toca los dibujos que te digan."
        : "Pídele a un compañero o compañera que te conozca bien que te diga de 3 a 5 cosas que ve que haces bien, distintas a las tuyas, y escríbelas aquí. Si ahora no puedes, puedes saltar este paso.",
      studies:
        "Escribe las asignaturas que recibes este año (puedes tocar las sugeridas). Luego ubícalas: arriba tus buenos resultados, a la derecha las que más te gustan.",
      free: "Escribe un resumen de tus actividades de tiempo libre, las que haces con otras personas y las que haces solo o sola. Luego ubícalas en el plano.",
      // (no se usa)
    } as Record<ProfileSet, string>;

    function togglePictogram(p: { key: string; emoji: string; label: string }) {
      const exists = items.find((i) => i.id === `p-${p.key}`);
      if (exists) setItems(set, items.filter((i) => i.id !== `p-${p.key}`));
      else if (items.filter((i) => i.text).length < cfg.profile.max)
        setItems(set, [...items.filter((i) => i.text), { id: `p-${p.key}`, text: p.label, emoji: p.emoji, x: null, y: null }]);
    }

    return (
      <div className="space-y-4">
        <div>
          <h2 className="font-bold text-slate-900">{PROFILE_TITLES[set]}</h2>
          <p className="text-sm text-slate-600 mt-1">{help[set]}</p>
          {cfg.readAloud && <ReadAloudButton text={`${PROFILE_TITLES[set]}. ${help[set]}`} className="mt-2" />}
        </div>

        {inicial ? (
          <div className="grid grid-cols-3 gap-2">
            {INICIAL_PICTOGRAMS.map((p) => {
              const on = items.some((i) => i.id === `p-${p.key}`);
              return (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => togglePictogram(p)}
                  className={`rounded-2xl border-2 p-2 text-center ${on ? "border-emerald-500 bg-emerald-50" : "border-slate-200 bg-white"}`}
                >
                  <span className="block text-4xl">{p.emoji}</span>
                  <span className="block text-[11px] leading-tight text-slate-700 mt-1">{p.label}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((it, i) => (
              <div key={it.id} className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-slate-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
                  {itemLabel(set, i)}
                </span>
                <input
                  value={it.text}
                  maxLength={120}
                  onChange={(e) => setItems(set, items.map((x) => (x.id === it.id ? { ...x, text: e.target.value } : x)))}
                  placeholder={isStudies ? "Ej. Matemática" : set === "free" ? "Ej. Tocar la guitarra" : "Ej. Explicar cosas a mis compañeros"}
                  className="flex-1 rounded border border-slate-300 px-2 py-2 text-base"
                />
                {items.length > Math.max(minReq, 1) && (
                  <button type="button" onClick={() => setItems(set, items.filter((x) => x.id !== it.id))} className="text-rose-600 text-xs shrink-0">
                    quitar
                  </button>
                )}
              </div>
            ))}
            {items.length < max && (
              <button type="button" onClick={() => setItems(set, [...items, blank()])} className="text-xs font-semibold text-emerald-700 border border-emerald-300 rounded px-3 py-1.5">
                + Añadir
              </button>
            )}
            {suggestions.length > 0 && (
              <div className="pt-1">
                <p className="text-[11px] text-slate-500 mb-1">Sugerencias (toca para añadir):</p>
                <div className="flex flex-wrap gap-1.5">
                  {suggestions
                    .filter((s) => !items.some((i) => i.text.trim().toLowerCase() === s.toLowerCase()))
                    .map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => {
                          const emptyIdx = items.findIndex((i) => !i.text.trim());
                          if (emptyIdx >= 0) setItems(set, items.map((x, k) => (k === emptyIdx ? { ...x, text: s } : x)));
                          else if (items.length < max) setItems(set, [...items, { ...blank(), text: s }]);
                        }}
                        className="text-[11px] rounded-full border border-slate-300 bg-white px-2 py-0.5 text-slate-600"
                      >
                        {s}
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}

        {filled.length > 0 && (
          <div className="border-t border-slate-100 pt-3">
            <p className="text-sm font-semibold text-slate-800 mb-2">
              {inicial ? "¿Cómo es para ti? Toca un dibujo y elige la carita." : "Ubícalas en el plano"}
            </p>
            <QuadrantPicker
              set={set}
              items={filled}
              onChange={(placed) => onPlace(set, placed)}
              studies={isStudies}
              simple={inicial}
              yTop={isStudies ? "Tengo buenos resultados" : "Lo hago bien"}
              yBottom={isStudies ? "Tengo malos resultados" : "Lo hago mal"}
            />
          </div>
        )}
      </div>
    );
  }

  // ------------------------------------------------------------------ cierre
  function Cierre() {
    const sets = version === 1 ? (["own", "other"] as ProfileSet[]) : (["studies", "free"] as ProfileSet[]);
    return (
      <div className="space-y-4">
        <h2 className="font-bold text-slate-900">{inicial ? "Para terminar" : "Lo que descubrí"}</h2>
        {!inicial && (
          <>
            <p className="text-sm text-slate-600">Así quedó tu perfil. Mira los cuatro cuadrantes:</p>
            <div className="grid gap-3">
              {sets.map((set) => {
                const items = result.sets[set] || [];
                if (!items.length) return null;
                return (
                  <div key={set} className="rounded-lg border border-slate-200 p-3">
                    <p className="text-xs font-semibold text-slate-600 mb-1">{PROFILE_TITLES[set]}</p>
                    <QuadrantChart
                      dots={items.map((it, i) => ({ id: it.id, label: itemLabel(set, i), x: it.x, y: it.y, title: it.text }))}
                      yTop={set === "studies" ? "Tengo buenos resultados" : "Lo hago bien"}
                      yBottom={set === "studies" ? "Tengo malos resultados" : "Lo hago mal"}
                      className="max-w-xs mx-auto"
                    />
                  </div>
                );
              })}
            </div>
            <ul className="space-y-1.5 text-sm">
              {QUADRANT_ORDER.map((q) => {
                const names = sets.flatMap((s) => (result.sets[s] || []).filter((i) => i.quadrant === q).map((i) => i.text));
                if (!names.length) return null;
                return (
                  <li key={q} className="rounded-lg border-l-4 bg-slate-50 px-3 py-2" style={{ borderColor: QUADRANTS[q].color }}>
                    <strong style={{ color: QUADRANTS[q].color }}>{QUADRANTS[q].signs} {QUADRANTS[q].label}:</strong>{" "}
                    <span className="text-slate-700">{names.join(", ")}</span>
                    <span className="block text-[11px] text-slate-500">{QUADRANTS[q].meaning}</span>
                  </li>
                );
              })}
            </ul>
            <p className="text-sm text-slate-700">
              {version === 1
                ? "Pregúntate: ¿qué talentos aparecen en los dos planos, el que hiciste tú y el que hizo otra persona? ¿Cuáles te dan energía?"
                : "Pregúntate: ¿percibes una relación entre las asignaturas que disfrutas, tus rasgos de personalidad y lo que haces en tu tiempo libre? ¿Cómo podrías desarrollar aquello en lo que eres bueno o buena pero disfrutas menos?"}
            </p>
          </>
        )}

        {version === 2 && !inicial && (
          <div>
            <label className="block text-sm font-medium text-slate-800 mb-1">
              ¿Qué relación ves entre lo que disfrutas en tus estudios y en tu tiempo libre?
            </label>
            <textarea
              value={data.version === 2 ? data.relation : ""}
              onChange={(e) => setData((d) => (d.version === 2 ? { ...d, relation: e.target.value } : d))}
              rows={3}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base"
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-800 mb-1">
            {inicial
              ? "¿Cómo te sentiste? Toca una carita."
              : nivel === "BASICA"
              ? "Cuenta qué descubriste sobre ti y quién puede ayudarte a mejorar."
              : "Presenta brevemente lo que descubriste sobre ti y cómo te pueden apoyar en la construcción de tu Proyecto de Vida."}
          </label>
          {inicial ? (
            <div className="flex justify-center gap-3">
              {[
                { e: "😊", t: "Me sentí feliz" },
                { e: "😐", t: "Me sentí normal" },
                { e: "😟", t: "No me gustó" },
              ].map((o) => (
                <button
                  key={o.e}
                  type="button"
                  onClick={() => setData((d) => ({ ...d, closing: `${o.e} ${o.t}` }))}
                  className={`text-5xl rounded-2xl border-2 p-3 ${data.closing.startsWith(o.e) ? "border-emerald-500 bg-emerald-50" : "border-slate-200"}`}
                  aria-label={o.t}
                >
                  {o.e}
                </button>
              ))}
            </div>
          ) : (
            <textarea
              value={data.closing}
              onChange={(e) => setData((d) => ({ ...d, closing: e.target.value }))}
              rows={4}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base"
            />
          )}
        </div>
        <p className="text-xs text-slate-500">Al enviar, tu perfil queda disponible para el DECE de tu institución.</p>
      </div>
    );
  }

  const progress = ((stepIdx + 1) / steps.length) * 100;
  const last = stepIdx === steps.length - 1;

  return (
    <div className="min-h-screen bg-slate-50 py-6 px-4">
      <div className="max-w-xl mx-auto">
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            {hubHref ? <a href={hubHref} className="font-semibold text-emerald-700">← Mis hojas · {studentName}</a> : <span>{studentName}</span>}
            <span>
              Paso {stepIdx + 1} de {steps.length}
            </span>
          </div>
          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-600 transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 sm:p-6">
          {stepIdx === 0 && <p className="text-sm text-slate-600 mb-4 rounded-lg bg-emerald-50 border border-emerald-100 p-3">{cfg.copy.perfilIntro}</p>}
          {/* Se llaman como funciones (no como <Componente/>) para que los campos no pierdan el foco al escribir */}
          {step.set ? SetStep({ set: step.set }) : Cierre()}
          {error && <p className="mt-4 text-sm text-rose-600">{error}</p>}
          <div className="mt-5 flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                setError(null);
                setStepIdx((i) => Math.max(0, i - 1));
                window.scrollTo({ top: 0 });
              }}
              disabled={stepIdx === 0 || submitting}
              className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-600 disabled:opacity-40"
            >
              Atrás
            </button>
            {last ? (
              <button type="button" onClick={submit} disabled={submitting} className="rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-40">
                {submitting ? "Enviando…" : "Enviar"}
              </button>
            ) : (
              <button type="button" onClick={next} className="rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white">
                {step.set === "other" && getSet(data, "other").every((i) => !i.text.trim()) ? "Saltar este paso" : "Continuar"}
              </button>
            )}
          </div>
        </div>
        <p className="text-center text-[11px] text-slate-400 mt-3">
          Tus respuestas se guardan en este dispositivo. Si cierras, vuelve al mismo enlace para continuar.
        </p>
      </div>
    </div>
  );
}

const PROFILE_TITLES: Record<ProfileSet, string> = {
  own: "Desde mi perspectiva",
  other: "Desde la perspectiva de otra persona",
  studies: "Mis estudios",
  free: "Mi tiempo libre",
};
