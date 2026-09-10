"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ARCHETYPES,
  ARCHETYPE_MAP,
  TAPAS_FAMILIES,
  TAPAS_CHOICES,
  MIN_IDENTIFIED,
  MIN_GROUPS,
  MAX_GROUPS,
  type TapasChoice,
} from "@/lib/tapas/archetypes";
import { saveTapasProgress, finalizeTapasApplication, suggestGroupName } from "../actions";

type Phase = "clasificar" | "ajuste" | "agrupar" | "ordenar" | "cierre";
type Classification = Record<string, TapasChoice>;
interface Group {
  id: string;
  name: string;
  archetypes: string[];
}

function ArchetypeCard({ k, small, img }: { k: string; small?: boolean; img?: string }) {
  const a = ARCHETYPE_MAP[k];
  if (!a) return null;
  const fam = TAPAS_FAMILIES[a.familia];
  return (
    <div
      className={`rounded-xl border-2 bg-white overflow-hidden ${small ? "" : "shadow-sm"}`}
      style={{ borderColor: fam.color }}
    >
      {img ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={img} alt={a.name} className="w-full aspect-[62/88] object-contain bg-white" />
      ) : (
        <div
          className={`flex items-center justify-center ${small ? "text-2xl py-2" : "text-5xl py-6"}`}
          style={{ backgroundColor: `${fam.color}18` }}
        >
          {a.emoji}
        </div>
      )}
      <div className={`px-2.5 ${small ? "py-1.5" : "py-3"}`}>
        <p className={`font-bold text-slate-900 ${small ? "text-[11px] leading-tight" : "text-sm"}`}>{a.name}</p>
        {!small && <p className="text-xs text-slate-500 mt-1 leading-snug">{a.meaning}</p>}
      </div>
    </div>
  );
}

export default function TapasGame({
  code,
  appId,
  studentName,
  initialClassification,
  initialGroups,
  initialReflection,
  initialLetter,
  deck,
}: {
  code: string;
  appId: string;
  studentName: string;
  initialClassification: Classification;
  initialGroups: Group[];
  initialReflection: string;
  initialLetter: string;
  deck: Record<string, string>;
}) {
  const router = useRouter();
  const Card = ({ k, small }: { k: string; small?: boolean }) => (
    <ArchetypeCard k={k} small={small} img={deck[k]} />
  );
  const storeKey = `tapas:${appId}`;
  const [phase, setPhase] = useState<Phase>("clasificar");
  const [cardIndex, setCardIndex] = useState(0);
  const [classification, setClassification] = useState<Classification>(initialClassification || {});
  const [groups, setGroups] = useState<Group[]>(
    initialGroups && initialGroups.length
      ? initialGroups
      : [
          { id: "g1", name: "", archetypes: [] },
          { id: "g2", name: "", archetypes: [] },
          { id: "g3", name: "", archetypes: [] },
        ]
  );
  const [activeGroup, setActiveGroup] = useState<string>("g1");
  const [reflection, setReflection] = useState(initialReflection || "");
  const [letter, setLetter] = useState(initialLetter || "");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const dirty = useRef(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storeKey);
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved.classification && Object.keys(saved.classification).length >= Object.keys(initialClassification || {}).length) {
          setClassification(saved.classification);
        }
        if (Array.isArray(saved.groups) && saved.groups.length) setGroups(saved.groups);
        if (saved.reflection) setReflection(saved.reflection);
        if (saved.letter) setLetter(saved.letter);
      }
    } catch {
      /* noop */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(storeKey, JSON.stringify({ classification, groups, reflection, letter }));
    } catch {
      /* noop */
    }
    dirty.current = true;
  }, [classification, groups, reflection, letter, storeKey]);

  async function persist() {
    if (!dirty.current) return;
    try {
      await saveTapasProgress(code, appId, {
        classification,
        groups: groups.map((g) => ({ name: g.name, archetypes: g.archetypes })),
        reflection,
        future_letter: letter,
      });
      dirty.current = false;
    } catch {
      /* localStorage conserva */
    }
  }

  const identified = useMemo(
    () => ARCHETYPES.filter((a) => classification[a.key] === "SI").map((a) => a.key),
    [classification]
  );
  const dudas = useMemo(
    () => ARCHETYPES.filter((a) => classification[a.key] === "DUDA").map((a) => a.key),
    [classification]
  );
  const answered = Object.keys(classification).length;

  function choose(choice: TapasChoice) {
    const a = ARCHETYPES[cardIndex];
    setClassification((c) => ({ ...c, [a.key]: choice }));
    if (cardIndex < ARCHETYPES.length - 1) setCardIndex((i) => i + 1);
  }

  async function afterClasificar() {
    setError(null);
    if (answered < ARCHETYPES.length) {
      setError("Todavía hay tarjetas sin responder.");
      return;
    }
    await persist();
    if (identified.length < MIN_IDENTIFIED && dudas.length > 0) {
      setPhase("ajuste");
    } else {
      setPhase("agrupar");
    }
    window.scrollTo({ top: 0 });
  }

  async function afterAjuste() {
    setError(null);
    await persist();
    setPhase("agrupar");
    window.scrollTo({ top: 0 });
  }

  function toggleInActiveGroup(k: string) {
    setGroups((gs) =>
      gs.map((g) => {
        if (g.id !== activeGroup) return { ...g, archetypes: g.archetypes.filter((x) => x !== k) };
        const has = g.archetypes.includes(k);
        return { ...g, archetypes: has ? g.archetypes.filter((x) => x !== k) : [...g.archetypes, k] };
      })
    );
  }
  const groupOf = (k: string) => groups.find((g) => g.archetypes.includes(k));

  async function aiName(groupId: string) {
    const g = groups.find((x) => x.id === groupId);
    if (!g || g.archetypes.length === 0) return;
    try {
      const res = await suggestGroupName(code, appId, g.archetypes);
      if (res.name) setGroups((gs) => gs.map((x) => (x.id === groupId ? { ...x, name: res.name! } : x)));
    } catch {
      /* noop */
    }
  }

  async function afterAgrupar() {
    setError(null);
    const filled = groups.filter((g) => g.archetypes.length > 0);
    if (filled.length < MIN_GROUPS) {
      setError(`Arma al menos ${MIN_GROUPS} grupos con tarjetas.`);
      return;
    }
    if (filled.some((g) => !g.name.trim())) {
      setError("Ponle un nombre a cada grupo (empieza con un verbo).");
      return;
    }
    setGroups(filled);
    await persist();
    setPhase("ordenar");
    window.scrollTo({ top: 0 });
  }

  function move(idx: number, dir: -1 | 1) {
    setGroups((gs) => {
      const next = [...gs];
      const j = idx + dir;
      if (j < 0 || j >= next.length) return gs;
      [next[idx], next[j]] = [next[j], next[idx]];
      return next;
    });
  }

  async function submit() {
    setError(null);
    if (!reflection.trim()) {
      setError("Escribe una reflexión antes de enviar.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await finalizeTapasApplication(code, appId, {
        classification,
        groups: groups.map((g) => ({ name: g.name, archetypes: g.archetypes })),
        reflection,
        future_letter: letter,
      });
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

  const phaseNum = { clasificar: 1, ajuste: 2, agrupar: 3, ordenar: 4, cierre: 5 }[phase];
  const progress =
    phase === "clasificar" ? (answered / ARCHETYPES.length) * 20 : (phaseNum - 1) * 20 + (phase === "cierre" ? 15 : 5);

  return (
    <div className="min-h-screen bg-slate-50 py-6 px-4">
      <div className="max-w-lg mx-auto">
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>{studentName}</span>
            <span>
              {phase === "clasificar"
                ? `Tarjeta ${Math.min(cardIndex + 1, ARCHETYPES.length)}/${ARCHETYPES.length}`
                : phase === "ajuste"
                ? "Ajuste"
                : phase === "agrupar"
                ? "Agrupa"
                : phase === "ordenar"
                ? "Ordena"
                : "Cierre"}
            </span>
          </div>
          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-600 transition-all" style={{ width: `${Math.min(100, progress)}%` }} />
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 sm:p-6">
          {/* ---------- CLASIFICAR ---------- */}
          {phase === "clasificar" && (
            <div>
              <p className="text-sm text-slate-600 mb-3">¿Te identificas con esta forma de ser o de hacer las cosas?</p>
              <Card k={ARCHETYPES[cardIndex].key} />
              <div className="grid grid-cols-3 gap-2 mt-4">
                {TAPAS_CHOICES.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => choose(opt.value)}
                    className="rounded-xl border-2 py-3 text-xs font-semibold flex flex-col items-center gap-1"
                    style={{
                      borderColor: classification[ARCHETYPES[cardIndex].key] === opt.value ? opt.color : "#e2e8f0",
                      backgroundColor: classification[ARCHETYPES[cardIndex].key] === opt.value ? `${opt.color}18` : "#fff",
                      color: opt.color,
                    }}
                  >
                    <span className="text-2xl">{opt.emoji}</span>
                    {opt.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center justify-between mt-5">
                <button
                  type="button"
                  onClick={() => setCardIndex((i) => Math.max(0, i - 1))}
                  disabled={cardIndex === 0}
                  className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-600 disabled:opacity-40"
                >
                  Atrás
                </button>
                {cardIndex >= ARCHETYPES.length - 1 && answered >= ARCHETYPES.length ? (
                  <button type="button" onClick={afterClasificar} className="rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white">
                    Continuar
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setCardIndex((i) => Math.min(ARCHETYPES.length - 1, i + 1))}
                    className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-600"
                  >
                    Saltar
                  </button>
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-3">
                Te identificas con {identified.length} tarjetas hasta ahora. Responde rápido y con sinceridad.
              </p>
            </div>
          )}

          {/* ---------- AJUSTE ---------- */}
          {phase === "ajuste" && (
            <div>
              <h2 className="font-bold text-slate-900 mb-1">Un ajuste rápido</h2>
              <p className="text-sm text-slate-600 mb-3">
                Necesitas al menos {MIN_IDENTIFIED} tarjetas con las que te identifiques (llevas {identified.length}).
                De estas que marcaste con dudas, toca las que sí van contigo.
              </p>
              <div className="grid grid-cols-2 gap-2">
                {dudas.map((k) => (
                  <button key={k} type="button" onClick={() => setClassification((c) => ({ ...c, [k]: "SI" }))} className="text-left">
                    <Card k={k} small />
                  </button>
                ))}
              </div>
              <div className="flex justify-end mt-5">
                <button
                  type="button"
                  onClick={afterAjuste}
                  disabled={identified.length < MIN_IDENTIFIED && dudas.length > 0}
                  className="rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
                >
                  Continuar
                </button>
              </div>
            </div>
          )}

          {/* ---------- AGRUPAR ---------- */}
          {phase === "agrupar" && (
            <div>
              <h2 className="font-bold text-slate-900 mb-1">Arma tus grupos de talentos</h2>
              <p className="text-sm text-slate-600 mb-3">
                Junta las tarjetas que se parecen entre sí en {MIN_GROUPS} a {MAX_GROUPS} grupos. Elige un grupo y toca
                las tarjetas para agregarlas o quitarlas. Ponle a cada grupo un nombre que empiece con un verbo.
              </p>

              <div className="space-y-2 mb-4">
                {groups.map((g, gi) => (
                  <div
                    key={g.id}
                    className={`rounded-lg border p-2 ${activeGroup === g.id ? "border-emerald-500 bg-emerald-50/50" : "border-slate-200"}`}
                  >
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setActiveGroup(g.id)}
                        className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center shrink-0"
                      >
                        {gi + 1}
                      </button>
                      <input
                        value={g.name}
                        onChange={(e) => setGroups((gs) => gs.map((x) => (x.id === g.id ? { ...x, name: e.target.value } : x)))}
                        onFocus={() => setActiveGroup(g.id)}
                        placeholder="Ej. Proteger la justicia"
                        className="flex-1 rounded border border-slate-300 px-2 py-1.5 text-sm"
                      />
                      {g.archetypes.length > 0 && (
                        <button type="button" onClick={() => aiName(g.id)} className="text-[11px] text-violet-700 border border-violet-300 bg-violet-50 rounded px-1.5 py-1 shrink-0">
                          ✨ IA
                        </button>
                      )}
                      {groups.length > MIN_GROUPS && (
                        <button
                          type="button"
                          onClick={() => {
                            setGroups((gs) => gs.filter((x) => x.id !== g.id));
                            if (activeGroup === g.id) setActiveGroup(groups[0].id);
                          }}
                          className="text-rose-600 text-xs shrink-0"
                        >
                          quitar
                        </button>
                      )}
                    </div>
                    {g.archetypes.length > 0 && (
                      <p className="text-[11px] text-slate-500 mt-1 pl-8">
                        {g.archetypes.map((k) => ARCHETYPE_MAP[k]?.name).join(" · ")}
                      </p>
                    )}
                  </div>
                ))}
                {groups.length < MAX_GROUPS && (
                  <button
                    type="button"
                    onClick={() => {
                      const id = `g${Date.now()}`;
                      setGroups((gs) => [...gs, { id, name: "", archetypes: [] }]);
                      setActiveGroup(id);
                    }}
                    className="text-xs font-semibold text-emerald-700 border border-emerald-300 rounded px-3 py-1.5"
                  >
                    + Añadir grupo
                  </button>
                )}
              </div>

              <p className="text-xs font-semibold text-slate-500 mb-1.5">
                Toca una tarjeta para ponerla en el grupo {groups.findIndex((g) => g.id === activeGroup) + 1}
              </p>
              <div className="grid grid-cols-3 gap-1.5 max-h-[50vh] overflow-y-auto pr-1">
                {identified.map((k) => {
                  const g = groupOf(k);
                  const inActive = groups.find((x) => x.id === activeGroup)?.archetypes.includes(k);
                  return (
                    <button key={k} type="button" onClick={() => toggleInActiveGroup(k)} className="relative text-left">
                      <div className={inActive ? "ring-2 ring-emerald-500 rounded-xl" : g ? "opacity-50" : ""}>
                        <Card k={k} small />
                      </div>
                      {g && (
                        <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-slate-700 text-white text-[10px] font-bold flex items-center justify-center">
                          {groups.findIndex((x) => x.id === g.id) + 1}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="flex justify-end mt-5">
                <button type="button" onClick={afterAgrupar} className="rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white">
                  Continuar
                </button>
              </div>
            </div>
          )}

          {/* ---------- ORDENAR ---------- */}
          {phase === "ordenar" && (
            <div>
              <h2 className="font-bold text-slate-900 mb-1">Ordena tus grupos</h2>
              <p className="text-sm text-slate-600 mb-3">Del talento que sientes más fuerte (arriba) al menos fuerte (abajo).</p>
              <div className="space-y-2">
                {groups.map((g, gi) => (
                  <div key={g.id} className="flex items-center gap-2 rounded-lg border border-slate-200 p-3">
                    <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center">{gi + 1}</span>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-900">{g.name}</p>
                      <p className="text-[11px] text-slate-500">{g.archetypes.map((k) => ARCHETYPE_MAP[k]?.name).join(" · ")}</p>
                    </div>
                    <div className="flex flex-col">
                      <button type="button" onClick={() => move(gi, -1)} disabled={gi === 0} className="text-slate-500 disabled:opacity-30 px-1">▲</button>
                      <button type="button" onClick={() => move(gi, 1)} disabled={gi === groups.length - 1} className="text-slate-500 disabled:opacity-30 px-1">▼</button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-end mt-5">
                <button type="button" onClick={() => { persist(); setPhase("cierre"); window.scrollTo({ top: 0 }); }} className="rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white">
                  Continuar
                </button>
              </div>
            </div>
          )}

          {/* ---------- CIERRE ---------- */}
          {phase === "cierre" && (
            <div className="space-y-4">
              <h2 className="font-bold text-slate-900">Para cerrar</h2>
              <div>
                <label className="block text-sm font-medium text-slate-800 mb-1">
                  ¿Qué descubriste sobre ti con este juego? ¿Cómo se conecta con lo que quieres estudiar o hacer?
                </label>
                <textarea value={reflection} onChange={(e) => setReflection(e.target.value)} rows={4} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-800 mb-1">Una carta breve a tu yo del futuro (opcional)</label>
                <textarea value={letter} onChange={(e) => setLetter(e.target.value)} rows={4} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base" placeholder="Querido/a yo del futuro..." />
              </div>
              <p className="text-xs text-slate-500">Al enviar, tu perfil de talentos queda disponible para el DECE de tu institución.</p>
            </div>
          )}

          {error && <p className="mt-4 text-sm text-rose-600">{error}</p>}

          {(phase === "ajuste" || phase === "agrupar" || phase === "ordenar" || phase === "cierre") && (
            <div className="mt-4 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setPhase(phase === "cierre" ? "ordenar" : phase === "ordenar" ? "agrupar" : phase === "agrupar" ? (identified.length < MIN_IDENTIFIED ? "ajuste" : "clasificar") : "clasificar");
                  window.scrollTo({ top: 0 });
                }}
                disabled={submitting}
                className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-600 disabled:opacity-40"
              >
                Atrás
              </button>
              {phase === "cierre" && (
                <button type="button" onClick={submit} disabled={submitting} className="rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-40">
                  {submitting ? "Enviando…" : "Enviar"}
                </button>
              )}
            </div>
          )}
        </div>

        <p className="text-center text-[11px] text-slate-400 mt-3">
          Tus respuestas se guardan en este dispositivo. Si cierras, vuelve al mismo enlace para continuar.
        </p>
      </div>
    </div>
  );
}
