"use client";

import { useEffect, useState } from "react";

/**
 * Fondo ambiental interactivo con mallas de degradado (Mesh Gradients)
 * y micro-textura geométrica dot-grid.
 *
 * Otorga profundidad, elegancia y movimiento sutil a la aplicación sin
 * perjudicar la legibilidad del texto ni el rendimiento de la CPU/batería.
 */
export default function AmbientBackground() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden select-none print:hidden"
    >
      {/* Patrón sutil de micropuntos (Dot Grid) */}
      <svg
        className="absolute inset-0 h-full w-full opacity-[0.22] [mask-image:radial-gradient(ellipse_at_center,white,transparent_85%)]"
        xmlns="http://www.w3.org/2000/svg"
        width="100%"
        height="100%"
      >
        <defs>
          <pattern id="dece-ambient-dots" width="28" height="28" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1" fill="#64748b" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#dece-ambient-dots)" />
      </svg>

      {/* Orbe 1: Azul Cielo Institucional (Superior Izquierdo) */}
      <div
        className="ambient-orb-1 absolute -top-24 -left-20 h-[500px] w-[500px] rounded-full bg-gradient-to-br from-sky-400/20 via-blue-500/15 to-transparent blur-3xl"
        style={{ willChange: "transform" }}
      />

      {/* Orbe 2: Índigo / Violeta Moderno (Superior Derecho) */}
      <div
        className="ambient-orb-2 absolute top-12 -right-28 h-[550px] w-[550px] rounded-full bg-gradient-to-bl from-indigo-400/18 via-purple-400/12 to-transparent blur-3xl"
        style={{ willChange: "transform" }}
      />

      {/* Orbe 3: Esmeralda / Acompañamiento (Inferior Centro) */}
      <div
        className="ambient-orb-3 absolute -bottom-32 left-1/3 h-[600px] w-[600px] rounded-full bg-gradient-to-tr from-emerald-400/15 via-teal-300/10 to-transparent blur-3xl"
        style={{ willChange: "transform" }}
      />
    </div>
  );
}
