"use client";

import React, { useState, useEffect } from "react";
import type { SquareDefinition, BackupQuestion, Team } from "@/lib/parchis/types";
import { EJES_INFO, BACKUP_QUESTIONS } from "@/lib/parchis/parchisCatalog";
import { parchisAudio } from "@/lib/parchis/parchisAudio";

interface ParchisQuestionModalProps {
  square: SquareDefinition;
  team: Team;
  isOpen: boolean;
  onSuccess: (square: SquareDefinition) => void;
  onFail: () => void;
}

export const ParchisQuestionModal: React.FC<ParchisQuestionModalProps> = ({
  square,
  team,
  isOpen,
  onSuccess,
  onFail,
}) => {
  const [selectedBackup, setSelectedBackup] = useState<BackupQuestion | null>(null);
  const [showBackupList, setShowBackupList] = useState(false);

  const eje = EJES_INFO[square.eje];

  useEffect(() => {
    if (isOpen) {
      setSelectedBackup(null);
      setShowBackupList(false);
      parchisAudio.playCardReveal();
    }
  }, [isOpen, square]);

  if (!isOpen) return null;

  const activeText = selectedBackup ? selectedBackup.text : square.text;

  // Fondo estilizado según el eje oficial
  const getEjeBadgeColor = () => {
    switch (square.zone) {
      case "AMARILLO":
        return "bg-amber-100 text-amber-900 border-amber-300 ring-amber-400/30";
      case "VERDE":
        return "bg-emerald-100 text-emerald-900 border-emerald-300 ring-emerald-400/30";
      case "VIOLETA":
        return "bg-purple-100 text-purple-900 border-purple-300 ring-purple-400/30";
      case "AZUL":
        return "bg-sky-100 text-sky-900 border-sky-300 ring-sky-400/30";
    }
  };

  const getBorderColor = () => {
    switch (square.zone) {
      case "AMARILLO":
        return "border-amber-400 shadow-amber-500/10";
      case "VERDE":
        return "border-emerald-400 shadow-emerald-500/10";
      case "VIOLETA":
        return "border-purple-400 shadow-purple-500/10";
      case "AZUL":
        return "border-sky-400 shadow-sky-500/10";
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border-4 ${getBorderColor()} overflow-hidden flex flex-col max-h-[90vh] transition-all transform animate-scale-up`}
      >
        {/* Barra superior de identificación de equipo y eje */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-6 py-4 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <span
              className="w-4 h-4 rounded-full ring-2 ring-white shadow-xs"
              style={{ backgroundColor: team.colorHex }}
            />
            <span className="font-bold text-slate-800 text-sm md:text-base">
              Turno: <span style={{ color: team.colorHex }}>{team.name}</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border shadow-xs ${getEjeBadgeColor()}`}
            >
              {eje.icon} EJE: {eje.name}
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-black bg-slate-900 text-white shadow-xs">
              CASILLERO #{square.number}
            </span>
          </div>
        </div>

        {/* Cuerpo de la tarjeta: optimizado para auditorio y pantalla grande */}
        <div className="p-6 md:p-10 flex-1 overflow-y-auto space-y-6">
          {/* Etiquetas especiales (Zona inclusiva, Actividad grupal, Retrocede) */}
          {square.tag && (
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs md:text-sm font-black bg-slate-100 text-slate-700 border border-slate-300 shadow-xs">
              {square.isInclusiveZone && "🤝 ZONA INCLUSIVA — "}
              {square.returnToStart && "⚠️ RETROCESO — "}
              {square.advanceBonus && `🚀 BONIFICACIÓN (+${square.advanceBonus}) — `}
              {square.tag}
            </div>
          )}

          {/* Título temático */}
          <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight leading-snug">
            {selectedBackup ? `Pregunta de Respaldo [${selectedBackup.letter}]` : square.title}
          </h2>

          {/* Pregunta o Reto en tipografía grande de alto contraste */}
          <div className="p-6 md:p-8 rounded-2xl bg-slate-50 border-2 border-slate-200 shadow-inner">
            <p className="text-xl md:text-3xl font-extrabold text-slate-950 leading-relaxed md:leading-normal tracking-wide">
              {activeText}
            </p>
          </div>

          {/* Selector desplegable de preguntas de respaldo A-K si el grupo tiene dudas */}
          {showBackupList && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-amber-900 uppercase tracking-wider">
                  📖 Preguntas de Respaldo Oficiales (A–K)
                </h4>
                <button
                  type="button"
                  onClick={() => setShowBackupList(false)}
                  className="text-xs text-amber-800 hover:underline"
                >
                  Cerrar lista
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                {BACKUP_QUESTIONS.map((bq) => (
                  <button
                    key={bq.letter}
                    type="button"
                    onClick={() => {
                      setSelectedBackup(bq);
                      setShowBackupList(false);
                    }}
                    className={`text-left p-2.5 rounded-lg text-xs font-medium border transition-all ${
                      selectedBackup?.letter === bq.letter
                        ? "bg-amber-600 text-white border-amber-700 shadow-xs"
                        : "bg-white hover:bg-amber-100 text-slate-800 border-amber-200"
                    }`}
                  >
                    <strong className="font-black">[{bq.letter}]</strong> {bq.text}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Acciones de facilitación en el pie del modal */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 bg-slate-50 border-t border-slate-200">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setShowBackupList(!showBackupList)}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs md:text-sm font-bold bg-white text-slate-700 border border-slate-300 hover:bg-slate-100 hover:text-slate-900 shadow-xs transition-all"
            >
              🔄 {selectedBackup ? "Cambiar Respaldo" : "Usar Pregunta de Respaldo"}
            </button>
            {selectedBackup && (
              <button
                type="button"
                onClick={() => setSelectedBackup(null)}
                className="px-3 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 underline"
              >
                Volver a original
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onFail}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs md:text-sm font-bold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 shadow-xs transition-all"
              title="La ficha no avanza y se queda en su casillero anterior"
            >
              ❌ No resolvió (no avanza)
            </button>
            <button
              type="button"
              onClick={() => onSuccess(square)}
              className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-xs md:text-sm font-black bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95 shadow-md ring-2 ring-emerald-500/20 transition-all"
            >
              ✅ Reto Resuelto
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
