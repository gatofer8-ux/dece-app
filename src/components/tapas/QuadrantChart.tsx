import type { PointerEvent as ReactPointerEvent, Ref } from "react";
import { QUADRANTS, type Quadrant } from "@/lib/tapas/instruments";

/**
 * Plano de coordenadas del Perfil de talentos (formato del Manual TaPas, pp. 19 y 21):
 * eje horizontal = «no me gusta» ← → «sí me gusta»; eje vertical = «lo hago mal» ↓ ↑ «lo hago bien».
 * Es solo SVG: sirve tanto en pantalla interactiva (con manejadores) como en informes (sin ellos).
 */

export const PLANE = { size: 400, center: 200, radius: 170 };

export interface ChartDot {
  id: string;
  /** Número o letra que se escribe en el punto (como en el formato impreso). */
  label: string;
  x: number | null;
  y: number | null;
  /** Texto que aparece al pasar el cursor. */
  title?: string;
}

/** Rótulo del punto, como en el formato impreso: números en estudios y perfil; letras en tiempo libre. */
export function itemLabel(set: "own" | "other" | "studies" | "free", index: number): string {
  if (set === "free") return String.fromCharCode(97 + index); // a, b, c…
  return String(index + 1);
}

export function planeToPixels(x: number, y: number) {
  return { px: PLANE.center + x * PLANE.radius, py: PLANE.center - y * PLANE.radius };
}

export function pixelsToPlane(px: number, py: number) {
  const clamp = (v: number) => Math.max(-1, Math.min(1, v));
  return { x: clamp((px - PLANE.center) / PLANE.radius), y: clamp((PLANE.center - py) / PLANE.radius) };
}

const QUADRANT_CELL: Record<Quadrant, { x: number; y: number }> = {
  BIEN_GUSTA: { x: PLANE.center, y: 20 },
  MAL_GUSTA: { x: PLANE.center, y: PLANE.center },
  BIEN_NOGUSTA: { x: 20, y: 20 },
  MAL_NOGUSTA: { x: 20, y: PLANE.center },
};

export default function QuadrantChart({
  dots,
  yTop = "Lo hago bien",
  yBottom = "Lo hago mal",
  xLeft = "No me gusta",
  xRight = "Sí me gusta",
  selectedId,
  activeDotId,
  svgRef,
  onSvgPointerDown,
  onSvgPointerMove,
  onSvgPointerUp,
  onDotPointerDown,
  className = "",
}: {
  dots: ChartDot[];
  yTop?: string;
  yBottom?: string;
  xLeft?: string;
  xRight?: string;
  selectedId?: string | null;
  activeDotId?: string | null;
  svgRef?: Ref<SVGSVGElement>;
  onSvgPointerDown?: (e: ReactPointerEvent<SVGSVGElement>) => void;
  onSvgPointerMove?: (e: ReactPointerEvent<SVGSVGElement>) => void;
  onSvgPointerUp?: (e: ReactPointerEvent<SVGSVGElement>) => void;
  onDotPointerDown?: (id: string, e: ReactPointerEvent<SVGGElement>) => void;
  className?: string;
}) {
  const S = PLANE.size;
  const lo = 20;
  const hi = S - 20;
  const interactive = !!onSvgPointerDown;
  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${S} ${S}`}
      className={`w-full h-auto select-none ${interactive ? "touch-none cursor-crosshair" : ""} ${className}`}
      role="img"
      aria-label={`Plano de talentos: ${yTop} arriba, ${yBottom} abajo, ${xLeft} a la izquierda, ${xRight} a la derecha`}
      onPointerDown={onSvgPointerDown}
      onPointerMove={onSvgPointerMove}
      onPointerUp={onSvgPointerUp}
      onPointerCancel={onSvgPointerUp}
    >
      {/* Cuadrantes con su color suave */}
      {(Object.keys(QUADRANT_CELL) as Quadrant[]).map((q) => (
        <rect
          key={q}
          x={QUADRANT_CELL[q].x}
          y={QUADRANT_CELL[q].y}
          width={PLANE.center - 20}
          height={PLANE.center - 20}
          fill={QUADRANTS[q].color}
          opacity={0.1}
        />
      ))}
      <rect x={lo} y={lo} width={hi - lo} height={hi - lo} fill="none" stroke="#CBD5E1" strokeWidth={1.5} />
      {/* Cuadrícula tenue */}
      {Array.from({ length: 7 }, (_, i) => lo + ((hi - lo) / 8) * (i + 1)).map((v, i) => (
        <g key={i} stroke="#E2E8F0" strokeWidth={0.8}>
          <line x1={v} y1={lo} x2={v} y2={hi} />
          <line x1={lo} y1={v} x2={hi} y2={v} />
        </g>
      ))}
      {/* Ejes */}
      <line x1={PLANE.center} y1={lo} x2={PLANE.center} y2={hi} stroke="#1E293B" strokeWidth={2} />
      <line x1={lo} y1={PLANE.center} x2={hi} y2={PLANE.center} stroke="#1E293B" strokeWidth={2} />

      {/* Rótulos de los ejes */}
      <g fontSize={13} fontWeight={700} fill="#334155">
        <text x={PLANE.center + 6} y={15} textAnchor="start">+ {yTop}</text>
        <text x={PLANE.center + 6} y={S - 5} textAnchor="start">− {yBottom}</text>
        <text x={hi - 2} y={PLANE.center - 6} textAnchor="end">+ {xRight}</text>
        <text x={lo + 2} y={PLANE.center + 18} textAnchor="start">− {xLeft}</text>
      </g>
      {/* Signos de cada cuadrante */}
      <g fontSize={22} fontWeight={800} fill="#94A3B8" opacity={0.55}>
        <text x={hi - 40} y={lo + 40}>＋＋</text>
        <text x={lo + 12} y={lo + 40}>＋－</text>
        <text x={hi - 40} y={hi - 22}>－＋</text>
        <text x={lo + 12} y={hi - 22}>－－</text>
      </g>

      {/* Puntos ubicados */}
      {dots.map((d) => {
        if (d.x === null || d.y === null) return null;
        const { px, py } = planeToPixels(d.x, d.y);
        const selected = selectedId === d.id;
        const active = activeDotId === d.id;
        return (
          <g
            key={d.id}
            transform={`translate(${px} ${py})`}
            onPointerDown={onDotPointerDown ? (e) => onDotPointerDown(d.id, e) : undefined}
            className={onDotPointerDown ? "cursor-grab" : ""}
          >
            <title>{d.title || d.label}</title>
            <circle r={selected || active ? 17 : 14} fill={selected ? "#DC2626" : "#334155"} stroke="#fff" strokeWidth={2.5} />
            <text textAnchor="middle" dominantBaseline="central" fontSize={d.label.length > 1 ? 11 : 14} fontWeight={700} fill="#fff">
              {d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/** Rótulo del cuadrante según el conjunto (los estudios hablan de «resultados»). */
export function quadrantText(q: Quadrant, studies = false) {
  return studies ? QUADRANTS[q].studyLabel : QUADRANTS[q].label;
}

export { QUADRANT_CELL };
