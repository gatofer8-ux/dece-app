"use client";

import React, { useState, useEffect } from "react";
import type {
  Team,
  TeamColor,
  PawnState,
  SquareDefinition,
  ParchisGameState,
  BonusChoice,
  FiveChoice,
} from "@/lib/parchis/types";
import {
  createInitialGameState,
  calculateNextPosition,
  evaluateLanding,
  getDisadvantagedTeams,
  addLog,
  advanceToNextTeam,
  applyRollOffResults,
  TEAM_CONFIG,
  META_POSITION,
} from "@/lib/parchis/parchisEngine";
import { getSquareByNumber, OFFICIAL_CREDIT } from "@/lib/parchis/parchisCatalog";
import { loadParchisState, saveParchisState, clearParchisState } from "@/lib/parchis/parchisStorage";
import { parchisAudio } from "@/lib/parchis/parchisAudio";

import { ParchisBoard } from "./components/ParchisBoard";
import { ParchisDice } from "./components/ParchisDice";
import { ParchisQuestionModal } from "./components/ParchisQuestionModal";
import { ParchisSetupModal } from "./components/ParchisSetupModal";
import { ParchisCelebrationModal } from "./components/ParchisCelebrationModal";
import { ParchisFacilitatorDrawer } from "./components/ParchisFacilitatorDrawer";

export default function ParchisInclusivoApp() {
  const [state, setState] = useState<ParchisGameState>(() => {
    return loadParchisState() || createInitialGameState();
  });

  const [setupModalOpen, setSetupModalOpen] = useState<boolean>(false);
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const [inspectModalSquare, setInspectModalSquare] = useState<SquareDefinition | null>(null);
  const [isRollingAnimation, setIsRollingAnimation] = useState<boolean>(false);

  // Guardar estado en localStorage al cambiar
  useEffect(() => {
    saveParchisState(state);
  }, [state]);

  // Si no se ha completado el desempate inicial, abrir modal
  useEffect(() => {
    if (state.turnPhase === "SETUP" || state.turnPhase === "ROLL_OFF") {
      setSetupModalOpen(true);
    }
  }, [state.turnPhase]);

  const currentTeam = state.teams[state.currentTeamIndex] || state.teams[0];

  // Determinar qué fichas del equipo activo son seleccionables
  const getSelectablePawnIds = (): string[] => {
    if (state.turnPhase !== "SELECTING_PAWN" || state.diceValue === null) return [];

    const dice = state.diceValue;
    return currentTeam.pawns
      .filter((p) => {
        if (p.isAtGoal) return false;
        // Si está en base, solo puede salir si sacó 5
        if (p.isAtBase) return dice === 5;
        // Si está en el tablero o rampa, siempre puede moverse
        return true;
      })
      .map((p) => p.id);
  };

  const selectablePawnIds = getSelectablePawnIds();

  // 1. Manejo del tiro de dado
  const handleRollDice = (outcome: number) => {
    setIsRollingAnimation(false);

    let nextConsecutive = outcome === 6 ? state.consecutiveSixes + 1 : 0;

    let updatedLogs = addLog(
      state,
      currentTeam.color,
      `🎲 ${currentTeam.name} lanzó el dado y obtuvo un ${outcome}.`,
      "ROLL"
    );

    // REGLA 9: Si es el 3er seis consecutivo -> se cede el avance al equipo en desventaja
    if (nextConsecutive >= 3) {
      const disadvantaged = getDisadvantagedTeams(state.teams, currentTeam.color);
      const targetTeam = disadvantaged[0] || state.teams.find((t) => t.color !== currentTeam.color);

      const bonusChoice: BonusChoice = {
        type: "TRIPLE_SIX",
        fromTeamColor: currentTeam.color,
        availableOptions: state.teams
          .filter((t) => t.color !== currentTeam.color)
          .map((t) => ({
            targetTeamColor: t.color,
            description: `Ceder avance de 6 casilleros a ${t.name}`,
            isDisadvantaged: disadvantaged.some((d) => d.color === t.color),
          })),
      };

      updatedLogs = addLog(
        state,
        currentTeam.color,
        `🤝 ¡3er seis consecutivo! Se cede el avance de 6 casilleros al equipo en desventaja por solidaridad.`,
        "SOLIDARITY"
      );

      setState({
        ...state,
        diceValue: outcome,
        consecutiveSixes: 3,
        turnPhase: "SELECTING_BONUS_DESTINATION",
        bonusChoice,
        logs: updatedLogs,
      });
      return;
    }

    // Verificar si alguna ficha puede moverse
    const canMovePawns = currentTeam.pawns.filter((p) => {
      if (p.isAtGoal) return false;
      if (p.isAtBase) return outcome === 5;
      return true;
    });

    if (canMovePawns.length === 0) {
      // Ninguna ficha puede moverse (ej: todas en base y no sacó 5)
      updatedLogs = addLog(
        state,
        currentTeam.color,
        `No tiene fichas en juego y no sacó 5. Pasa el turno al siguiente equipo.`,
        "MOVE"
      );

      const nextState = advanceToNextTeam({
        ...state,
        diceValue: outcome,
        consecutiveSixes: 0,
        logs: updatedLogs,
      });
      setState(nextState);
      return;
    }

    // Si solo hay una ficha que puede moverse, o si hay varias
    setState({
      ...state,
      diceValue: outcome,
      consecutiveSixes: nextConsecutive,
      turnPhase: "SELECTING_PAWN",
      logs: updatedLogs,
    });
  };

  // 2. Selección de ficha para mover
  const handleSelectPawn = (pawn: PawnState) => {
    if (state.turnPhase !== "SELECTING_PAWN" || state.diceValue === null) return;
    if (pawn.teamColor !== currentTeam.color) return;

    // REGLA 5: Si sacó 5 y la ficha está en el tablero, opción de avanzar 5 o reiniciar en inicio
    if (state.diceValue === 5 && !pawn.isAtBase && !pawn.isAtGoal) {
      setState({
        ...state,
        activePawnId: pawn.id,
        turnPhase: "CHOOSING_FIVE_ACTION",
        fiveChoice: {
          teamColor: currentTeam.color,
          pawnId: pawn.id,
          advanceOption: {
            pawnId: pawn.id,
            targetSquare: (pawn.position - 1 + 5) % 68 + 1,
            description: `Avanzar 5 casilleros hacia el #${(pawn.position - 1 + 5) % 68 + 1}`,
          },
          startOption: {
            pawnId: pawn.id,
            targetSquare: currentTeam.startSquare,
            description: `Colocar / reiniciar en el casillero de inicio #${currentTeam.startSquare}`,
          },
        },
      });
      return;
    }

    executePawnMove(pawn, state.diceValue);
  };

  // Ejecución física del movimiento de la ficha
  const executePawnMove = (pawn: PawnState, steps: number) => {
    parchisAudio.playStep();

    const originalPos = pawn.position;
    const moveResult = calculateNextPosition(currentTeam, pawn, steps);
    const landing = evaluateLanding(state, currentTeam, pawn, moveResult.newPosition, steps);

    if (landing.isBouncedByBarrier) {
      parchisAudio.playBarrier();
    } else if (landing.capturedPawn) {
      parchisAudio.playCapture();
    }

    // Actualizar fichas de los equipos
    let updatedTeams = state.teams.map((t) => {
      // Si este equipo tuvo una ficha capturada por acto discriminatorio
      if (landing.capturedPawn && t.color === landing.capturedTeam) {
        return {
          ...t,
          pawns: t.pawns.map((p) =>
            p.id === landing.capturedPawn!.id
              ? { ...p, position: 0, stepsMoved: 0, isAtBase: true }
              : p
          ),
        };
      }

      // Si es el equipo que se está moviendo
      if (t.color === currentTeam.color) {
        return {
          ...t,
          pawns: t.pawns.map((p) => {
            if (p.id === pawn.id) {
              const finalPos = landing.finalPosition;
              const isGoal = finalPos === META_POSITION;
              return {
                ...p,
                position: finalPos,
                stepsMoved: moveResult.newStepsMoved + landing.bonusAdvance,
                isAtBase: false,
                isAtGoal: isGoal,
              };
            }
            return p;
          }),
        };
      }
      return t;
    });

    let updatedLogs = [...state.logs];
    landing.logs.forEach((l) => {
      updatedLogs = addLog({ ...state, logs: updatedLogs }, currentTeam.color, l.message, l.type);
    });

    // Caso A: Llegó a la META central (Regla 10 y 11)
    if (landing.finalPosition === META_POSITION) {
      const teamAfter = updatedTeams.find((t) => t.color === currentTeam.color)!;
      const goalsNow = teamAfter.pawns.filter((p) => p.isAtGoal).length;
      teamAfter.goalsFinished = goalsNow;

      if (goalsNow >= teamAfter.pawns.length) {
        // Victoria absoluta
        setState({
          ...state,
          teams: updatedTeams,
          turnPhase: "GAME_OVER",
          winnerTeam: currentTeam.color,
          logs: addLog(
            { ...state, logs: updatedLogs },
            currentTeam.color,
            `🏆 ¡${currentTeam.name} ha llevado todas sus fichas a la meta y gana la partida!`,
            "GOAL"
          ),
        });
        return;
      }

      // Ofrecer bono de 10 casilleros
      const disadvantaged = getDisadvantagedTeams(updatedTeams, currentTeam.color);
      const otherPawns = teamAfter.pawns.filter((p) => !p.isAtGoal);

      const bonusChoice: BonusChoice = {
        type: "GOAL_TEN",
        fromTeamColor: currentTeam.color,
        availableOptions: [
          ...otherPawns.map((p) => ({
            targetTeamColor: currentTeam.color,
            targetPawnId: p.id,
            description: `Avanzar +10 casilleros con la ficha #${p.pawnNumber}`,
            isDisadvantaged: false,
          })),
          ...updatedTeams
            .filter((t) => t.color !== currentTeam.color)
            .map((t) => ({
              targetTeamColor: t.color,
              description: `Ceder +10 casilleros de solidaridad a ${t.name}`,
              isDisadvantaged: disadvantaged.some((d) => d.color === t.color),
            })),
        ],
      };

      setState({
        ...state,
        teams: updatedTeams,
        turnPhase: "CELEBRATING_GOAL",
        bonusChoice,
        logs: updatedLogs,
      });
      return;
    }

    // Caso B: Si está en rampa (101..107), no hay reto ni tarjeta, pasa o repite si sacó 6
    if (landing.finalPosition >= 101 && landing.finalPosition <= 107) {
      if (state.diceValue === 6 && state.consecutiveSixes < 3) {
        setState({
          ...state,
          teams: updatedTeams,
          turnPhase: "WAITING_ROLL",
          diceValue: null,
          logs: addLog(
            { ...state, logs: updatedLogs },
            currentTeam.color,
            `¡Sacó 6 en la rampa! Vuelve a lanzar el dado.`,
            "ROLL"
          ),
        });
      } else {
        const nextState = advanceToNextTeam({
          ...state,
          teams: updatedTeams,
          logs: updatedLogs,
        });
        setState(nextState);
      }
      return;
    }

    // Caso C: Cayó en un casillero del circuito (1..68) -> Abrir Modal de Reto/Pregunta
    const targetSq = getSquareByNumber(landing.finalPosition);
    if (targetSq) {
      setState({
        ...state,
        teams: updatedTeams,
        activePawnId: pawn.id,
        positionBeforeTurn: originalPos,
        activeSquare: targetSq,
        turnPhase: "RESOLVING_QUESTION",
        logs: updatedLogs,
      });
    } else {
      // Fallback si no hay casillero
      const nextState = advanceToNextTeam({
        ...state,
        teams: updatedTeams,
        logs: updatedLogs,
      });
      setState(nextState);
    }
  };

  // 3. Resolución de Reto: Éxito
  const handleQuestionSuccess = (square: SquareDefinition) => {
    let updatedLogs = addLog(
      state,
      currentTeam.color,
      `✅ ${currentTeam.name} resolvió con éxito el reto del casillero #${square.number}: «${square.title}».`,
      "QUESTION"
    );

    let updatedTeams = [...state.teams];

    // Manejar retroceso al inicio si es casillero de prejuicio (10, 27, 44, 61)
    if (square.returnToStart && state.activePawnId) {
      updatedTeams = updatedTeams.map((t) => {
        if (t.color === currentTeam.color) {
          return {
            ...t,
            pawns: t.pawns.map((p) =>
              p.id === state.activePawnId
                ? { ...p, position: 0, stepsMoved: 0, isAtBase: true }
                : p
            ),
          };
        }
        return t;
      });

      updatedLogs = addLog(
        state,
        currentTeam.color,
        `⚠️ La ficha regresa al inicio del camino a reflexionar y restaurar la convivencia.`,
        "MOVE"
      );
    }

    // Manejar bonificación especial de avance (ej: +2 en casilleros especiales)
    if (square.advanceBonus && !square.returnToStart && state.activePawnId) {
      const activePawn = currentTeam.pawns.find((p) => p.id === state.activePawnId);
      if (activePawn) {
        const bonusMove = calculateNextPosition(currentTeam, activePawn, square.advanceBonus);
        updatedTeams = updatedTeams.map((t) => {
          if (t.color === currentTeam.color) {
            return {
              ...t,
              pawns: t.pawns.map((p) =>
                p.id === state.activePawnId
                  ? { ...p, position: bonusMove.newPosition, stepsMoved: bonusMove.newStepsMoved }
                  : p
              ),
            };
          }
          return t;
        });

        updatedLogs = addLog(
          state,
          currentTeam.color,
          `🚀 ¡Bonificación del casillero! Avanza +${square.advanceBonus} casilleros adicionales.`,
          "BONUS"
        );
      }
    }

    // Si sacó 6 y no es el 3er seis consecutivo, tiene otro tiro
    if (state.diceValue === 6 && state.consecutiveSixes < 3) {
      setState({
        ...state,
        teams: updatedTeams,
        activeSquare: null,
        activePawnId: null,
        diceValue: null,
        turnPhase: "WAITING_ROLL",
        logs: addLog(
          { ...state, logs: updatedLogs },
          currentTeam.color,
          `🔥 ¡Sacó 6! ${currentTeam.name} vuelve a lanzar el dado.`,
          "ROLL"
        ),
      });
    } else {
      // Pasa al siguiente equipo
      const nextState = advanceToNextTeam({
        ...state,
        teams: updatedTeams,
        logs: updatedLogs,
      });
      setState(nextState);
    }
  };

  // 4. Resolución de Reto: Fallo (la ficha se queda donde estaba antes del tiro)
  const handleQuestionFail = () => {
    let updatedLogs = addLog(
      state,
      currentTeam.color,
      `❌ No se resolvió el reto. La ficha se queda en su casillero anterior (no avanzó).`,
      "QUESTION"
    );

    // Revertir posición de la ficha al valor previo al tiro
    const updatedTeams = state.teams.map((t) => {
      if (t.color === currentTeam.color) {
        return {
          ...t,
          pawns: t.pawns.map((p) => {
            if (p.id === state.activePawnId && state.positionBeforeTurn !== null) {
              return {
                ...p,
                position: state.positionBeforeTurn,
                isAtBase: state.positionBeforeTurn === 0,
              };
            }
            return p;
          }),
        };
      }
      return t;
    });

    const nextState = advanceToNextTeam({
      ...state,
      teams: updatedTeams,
      logs: updatedLogs,
    });
    setState(nextState);
  };

  // 5. Aplicar bonificación (+10 de meta o triple seis a equipo en desventaja)
  const handleApplyBonus = (targetTeamColor: TeamColor, targetPawnId?: string) => {
    const bonusSteps = state.bonusChoice?.type === "GOAL_TEN" ? 10 : 6;
    const targetTeam = state.teams.find((t) => t.color === targetTeamColor)!;

    // Buscar qué ficha mover
    let pawnToMove = targetTeam.pawns.find((p) => p.id === targetPawnId);
    if (!pawnToMove) {
      pawnToMove = targetTeam.pawns.find((p) => !p.isAtGoal);
    }

    if (pawnToMove) {
      const moveResult = calculateNextPosition(targetTeam, pawnToMove, bonusSteps);
      const updatedTeams = state.teams.map((t) => {
        if (t.color === targetTeamColor) {
          return {
            ...t,
            pawns: t.pawns.map((p) =>
              p.id === pawnToMove!.id
                ? {
                    ...p,
                    position: moveResult.newPosition,
                    stepsMoved: moveResult.newStepsMoved,
                    isAtBase: false,
                    isAtGoal: moveResult.reachedGoal,
                  }
                : p
            ),
          };
        }
        return t;
      });

      const updatedLogs = addLog(
        state,
        targetTeamColor,
        `🎁 ${targetTeam.name} recibió +${bonusSteps} casilleros por bono de solidaridad.`,
        "BONUS"
      );

      const nextState = advanceToNextTeam({
        ...state,
        teams: updatedTeams,
        bonusChoice: null,
        logs: updatedLogs,
      });
      setState(nextState);
    } else {
      const nextState = advanceToNextTeam({
        ...state,
        bonusChoice: null,
      });
      setState(nextState);
    }
  };

  // 6. Iniciar partida desde el modal de setup
  const handleStartGame = (
    selectedColors: TeamColor[],
    pawnsCount: number,
    customNames: Partial<Record<TeamColor, string>>,
    initialRolls: Record<TeamColor, number>
  ) => {
    let newState = createInitialGameState(selectedColors, pawnsCount, customNames);
    newState = applyRollOffResults(newState, initialRolls);
    setState(newState);
    setSetupModalOpen(false);
  };

  // 7. Reiniciar partida
  const handleResetGame = () => {
    clearParchisState();
    const fresh = createInitialGameState();
    setState(fresh);
    setSetupModalOpen(true);
  };

  // Toggle de sonido
  const handleToggleSound = () => {
    const nextVal = !state.soundEnabled;
    parchisAudio.setEnabled(nextVal);
    setState({ ...state, soundEnabled: nextVal });
  };

  // Pantalla completa para proyector 16:9
  const handleToggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-between text-slate-900 pb-8">
      {/* 1. BARRA SUPERIOR DE FACILITACIÓN */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 md:px-8 py-3 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🎲</span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg md:text-xl font-black text-slate-900 tracking-tight">
                  Parchís Inclusivo
                </h1>
                <span className="hidden sm:inline px-2.5 py-0.5 rounded-full text-2xs font-extrabold bg-blue-100 text-blue-800 border border-blue-200">
                  Respiramos Inclusión
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Herramienta digital de facilitación en vivo para talleres DECE
              </p>
            </div>
          </div>

          {/* Botones de acción rápida de facilitación */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleToggleFullScreen}
              className="p-2 md:px-3.5 md:py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all flex items-center gap-1.5"
              title="Pantalla Completa para Proyector (16:9)"
            >
              <span>🖥️</span>
              <span className="hidden md:inline">Modo Proyector</span>
            </button>

            <button
              type="button"
              onClick={handleToggleSound}
              className="p-2 md:px-3 md:py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all"
              title="Activar / Desactivar Sonido"
            >
              {state.soundEnabled ? "🔊" : "🔇"}
            </button>

            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="px-3.5 py-2 rounded-xl text-xs font-black bg-blue-600 text-white hover:bg-blue-700 shadow-xs transition-all flex items-center gap-1.5"
            >
              <span>🧰</span>
              <span className="hidden sm:inline">Caja de Herramientas</span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. ÁREA PRINCIPAL: TABLERO + PANEL DE TURNO EN VIVO */}
      <main className="max-w-7xl mx-auto w-full px-4 md:px-8 py-6 flex-1">
        {/* BANNER DE TURNO GUIADO PASO A PASO */}
        <div className="mb-6 p-4 md:p-5 rounded-3xl bg-white border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-white text-xl shadow-md flex-shrink-0"
              style={{ backgroundColor: currentTeam.colorHex }}
            >
              {currentTeam.color[0]}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Turno Activo:
                </span>
                <span
                  className="px-2.5 py-0.5 rounded-full text-xs font-extrabold"
                  style={{
                    backgroundColor: `${currentTeam.colorHex}20`,
                    color: currentTeam.colorHex,
                  }}
                >
                  {currentTeam.color}
                </span>
              </div>
              <h2 className="text-lg md:text-xl font-black text-slate-900 leading-tight">
                {currentTeam.name}
              </h2>
            </div>
          </div>

          {/* Guía de acción esperada */}
          <div className="flex items-center gap-3 w-full md:w-auto justify-end">
            <div className="px-4 py-2 rounded-2xl bg-slate-50 border border-slate-200 text-xs md:text-sm font-bold text-slate-700 flex items-center gap-2">
              {state.turnPhase === "WAITING_ROLL" && (
                <>
                  <span className="animate-bounce">🎲</span>
                  <span>Lanza el dado para comenzar tu turno</span>
                </>
              )}
              {state.turnPhase === "SELECTING_PAWN" && (
                <>
                  <span className="animate-pulse text-blue-600">👆</span>
                  <span>Selecciona en el tablero la ficha que deseas mover</span>
                </>
              )}
              {state.turnPhase === "RESOLVING_QUESTION" && (
                <>
                  <span>📖</span>
                  <span>Lean en voz alta la pregunta del casillero</span>
                </>
              )}
              {state.turnPhase === "CHOOSING_FIVE_ACTION" && (
                <>
                  <span>🎯</span>
                  <span>Sacó 5: Elige avanzar 5 o reiniciar en inicio</span>
                </>
              )}
              {state.turnPhase === "CELEBRATING_GOAL" && (
                <>
                  <span>🎉</span>
                  <span>¡Canten su barra inclusiva y elijan su bono de +10!</span>
                </>
              )}
              {state.turnPhase === "GAME_OVER" && (
                <>
                  <span>🏆</span>
                  <span>¡Partida finalizada con éxito!</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* DIÁLOGO ESPECIAL DE ELECCIÓN AL SACAR 5 */}
        {state.turnPhase === "CHOOSING_FIVE_ACTION" && state.fiveChoice && (
          <div className="mb-6 p-5 rounded-2xl bg-amber-50 border-2 border-amber-300 shadow-md animate-fade-in flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-black text-amber-950 flex items-center gap-2">
                <span>🎯</span> Regla Oficial #5: ¡Sacaste un 5!
              </h3>
              <p className="text-xs text-amber-800">
                Puedes elegir entre avanzar 5 casilleros con tu ficha, o colocar/reiniciar la ficha en el
                casillero de inicio #{currentTeam.startSquare}.
              </p>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => {
                  const pawn = currentTeam.pawns.find((p) => p.id === state.fiveChoice!.pawnId);
                  if (pawn) executePawnMove(pawn, 5);
                }}
                className="flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-black bg-blue-600 text-white hover:bg-blue-700 shadow-xs"
              >
                Avanzar 5 casilleros
              </button>
              <button
                type="button"
                onClick={() => {
                  const pawn = currentTeam.pawns.find((p) => p.id === state.fiveChoice!.pawnId);
                  if (pawn) {
                    const updatedTeams = state.teams.map((t) => {
                      if (t.color === currentTeam.color) {
                        return {
                          ...t,
                          pawns: t.pawns.map((p) =>
                            p.id === pawn.id
                              ? { ...p, position: currentTeam.startSquare, isAtBase: false }
                              : p
                          ),
                        };
                      }
                      return t;
                    });
                    const next = advanceToNextTeam({
                      ...state,
                      teams: updatedTeams,
                      fiveChoice: null,
                    });
                    setState(next);
                  }
                }}
                className="flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-black bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs"
              >
                Colocar en Inicio (#{currentTeam.startSquare})
              </button>
            </div>
          </div>
        )}

        {/* LAYOUT PRINCIPAL: TABLERO (COLUMNA IZQUIERDA/CENTRO) Y PANEL DE ACCIONES (COLUMNA DERECHA) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* TABLERO HERO */}
          <div className="lg:col-span-8 flex flex-col items-center">
            <ParchisBoard
              teams={state.teams}
              currentTeam={currentTeam}
              selectablePawnIds={selectablePawnIds}
              activePawnId={state.activePawnId}
              onPawnClick={handleSelectPawn}
              onInspectSquare={(sq) => setInspectModalSquare(sq)}
            />
          </div>

          {/* PANEL DERECHO: DADO + EQUIPOS + HISTORIAL */}
          <div className="lg:col-span-4 space-y-6">
            {/* DADO INTERACTIVO */}
            <ParchisDice
              value={state.diceValue}
              isRolling={isRollingAnimation}
              disabled={state.turnPhase !== "WAITING_ROLL"}
              consecutiveSixes={state.consecutiveSixes}
              onRoll={handleRollDice}
            />

            {/* LISTA DE EQUIPOS Y PROGRESO DE FICHAS */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3">
              <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider">
                Estado de los Equipos
              </h3>
              <div className="space-y-2.5">
                {state.teams.map((t, idx) => {
                  const isCurrent = idx === state.currentTeamIndex;
                  const goals = t.pawns.filter((p) => p.isAtGoal).length;

                  return (
                    <div
                      key={t.color}
                      className={`p-3 rounded-2xl border transition-all ${
                        isCurrent
                          ? "bg-slate-50 border-slate-400 ring-2 ring-blue-500/20 shadow-xs"
                          : "bg-white border-slate-200"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-3.5 h-3.5 rounded-full"
                            style={{ backgroundColor: t.colorHex }}
                          />
                          <span className="text-xs font-extrabold text-slate-800">
                            {t.name}
                          </span>
                        </div>
                        <span className="text-2xs font-bold text-slate-500">
                          {goals}/{t.pawns.length} en Meta
                        </span>
                      </div>

                      {/* Fichas individuales de este equipo */}
                      <div className="flex items-center gap-1.5">
                        {t.pawns.map((p) => {
                          let label = `P${p.pawnNumber}`;
                          let locText = p.isAtGoal
                            ? "🏆"
                            : p.isAtBase
                            ? "Base"
                            : p.position >= 101
                            ? `R${p.position - 100}`
                            : `#${p.position}`;

                          return (
                            <div
                              key={p.id}
                              className={`px-2 py-0.5 rounded-lg text-2xs font-black border flex items-center gap-1 ${
                                p.isAtGoal
                                  ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                                  : p.isAtBase
                                  ? "bg-slate-100 text-slate-500 border-slate-200"
                                  : "bg-white text-slate-800 border-slate-300"
                              }`}
                            >
                              <span>{label}:</span>
                              <span>{locText}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* HISTORIAL DE ACCIONES EN VIVO */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3">
              <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider">
                Registro de la Dinámica
              </h3>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1 text-xs">
                {state.logs.map((log) => (
                  <div
                    key={log.id}
                    className="p-2 rounded-xl bg-slate-50 border border-slate-200/70 text-slate-700 leading-snug"
                  >
                    <div className="flex items-center justify-between text-2xs text-slate-400 mb-0.5">
                      <span className="font-bold" style={{ color: TEAM_CONFIG[log.teamColor]?.colorHex }}>
                        {TEAM_CONFIG[log.teamColor]?.name || log.teamColor}
                      </span>
                      <span>{log.timestamp}</span>
                    </div>
                    <p className="font-medium text-slate-800">{log.message}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* 3. PIE DE PÁGINA OBLIGATORIO CON CRÉDITOS */}
      <footer className="max-w-7xl mx-auto w-full px-4 md:px-8 pt-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 text-center shadow-xs">
          <p className="text-2xs md:text-xs text-slate-500 leading-relaxed max-w-4xl mx-auto">
            {OFFICIAL_CREDIT}
          </p>
        </div>
      </footer>

      {/* 4. MODALES DEL JUEGO */}
      {/* Modal de Pregunta / Reto del casillero */}
      {state.activeSquare && (
        <ParchisQuestionModal
          square={state.activeSquare}
          team={currentTeam}
          isOpen={state.turnPhase === "RESOLVING_QUESTION"}
          onSuccess={handleQuestionSuccess}
          onFail={handleQuestionFail}
        />
      )}

      {/* Modal de Inspección rápida de casillero al hacer clic en el tablero */}
      {inspectModalSquare && (
        <ParchisQuestionModal
          square={inspectModalSquare}
          team={currentTeam}
          isOpen={true}
          onSuccess={() => setInspectModalSquare(null)}
          onFail={() => setInspectModalSquare(null)}
        />
      )}

      {/* Modal de Configuración Inicial y Desempate */}
      <ParchisSetupModal
        isOpen={setupModalOpen}
        onStartGame={handleStartGame}
      />

      {/* Modal de Celebración de Meta o Solidaridad */}
      <ParchisCelebrationModal
        isOpen={
          state.turnPhase === "CELEBRATING_GOAL" ||
          state.turnPhase === "SELECTING_BONUS_DESTINATION" ||
          state.turnPhase === "GAME_OVER"
        }
        type={
          state.turnPhase === "GAME_OVER"
            ? "GAME_OVER"
            : state.bonusChoice?.type === "TRIPLE_SIX"
            ? "TRIPLE_SIX"
            : "GOAL"
        }
        currentTeam={currentTeam}
        winningTeam={state.winnerTeam ? state.teams.find((t) => t.color === state.winnerTeam) : undefined}
        bonusChoice={state.bonusChoice}
        onApplyBonus={handleApplyBonus}
        onRestartGame={handleResetGame}
      />

      {/* Cajón lateral de herramientas del facilitador */}
      <ParchisFacilitatorDrawer
        isOpen={drawerOpen}
        soundEnabled={state.soundEnabled}
        onClose={() => setDrawerOpen(false)}
        onToggleSound={handleToggleSound}
        onResetGame={handleResetGame}
        onForceNextTurn={() => {
          const next = advanceToNextTeam(state);
          setState(next);
        }}
      />
    </div>
  );
}
