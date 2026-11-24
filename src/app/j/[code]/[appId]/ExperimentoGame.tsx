"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ReadAloudButton from "@/components/tapas/ReadAloudButton";
import {
  EXPERIMENTO_OBJETIVOS,
  emptyExperimento,
  sanitizeExperimento,
  validateExperimento,
  type ExperimentoData,
  type ExperimentoObjetivo,
} from "@/lib/tapas/instruments";
import { TAPAS_NIVELES, type TapasNivel } from "@/lib/tapas/niveles";
import { saveTapasData, finalizeTapasInstrument } from "../actions";

type View = "s1a" | "s1b" | "s1c" | "espera" | "s2a" | "s2b" | "s2c";

const today = () => new Date().toISOString().slice(0, 10);

const area = "w-full rounded-lg border border-slate-300 px-3 py-2 text-base";

export default function ExperimentoGame({
  code,
  appId,
  studentName,
  nivel,
  initialData,
  suggestions,
  hubHref,
}: {
  code: string;
  appId: string;
  studentName: string;
  nivel: TapasNivel;
  initialData: ExperimentoData | null;
  /** Talentos que ya salieron de su perfil o de las tarjetas, para ayudar a completar el punto 1. */
  suggestions: string[];
  /** Enlace a «Mis hojas» cuando la hoja es parte de un proceso de varias hojas. */
  hubHref?: string;
}) {
  const router = useRouter();
  const cfg = TAPAS_NIVELES[nivel];
  const basica = nivel === "BASICA";
  const storeKey = `tapas-exp:${appId}`;

  const [data, setData] = useState<ExperimentoData>(() => initialData || emptyExperimento());
  const [view, setView] = useState<View>(() => (initialData?.sesion === 2 ? "espera" : "s1a"));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [diaryNote, setDiaryNote] = useState("");
  const [diaryDate, setDiaryDate] = useState(today());
  const dirty = useRef(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storeKey);
      if (raw) {
        const saved = JSON.parse(raw) as ExperimentoData;
        // lo guardado en el servidor manda si ya cerró la sesión 1
        if (saved && !(initialData?.sesion === 2 && saved.sesion === 1)) setData(sanitizeExperimento(saved));
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

  async function persist(d: ExperimentoData = data) {
    try {
      await saveTapasData(code, appId, d);
      dirty.current = false;
    } catch {
      /* localStorage conserva */
    }
  }

  const set = <K extends keyof ExperimentoData>(k: K, v: ExperimentoData[K]) => setData((d) => ({ ...d, [k]: v }));
  const go = (v: View) => {
    setError(null);
    setView(v);
    window.scrollTo({ top: 0 });
  };

  /** Lista de líneas de texto (puntos 1 y 5). */
  const lines = (key: "p1" | "p5", max: number, placeholder: string) => {
    const list = data[key].length ? data[key] : [""];
    return (
      <div className="space-y-2">
        {list.map((v, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-slate-400 shrink-0">{key === "p5" ? "➜" : `${i + 1}.`}</span>
            <input
              value={v}
              maxLength={200}
              onChange={(e) => set(key, list.map((x, k) => (k === i ? e.target.value : x)))}
              placeholder={placeholder}
              className="flex-1 rounded border border-slate-300 px-2 py-2 text-base"
            />
            {list.length > 1 && (
              <button type="button" onClick={() => set(key, list.filter((_, k) => k !== i))} className="text-rose-600 text-xs shrink-0">
                quitar
              </button>
            )}
          </div>
        ))}
        {list.length < max && (
          <button type="button" onClick={() => set(key, [...list, ""])} className="text-xs font-semibold text-emerald-700 border border-emerald-300 rounded px-3 py-1.5">
            + Añadir
          </button>
        )}
      </div>
    );
  };

  function nextS1a() {
    const clean = sanitizeExperimento(data);
    if (!clean.p2) return setError("Escribe el talento con el que quieres experimentar.");
    go("s1b");
    persist();
  }
  function nextS1b() {
    const clean = sanitizeExperimento(data);
    if (!clean.p3) return setError("Escribe qué quieres descubrir sobre tu talento.");
    if (!(data.pregunta.concisa && data.pregunta.alcanzable && data.pregunta.relevante)) {
      return setError("Revisa tu pregunta: marca las tres condiciones cuando las cumpla.");
    }
    if (!clean.p4) return setError("Describe en qué consiste tu experimento.");
    go("s1c");
    persist();
  }

  async function closeSession1() {
    setError(null);
    const clean = sanitizeExperimento({ ...data, sesion: 1 });
    const errs = validateExperimento(clean, 1, nivel);
    if (errs.length) return setError(errs[0]);
    setBusy(true);
    try {
      const res = await finalizeTapasInstrument(code, appId, clean);
      if (!res.ok) {
        setError(res.error || "No se pudo guardar.");
        setBusy(false);
        return;
      }
      const next = { ...clean, sesion: 2 as const, sesion1At: clean.sesion1At || new Date().toISOString() };
      setData(next);
      await persist(next);
      setBusy(false);
      go("espera");
    } catch {
      setError("No se pudo guardar. Revisa tu conexión.");
      setBusy(false);
    }
  }

  async function submitSession2() {
    setError(null);
    const clean = sanitizeExperimento({ ...data, sesion: 2 });
    const errs = validateExperimento(clean, 2, nivel);
    if (errs.length) return setError(errs[0]);
    setBusy(true);
    try {
      const res = await finalizeTapasInstrument(code, appId, clean);
      if (!res.ok) {
        setError(res.error || "No se pudo enviar.");
        setBusy(false);
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
      setBusy(false);
    }
  }

  const stepNames: Record<View, string> = {
    s1a: "Sesión 1 · Mi talento",
    s1b: "Sesión 1 · Mi pregunta",
    s1c: "Sesión 1 · Cómo lo compruebo",
    espera: "Mi semana de experimento",
    s2a: "Sesión 2 · Resultados",
    s2b: "Sesión 2 · Desafíos y aprendizajes",
    s2c: "Sesión 2 · Mi perfil ahora",
  };
  const order: View[] = ["s1a", "s1b", "s1c", "espera", "s2a", "s2b", "s2c"];
  const progress = ((order.indexOf(view) + 1) / order.length) * 100;

  const nav = (back: View | null, onNext: () => void, nextLabel = "Continuar", disabled = false) => (
    <div className="mt-5 flex items-center justify-between">
      <button
        type="button"
        onClick={() => back && go(back)}
        disabled={!back || busy}
        className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-600 disabled:opacity-40"
      >
        Atrás
      </button>
      <button type="button" onClick={onNext} disabled={busy || disabled} className="rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-40">
        {busy ? "Guardando…" : nextLabel}
      </button>
    </div>
  );

  const Q = (n: number, title: string, hint?: string) => (
    <div className="mb-2">
      <p className="font-semibold text-slate-900">
        <span className="inline-flex w-6 h-6 rounded-full bg-slate-600 text-white text-xs items-center justify-center mr-2">{n}</span>
        {title}
      </p>
      {hint && <p className="text-xs text-slate-500 mt-0.5 ml-8">{hint}</p>}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 py-6 px-4">
      <div className="max-w-xl mx-auto">
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            {hubHref ? <a href={hubHref} className="font-semibold text-emerald-700">← Mis hojas · {studentName}</a> : <span>{studentName}</span>}
            <span>{stepNames[view]}</span>
          </div>
          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-600 transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 sm:p-6 space-y-4">
          {view === "s1a" && (
            <>
              <p className="text-sm text-slate-600 rounded-lg bg-emerald-50 border border-emerald-100 p-3">{cfg.copy.experimentoIntro}</p>
              {cfg.readAloud && <ReadAloudButton text={cfg.copy.experimentoIntro} />}
              {Q(1, "Resumen de mi perfil de talentos", "Estas son las cosas que me gustan y que puedo hacer bien.")}
              {suggestions.length > 0 && (
                <div>
                  <p className="text-[11px] text-slate-500 mb-1">De tus actividades anteriores (toca para añadir):</p>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {suggestions
                      .filter((s) => !data.p1.includes(s))
                      .slice(0, 10)
                      .map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => {
                            const list = data.p1.filter(Boolean);
                            if (list.length < 5) set("p1", [...list, s]);
                          }}
                          className="text-[11px] rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-emerald-800"
                        >
                          + {s}
                        </button>
                      ))}
                  </div>
                </div>
              )}
              {lines("p1", 5, "Algo que me gusta y hago bien")}

              {Q(2, "El talento con el que quiero experimentar es:", "Tiene que ser concreto: que se pueda ver en algo que hago (un comportamiento observable).")}
              <textarea value={data.p2} onChange={(e) => set("p2", e.target.value)} rows={2} maxLength={300} className={area} placeholder="Ej. Cocinar recetas nuevas" />

              <div>
                <p className="text-sm font-semibold text-slate-800 mb-1">¿Para qué quiero hacer el experimento? (puedes marcar uno o varios)</p>
                <div className="space-y-1.5">
                  {(Object.keys(EXPERIMENTO_OBJETIVOS) as ExperimentoObjetivo[]).map((o) => (
                    <label key={o} className="flex items-start gap-2 text-sm text-slate-700 rounded-lg border border-slate-200 p-2">
                      <input
                        type="checkbox"
                        checked={data.objetivos.includes(o)}
                        onChange={(e) => set("objetivos", e.target.checked ? [...data.objetivos, o] : data.objetivos.filter((x) => x !== o))}
                        className="mt-1"
                      />
                      <span>
                        <strong>{EXPERIMENTO_OBJETIVOS[o].label}.</strong>{" "}
                        <span className="text-xs text-slate-500">{EXPERIMENTO_OBJETIVOS[o].help}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              {error && <p className="text-sm text-rose-600">{error}</p>}
              {nav(null, nextS1a)}
            </>
          )}

          {view === "s1b" && (
            <>
              {Q(3, "¿Qué quiero descubrir sobre mi talento y lo que significa para mí?", "Escríbelo como una pregunta.")}
              <textarea value={data.p3} onChange={(e) => set("p3", e.target.value)} rows={3} maxLength={500} className={area} placeholder="Ej. ¿Me gusta cocinar porque soy creativo o porque me gusta seguir recetas?" />
              <div className="rounded-lg border border-slate-200 p-3 space-y-1.5">
                <p className="text-xs font-semibold text-slate-600">Revisa tu pregunta. Debe ser:</p>
                {(
                  [
                    ["concisa", "Concisa", "Frase corta y directa, con lenguaje sencillo que cualquiera entienda."],
                    ["alcanzable", "Alcanzable", "Tiene una respuesta posible y puedo reunir datos para contestarla."],
                    ["relevante", "Relevante", "Es importante para mí: el beneficio para mi vida se nota."],
                  ] as const
                ).map(([k, label, help]) => (
                  <label key={k} className="flex items-start gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={data.pregunta[k]}
                      onChange={(e) => set("pregunta", { ...data.pregunta, [k]: e.target.checked })}
                      className="mt-1"
                    />
                    <span>
                      <strong>{label}:</strong> <span className="text-xs text-slate-500">{help}</span>
                    </span>
                  </label>
                ))}
              </div>
              {Q(4, "Por lo tanto, mi experimento de talento consiste en:", "Describe qué vas a hacer durante la semana. Debe poder verse y evaluarse.")}
              <textarea value={data.p4} onChange={(e) => set("p4", e.target.value)} rows={4} maxLength={1200} className={area} placeholder="Ej. Voy a cocinar una receta nueva cada día y anotar cómo me sentí." />
              {error && <p className="text-sm text-rose-600">{error}</p>}
              {nav("s1a", nextS1b)}
            </>
          )}

          {view === "s1c" && (
            <>
              {Q(5, "¿Cómo puedo yo (y las demás personas) verificar que mi experimento fue exitoso?", `Anota por lo menos ${cfg.experimento.verifyMin} formas.`)}
              {lines("p5", 5, "Ej. Mi familia prueba el plato y me dice qué tal salió")}
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-sm text-slate-700 space-y-1">
                <p><strong>Mi talento:</strong> {data.p2 || "—"}</p>
                <p><strong>Mi pregunta:</strong> {data.p3 || "—"}</p>
                <p><strong>Mi experimento:</strong> {data.p4 || "—"}</p>
              </div>
              <p className="text-xs text-slate-500">
                Al guardar, empieza tu semana de experimento. Vuelve al mismo enlace para anotar lo que pasa y para la sesión 2.
              </p>
              {error && <p className="text-sm text-rose-600">{error}</p>}
              {nav("s1b", closeSession1, "Guardar y empezar mi experimento")}
            </>
          )}

          {view === "espera" && (
            <>
              <h2 className="font-bold text-slate-900">¡Tu experimento está en marcha! 🧪</h2>
              <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-3 text-sm text-slate-700 space-y-1">
                <p><strong>Talento:</strong> {data.p2}</p>
                <p><strong>Pregunta:</strong> {data.p3}</p>
                <p><strong>Cómo lo comprobaré:</strong> {data.p5.filter(Boolean).join(" · ")}</p>
              </div>
              <p className="text-sm text-slate-600">
                Durante la semana, anota aquí cada día lo que hiciste, cómo te sentiste y qué notaste. Eso te servirá para la sesión 2.
              </p>
              <div className="space-y-2">
                {data.diary.map((e, i) => (
                  <div key={i} className="rounded-lg border border-slate-200 p-2 text-sm">
                    <span className="text-[11px] font-semibold text-slate-500">{e.date}</span>
                    <p className="text-slate-800 whitespace-pre-wrap">{e.note}</p>
                  </div>
                ))}
                <div className="rounded-lg border border-dashed border-slate-300 p-2 space-y-2">
                  <input type="date" value={diaryDate} onChange={(e) => setDiaryDate(e.target.value)} className="rounded border border-slate-300 px-2 py-1 text-sm" />
                  <textarea value={diaryNote} onChange={(e) => setDiaryNote(e.target.value)} rows={2} maxLength={600} className={area} placeholder="¿Qué hice hoy? ¿Cómo me sentí? ¿Qué noté?" />
                  <button
                    type="button"
                    disabled={!diaryNote.trim()}
                    onClick={() => {
                      const next = { ...data, diary: [...data.diary, { date: diaryDate, note: diaryNote.trim() }] };
                      setData(next);
                      setDiaryNote("");
                      persist(next);
                    }}
                    className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-800 disabled:opacity-40"
                  >
                    + Guardar anotación
                  </button>
                </div>
              </div>
              <div className="flex justify-end">
                <button type="button" onClick={() => go("s2a")} className="rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white">
                  Ya hice mi experimento → Sesión 2
                </button>
              </div>
            </>
          )}

          {view === "s2a" && (
            <>
              {Q(6, "Resumen de los resultados de mi experimento", "¿Qué me dio energía? ¿Qué me costó más esfuerzo? ¿Qué puedo hacer bien? ¿Qué me resultó sorprendente?")}
              <p className="text-[11px] text-slate-500">
                No hay resultados «correctos» o «incorrectos»; lo importante es ser sincero o sincera contigo. Ten en cuenta tu objetivo, cómo ibas a verificarlo y tus anotaciones de la semana.
              </p>
              {data.diary.length > 0 && (
                <details className="rounded-lg border border-slate-200 p-2 text-sm">
                  <summary className="cursor-pointer text-slate-600">Ver mis anotaciones ({data.diary.length})</summary>
                  <ul className="mt-1 space-y-1">
                    {data.diary.map((e, i) => (
                      <li key={i}><span className="text-[11px] font-semibold text-slate-500">{e.date}:</span> {e.note}</li>
                    ))}
                  </ul>
                </details>
              )}
              <textarea value={data.p6} onChange={(e) => set("p6", e.target.value)} rows={6} maxLength={1800} className={area} />
              {error && <p className="text-sm text-rose-600">{error}</p>}
              {nav("espera", () => (data.p6.trim() ? go("s2b") : setError("Cuenta cómo te fue en el experimento.")))}
            </>
          )}

          {view === "s2b" && (
            <>
              {Q(7, "Desafíos: lo que puedo hacer bien pero aún necesito practicar", "Para cada desafío, anota una acción concreta con la que puedes mejorar.")}
              <div className="space-y-2">
                {(data.p7.length ? data.p7 : [{ reto: "", mejora: "" }]).map((r, i, arr) => (
                  <div key={i} className="grid grid-cols-[1fr_auto_1fr] items-center gap-1.5">
                    <input value={r.reto} maxLength={250} onChange={(e) => set("p7", arr.map((x, k) => (k === i ? { ...x, reto: e.target.value } : x)))} placeholder="Desafío" className="rounded border border-slate-300 px-2 py-2 text-base" />
                    <span className="text-slate-400">➜</span>
                    <input value={r.mejora} maxLength={250} onChange={(e) => set("p7", arr.map((x, k) => (k === i ? { ...x, mejora: e.target.value } : x)))} placeholder="¿Cómo puedo mejorar?" className="rounded border border-slate-300 px-2 py-2 text-base" />
                  </div>
                ))}
                {(data.p7.length ? data.p7 : [{}]).length < 5 && (
                  <button type="button" onClick={() => set("p7", [...(data.p7.length ? data.p7 : [{ reto: "", mejora: "" }]), { reto: "", mejora: "" }])} className="text-xs font-semibold text-emerald-700 border border-emerald-300 rounded px-3 py-1.5">
                    + Añadir desafío
                  </button>
                )}
              </div>
              {Q(8, "Lo más importante que he aprendido es:")}
              <textarea value={data.p8} onChange={(e) => set("p8", e.target.value)} rows={3} maxLength={1200} className={area} />
              {Q(9, "La próxima vez, necesito esto de parte de las demás personas:")}
              <textarea value={data.p9} onChange={(e) => set("p9", e.target.value)} rows={3} maxLength={1200} className={area} />
              {error && <p className="text-sm text-rose-600">{error}</p>}
              {nav("s2a", () => {
                const clean = sanitizeExperimento({ ...data, sesion: 2 });
                if (!clean.p7.some((r) => r.reto)) return setError("Anota al menos un desafío.");
                if (!clean.p8) return setError("Escribe lo más importante que aprendiste.");
                go("s2c");
                persist();
              })}
            </>
          )}

          {view === "s2c" && (
            <>
              {Q(10, "Así es como se ve mi perfil de talentos ahora:", basica ? "Cuenta qué cosas haces bien y te gustan después del experimento." : "Vuelve a escribir tu perfil a partir de lo que viviste en el experimento.")}
              <textarea value={data.p10} onChange={(e) => set("p10", e.target.value)} rows={6} maxLength={1800} className={area} />
              <p className="text-xs text-slate-500">Al enviar, tu experimento queda disponible para el DECE de tu institución.</p>
              {error && <p className="text-sm text-rose-600">{error}</p>}
              {nav("s2b", submitSession2, "Enviar")}
            </>
          )}
        </div>
        <p className="text-center text-[11px] text-slate-400 mt-3">
          Tus respuestas se guardan. Si cierras, vuelve al mismo enlace para continuar.
        </p>
      </div>
    </div>
  );
}
