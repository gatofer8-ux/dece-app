"use client";

import React, { useState } from "react";
import { parchisAudio } from "@/lib/parchis/parchisAudio";

interface ParchisDiceProps {
  value: number | null;
  isRolling: boolean;
  disabled: boolean;
  consecutiveSixes: number;
  onRoll: (result: number) => void;
}

export const ParchisDice: React.FC<ParchisDiceProps> = ({
  value,
  isRolling,
  disabled,
  consecutiveSixes,
  onRoll,
}) => {
  const [manualMode, setManualMode] = useState(false);
  const [animating, setAnimating] = useState(false);

  const handleRollClick = () => {
    if (disabled || isRolling || animating) return;

    setAnimating(true);
    parchisAudio.playDiceRoll();

    // Simulación de animación de giro durante 600ms
    setTimeout(() => {
      const outcome = Math.floor(Math.random() * 6) + 1;
      setAnimating(false);
      onRoll(outcome);
    }, 600);
  };

  const handleManualSelect = (num: number) => {
    if (disabled) return;
    parchisAudio.playDiceRoll();
    onRoll(num);
  };

  // Renderizado de los puntos clásicos del dado
  const renderDots = (num: number) => {
    switch (num) {
      case 1:
        return (
          <div className="flex items-center justify-center w-full h-full">
            <span className="w-5 h-5 rounded-full bg-red-600 shadow-xs" />
          </div>
        );
      case 2:
        return (
          <div className="flex justify-between w-full h-full p-2">
            <span className="w-3.5 h-3.5 rounded-full bg-slate-900" />
            <span className="w-3.5 h-3.5 rounded-full bg-slate-900 self-end" />
          </div>
        );
      case 3:
        return (
          <div className="flex justify-between w-full h-full p-2">
            <span className="w-3.5 h-3.5 rounded-full bg-slate-900" />
            <span className="w-3.5 h-3.5 rounded-full bg-slate-900 self-center" />
            <span className="w-3.5 h-3.5 rounded-full bg-slate-900 self-end" />
          </div>
        );
      case 4:
        return (
          <div className="grid grid-cols-2 gap-3 w-full h-full p-2 place-items-center">
            <span className="w-3.5 h-3.5 rounded-full bg-slate-900" />
            <span className="w-3.5 h-3.5 rounded-full bg-slate-900" />
            <span className="w-3.5 h-3.5 rounded-full bg-slate-900" />
            <span className="w-3.5 h-3.5 rounded-full bg-slate-900" />
          </div>
        );
      case 5:
        return (
          <div className="relative w-full h-full p-2">
            <div className="grid grid-cols-2 gap-3 h-full place-items-center">
              <span className="w-3.5 h-3.5 rounded-full bg-slate-900" />
              <span className="w-3.5 h-3.5 rounded-full bg-slate-900" />
              <span className="w-3.5 h-3.5 rounded-full bg-slate-900" />
              <span className="w-3.5 h-3.5 rounded-full bg-slate-900" />
            </div>
            <span className="absolute inset-0 m-auto w-3.5 h-3.5 rounded-full bg-slate-900" />
          </div>
        );
      case 6:
        return (
          <div className="grid grid-cols-2 grid-rows-3 gap-2 w-full h-full p-2 place-items-center">
            <span className="w-3.5 h-3.5 rounded-full bg-slate-900" />
            <span className="w-3.5 h-3.5 rounded-full bg-slate-900" />
            <span className="w-3.5 h-3.5 rounded-full bg-slate-900" />
            <span className="w-3.5 h-3.5 rounded-full bg-slate-900" />
            <span className="w-3.5 h-3.5 rounded-full bg-slate-900" />
            <span className="w-3.5 h-3.5 rounded-full bg-slate-900" />
          </div>
        );
      default:
        return (
          <div className="flex items-center justify-center w-full h-full text-slate-400 font-bold text-lg">
            🎲
          </div>
        );
    }
  };

  return (
    <div className="flex flex-col items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-md">
      <div className="flex items-center justify-between w-full mb-3">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          {manualMode ? "Dado Físico / Manual" : "Dado Digital"}
        </span>
        <button
          type="button"
          onClick={() => setManualMode(!manualMode)}
          className="text-xs font-medium text-blue-600 hover:text-blue-800 underline flex items-center gap-1"
          title="Alternar entre dado virtual y entrada manual para dado de espuma físico"
        >
          {manualMode ? "🔄 Usar virtual" : "🎯 Usar dado de taller"}
        </button>
      </div>

      {!manualMode ? (
        <div className="flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={handleRollClick}
            disabled={disabled || isRolling || animating}
            className={`relative group focus:outline-none transition-all transform ${
              disabled
                ? "opacity-50 cursor-not-allowed scale-95"
                : "hover:scale-105 active:scale-95 cursor-pointer"
            }`}
            aria-label="Lanzar dado"
          >
            <div
              className={`w-24 h-24 rounded-2xl bg-gradient-to-br from-white via-slate-50 to-slate-200 border-2 border-slate-300 shadow-xl flex items-center justify-center transition-all duration-300 ${
                animating
                  ? "animate-spin ring-4 ring-blue-400/50 rotate-180"
                  : "group-hover:border-blue-400 group-hover:shadow-2xl"
              }`}
            >
              {renderDots(value || 0)}
            </div>

            {/* Brillo indicativo si es turno de lanzar */}
            {!disabled && !value && !animating && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-blue-500"></span>
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={handleRollClick}
            disabled={disabled || isRolling || animating}
            className={`px-5 py-2 rounded-xl text-sm font-bold shadow-md transition-all ${
              disabled
                ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                : "bg-blue-600 text-white hover:bg-blue-700 active:scale-95 ring-2 ring-blue-500/20"
            }`}
          >
            {animating ? "Lanzando..." : "🎲 ¡Lanzar Dado!"}
          </button>
        </div>
      ) : (
        /* Selector manual rápido para facilitadores con dados gigantes de espuma */
        <div className="w-full">
          <p className="text-xs text-slate-500 text-center mb-2">
            Selecciona el número obtenido en el dado de espuma del taller:
          </p>
          <div className="grid grid-cols-6 gap-1.5">
            {[1, 2, 3, 4, 5, 6].map((num) => (
              <button
                key={num}
                type="button"
                disabled={disabled}
                onClick={() => handleManualSelect(num)}
                className={`h-11 rounded-lg font-black text-base transition-all border ${
                  disabled
                    ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                    : "bg-slate-50 hover:bg-blue-600 hover:text-white hover:border-blue-600 text-slate-800 border-slate-300 active:scale-95 shadow-xs"
                }`}
              >
                {num}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Indicador de seises consecutivos */}
      {consecutiveSixes > 0 && (
        <div className="mt-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
          {consecutiveSixes === 1 && "🔥 ¡Sacó 6! Vuelve a lanzar tras resolver el reto"}
          {consecutiveSixes === 2 && "⚡ ¡2do seis consecutivo! Un 3er seis cederá el avance por solidaridad"}
          {consecutiveSixes >= 3 && "🤝 ¡3er seis consecutivo! Se cede el avance al equipo en desventaja"}
        </div>
      )}
    </div>
  );
};
