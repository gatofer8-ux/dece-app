"use client";

import React, { useState, useEffect, useRef } from "react";
import type {
  Team,
  TeamColor,
  PawnState,
  SquareDefinition,
  ParchisGameState,
  BonusChoice,
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
  CIRCUIT_SIZE,
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
import { ParchisOnboardingModal } from "./components/ParchisOnboardingModal";

export default function ParchisInclusivoApp() {
  const [state, setState] = useState<ParchisGameState>(() => {
    return loadParchisState() || createInitialGameState();
  });

  const [setupModalOpen, setSetupModalOpen] = useState<boolean>(false);
  const [onboardingOpen, setOnboardingOpen] = useState<boolean>(false);
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const [inspectModalSquare, setInspectModalSquare] = useState<SquareDefinition | null>(null);
  const [isRollingAnimation, setIsRollingAnimation] = useState<boolean>(false);
  const [isHopping, setIsHopping] = useState<boolean>(false);
  const [hoppingPawnId, setHoppingPawnId] = useState<string | null>(null);

  const hoppingTimerRef = useRef<NodeJS.Timeout | null>(null);

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

  // Onboarding automático si es primera visita del facilitador
  useEffect(() => {
    try {
      const tourDone = localStorage.getItem("sadex_parchis_tour_completed");
      if (tourDone !== "true") {
        setOnboardingOpen(true);
      }
    } catch (e) {
      // Ignorar restricciones en entornos con localStorage restringido
    }
  }, []);

  // Limpiar timer de salto al desmontar
  useEffect(() => {
    return () => {
      if (hoppingTimerRef.current) clearInterval(hoppingTimerRef.current);
    };
  }, []);

  const currentTeam = state.teams[state.currentTeamIndex] || state.teams[0];

  // Determinar qué fichas del equipo activo son seleccionables
  const getSelectablePawnIds = (): string[] => {
    if (isHopping || state.turnPhase !== "SELECTING_PAWN" || state.diceValue === null) return [];

    const dice = state.diceValue;
    return currentTeam.pawns
      .filter((p) => {
        if (p.isAtGoal) return false;
        if (p.isAtBase) return dice === 5;
        return true;
      })
      .map((p) => p.id);
  };

  const selectablePawnIds = getSelectablePawnIds();

  // 1. Manejo del tiro de dado
  const handleRollDice = (outcome: number) => {
    if (isHopping) return;
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
    if (isHopping || state.turnPhase !== "SELECTING_PAWN" || state.diceValue === null) return;
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
            targetSquare: (pawn.position - 1 + 5) % CIRCUIT_SIZE + 1,
            description: `Avanzar 5 casilleros hacia el #${(pawn.position - 1 + 5) % CIRCUIT_SIZE + 1}`,
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

    startHoppingAnimation(pawn, state.diceValue);
  };

  // 3. Animación de salto casilla por casilla (Pawn Hop - Dinámica de Monopolio Moderno)
  const startHoppingAnimation = (pawn: PawnState, totalSteps: number) => {
    setIsHopping(true);
    setHoppingPawnId(pawn.id);
    const originalPos = pawn.position;

    // Si está saliendo de base (con 5)
    if (pawn.isAtBase || pawn.position === 0) {
      parchisAudio.playStep();
      const targetPos = currentTeam.startSquare;

      const updatedTeams = state.teams.map((t) => {
        if (t.color === currentTeam.color) {
          return {
            ...t,
            pawns: t.pawns.map((p) =>
              p.id === pawn.id ? { ...p, position: targetPos, isAtBase: false } : p
            ),
          };
        }
        return t;
      });

      setIsHopping(false);
      setHoppingPawnId(null);
      finishLanding({ ...state, teams: updatedTeams }, pawn, targetPos, originalPos, 5);
      return;
    }

    // Si ya está en juego: animar salto paso a paso
    let currentStepIndex = 0;
    let currentPos = pawn.position;

    hoppingTimerRef.current = setInterval(() => {
      currentStepIndex++;
      currentPos = (currentPos % CIRCUIT_SIZE) + 1;
      parchisAudio.playStep();

      // Actualizar posición intermedia visual en el tablero
      setState((prev) => ({
        ...prev,
        teams: prev.teams.map((t) => {
          if (t.color === currentTeam.color) {
            return {
              ...t,
              pawns: t.pawns.map((p) => (p.id === pawn.id ? { ...p, position: currentPos } : p)),
            };
          }
          return t;
        }),
      }));

      if (currentStepIndex >= totalSteps) {
        if (hoppingTimerRef.current) clearInterval(hoppingTimerRef.current);
        setIsHopping(false);
        setHoppingPawnId(null);

        // Evaluar aterrizaje final
        finishLanding(state, pawn, currentPos, originalPos, totalSteps);
      }
    }, 160); // 160ms por salto (efecto rebote fluido)
  };

  // 4. Conclusión del aterrizaje y apertura de Reto Monopolio
  const finishLanding = (
    currentState: ParchisGameState,
    pawn: PawnState,
    targetSquare: number,
    originalPos: number,
    diceRoll: number
  ) => {
    const landing = evaluateLanding(currentState, currentTeam, pawn, targetSquare, diceRoll);

    if (landing.isBouncedByBarrier) {
      parchisAudio.playBarrier();
    } else if (landing.capturedPawn) {
      parchisAudio.playCapture();
    }

    // Actualizar fichas de los equipos
    let updatedTeams = currentState.teams.map((t) => {
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
              return {
                ...p,
                position: landing.finalPosition,
                stepsMoved: p.stepsMoved + diceRoll + landing.bonusAdvance,
                isAtBase: false,
              };
            }
            return p;
          }),
        };
      }
      return t;
    });

    let updatedLogs = [...currentState.logs];
    landing.logs.forEach((l) => {
      updatedLogs = addLog(
        { ...currentState, logs: updatedLogs },
        currentTeam.color,
        l.message,
        l.type
      );
    });

    // Abrir Modal de Reto de Monopolio para el casillero
    const targetSq = getSquareByNumber(landing.finalPosition);
    if (targetSq) {
      setState({
        ...currentState,
        teams: updatedTeams,
        activePawnId: pawn.id,
        positionBeforeTurn: originalPos,
        activeSquare: targetSq,
        turnPhase: "RESOLVING_QUESTION",
        logs: updatedLogs,
      });
    } else {
      const nextState = advanceToNextTeam({
        ...currentState,
        teams: updatedTeams,
        logs: updatedLogs,
      });
      setState(nextState);
    }
  };

  // 5. Resolución de Reto: Éxito
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

    // Manejar bonificación especial de avance (ej: +2)
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
      const nextState = advanceToNextTeam({
        ...state,
        teams: updatedTeams,
        logs: updatedLogs,
      });
      setState(nextState);
    }
  };

  // 6. Resolución de Reto: Fallo
  const handleQuestionFail = () => {
    let updatedLogs = addLog(
      state,
      currentTeam.color,
      `❌ No se resolvió el reto. La ficha se queda en su casillero anterior (no avanzó).`,
      "QUESTION"
    );

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

  // 7. Aplicar bono de solidaridad
  const handleApplyBonus = (targetTeamColor: TeamColor, targetPawnId?: string) => {
    const bonusSteps = state.bonusChoice?.type === "GOAL_TEN" ? 10 : 6;
    const targetTeam = state.teams.find((t) => t.color === targetTeamColor)!;

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

  // 8. Iniciar partida desde el modal de setup
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

  // 9. Reiniciar partida
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

  // Pasos de la jugada guiada (Stage Director)
  const isStep1Active =
    (state.turnPhase === "WAITING_ROLL" || state.turnPhase === "ROLL_OFF") && !isHopping;
  const isStep1Done = state.diceValue !== null && !isStep1Active;

  const isStep2Active =
    isHopping || state.turnPhase === "SELECTING_PAWN" || state.turnPhase === "CHOOSING_FIVE_ACTION";
  const isStep2Done =
    isStep1Done &&
    !isStep2Active &&
    (state.turnPhase === "RESOLVING_QUESTION" ||
      state.turnPhase === "CELEBRATING_GOAL" ||
      state.turnPhase === "SELECTING_BONUS_DESTINATION");

  const isStep3Active =
    state.turnPhase === "RESOLVING_QUESTION" ||
    state.turnPhase === "CELEBRATING_GOAL" ||
    state.turnPhase === "SELECTING_BONUS_DESTINATION";

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-between text-slate-100 pb-8">
      {/* 1. BARRA SUPERIOR DE FACILITACIÓN MONOPOLIO */}
      <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-md border-b border-amber-400/30 px-4 md:px-8 py-3 shadow-lg">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl animate-pulse">🎲</span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg md:text-xl font-black text-amber-300 tracking-tight flex items-center gap-2">
                  <span>Parchís Inclusivo</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                    Edición Monopolio Moderno
                  </span>
                </h1>
              </div>
              <p className="text-xs text-slate-400">
                Programa «Respiramos Inclusión» — Herramienta digital en vivo para talleres DECE
              </p>
            </div>
          </div>

          {/* Botones de acción rápida de facilitación */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setOnboardingOpen(true)}
              className="p-2 md:px-3.5 md:py-2 rounded-xl text-xs font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-400/40 transition-all flex items-center gap-1.5 shadow-sm"
              title="Guía interactiva y reglas oficiales"
            >
              <span>❓</span>
              <span className="hidden md:inline">¿Cómo se juega?</span>
            </button>

            <button
              type="button"
              onClick={handleToggleFullScreen}
              className="p-2 md:px-3.5 md:py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all flex items-center gap-1.5"
              title="Pantalla Completa para Proyector (16:9)"
            >
              <span>🖥️</span>
              <span className="hidden md:inline">Modo Proyector</span>
            </button>

            <button
              type="button"
              onClick={handleToggleSound}
              className="p-2 md:px-3 md:py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all"
              title="Activar / Desactivar Sonido"
            >
              {state.soundEnabled ? "🔊" : "🔇"}
            </button>

            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="px-3.5 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-md transition-all flex items-center gap-1.5"
            >
              <span>🧰</span>
              <span className="hidden sm:inline">Herramientas</span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. ÁREA PRINCIPAL: TABLERO MONOPOLIO + PANEL DE ACCIÓN */}
      <main className="max-w-7xl mx-auto w-full px-4 md:px-8 py-6 flex-1">
        {/* BANNER DE TURNO ESTILO MONOPOLIO CON BARRA DE 3 PASOS */}
        <div className="mb-6 p-4 md:p-5 rounded-3xl bg-slate-900 border-2 border-amber-400/40 shadow-xl space-y-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4 w-full md:w-auto">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center font-black text-white text-2xl shadow-xl flex-shrink-0 border-2 border-white/40"
                style={{ backgroundColor: currentTeam.colorHex }}
              >
                {currentTeam.color[0]}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-2xs font-black text-amber-400 uppercase tracking-widest">
                    TURNO ACTUAL:
                  </span>
                  <span
                    className="px-2.5 py-0.5 rounded-full text-xs font-black"
                    style={{
                      backgroundColor: `${currentTeam.colorHex}25`,
                      color: currentTeam.colorHex,
                    }}
                  >
                    {currentTeam.color}
                  </span>
                </div>
                <h2 className="text-xl md:text-2xl font-black text-white leading-tight">
                  {currentTeam.name}
                </h2>
              </div>
            </div>

            {/* Guía interactiva de paso */}
            <div className="flex items-center gap-3 w-full md:w-auto justify-end">
              <div className="px-5 py-2.5 rounded-2xl bg-slate-800 border border-slate-700 text-xs md:text-sm font-bold text-slate-200 flex items-center gap-2.5">
                {isHopping ? (
                  <>
                    <span className="animate-bounce text-emerald-400">🏃</span>
                    <span className="text-emerald-300 font-extrabold">Avanzando casilleros...</span>
                  </>
                ) : state.turnPhase === "WAITING_ROLL" ? (
                  <>
                    <span className="animate-bounce">🎲</span>
                    <span>Tira el dado para iniciar tu jugada</span>
                  </>
                ) : state.turnPhase === "SELECTING_PAWN" ? (
                  <>
                    <span className="animate-pulse text-blue-400">👆</span>
                    <span>Selecciona en el tablero la ficha que saltará</span>
                  </>
                ) : state.turnPhase === "RESOLVING_QUESTION" ? (
                  <>
                    <span>📖</span>
                    <span>Resuelvan en equipo el reto de la casilla</span>
                  </>
                ) : state.turnPhase === "CHOOSING_FIVE_ACTION" ? (
                  <>
                    <span>🎯</span>
                    <span>Sacó 5: Elige avanzar 5 o poner ficha en Inicio</span>
                  </>
                ) : state.turnPhase === "CELEBRATING_GOAL" ? (
                  <>
                    <span>🎉</span>
                    <span>¡Canten la barra inclusiva y elijan su bono de +10!</span>
                  </>
                ) : (
                  <>
                    <span>🏆</span>
                    <span>¡Gran victoria comunitaria!</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* BARRA DE PROGRESO DE 3 PASOS GUIADA (STAGE DIRECTOR) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-800/80">
            {/* Paso 1: Tirar Dado */}
            <div
              className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${
                isStep1Active
                  ? "bg-amber-500/20 border-amber-400/80 text-amber-300 shadow-lg shadow-amber-500/10 ring-2 ring-amber-400/40"
                  : isStep1Done
                  ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-300"
                  : "bg-slate-950/50 border-slate-800/80 text-slate-500"
              }`}
            >
              <div
                className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black flex-shrink-0 ${
                  isStep1Active
                    ? "bg-amber-400 text-slate-950 animate-bounce"
                    : isStep1Done
                    ? "bg-emerald-500 text-white"
                    : "bg-slate-800 text-slate-400"
                }`}
              >
                {isStep1Done ? "✓" : "🎲"}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-black truncate">1. Tirar Dado 3D</div>
                <div className="text-2xs opacity-80 truncate">
                  {isStep1Active
                    ? "¡Lanza el cubo virtual!"
                    : isStep1Done
                    ? `Resultado: ${state.diceValue}`
                    : "Esperando turno"}
                </div>
              </div>
            </div>

            {/* Paso 2: Mover Ficha */}
            <div
              className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${
                isStep2Active
                  ? "bg-blue-500/20 border-blue-400/80 text-blue-300 shadow-lg shadow-blue-500/10 ring-2 ring-blue-400/40"
                  : isStep2Done
                  ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-300"
                  : "bg-slate-950/50 border-slate-800/80 text-slate-500"
              }`}
            >
              <div
                className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black flex-shrink-0 ${
                  isStep2Active
                    ? "bg-blue-400 text-slate-950 animate-pulse"
                    : isStep2Done
                    ? "bg-emerald-500 text-white"
                    : "bg-slate-800 text-slate-400"
                }`}
              >
                {isStep2Done ? "✓" : "🏃"}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-black truncate">2. Mover Ficha</div>
                <div className="text-2xs opacity-80 truncate">
                  {isHopping
                    ? "Rebotando en arco..."
                    : state.turnPhase === "SELECTING_PAWN"
                    ? "Elige ficha a mover"
                    : state.turnPhase === "CHOOSING_FIVE_ACTION"
                    ? "Elige acción del 5"
                    : isStep2Done
                    ? "Aterrizaje completo"
                    : "Pendiente del dado"}
                </div>
              </div>
            </div>

            {/* Paso 3: Resolver Reto */}
            <div
              className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${
                isStep3Active
                  ? "bg-purple-500/20 border-purple-400/80 text-purple-300 shadow-lg shadow-purple-500/10 ring-2 ring-purple-400/40 animate-pulse"
                  : "bg-slate-950/50 border-slate-800/80 text-slate-500"
              }`}
            >
              <div
                className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black flex-shrink-0 ${
                  isStep3Active
                    ? "bg-purple-400 text-white animate-bounce"
                    : "bg-slate-800 text-slate-400"
                }`}
              >
                📖
              </div>
              <div className="min-w-0">
                <div className="text-xs font-black truncate">3. Responder Reto</div>
                <div className="text-2xs opacity-80 truncate">
                  {isStep3Active
                    ? "Debate inclusivo en equipo"
                    : "Al caer en casilla del circuito"}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* DIÁLOGO AL SACAR 5 */}
        {state.turnPhase === "CHOOSING_FIVE_ACTION" && state.fiveChoice && (
          <div className="mb-6 p-5 rounded-2xl bg-amber-500/10 border-2 border-amber-400 text-white shadow-xl animate-fade-in flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-black text-amber-300 flex items-center gap-2">
                <span>🎯</span> Regla Oficial #5: ¡Sacaste un 5!
              </h3>
              <p className="text-xs text-slate-300 mt-1">
                Puedes elegir entre avanzar 5 casilleros, o colocar/reiniciar tu ficha en la casilla de
                inicio #{currentTeam.startSquare}.
              </p>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => {
                  const pawn = currentTeam.pawns.find((p) => p.id === state.fiveChoice!.pawnId);
                  if (pawn) startHoppingAnimation(pawn, 5);
                }}
                className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl text-xs font-black bg-blue-600 hover:bg-blue-500 text-white shadow-md"
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
                className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white shadow-md"
              >
                Colocar en Inicio (#{currentTeam.startSquare})
              </button>
            </div>
          </div>
        )}

        {/* CUADRÍCULA: TABLERO MONOPOLIO (IZQUIERDA) + DADO Y REGISTRO (DERECHA) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* TABLERO MONOPOLIO HERO */}
          <div className="lg:col-span-8 flex flex-col items-center">
            <ParchisBoard
              teams={state.teams}
              currentTeam={currentTeam}
              selectablePawnIds={selectablePawnIds}
              activePawnId={state.activePawnId}
              isHoppingPawnId={hoppingPawnId}
              onPawnClick={handleSelectPawn}
              onInspectSquare={(sq) => setInspectModalSquare(sq)}
            />
          </div>

          {/* PANEL LATERAL DE MONOPOLIO */}
          <div className="lg:col-span-4 space-y-6">
            {/* DADO MONOPOLIO 3D CON DIRECCIÓN DE ESCENA */}
            <div
              className={`transition-all duration-300 rounded-3xl ${
                isStep1Active
                  ? "ring-2 ring-amber-400/60 shadow-2xl shadow-amber-500/10"
                  : isHopping
                  ? "opacity-60 pointer-events-none"
                  : ""
              }`}
            >
              <ParchisDice
                value={state.diceValue}
                isRolling={isRollingAnimation}
                disabled={isHopping || state.turnPhase !== "WAITING_ROLL"}
                consecutiveSixes={state.consecutiveSixes}
                onRoll={handleRollDice}
              />
            </div>

            {/* LEADERBOARD DE EQUIPOS Y FICHAS */}
            <div className="bg-slate-900 p-5 rounded-3xl border border-slate-800 shadow-xl space-y-3">
              <h3 className="text-2xs font-black text-amber-400 uppercase tracking-widest flex items-center gap-1.5">
                <span>🏆</span> Equipos en Competencia Inclusiva
              </h3>
              <div className="space-y-2.5">
                {state.teams.map((t, idx) => {
                  const isCurrent = idx === state.currentTeamIndex;

                  return (
                    <div
                      key={t.color}
                      className={`p-3.5 rounded-2xl border transition-all ${
                        isCurrent
                          ? "bg-slate-800/90 border-amber-400/50 shadow-md ring-1 ring-amber-400/30"
                          : "bg-slate-950/60 border-slate-800"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-4 h-4 rounded-full border border-white"
                            style={{ backgroundColor: t.colorHex }}
                          />
                          <span className="text-xs font-black text-white">{t.name}</span>
                        </div>
                      </div>

                      {/* Estado de cada ficha */}
                      <div className="flex items-center gap-1.5">
                        {t.pawns.map((p) => {
                          const isOut = !p.isAtBase && !p.isAtGoal;
                          return (
                            <div
                              key={p.id}
                              className={`px-2.5 py-1 rounded-xl text-2xs font-black border flex items-center gap-1 ${
                                isOut
                                  ? "bg-blue-950 text-blue-300 border-blue-600/40"
                                  : "bg-slate-800 text-slate-400 border-slate-700"
                              }`}
                            >
                              <span>#{p.pawnNumber}:</span>
                              <span>{isOut ? `Casilla ${p.position}` : "Base"}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* HISTORIAL DE SUCESOS */}
            <div className="bg-slate-900 p-5 rounded-3xl border border-slate-800 shadow-xl space-y-3">
              <h3 className="text-2xs font-black text-amber-400 uppercase tracking-widest flex items-center gap-1.5">
                <span>📜</span> Registro del Taller
              </h3>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1 text-xs">
                {state.logs.map((log) => (
                  <div
                    key={log.id}
                    className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-300"
                  >
                    <div className="flex items-center justify-between text-2xs text-slate-400 mb-0.5">
                      <span className="font-bold" style={{ color: TEAM_CONFIG[log.teamColor]?.colorHex }}>
                        {TEAM_CONFIG[log.teamColor]?.name || log.teamColor}
                      </span>
                      <span>{log.timestamp}</span>
                    </div>
                    <p className="font-medium">{log.message}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* 3. PIE DE PÁGINA CON CRÉDITOS */}
      <footer className="max-w-7xl mx-auto w-full px-4 md:px-8 pt-4">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-center shadow-md">
          <p className="text-2xs md:text-xs text-slate-400 leading-relaxed max-w-4xl mx-auto">
            {OFFICIAL_CREDIT}
          </p>
        </div>
      </footer>

      {/* 4. MODALES */}
      {/* Modal de Reto / Pregunta */}
      {state.activeSquare && (
        <ParchisQuestionModal
          square={state.activeSquare}
          team={currentTeam}
          isOpen={state.turnPhase === "RESOLVING_QUESTION"}
          onSuccess={handleQuestionSuccess}
          onFail={handleQuestionFail}
        />
      )}

      {/* Inspección rápida */}
      {inspectModalSquare && (
        <ParchisQuestionModal
          square={inspectModalSquare}
          team={currentTeam}
          isOpen={true}
          onSuccess={() => setInspectModalSquare(null)}
          onFail={() => setInspectModalSquare(null)}
        />
      )}

      {/* Configuración Inicial */}
      <ParchisSetupModal isOpen={setupModalOpen} onStartGame={handleStartGame} />

      {/* Celebración */}
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

      {/* Cajón de herramientas */}
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

      {/* Tour interactivo de Onboarding y Reglas */}
      <ParchisOnboardingModal
        isOpen={onboardingOpen}
        onClose={() => setOnboardingOpen(false)}
      />
    </div>
  );
}
