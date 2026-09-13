"use client";

import React, { useEffect } from "react";
import type { Team, TeamColor, PawnState, BonusChoice } from "@/lib/parchis/types";
import { parchisAudio } from "@/lib/parchis/parchisAudio";

interface ParchisCelebrationModalProps {
  isOpen: boolean;
  type: "GOAL" | "GAME_OVER" | "TRIPLE_SIX";
  winningTeam?: Team;
  currentTeam: Team;
  bonusChoice: BonusChoice | null;
  onApplyBonus: (targetTeamColor: TeamColor, targetPawnId?: string) => void;
  onRestartGame?: () => void;
}

export const ParchisCelebrationModal: React.FC<ParchisCelebrationModalProps> = ({
  isOpen,
  type,
  winningTeam,
  currentTeam,
  bonusChoice,
  onApplyBonus,
  onRestartGame,
}) => {
  useEffect(() => {
    if (isOpen) {
      parchisAudio.playFanfare();
    }
  }, [isOpen, type]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border-4 border-amber-400 overflow-hidden flex flex-col max-h-[90vh] text-center p-6 md:p-8 animate-scale-up">
        {/* Título e Ícono de Celebración */}
        <div className="flex flex-col items-center space-y-3">
          <span className="text-6xl animate-bounce">
            {type === "GAME_OVER" ? "🏆" : type === "GOAL" ? "🌟" : "🤝"}
          </span>

          {type === "GAME_OVER" && (
            <>
              <span className="px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest bg-amber-100 text-amber-900 border border-amber-300">
                ¡Gran Victoria Inclusiva!
              </span>
              <h2 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tight">
                ¡{winningTeam?.name || currentTeam.name} coronó todas sus fichas!
              </h2>
              <p className="text-sm md:text-base text-slate-600 max-w-lg mx-auto">
                Felicitaciones a toda la comunidad educativa. Han demostrado compromiso, reflexión y
                trabajo en equipo en cada casillero.
              </p>
            </>
          )}

          {type === "GOAL" && (
            <>
              <span className="px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest bg-emerald-100 text-emerald-900 border border-emerald-300">
                ¡Ficha en la Meta Central!
              </span>
              <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
                ¡{currentTeam.name} llegó a la Meta!
              </h2>
              <div className="p-4 rounded-2xl bg-amber-50 border-2 border-dashed border-amber-300 w-full text-amber-950">
                <p className="font-extrabold text-base md:text-lg">
                  📣 ¡Canten su Barra Inclusiva con entusiasmo!
                </p>
                <p className="text-xs text-amber-800 mt-1">
                  Regla Oficial #10: Al llegar una ficha a la meta, el equipo canta su barra inclusiva y
                  elige el destino de sus +10 casilleros de bonificación.
                </p>
              </div>
            </>
          )}

          {type === "TRIPLE_SIX" && (
            <>
              <span className="px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest bg-purple-100 text-purple-900 border border-purple-300">
                Regla Oficial #9 — Solidaridad e Inclusión
              </span>
              <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
                ¡Tres Seises Consecutivos!
              </h2>
              <p className="text-sm text-slate-600 max-w-lg mx-auto">
                Como acto de solidaridad e inclusión comunitaria, el avance del tercer seis (+6 casilleros)
                se cede obligatoriamente al equipo que va en mayor desventaja.
              </p>
            </>
          )}
        </div>

        {/* Opciones de Bonificación */}
        {bonusChoice && (
          <div className="my-6 space-y-3 text-left">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-500">
              Selecciona el destino del bono ({bonusChoice.type === "GOAL_TEN" ? "+10 casilleros" : "+6 casilleros"}):
            </h4>
            <div className="grid grid-cols-1 gap-2.5 max-h-48 overflow-y-auto pr-1">
              {bonusChoice.availableOptions.map((opt, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onApplyBonus(opt.targetTeamColor, opt.targetPawnId)}
                  className={`p-3.5 rounded-2xl border text-sm font-bold flex items-center justify-between transition-all ${
                    opt.isDisadvantaged
                      ? "bg-amber-50 hover:bg-amber-100 border-amber-300 text-amber-950 shadow-xs"
                      : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{opt.isDisadvantaged ? "🤝" : "🚀"}</span>
                    <span>{opt.description}</span>
                  </div>
                  {opt.isDisadvantaged && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-black bg-amber-200 text-amber-900">
                      Equipo en desventaja
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Botón de Fin de Partida */}
        {type === "GAME_OVER" && onRestartGame && (
          <div className="mt-6">
            <button
              type="button"
              onClick={onRestartGame}
              className="px-8 py-3 rounded-2xl text-base font-black bg-emerald-600 text-white hover:bg-emerald-700 shadow-xl ring-4 ring-emerald-500/20 transition-all"
            >
              🔄 Iniciar Nueva Partida de Taller
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
