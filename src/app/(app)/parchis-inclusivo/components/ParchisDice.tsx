"use client";

import React, { useState, useRef, useEffect } from "react";
import { parchisAudio } from "@/lib/parchis/parchisAudio";

interface ParchisDiceProps {
  value: number | null;
  isRolling: boolean;
  disabled: boolean;
  consecutiveSixes: number;
  focused?: boolean;
  onRoll: (result: number) => void;
}

// Mapeo exacto de rotaciones 3D para que cada cara quede de frente
const DICE_ROTATIONS: Record<number, { x: number; y: number }> = {
  1: { x: 0, y: 0 },
  2: { x: 0, y: -90 },
  3: { x: 0, y: 90 },
  4: { x: -90, y: 0 },
  5: { x: 90, y: 0 },
  6: { x: 0, y: 180 },
};

export const ParchisDice: React.FC<ParchisDiceProps> = ({
  value,
  isRolling,
  disabled,
  consecutiveSixes,
  focused = true,
  onRoll,
}) => {
  const [manualMode, setManualMode] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [revealingNumber, setRevealingNumber] = useState<number | null>(null);
  const [cubeRotation, setCubeRotation] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const rollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const revealTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (rollTimeoutRef.current) clearTimeout(rollTimeoutRef.current);
      if (revealTimeoutRef.current) clearTimeout(revealTimeoutRef.current);
    };
  }, []);

  // Actualizar rotación si cambia el valor externamente
  useEffect(() => {
    if (value && DICE_ROTATIONS[value] && !animating) {
      setCubeRotation(DICE_ROTATIONS[value]);
    }
  }, [value, animating]);

  const handleRollClick = () => {
    if (disabled || isRolling || animating || revealingNumber !== null) return;

    setAnimating(true);
    setRevealingNumber(null);
    parchisAudio.playDiceRoll();

    // Generar resultado
    const outcome = Math.floor(Math.random() * 6) + 1;
    const targetBase = DICE_ROTATIONS[outcome];

    // Múltiples giros de 360° para realismo físico
    const spinsX = (Math.floor(Math.random() * 2) + 2) * 360;
    const spinsY = (Math.floor(Math.random() * 2) + 2) * 360;

    setCubeRotation({
      x: targetBase.x + spinsX,
      y: targetBase.y + spinsY,
    });

    // 1. Giro del dado (850ms)
    rollTimeoutRef.current = setTimeout(() => {
      setAnimating(false);
      setRevealingNumber(outcome);

      // 2. Pausa de revelación clara para el auditorio (1200ms)
      revealTimeoutRef.current = setTimeout(() => {
        setRevealingNumber(null);
        onRoll(outcome);
      }, 1200);
    }, 850);
  };

  const handleManualSelect = (num: number) => {
    if (disabled || animating) return;
    parchisAudio.playDiceRoll();
    setCubeRotation(DICE_ROTATIONS[num]);
    setRevealingNumber(num);

    revealTimeoutRef.current = setTimeout(() => {
      setRevealingNumber(null);
      onRoll(num);
    }, 800);
  };

  // Renderizado de las 6 caras del cubo con puntos clásicos grabados
  const renderPip = (colorClass: string = "bg-slate-900") => (
    <span
      className={`w-3.5 h-3.5 rounded-full ${colorClass} shadow-inner transform transition-transform`}
    />
  );

  return (
    <div
      className={`relative flex flex-col items-center bg-[#FDFBF7] p-5 rounded-3xl border-2 transition-all duration-500 shadow-md ${
        focused
          ? "border-amber-500 ring-4 ring-amber-400/30 scale-100"
          : "border-slate-300 opacity-80 scale-95"
      }`}
    >
      {/* Selector de modo y cabecera */}
      <div className="flex items-center justify-between w-full mb-4">
        <span className="text-2xs font-black text-amber-800 uppercase tracking-widest flex items-center gap-1.5">
          <span>🎲</span> {manualMode ? "Dado Físico de Taller" : "Dado 3D Oficial"}
        </span>
        <button
          type="button"
          onClick={() => setManualMode(!manualMode)}
          className="text-2xs font-bold text-blue-700 hover:text-blue-900 underline transition-colors cursor-pointer"
        >
          {manualMode ? "🔄 Usar 3D Virtual" : "🎯 Entrada Manual"}
        </button>
      </div>

      {!manualMode ? (
        <div className="flex flex-col items-center gap-4 my-2">
          {/* Escenario 3D con perspectiva para el cubo */}
          <div
            className="w-32 h-32 flex items-center justify-center cursor-pointer select-none"
            style={{ perspective: "800px" }}
            onClick={handleRollClick}
          >
            <div
              className="relative w-20 h-20 transition-transform duration-[850ms] ease-out"
              style={{
                transformStyle: "preserve-3d",
                transform: `rotateX(${cubeRotation.x}deg) rotateY(${cubeRotation.y}deg)`,
              }}
            >
              {/* Cara 1 (Frontal - Punto rojo central) */}
              <div
                className="absolute inset-0 bg-white border-2 border-slate-400 rounded-2xl shadow-md flex items-center justify-center"
                style={{ transform: "rotateY(0deg) translateZ(40px)", backfaceVisibility: "hidden" }}
              >
                <span className="w-5 h-5 rounded-full bg-rose-600 ring-2 ring-rose-300 shadow-sm" />
              </div>

              {/* Cara 6 (Trasera - 6 puntos) */}
              <div
                className="absolute inset-0 bg-white border-2 border-slate-400 rounded-2xl shadow-md grid grid-cols-2 grid-rows-3 p-2 place-items-center"
                style={{ transform: "rotateY(180deg) translateZ(40px)", backfaceVisibility: "hidden" }}
              >
                {renderPip()}
                {renderPip()}
                {renderPip()}
                {renderPip()}
                {renderPip()}
                {renderPip()}
              </div>

              {/* Cara 2 (Derecha - 2 puntos) */}
              <div
                className="absolute inset-0 bg-white border-2 border-slate-400 rounded-2xl shadow-md flex justify-between p-2.5"
                style={{ transform: "rotateY(90deg) translateZ(40px)", backfaceVisibility: "hidden" }}
              >
                {renderPip()}
                <span className="self-end">{renderPip()}</span>
              </div>

              {/* Cara 3 (Izquierda - 3 puntos) */}
              <div
                className="absolute inset-0 bg-white border-2 border-slate-400 rounded-2xl shadow-md flex justify-between p-2.5"
                style={{ transform: "rotateY(-90deg) translateZ(40px)", backfaceVisibility: "hidden" }}
              >
                {renderPip()}
                <span className="self-center">{renderPip()}</span>
                <span className="self-end">{renderPip()}</span>
              </div>

              {/* Cara 4 (Superior - 4 puntos) */}
              <div
                className="absolute inset-0 bg-white border-2 border-slate-400 rounded-2xl shadow-md grid grid-cols-2 p-2.5 place-items-center gap-2"
                style={{ transform: "rotateX(90deg) translateZ(40px)", backfaceVisibility: "hidden" }}
              >
                {renderPip()}
                {renderPip()}
                {renderPip()}
                {renderPip()}
              </div>

              {/* Cara 5 (Inferior - 5 puntos) */}
              <div
                className="absolute inset-0 bg-white border-2 border-slate-400 rounded-2xl shadow-md p-2.5"
                style={{ transform: "rotateX(-90deg) translateZ(40px)", backfaceVisibility: "hidden" }}
              >
                <div className="grid grid-cols-2 h-full place-items-center gap-2">
                  {renderPip()}
                  {renderPip()}
                  {renderPip()}
                  {renderPip()}
                </div>
                <div className="absolute inset-0 m-auto w-3.5 h-3.5">{renderPip()}</div>
              </div>
            </div>
          </div>

          {/* Banner de revelación clara tras detenerse */}
          {revealingNumber !== null && (
            <div className="animate-bounce px-4 py-1.5 rounded-full bg-emerald-600 text-white font-black text-sm tracking-wide shadow-lg border-2 border-emerald-300">
              ¡SACASTE UN {revealingNumber}!
            </div>
          )}

          {/* Botón de Tirar Dado estilo Monopolio */}
          <button
            type="button"
            onClick={handleRollClick}
            disabled={disabled || isRolling || animating || revealingNumber !== null}
            className={`w-full px-6 py-3.5 rounded-2xl text-sm font-black uppercase tracking-wider transition-all shadow-md cursor-pointer ${
              disabled || animating || revealingNumber !== null
                ? "bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed"
                : "bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-600 text-white border-2 border-red-800 shadow-rose-900/30 active:scale-95 ring-4 ring-red-400/20"
            }`}
          >
            {animating ? "Girando..." : revealingNumber !== null ? "¡Revelando!" : "🎲 ¡Lanzar Dado!"}
          </button>
        </div>
      ) : (
        /* Modo Manual para el facilitador con dado gigante de espuma */
        <div className="w-full space-y-2.5 my-2">
          <p className="text-2xs text-slate-600 text-center font-semibold">
            Ingresa el número obtenido con el dado físico en el taller:
          </p>
          <div className="grid grid-cols-6 gap-2">
            {[1, 2, 3, 4, 5, 6].map((num) => (
              <button
                key={num}
                type="button"
                disabled={disabled || animating}
                onClick={() => handleManualSelect(num)}
                className={`h-12 rounded-xl font-black text-lg transition-all border cursor-pointer ${
                  disabled
                    ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                    : "bg-white hover:bg-red-600 hover:text-white hover:border-red-700 text-slate-800 border-slate-300 active:scale-95 shadow-xs"
                }`}
              >
                {num}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Racha de seises */}
      {consecutiveSixes > 0 && (
        <div className="mt-2 text-2xs font-extrabold px-3 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 animate-pulse text-center">
          {consecutiveSixes === 1 && "🔥 ¡Sacó 6! Vuelve a lanzar tras resolver el reto"}
          {consecutiveSixes === 2 && "⚡ ¡2do seis! Un 3er seis cede el avance por solidaridad"}
          {consecutiveSixes >= 3 && "🤝 ¡3er seis consecutivo! Se cede el avance al equipo en desventaja"}
        </div>
      )}
    </div>
  );
};
