"use client";

import { useRef, useState } from "react";
import QuadrantChart, { itemLabel, pixelsToPlane, PLANE } from "./QuadrantChart";
import { quadrantOf, QUADRANTS, type ProfileItem, type Quadrant } from "@/lib/tapas/instruments";

/**
 * Lista de ítems + plano interactivo. El estudiante toca un ítem y luego toca el plano para
 * ubicarlo; también puede arrastrar el punto o usar los botones de cuadrante (más fácil en el celular).
 */

const QUADRANT_BUTTONS: Quadrant[] = ["BIEN_GUSTA", "MAL_GUSTA", "BIEN_NOGUSTA", "MAL_NOGUSTA"];
const QUADRANT_CENTER: Record<Quadrant, { x: number; y: number }> = {
  BIEN_GUSTA: { x: 0.5, y: 0.5 },
  MAL_GUSTA: { x: 0.5, y: -0.5 },
  BIEN_NOGUSTA: { x: -0.5, y: 0.5 },
  MAL_NOGUSTA: { x: -0.5, y: -0.5 },
};

export default function QuadrantPicker({
  set,
  items,
  onChange,
  yTop,
  yBottom,
  studies = false,
  simple = false,
}: {
  set: "own" | "other" | "studies" | "free";
  items: ProfileItem[];
  onChange: (items: ProfileItem[]) => void;
  yTop?: string;
  yBottom?: string;
  /** Rótulos de cuadrante de «estudios» (resultados) en vez de «lo hago bien». */
  studies?: boolean;
  /** Versión para Inicial: solo botones grandes con caritas (sin arrastrar). */
  simple?: boolean;
}) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(items.find((i) => i.x === null)?.id ?? items[0]?.id ?? null);
  const [dragId, setDragId] = useState<string | null>(null);
  const moved = useRef(false);

  const selected = items.find((i) => i.id === selectedId) || null;

  function place(id: string, x: number, y: number) {
    onChange(items.map((it) => (it.id === id ? { ...it, x, y } : it)));
  }

  function coords(e: { clientX: number; clientY: number }) {
    const r = svgRef.current!.getBoundingClientRect();
    return pixelsToPlane(((e.clientX - r.left) / r.width) * PLANE.size, ((e.clientY - r.top) / r.height) * PLANE.size);
  }

  const dots = items.map((it, i) => ({ id: it.id, label: itemLabel(set, i), x: it.x, y: it.y, title: it.text }));
  const unplaced = items.filter((i) => i.x === null).length;
  const qLabel = (q: Quadrant) => (studies ? QUADRANTS[q].studyLabel : QUADRANTS[q].label);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {items.map((it, i) => {
          const placed = it.x !== null;
          const isSel = it.id === selectedId;
          return (
            <button
              key={it.id}
              type="button"
              onClick={() => setSelectedId(it.id)}
              className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${
                isSel ? "border-rose-500 bg-rose-50 text-rose-800" : placed ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-slate-300 bg-white text-slate-700"
              }`}
            >
              <span className={`w-5 h-5 rounded-full text-white text-[11px] flex items-center justify-center ${isSel ? "bg-rose-600" : "bg-slate-600"}`}>
                {itemLabel(set, i)}
              </span>
              {it.emoji ? `${it.emoji} ` : ""}
              {it.text}
              {placed ? " ✓" : ""}
            </button>
          );
        })}
      </div>

      {!simple && (
        <>
          <QuadrantChart
            dots={dots}
            yTop={yTop}
            yBottom={yBottom}
            selectedId={selectedId}
            activeDotId={dragId}
            svgRef={svgRef}
            onSvgPointerDown={(e) => {
              if (dragId || !selected) return;
              place(selected.id, coords(e).x, coords(e).y);
            }}
            onDotPointerDown={(id, e) => {
              e.stopPropagation();
              moved.current = false;
              setSelectedId(id);
              setDragId(id);
              svgRef.current?.setPointerCapture?.(e.pointerId);
            }}
            onSvgPointerMove={(e) => {
              if (!dragId) return;
              moved.current = true;
              const c = coords(e);
              place(dragId, c.x, c.y);
            }}
            onSvgPointerUp={() => setDragId(null)}
          />
          <p className="text-[11px] text-slate-500">
            {selected
              ? `Toca el plano para ubicar «${selected.text}». Para moverla, arrastra su número.`
              : "Elige una de las opciones de arriba para ubicarla."}
            {unplaced > 0 ? ` Te faltan ${unplaced} por ubicar.` : ""}
          </p>
        </>
      )}

      {/* Botones de cuadrante: más cómodos en el celular y la única vía en Inicial */}
      {selected && (
        <div className="grid grid-cols-2 gap-2">
          {QUADRANT_BUTTONS.map((q) => {
            const on = quadrantOf(selected.x, selected.y) === q;
            return (
              <button
                key={q}
                type="button"
                onClick={() => place(selected.id, QUADRANT_CENTER[q].x, QUADRANT_CENTER[q].y)}
                className={`rounded-xl border-2 px-2 ${simple ? "py-4 text-sm" : "py-2 text-[11px]"} font-semibold leading-tight`}
                style={{
                  borderColor: on ? QUADRANTS[q].color : "#E2E8F0",
                  backgroundColor: on ? `${QUADRANTS[q].color}22` : "#fff",
                  color: QUADRANTS[q].color,
                }}
              >
                <span className="block text-base mb-0.5">
                  {q === "BIEN_GUSTA" ? "😊" : q === "MAL_GUSTA" ? "🤩" : q === "BIEN_NOGUSTA" ? "😐" : "🙁"}
                </span>
                {qLabel(q)}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
