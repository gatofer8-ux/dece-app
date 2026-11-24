"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ARCHETYPE_MAP,
  TAPAS_FAMILIES,
  TAPAS_CHOICES,
  type TapasChoice,
} from "@/lib/tapas/archetypes";
import {
  TAPAS_NIVELES,
  INICIAL_MEANINGS,
  archetypesForNivel,
  fillCopy,
  type TapasNivel,
} from "@/lib/tapas/niveles";
import { BUILTIN_CATEGORY_CARDS } from "@/lib/tapas/builtinDeck";
import ReadAloudButton from "@/components/tapas/ReadAloudButton";
import { saveTapasProgress, finalizeTapasApplication, suggestGroupName } from "../actions";

type Phase = "conocer" | "clasificar" | "ajuste" | "agrupar" | "ordenar" | "favoritas" | "cierre";
type Classification = Record<string, TapasChoice>;
interface Group {
  id: string;
  name: string;
  archetypes: string[];
}

/**
 * ¿Ya respondió esta tarjeta? No basta con `classification[key]`: hay una tarjeta «constructor»
 * y `{}.constructor` existe en todo objeto de JavaScript, así que contaría como respondida.
 */
function isAnswered(classification: Record<string, TapasChoice>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(classification, key);
}

function meaningOf(key: string, nivel: TapasNivel): string {
  const a = ARCHETYPE_MAP[key];
  if (!a) return "";
  return nivel === "INICIAL" ? INICIAL_MEANINGS[key] || a.meaning : a.meaning;
}

function ArchetypeCard({
  k,
  nivel,
  small,
  img,
  hideMeaning,
}: {
  k: string;
  nivel: TapasNivel;
  small?: boolean;
  img?: string;
  hideMeaning?: boolean;
}) {
  const a = ARCHETYPE_MAP[k];
  if (!a) return null;
  const fam = TAPAS_FAMILIES[a.familia];
  return (
    <div className={`rounded-xl border-2 bg-white overflow-hidden ${small ? "" : "shadow-sm"}`} style={{ borderColor: fam.color }}>
      {img ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={img} alt={a.name} className={`w-full aspect-[62/88] object-contain bg-white ${small ? "" : "max-h-[46vh] mx-auto"}`} draggable={false} />
      ) : (
        <div
          className={`flex items-center justify-center ${small ? "text-2xl py-2" : "text-5xl py-6"}`}
          style={{ backgroundColor: `${fam.color}18` }}
        >
          {a.emoji}
        </div>
      )}
      {(small || !img) && (
        <div className={`px-2.5 ${small ? "py-1.5" : "py-3"}`}>
          <p className={`font-bold text-slate-900 ${small ? "text-[11px] leading-tight" : "text-sm"}`}>{a.name}</p>
          {!small && !hideMeaning && <p className="text-xs text-slate-500 mt-1 leading-snug">{meaningOf(k, nivel)}</p>}
        </div>
      )}
    </div>
  );
}

export default function TapasGame({
  code,
  appId,
  studentName,
  nivel,
  initialClassification,
  initialGroups,
  initialReflection,
  initialLetter,
  deck,
  hubHref,
}: {
  code: string;
  appId: string;
  studentName: string;
  nivel: TapasNivel;
  initialClassification: Classification;
  initialGroups: Group[];
  initialReflection: string;
  initialLetter: string;
  deck: Record<string, string>;
  /** Enlace a «Mis hojas» cuando la hoja es parte de un proceso de varias hojas. */
  hubHref?: string;
}) {
  const router = useRouter();
  const cfg = TAPAS_NIVELES[nivel];
  const cards = useMemo(() => archetypesForNivel(nivel), [nivel]);
  const cardKeys = useMemo(() => new Set(cards.map((c) => c.key)), [cards]);
  const favoritasFlow = cfg.arquetiposFlow === "FAVORITAS";
  const inicial = nivel === "INICIAL";
  const vars = { n: cards.length, min: cfg.minGroups, max: cfg.maxGroups, minId: cfg.minIdentified };

  const renderCard = (k: string, small?: boolean, hideMeaning?: boolean) => (
    <ArchetypeCard k={k} nivel={nivel} small={small} img={deck[k]} hideMeaning={hideMeaning} />
  );

  const storeKey = `tapas:${appId}`;
  // Retomar donde se quedó (el juego puede repartirse en varias horas de clase)
  const [phase, setPhase] = useState<Phase>(() => {
    const cls = initialClassification || {};
    const answeredInit = cards.filter((a) => isAnswered(cls, a.key)).length;
    if (cards.length > 0 && answeredInit >= cards.length) {
      if (favoritasFlow) return "favoritas";
      const si = cards.filter((a) => cls[a.key] === "SI").length;
      const duda = cards.filter((a) => cls[a.key] === "DUDA").length;
      if (si < cfg.minIdentified && duda > 0) return "ajuste";
      return "agrupar";
    }
    if (answeredInit > 0) return "clasificar";
    return inicial ? "clasificar" : "conocer";
  });
  const [cardIndex, setCardIndex] = useState(() => {
    const first = cards.findIndex((a) => !isAnswered(initialClassification || {}, a.key));
    return first >= 0 ? first : 0;
  });
  const [classification, setClassification] = useState<Classification>(initialClassification || {});
  const [groups, setGroups] = useState<Group[]>(
    initialGroups && initialGroups.length
      ? initialGroups
      : Array.from({ length: Math.max(cfg.minGroups, 1) }, (_, i) => ({ id: `g${i + 1}`, name: "", archetypes: [] }))
  );
  const [favorites, setFavorites] = useState<string[]>(() =>
    favoritasFlow ? (initialGroups || []).map((g) => g.archetypes[0]).filter(Boolean) : []
  );
  const [activeGroup, setActiveGroup] = useState<string>("g1");
  const [reflection, setReflection] = useState(initialReflection || "");
  const [letter, setLetter] = useState(initialLetter || "");
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [dragOver, setDragOver] = useState<TapasChoice | null>(null);
  const dirty = useRef(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storeKey);
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved.classification && Object.keys(saved.classification).length >= Object.keys(initialClassification || {}).length) {
          setClassification(saved.classification);
          const first = cards.findIndex((a) => !isAnswered(saved.classification, a.key));
          if (first > 0) {
            setCardIndex(first);
            setPhase((ph) => (ph === "conocer" ? "clasificar" : ph));
          }
        }
        if (Array.isArray(saved.groups) && saved.groups.length) setGroups(saved.groups);
        if (Array.isArray(saved.favorites)) setFavorites(saved.favorites);
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
      localStorage.setItem(storeKey, JSON.stringify({ classification, groups, favorites, reflection, letter }));
    } catch {
      /* noop */
    }
    dirty.current = true;
  }, [classification, groups, favorites, reflection, letter, storeKey]);

  /** Grupos tal como se guardan: en Inicial, cada favorita es un grupo de una tarjeta, en el orden elegido. */
  function groupsForSave(): { name: string; archetypes: string[] }[] {
    if (favoritasFlow) return favorites.map((k) => ({ name: ARCHETYPE_MAP[k]?.name || k, archetypes: [k] }));
    return groups.map((g) => ({ name: g.name, archetypes: g.archetypes }));
  }

  async function persist() {
    if (!dirty.current) return;
    try {
      await saveTapasProgress(code, appId, {
        classification,
        groups: groupsForSave(),
        reflection,
        future_letter: letter,
      });
      dirty.current = false;
    } catch {
      /* localStorage conserva */
    }
  }

  useEffect(() => {
    if (phase !== "clasificar" || Object.keys(classification).length === 0) return;
    const timer = setTimeout(() => {
      persist();
    }, 1500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classification, phase]);

  const identified = useMemo(
    () => cards.filter((a) => classification[a.key] === "SI").map((a) => a.key),
    [classification, cards]
  );
  const dudas = useMemo(() => cards.filter((a) => classification[a.key] === "DUDA").map((a) => a.key), [classification, cards]);
  const answered = cards.filter((a) => isAnswered(classification, a.key)).length;
  const choices = cfg.twoChoices ? TAPAS_CHOICES.filter((c) => c.value !== "DUDA") : TAPAS_CHOICES;
  const current = cards[Math.min(cardIndex, cards.length - 1)];

  function choose(choice: TapasChoice) {
    setClassification((c) => ({ ...c, [current.key]: choice }));
    if (cardIndex < cards.length - 1) setCardIndex((i) => i + 1);
  }

  async function afterClasificar() {
    setError(null);
    if (answered < cards.length) {
      setError("Todavía hay tarjetas sin responder.");
      return;
    }
    if (identified.length < cfg.minIdentified && dudas.length === 0) {
      setError(
        favoritasFlow
          ? `Elige «${cfg.copy.choiceLabels.SI}» en al menos ${cfg.minIdentified} tarjetas. Puedes volver atrás y cambiar algunas.`
          : `Necesitas al menos ${cfg.minIdentified} tarjetas con las que te identifiques. Vuelve atrás y revisa tus respuestas.`
      );
      return;
    }
    await persist();
    if (favoritasFlow) setPhase("favoritas");
    else if (identified.length < cfg.minIdentified && dudas.length > 0) setPhase("ajuste");
    else setPhase("agrupar");
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
    if (filled.length < cfg.minGroups) {
      setError(`Arma al menos ${cfg.minGroups} grupos con tarjetas.`);
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
    if (cfg.requireReflection && !reflection.trim()) {
      setError("Escribe una reflexión antes de enviar.");
      return;
    }
    if (inicial && !reflection.trim()) {
      setError("Toca una carita para contarnos cómo te sentiste.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await finalizeTapasApplication(code, appId, {
        classification,
        groups: groupsForSave(),
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

  const phaseList: Phase[] = favoritasFlow
    ? ["clasificar", "favoritas", "cierre"]
    : ["conocer", "clasificar", "ajuste", "agrupar", "ordenar", "cierre"];
  const phaseNum = Math.max(0, phaseList.indexOf(phase));
  const step = 100 / phaseList.length;
  const progress =
    phase === "clasificar"
      ? (phaseNum + answered / cards.length) * step
      : (phaseNum + 0.5) * step;

  const phaseLabel: Record<Phase, string> = {
    conocer: "Conoce las tarjetas",
    clasificar: `Tarjeta ${Math.min(cardIndex + 1, cards.length)}/${cards.length}`,
    ajuste: "Ajuste",
    agrupar: "Agrupa",
    ordenar: "Ordena",
    favoritas: "Tus favoritas",
    cierre: "Cierre",
  };

  function goBack() {
    setError(null);
    const prev: Record<Phase, Phase> = {
      conocer: "conocer",
      clasificar: inicial ? "clasificar" : "conocer",
      ajuste: "clasificar",
      agrupar: identified.length < cfg.minIdentified ? "ajuste" : "clasificar",
      ordenar: "agrupar",
      favoritas: "clasificar",
      cierre: favoritasFlow ? "favoritas" : "ordenar",
    };
    setPhase(prev[phase]);
    window.scrollTo({ top: 0 });
  }

  const dictCards = cards.filter((a) => {
    const q = search.trim().toLowerCase();
    return !q || a.name.toLowerCase().includes(q) || a.meaning.toLowerCase().includes(q);
  });

  return (
    <div className="min-h-screen bg-slate-50 py-6 px-4">
      <div className="max-w-xl mx-auto">
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            {hubHref ? <a href={hubHref} className="font-semibold text-emerald-700">← Mis hojas · {studentName}</a> : <span>{studentName}</span>}
            <span>{phaseLabel[phase]}</span>
          </div>
          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-600 transition-all" style={{ width: `${Math.min(100, progress)}%` }} />
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 sm:p-6">
          {/* ---------- CONOCER (diccionario de tarjetas, manual p. 25) ---------- */}
          {phase === "conocer" && (
            <div>
              <h2 className="font-bold text-slate-900 mb-1">Conoce las tarjetas</h2>
              <p className="text-sm text-slate-600 mb-3">
                Antes de jugar, mira qué significa cada tarjeta. Así podrás elegir mejor. Hay {cards.length}.
              </p>
              {cfg.readAloud && <ReadAloudButton text={`Vas a ver ${cards.length} tarjetas. Mira qué significa cada una antes de jugar.`} className="mb-3" />}
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar una tarjeta…"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base mb-3"
              />
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[52vh] overflow-y-auto pr-1">
                {dictCards.map((a) => (
                  <div key={a.key} className="rounded-xl border border-slate-200 overflow-hidden bg-white">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {deck[a.key] ? <img src={deck[a.key]} alt={a.name} className="w-full aspect-[62/88] object-contain" loading="lazy" /> : <div className="text-4xl text-center py-4">{a.emoji}</div>}
                    <p className="px-2 py-1.5 text-[11px] leading-snug text-slate-600">{meaningOf(a.key, nivel)}</p>
                  </div>
                ))}
                {dictCards.length === 0 && <p className="col-span-full text-sm text-slate-400">No hay tarjetas con ese texto.</p>}
              </div>
              <div className="mt-3 rounded-lg bg-emerald-50 border border-emerald-100 p-3 text-sm text-slate-700 space-y-1">
                {cfg.copy.intro.map((s, i) => (
                  <p key={i}>
                    {i + 1}. {fillCopy(s, vars)}
                  </p>
                ))}
              </div>
              <div className="flex justify-end mt-5">
                <button type="button" onClick={() => { setPhase("clasificar"); window.scrollTo({ top: 0 }); }} className="rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white">
                  Empezar a jugar
                </button>
              </div>
            </div>
          )}

          {/* ---------- CLASIFICAR ---------- */}
          {phase === "clasificar" && current && (
            <div>
              {inicial && cardIndex === 0 && answered === 0 && (
                <div className="mb-3 rounded-lg bg-emerald-50 border border-emerald-100 p-3 text-sm text-slate-700 space-y-1">
                  {cfg.copy.intro.map((s, i) => (
                    <p key={i}>{fillCopy(s, vars)}</p>
                  ))}
                </div>
              )}
              <p className="text-sm text-slate-600 mb-3">{cfg.copy.clasificarPrompt}</p>
              <div key={current.key} draggable onDragStart={(e) => e.dataTransfer.setData("text/plain", current.key)}>
                {renderCard(current.key, false, inicial)}
              </div>
              {cards[cardIndex + 1] && deck[cards[cardIndex + 1].key] && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={deck[cards[cardIndex + 1].key]} alt="" aria-hidden className="hidden" />
              )}
              {cfg.readAloud && (
                <div className="mt-2 flex justify-center">
                  <ReadAloudButton text={`${current.name}. ${meaningOf(current.key, nivel)}`} />
                </div>
              )}
              {inicial && <p className="text-center text-base font-semibold text-slate-800 mt-2">{meaningOf(current.key, nivel)}</p>}

              <div className={`grid gap-2 mt-4 ${choices.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
                {choices.map((opt) => {
                  const selected = classification[current.key] === opt.value;
                  const catImg = !inicial ? BUILTIN_CATEGORY_CARDS[opt.value] : null;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => choose(opt.value)}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragOver(opt.value);
                      }}
                      onDragLeave={() => setDragOver(null)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setDragOver(null);
                        choose(opt.value);
                      }}
                      aria-label={cfg.copy.choiceLabels[opt.value]}
                      className={`rounded-xl border-2 overflow-hidden flex flex-col items-center gap-1 ${inicial ? "py-5 text-sm" : "pb-2 text-xs"} font-semibold transition-transform ${dragOver === opt.value ? "scale-105" : ""}`}
                      style={{
                        borderColor: selected || dragOver === opt.value ? opt.color : "#e2e8f0",
                        backgroundColor: selected ? `${opt.color}18` : "#fff",
                        color: opt.color,
                      }}
                    >
                      {catImg ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={catImg} alt="" className="w-full aspect-[10/7] object-cover" draggable={false} />
                      ) : (
                        <span className={inicial ? "text-6xl" : "text-2xl"}>{opt.emoji}</span>
                      )}
                      <span className="px-1 leading-tight">{cfg.copy.choiceLabels[opt.value]}</span>
                    </button>
                  );
                })}
              </div>
              {!inicial && <p className="text-[11px] text-slate-400 text-center mt-1.5">Toca una categoría o arrastra la tarjeta hasta ella.</p>}

              <div className="flex items-center justify-between mt-5">
                <button
                  type="button"
                  onClick={() => setCardIndex((i) => Math.max(0, i - 1))}
                  disabled={cardIndex === 0}
                  className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-600 disabled:opacity-40"
                >
                  Atrás
                </button>
                {cardIndex >= cards.length - 1 && answered >= cards.length ? (
                  <button type="button" onClick={afterClasificar} className="rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white">
                    Continuar
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setCardIndex((i) => Math.min(cards.length - 1, i + 1))}
                    className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-600"
                  >
                    Saltar
                  </button>
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-3">
                {inicial
                  ? `Te gustaron ${identified.length} tarjetas.`
                  : `Te identificas con ${identified.length} tarjetas hasta ahora. Responde rápido y con sinceridad.`}
              </p>
            </div>
          )}

          {/* ---------- AJUSTE ---------- */}
          {phase === "ajuste" && (
            <div>
              <h2 className="font-bold text-slate-900 mb-1">Un ajuste rápido</h2>
              <p className="text-sm text-slate-600 mb-3">{fillCopy(cfg.copy.ajusteHelp, { ...vars, min: cfg.minIdentified, n: identified.length })}</p>
              <div className="grid grid-cols-2 gap-2">
                {dudas.map((k) => (
                  <button key={k} type="button" onClick={() => setClassification((c) => ({ ...c, [k]: "SI" }))} className="text-left">
                    {renderCard(k, true)}
                  </button>
                ))}
              </div>
              <div className="flex justify-end mt-5">
                <button
                  type="button"
                  onClick={afterAjuste}
                  disabled={identified.length < cfg.minIdentified && dudas.length > 0}
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
              <p className="text-sm text-slate-600 mb-3">{fillCopy(cfg.copy.agruparHelp, vars)}</p>
              {cfg.readAloud && <ReadAloudButton text={fillCopy(cfg.copy.agruparHelp, vars)} className="mb-3" />}

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
                        placeholder={cfg.copy.groupPlaceholder}
                        className="flex-1 rounded border border-slate-300 px-2 py-1.5 text-sm"
                      />
                      {g.archetypes.length > 0 && (
                        <button type="button" onClick={() => aiName(g.id)} className="text-[11px] text-violet-700 border border-violet-300 bg-violet-50 rounded px-1.5 py-1 shrink-0">
                          ✨ IA
                        </button>
                      )}
                      {groups.length > cfg.minGroups && (
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
                      <p className="text-[11px] text-slate-500 mt-1 pl-8">{g.archetypes.map((k) => ARCHETYPE_MAP[k]?.name).join(" · ")}</p>
                    )}
                  </div>
                ))}
                {groups.length < cfg.maxGroups && (
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
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[55vh] overflow-y-auto pr-1">
                {identified.filter((k) => cardKeys.has(k)).map((k) => {
                  const g = groupOf(k);
                  const inActive = groups.find((x) => x.id === activeGroup)?.archetypes.includes(k);
                  return (
                    <button key={k} type="button" onClick={() => toggleInActiveGroup(k)} className="relative text-left">
                      <div className={inActive ? "ring-2 ring-emerald-500 rounded-xl" : g ? "opacity-50" : ""}>{renderCard(k, true)}</div>
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
              <p className="text-sm text-slate-600 mb-3">{cfg.copy.ordenarHelp}</p>
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

          {/* ---------- FAVORITAS (Inicial) ---------- */}
          {phase === "favoritas" && (
            <div>
              <h2 className="font-bold text-slate-900 mb-1">¡Tus 3 tarjetas favoritas!</h2>
              <p className="text-sm text-slate-600 mb-2">{cfg.copy.favoritasHelp}</p>
              <ReadAloudButton text={cfg.copy.favoritasHelp} className="mb-3" />
              <div className="grid grid-cols-3 gap-2">
                {identified.map((k) => {
                  const pos = favorites.indexOf(k);
                  return (
                    <button
                      key={k}
                      type="button"
                      onClick={() =>
                        setFavorites((f) => (f.includes(k) ? f.filter((x) => x !== k) : f.length < cfg.maxGroups ? [...f, k] : f))
                      }
                      className="relative text-left"
                    >
                      <div className={pos >= 0 ? "ring-4 ring-amber-400 rounded-xl" : ""}>{renderCard(k, true, true)}</div>
                      {pos >= 0 && (
                        <span className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-amber-400 text-slate-900 text-lg font-bold flex items-center justify-center shadow">
                          {pos === 0 ? "⭐" : pos + 1}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
              <div className="flex justify-end mt-5">
                <button
                  type="button"
                  onClick={async () => {
                    if (favorites.length === 0) return setError("Toca al menos una tarjeta favorita.");
                    setError(null);
                    await persist();
                    setPhase("cierre");
                    window.scrollTo({ top: 0 });
                  }}
                  className="rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white"
                >
                  Continuar
                </button>
              </div>
            </div>
          )}

          {/* ---------- CIERRE ---------- */}
          {phase === "cierre" && (
            <div className="space-y-4">
              <h2 className="font-bold text-slate-900">Para cerrar</h2>
              {inicial ? (
                <div>
                  <label className="block text-sm font-medium text-slate-800 mb-2">{cfg.copy.cierreReflection}</label>
                  <ReadAloudButton text={cfg.copy.cierreReflection} className="mb-3" />
                  <div className="flex justify-center gap-3">
                    {[
                      { e: "😊", t: "Me sentí feliz" },
                      { e: "😐", t: "Me sentí normal" },
                      { e: "😟", t: "No me gustó" },
                    ].map((o) => (
                      <button
                        key={o.e}
                        type="button"
                        onClick={() => setReflection(`${o.e} ${o.t}`)}
                        aria-label={o.t}
                        className={`text-5xl rounded-2xl border-2 p-3 ${reflection.startsWith(o.e) ? "border-emerald-500 bg-emerald-50" : "border-slate-200"}`}
                      >
                        {o.e}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-800 mb-1">{cfg.copy.cierreReflection}</label>
                    <textarea value={reflection} onChange={(e) => setReflection(e.target.value)} rows={4} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-800 mb-1">{cfg.copy.cierreLetter}</label>
                    <textarea value={letter} onChange={(e) => setLetter(e.target.value)} rows={4} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base" placeholder="Querido yo del futuro…" />
                  </div>
                </>
              )}
              <p className="text-xs text-slate-500">Al enviar, tu perfil de talentos queda disponible para el DECE de tu institución.</p>
            </div>
          )}

          {error && phase !== "favoritas" && <p className="mt-4 text-sm text-rose-600">{error}</p>}

          {phase !== "clasificar" && phase !== "conocer" && (
            <div className="mt-4 flex items-center justify-between">
              <button type="button" onClick={goBack} disabled={submitting} className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-600 disabled:opacity-40">
                Atrás
              </button>
              {phase === "cierre" && (
                <button type="button" onClick={submit} disabled={submitting} className="rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-40">
                  {submitting ? "Enviando…" : "Enviar"}
                </button>
              )}
            </div>
          )}
          {phase === "clasificar" && error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
        </div>

        <p className="text-center text-[11px] text-slate-400 mt-3">
          Tus respuestas se guardan en este dispositivo. Si cierras, vuelve al mismo enlace para continuar.
        </p>
      </div>
    </div>
  );
}
