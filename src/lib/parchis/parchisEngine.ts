import type {
  TeamColor,
  Team,
  PawnState,
  SquareDefinition,
  ParchisGameState,
  BonusChoice,
  FiveChoice,
  LogEntry,
} from "./types";
import { SQUARES_CATALOG, getSquareByNumber } from "./parchisCatalog";

export const CIRCUIT_SIZE = 68;
export const RAMP_LENGTH = 7;
export const META_POSITION = 999;

export const TEAM_CONFIG: Record<
  TeamColor,
  {
    name: string;
    colorHex: string;
    badgeBg: string;
    textColor: string;
    startSquare: number;
    rampEntrySquare: number;
  }
> = {
  AMARILLO: {
    name: "Equipo Amarillo (Identidad)",
    colorHex: "#EAB308",
    badgeBg: "bg-amber-100 border-amber-300 text-amber-900",
    textColor: "text-amber-700",
    startSquare: 5,
    rampEntrySquare: 4,
  },
  VERDE: {
    name: "Equipo Verde (Diversidad)",
    colorHex: "#10B981",
    badgeBg: "bg-emerald-100 border-emerald-300 text-emerald-900",
    textColor: "text-emerald-700",
    startSquare: 22,
    rampEntrySquare: 21,
  },
  VIOLETA: {
    name: "Equipo Violeta (Justicia)",
    colorHex: "#8B5CF6",
    badgeBg: "bg-purple-100 border-purple-300 text-purple-900",
    textColor: "text-purple-700",
    startSquare: 39,
    rampEntrySquare: 38,
  },
  AZUL: {
    name: "Equipo Azul (Cambio Social)",
    colorHex: "#0284C7",
    badgeBg: "bg-sky-100 border-sky-300 text-sky-900",
    textColor: "text-sky-700",
    startSquare: 56,
    rampEntrySquare: 55,
  },
};

/** Crea el estado inicial por defecto para una nueva partida */
export function createInitialGameState(
  selectedColors: TeamColor[] = ["AMARILLO", "VERDE", "VIOLETA", "AZUL"],
  pawnsPerTeam: number = 2,
  customNames?: Partial<Record<TeamColor, string>>
): ParchisGameState {
  const teams: Team[] = selectedColors.map((color) => {
    const config = TEAM_CONFIG[color];
    const pawns: PawnState[] = Array.from({ length: pawnsPerTeam }, (_, idx) => ({
      id: `${color}-${idx + 1}`,
      pawnNumber: idx + 1,
      teamColor: color,
      position: 0, // En base ("Inicia el camino inclusivo")
      stepsMoved: 0,
      isAtBase: true,
      isAtGoal: false,
    }));

    return {
      id: color,
      name: customNames?.[color] || config.name,
      color,
      colorHex: config.colorHex,
      badgeBg: config.badgeBg,
      textColor: config.textColor,
      startSquare: config.startSquare,
      rampEntrySquare: config.rampEntrySquare,
      pawns,
      goalsFinished: 0,
    };
  });

  return {
    teams,
    pawnCountPerTeam: pawnsPerTeam,
    currentTeamIndex: 0,
    activePawnId: null,
    diceValue: null,
    consecutiveSixes: 0,
    turnPhase: "ROLL_OFF",
    activeSquare: null,
    activeBackupQuestion: null,
    positionBeforeTurn: null,
    bonusChoice: null,
    fiveChoice: null,
    logs: [
      {
        id: "init-1",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        teamColor: selectedColors[0],
        message: "¡Bienvenidos al Parchís Inclusivo! Inicia la ronda de desempate con el dado.",
        type: "ROLL",
      },
    ],
    soundEnabled: true,
    winnerTeam: null,
  };
}

/** Agrega una entrada al historial de acciones */
export function addLog(
  state: ParchisGameState,
  teamColor: TeamColor,
  message: string,
  type: LogEntry["type"]
): LogEntry[] {
  const newEntry: LogEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
    teamColor,
    message,
    type,
  };
  return [newEntry, ...state.logs.slice(0, 49)];
}

/** Determina si un casillero es zona inclusiva oficial */
export function isSquareInclusive(sqNum: number): boolean {
  const sq = getSquareByNumber(sqNum);
  return sq ? sq.isInclusiveZone : false;
}

/** Encuentra todas las fichas en un casillero específico del circuito */
export function getPawnsAtPosition(teams: Team[], position: number): PawnState[] {
  if (position <= 0 || position === META_POSITION) return [];
  const list: PawnState[] = [];
  for (const team of teams) {
    for (const p of team.pawns) {
      if (p.position === position && !p.isAtGoal && !p.isAtBase) {
        list.push(p);
      }
    }
  }
  return list;
}

/** Verifica si existe una barrera del mismo equipo en un casillero */
export function hasBarrierAtPosition(
  teams: Team[],
  position: number
): { hasBarrier: boolean; teamColor?: TeamColor } {
  const pawns = getPawnsAtPosition(teams, position);
  if (pawns.length >= 2) {
    // Si dos o más fichas pertenecen al mismo equipo
    const colorCounts: Partial<Record<TeamColor, number>> = {};
    for (const p of pawns) {
      colorCounts[p.teamColor] = (colorCounts[p.teamColor] || 0) + 1;
      if (colorCounts[p.teamColor]! >= 2) {
        return { hasBarrier: true, teamColor: p.teamColor };
      }
    }
  }
  return { hasBarrier: false };
}

/**
 * Calcula la nueva posición de una ficha tras avanzar N casilleros.
 * Maneja el circuito 1..68, la entrada al pasillo privado (101..107) y la meta (999).
 */
export function calculateNextPosition(
  team: Team,
  pawn: PawnState,
  steps: number
): {
  newPosition: number;
  newStepsMoved: number;
  reachedGoal: boolean;
  enteredRamp: boolean;
} {
  // Si está en base y se mueve (por ejemplo saca 5 o se coloca en inicio)
  if (pawn.isAtBase || pawn.position === 0) {
    return {
      newPosition: team.startSquare,
      newStepsMoved: 0,
      reachedGoal: false,
      enteredRamp: false,
    };
  }

  // Si ya está en el pasillo hacia la meta (101..107)
  if (pawn.position >= 101 && pawn.position <= 107) {
    const currentRampStep = pawn.position - 100;
    const targetRampStep = currentRampStep + steps;
    if (targetRampStep >= 8) {
      return {
        newPosition: META_POSITION,
        newStepsMoved: pawn.stepsMoved + steps,
        reachedGoal: true,
        enteredRamp: true,
      };
    }
    return {
      newPosition: 100 + targetRampStep,
      newStepsMoved: pawn.stepsMoved + steps,
      reachedGoal: false,
      enteredRamp: true,
    };
  }

  // Ficha en el circuito exterior (1..68)
  const currentPos = pawn.position;
  const currentSteps = pawn.stepsMoved;
  const totalCircuitSteps = 64; // Cantidad de casilleros de circuito antes de entrar a la rampa

  // Si con este avance supera o alcanza la rampa
  if (currentSteps + steps >= totalCircuitSteps) {
    const stepsIntoRamp = currentSteps + steps - totalCircuitSteps;
    if (stepsIntoRamp >= RAMP_LENGTH + 1) {
      return {
        newPosition: META_POSITION,
        newStepsMoved: currentSteps + steps,
        reachedGoal: true,
        enteredRamp: true,
      };
    } else if (stepsIntoRamp > 0) {
      return {
        newPosition: 100 + stepsIntoRamp,
        newStepsMoved: currentSteps + steps,
        reachedGoal: false,
        enteredRamp: true,
      };
    }
  }

  // Avance normal circular en el circuito 1..68
  let nextPos = currentPos + steps;
  while (nextPos > CIRCUIT_SIZE) {
    nextPos -= CIRCUIT_SIZE;
  }

  return {
    newPosition: nextPos,
    newStepsMoved: currentSteps + steps,
    reachedGoal: false,
    enteredRamp: false,
  };
}

/** Calcula el índice de progreso total de un equipo para determinar desventaja */
export function calculateTeamProgress(team: Team): number {
  let score = 0;
  for (const p of team.pawns) {
    if (p.isAtGoal) {
      score += 100;
    } else if (p.isAtBase) {
      score += 0;
    } else if (p.position >= 101 && p.position <= 107) {
      score += 68 + (p.position - 100) * 3;
    } else {
      score += p.stepsMoved;
    }
  }
  return score;
}

/** Determina el equipo o equipos en mayor desventaja */
export function getDisadvantagedTeams(teams: Team[], excludeColor?: TeamColor): Team[] {
  const eligible = teams.filter((t) => t.color !== excludeColor && t.goalsFinished < t.pawns.length);
  if (eligible.length === 0) return [];

  const scores = eligible.map((t) => ({ team: t, score: calculateTeamProgress(t) }));
  scores.sort((a, b) => a.score - b.score);

  const minScore = scores[0].score;
  return scores.filter((s) => s.score === minScore).map((s) => s.team);
}

/** Resuelve el impacto de aterrizar en un casillero (barrera, captura, zona inclusiva) */
export function evaluateLanding(
  state: ParchisGameState,
  movingTeam: Team,
  pawn: PawnState,
  targetSquare: number,
  diceRoll: number
): {
  finalPosition: number;
  isBouncedByBarrier: boolean;
  capturedPawn: PawnState | null;
  capturedTeam: TeamColor | null;
  bonusAdvance: number;
  logs: { message: string; type: LogEntry["type"] }[];
} {
  const logs: { message: string; type: LogEntry["type"] }[] = [];

  // Si llegó a la meta
  if (targetSquare === META_POSITION) {
    return {
      finalPosition: META_POSITION,
      isBouncedByBarrier: false,
      capturedPawn: null,
      capturedTeam: null,
      bonusAdvance: 0,
      logs: [
        {
          message: `¡${movingTeam.name} llevó la ficha #${pawn.pawnNumber} a la META! Canten su barra inclusiva.`,
          type: "GOAL",
        },
      ],
    };
  }

  // Si está en rampa privada (101..107), no hay colisiones con otros equipos
  if (targetSquare >= 101 && targetSquare <= 107) {
    return {
      finalPosition: targetSquare,
      isBouncedByBarrier: false,
      capturedPawn: null,
      capturedTeam: null,
      bonusAdvance: 0,
      logs: [],
    };
  }

  // Comprobar si hay barrera en el casillero
  const barrierCheck = hasBarrierAtPosition(state.teams, targetSquare);
  if (barrierCheck.hasBarrier && barrierCheck.teamColor !== movingTeam.color) {
    // Regla 6: Si otro equipo cae exactamente ahí, retrocede la cantidad de su propio dado
    let bouncedSquare = targetSquare - diceRoll;
    if (bouncedSquare <= 0) bouncedSquare += CIRCUIT_SIZE;

    logs.push({
      message: `¡Barrera contra la discriminación! El ${barrierCheck.teamColor} tiene dos fichas en el casillero ${targetSquare}. ${movingTeam.name} retrocede ${diceRoll} casilleros.`,
      type: "BARRIER",
    });

    return {
      finalPosition: bouncedSquare,
      isBouncedByBarrier: true,
      capturedPawn: null,
      capturedTeam: null,
      bonusAdvance: 0,
      logs,
    };
  }

  // Fichas existentes en el casillero
  const existingPawns = getPawnsAtPosition(state.teams, targetSquare).filter((p) => p.id !== pawn.id);

  // Si dos fichas del MISMO equipo coinciden, forman una barrera
  if (existingPawns.some((p) => p.teamColor === movingTeam.color)) {
    logs.push({
      message: `¡${movingTeam.name} formó una Barrera contra la discriminación en el casillero ${targetSquare}!`,
      type: "BARRIER",
    });
  }

  // Fichas de OTROS equipos
  const opponentPawns = existingPawns.filter((p) => p.teamColor !== movingTeam.color);
  if (opponentPawns.length > 0) {
    const isInclusive = isSquareInclusive(targetSquare);
    if (isInclusive) {
      // Regla 7: Zona inclusiva, conviven sin problema
      logs.push({
        message: `Casillero ${targetSquare} es una Zona Inclusiva: ${movingTeam.name} y los demás equipos conviven pacíficamente.`,
        type: "MOVE",
      });
    } else {
      // Regla 8: No es zona inclusiva -> "Identificó un acto discriminatorio"
      // Avanza 15 adicionales, y la ficha afectada regresa al casillero de inicio a reflexionar
      const captured = opponentPawns[0];
      logs.push({
        message: `¡${movingTeam.name} identificó un acto discriminatorio en el casillero ${targetSquare}! Avanza +15 casilleros adicionales y la ficha del ${captured.teamColor} regresa al inicio a reflexionar.`,
        type: "CAPTURE",
      });

      return {
        finalPosition: targetSquare,
        isBouncedByBarrier: false,
        capturedPawn: captured,
        capturedTeam: captured.teamColor,
        bonusAdvance: 15,
        logs,
      };
    }
  }

  return {
    finalPosition: targetSquare,
    isBouncedByBarrier: false,
    capturedPawn: null,
    capturedTeam: null,
    bonusAdvance: 0,
    logs,
  };
}

/** Aplica el desempate inicial (Roll-Off) y ordena los turnos por el dado más alto */
export function applyRollOffResults(
  state: ParchisGameState,
  rolls: Record<TeamColor, number>
): ParchisGameState {
  const updatedTeams = state.teams.map((t) => ({
    ...t,
    initialRoll: rolls[t.color] || 1,
  }));

  // Ordenar de mayor a menor dado
  updatedTeams.sort((a, b) => (b.initialRoll || 0) - (a.initialRoll || 0));

  const starter = updatedTeams[0];
  let logs = addLog(
    state,
    starter.color,
    `¡${starter.name} sacó el dado más alto (${starter.initialRoll}) e inicia la partida!`,
    "ROLL"
  );

  return {
    ...state,
    teams: updatedTeams,
    currentTeamIndex: 0,
    turnPhase: "WAITING_ROLL",
    diceValue: null,
    logs,
  };
}

/** Pasa al siguiente turno de equipo */
export function advanceToNextTeam(state: ParchisGameState): ParchisGameState {
  const nextIndex = (state.currentTeamIndex + 1) % state.teams.length;
  const nextTeam = state.teams[nextIndex];

  return {
    ...state,
    currentTeamIndex: nextIndex,
    activePawnId: null,
    diceValue: null,
    consecutiveSixes: 0,
    turnPhase: "WAITING_ROLL",
    activeSquare: null,
    activeBackupQuestion: null,
    positionBeforeTurn: null,
    bonusChoice: null,
    fiveChoice: null,
    logs: addLog(state, nextTeam.color, `Turno del ${nextTeam.name}. ¡Lanza el dado!`, "ROLL"),
  };
}
