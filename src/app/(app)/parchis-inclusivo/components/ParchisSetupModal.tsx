"use client";

import React, { useState } from "react";
import type { TeamColor } from "@/lib/parchis/types";
import { TEAM_CONFIG } from "@/lib/parchis/parchisEngine";
import { parchisAudio } from "@/lib/parchis/parchisAudio";

interface ParchisSetupModalProps {
  isOpen: boolean;
  onStartGame: (
    selectedColors: TeamColor[],
    pawnsCount: number,
    customNames: Partial<Record<TeamColor, string>>,
    initialRolls: Record<TeamColor, number>
  ) => void;
}

const ALL_COLORS: TeamColor[] = ["AMARILLO", "VERDE", "VIOLETA", "AZUL"];

export const ParchisSetupModal: React.FC<ParchisSetupModalProps> = ({
  isOpen,
  onStartGame,
}) => {
  const [selectedColors, setSelectedColors] = useState<TeamColor[]>([
    "AMARILLO",
    "VERDE",
    "VIOLETA",
    "AZUL",
  ]);
  const [pawnsCount, setPawnsCount] = useState<number>(2);
  const [customNames, setCustomNames] = useState<Record<TeamColor, string>>({
    AMARILLO: "Equipo Amarillo (Identidad)",
    VERDE: "Equipo Verde (Diversidad)",
    VIOLETA: "Equipo Violeta (Justicia)",
    AZUL: "Equipo Azul (Cambio Social)",
  });

  const [step, setStep] = useState<"CONFIG" | "ROLL_OFF">("CONFIG");
  const [rollOffResults, setRollOffResults] = useState<Record<TeamColor, number>>({
    AMARILLO: 0,
    VERDE: 0,
    VIOLETA: 0,
    AZUL: 0,
  });

  if (!isOpen) return null;

  const toggleColor = (c: TeamColor) => {
    if (selectedColors.includes(c)) {
      if (selectedColors.length <= 2) return; // Mínimo 2 equipos
      setSelectedColors(selectedColors.filter((col) => col !== c));
    } else {
      setSelectedColors([...selectedColors, c]);
    }
  };

  const handleNameChange = (c: TeamColor, val: string) => {
    setCustomNames({ ...customNames, [c]: val });
  };

  const rollForTeam = (c: TeamColor) => {
    parchisAudio.playDiceRoll();
    const roll = Math.floor(Math.random() * 6) + 1;
    setRollOffResults((prev) => ({ ...prev, [c]: roll }));
  };

  const allRolled = selectedColors.every((c) => rollOffResults[c] > 0);

  const handleFinishSetup = () => {
    onStartGame(selectedColors, pawnsCount, customNames, rollOffResults);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Cabecera */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🎲</span>
            <div>
              <h2 className="text-xl font-black tracking-tight">
                Parchís Inclusivo — Configuración del Taller
              </h2>
              <p className="text-xs text-blue-200">
                Programa «Respiramos Inclusión» — World Vision & ACNUR
              </p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-white/10 text-white border border-white/20">
            {step === "CONFIG" ? "Paso 1 de 2: Equipos" : "Paso 2 de 2: Desempate"}
          </span>
        </div>

        {/* Contenido paso 1: Configuración */}
        {step === "CONFIG" ? (
          <div className="p-6 md:p-8 space-y-6 flex-1 overflow-y-auto">
            {/* Selección de número de fichas */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Fichas por equipo:
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[2, 3, 4].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setPawnsCount(n)}
                    className={`py-2.5 px-4 rounded-xl border text-sm font-bold transition-all ${
                      pawnsCount === n
                        ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                        : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                    }`}
                  >
                    {n} fichas {n === 2 && "(Recomendado para talleres 45m)"}
                  </button>
                ))}
              </div>
            </div>

            {/* Equipos participantes */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Equipos y Nombres (2 a 4 equipos):
              </label>
              <div className="space-y-3">
                {ALL_COLORS.map((color) => {
                  const isSelected = selectedColors.includes(color);
                  const conf = TEAM_CONFIG[color];

                  return (
                    <div
                      key={color}
                      className={`flex items-center gap-3 p-3.5 rounded-2xl border transition-all ${
                        isSelected
                          ? "bg-white border-slate-300 shadow-xs"
                          : "bg-slate-50 border-slate-200 opacity-60"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => toggleColor(color)}
                        className={`w-6 h-6 rounded-lg flex items-center justify-center border font-bold text-xs transition-all ${
                          isSelected
                            ? "bg-blue-600 text-white border-blue-600"
                            : "bg-white border-slate-300 text-transparent"
                        }`}
                      >
                        ✓
                      </button>

                      <span
                        className="w-4 h-4 rounded-full flex-shrink-0"
                        style={{ backgroundColor: conf.colorHex }}
                      />

                      <input
                        type="text"
                        disabled={!isSelected}
                        value={customNames[color]}
                        onChange={(e) => handleNameChange(color, e.target.value)}
                        className="flex-1 bg-transparent border-b border-slate-300 focus:border-blue-600 focus:outline-none text-sm font-bold text-slate-900 px-1 py-0.5"
                        placeholder={`Nombre para ${color}`}
                      />

                      <span className="text-xs font-medium text-slate-500 hidden sm:inline">
                        Inicia en casillero #{conf.startSquare}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          /* Paso 2: Desempate inicial con dados */
          <div className="p-6 md:p-8 space-y-6 flex-1 overflow-y-auto">
            <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200">
              <h3 className="text-sm font-black text-blue-950 mb-1">
                🎲 Desempate Inicial (Regla Oficial #2)
              </h3>
              <p className="text-xs text-blue-800 leading-relaxed">
                Antes de iniciar, cada equipo lanza el dado; quien saque el número más alto
                comienza la partida. Haz clic en el botón de cada equipo para registrar su tiro.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {selectedColors.map((color) => {
                const conf = TEAM_CONFIG[color];
                const roll = rollOffResults[color];

                return (
                  <div
                    key={color}
                    className="p-4 rounded-2xl border border-slate-200 bg-white flex items-center justify-between shadow-xs"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: conf.colorHex }}
                      />
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">
                          {customNames[color]}
                        </h4>
                        <span className="text-xs text-slate-500">
                          {roll > 0 ? `Dado obtenido: ${roll}` : "Pendiente de lanzar"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {roll > 0 && (
                        <div className="w-10 h-10 rounded-xl bg-slate-900 text-white font-black text-lg flex items-center justify-center shadow-xs">
                          {roll}
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => rollForTeam(color)}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-700 transition-all"
                      >
                        {roll > 0 ? "Reintentar" : "Lanzar"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Botones inferiores */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          {step === "ROLL_OFF" ? (
            <button
              type="button"
              onClick={() => setStep("CONFIG")}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900"
            >
              ← Volver a Equipos
            </button>
          ) : (
            <div />
          )}

          {step === "CONFIG" ? (
            <button
              type="button"
              onClick={() => setStep("ROLL_OFF")}
              className="px-6 py-2.5 rounded-xl text-sm font-black bg-blue-600 text-white hover:bg-blue-700 shadow-md transition-all"
            >
              Continuar al Desempate Inicial →
            </button>
          ) : (
            <button
              type="button"
              disabled={!allRolled}
              onClick={handleFinishSetup}
              className={`px-6 py-2.5 rounded-xl text-sm font-black transition-all ${
                allRolled
                  ? "bg-emerald-600 text-white hover:bg-emerald-700 shadow-md ring-2 ring-emerald-500/20"
                  : "bg-slate-200 text-slate-400 cursor-not-allowed"
              }`}
            >
              🚀 ¡Iniciar Partida!
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
