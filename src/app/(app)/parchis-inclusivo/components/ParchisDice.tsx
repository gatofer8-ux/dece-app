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

    // Animación de giro de dados de 650ms
    setTimeout(() => {
      const outcome = Math.floor(Math.random() * 6) + 1;
      setAnimating(false);
      onRoll(outcome);
    }, 650);
  };

  const handleManualSelect = (num: number) => {
    if (disabled) return;
    parchisAudio.playDiceRoll();
    onRoll(num);
  };

  const renderDots = (num: number) => {
    switch (num) {
      case 1:
        return (
          <div className="flex items-center justify-center w-full h-full">
            <span className="w-6 h-6 rounded-full bg-rose-600 shadow-sm ring-2 ring-rose-300" />
          </div>
        );
      case 2:
        return (
          <div className="flex justify-between w-full h-full p-2.5">
            <span className="w-4 h-4 rounded-full bg-slate-900" />
            <span className="w-4 h-4 rounded-full bg-slate-900 self-end" />
          </div>
        );
      case 3:
        return (
          <div className="flex justify-between w-full h-full p-2.5">
            <span className="w-4 h-4 rounded-full bg-slate-900" />
            <span className="w-4 h-4 rounded-full bg-slate-900 self-center" />
            <span className="w-4 h-4 rounded-full bg-slate-900 self-end" />
          </div>
        );
      case 4:
        return (
          <div className="grid grid-cols-2 gap-3.5 w-full h-full p-2.5 place-items-center">
            <span className="w-4 h-4 rounded-full bg-slate-900" />
            <span className="w-4 h-4 rounded-full bg-slate-900" />
            <span className="w-4 h-4 rounded-full bg-slate-900" />
            <span className="w-4 h-4 rounded-full bg-slate-900" />
          </div>
        );
      case 5:
        return (
          <div className="relative w-full h-full p-2.5">
            <div className="grid grid-cols-2 gap-3.5 h-full place-items-center">
              <span className="w-4 h-4 rounded-full bg-slate-900" />
              <span className="w-4 h-4 rounded-full bg-slate-900" />
              <span className="w-4 h-4 rounded-full bg-slate-900" />
              <span className="w-4 h-4 rounded-full bg-slate-900" />
            </div>
            <span className="absolute inset-0 m-auto w-4 h-4 rounded-full bg-slate-900" />
          </div>
        );
      case 6:
        return (
          <div className="grid grid-cols-2 grid-rows-3 gap-2 w-full h-full p-2.5 place-items-center">
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
          <div className="flex items-center justify-center w-full h-full text-slate-400 font-black text-2xl">
            🎲
          </div>
        );
    }
  };

  return (
    <div className="flex flex-col items-center bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 p-5 rounded-3xl border-2 border-amber-400/40 shadow-xl text-white">
      {/* Selector de modo */}
      <div className="flex items-center justify-between w-full mb-4">
        <span className="text-2xs font-black text-amber-400 uppercase tracking-widest flex items-center gap-1.5">
          <span>👑</span> {manualMode ? "Dado Físico de Taller" : "Dado Monopolio 3D"}
        </span>
        <button
          type="button"
          onClick={() => setManualMode(!manualMode)}
          className="text-2xs font-bold text-blue-300 hover:text-white underline transition-colors"
        >
          {manualMode ? "🔄 Modo Virtual" : "🎯 Entrada Manual"}
        </button>
      </div>

      {!manualMode ? (
        <div className="flex flex-col items-center gap-4">
          {/* Cubo 3D de Monopolio */}
          <button
            type="button"
            onClick={handleRollClick}
            disabled={disabled || isRolling || animating}
            className={`relative group focus:outline-none transition-all transform ${
              disabled
                ? "opacity-50 cursor-not-allowed scale-95"
                : "hover:scale-105 active:scale-95 cursor-pointer"
            }`}
            aria-label="Lanzar Dado"
          >
            <div
              className={`w-28 h-28 rounded-3xl bg-gradient-to-br from-white via-slate-100 to-slate-300 border-4 border-amber-300 shadow-2xl flex items-center justify-center transition-all duration-500 ${
                animating
                  ? "animate-spin ring-8 ring-amber-400/60 rotate-180 scale-110"
                  : "group-hover:border-amber-400 group-hover:shadow-amber-500/20"
              }`}
            >
              {renderDots(value || 0)}
            </div>

            {/* Baliza pulsante cuando es hora de tirar */}
            {!disabled && !value && !animating && (
              <span className="absolute -top-2 -right-2 flex h-5 w-5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-5 w-5 bg-emerald-500 border-2 border-white"></span>
              </span>
            )}
          </button>

          {/* Gran Botón Estilo Monopolio GO */}
          <button
            type="button"
            onClick={handleRollClick}
            disabled={disabled || isRolling || animating}
            className={`w-full px-6 py-3.5 rounded-2xl text-base font-black uppercase tracking-wider transition-all shadow-xl ${
              disabled
                ? "bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed"
                : "bg-gradient-to-r from-emerald-500 via-green-500 to-emerald-600 hover:from-emerald-400 hover:to-green-500 text-white border-2 border-emerald-300 ring-4 ring-emerald-500/30 active:scale-95 shadow-emerald-900/50"
            }`}
          >
            {animating ? "Tirando..." : "🎲 ¡TIRAR DADO!"}
          </button>
        </div>
      ) : (
        /* Modo Manual para Facilitadores con dados de espuma */
        <div className="w-full space-y-2">
          <p className="text-2xs text-slate-400 text-center">
            Selecciona el número obtenido en el dado de espuma del taller:
          </p>
          <div className="grid grid-cols-6 gap-2">
            {[1, 2, 3, 4, 5, 6].map((num) => (
              <button
                key={num}
                type="button"
                disabled={disabled}
                onClick={() => handleManualSelect(num)}
                className={`h-12 rounded-xl font-black text-lg transition-all border ${
                  disabled
                    ? "bg-slate-800 text-slate-600 border-slate-700 cursor-not-allowed"
                    : "bg-slate-800 hover:bg-emerald-600 hover:border-emerald-400 text-white border-slate-600 active:scale-95 shadow-md"
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
        <div className="mt-3 text-2xs font-extrabold px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/40 animate-pulse text-center">
          {consecutiveSixes === 1 && "🔥 ¡Sacó 6! Repite lanzamiento tras resolver"}
          {consecutiveSixes === 2 && "⚡ ¡2do seis! Un 3er seis cede el avance por solidaridad"}
          {consecutiveSixes >= 3 && "🤝 ¡3er seis consecutivo! Se cede el avance por solidaridad"}
        </div>
      )}
    </div>
  );
};
