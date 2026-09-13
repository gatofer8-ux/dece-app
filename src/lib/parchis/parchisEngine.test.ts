import { describe, it, expect } from "vitest";
import {
  createInitialGameState,
  calculateNextPosition,
  isSquareInclusive,
  hasBarrierAtPosition,
  evaluateLanding,
  getDisadvantagedTeams,
  CIRCUIT_SIZE,
  META_POSITION,
} from "./parchisEngine";
import type { ParchisGameState } from "./types";

describe("Parchís Inclusivo - Motor de Reglas", () => {
  it("crea el estado inicial correctamente con 4 equipos y fichas en base", () => {
    const state = createInitialGameState(["AMARILLO", "VERDE", "VIOLETA", "AZUL"], 2);
    expect(state.teams.length).toBe(4);
    expect(state.pawnCountPerTeam).toBe(2);

    const amarillo = state.teams.find((t) => t.color === "AMARILLO")!;
    expect(amarillo.startSquare).toBe(5);
    expect(amarillo.pawns.length).toBe(2);
    expect(amarillo.pawns[0].position).toBe(0);
    expect(amarillo.pawns[0].isAtBase).toBe(true);

    const verde = state.teams.find((t) => t.color === "VERDE")!;
    expect(verde.startSquare).toBe(22);

    const violeta = state.teams.find((t) => t.color === "VIOLETA")!;
    expect(violeta.startSquare).toBe(39);

    const azul = state.teams.find((t) => t.color === "AZUL")!;
    expect(azul.startSquare).toBe(56);
  });

  it("calcula avance circular y salida de base", () => {
    const state = createInitialGameState(["AMARILLO"], 2);
    const amarillo = state.teams[0];
    const pawn = amarillo.pawns[0];

    // Salir de base
    const startMove = calculateNextPosition(amarillo, pawn, 5);
    expect(startMove.newPosition).toBe(5);
    expect(startMove.newStepsMoved).toBe(0);

    // Mover 4 casilleros desde el 5 -> 9
    const activePawn = { ...pawn, position: 5, stepsMoved: 0, isAtBase: false };
    const stepMove = calculateNextPosition(amarillo, activePawn, 4);
    expect(stepMove.newPosition).toBe(9);
    expect(stepMove.newStepsMoved).toBe(4);

    // Mover sobrepasando el casillero 68 (circuito circular)
    const nearEndPawn = { ...pawn, position: 66, stepsMoved: 10, isAtBase: false };
    const wrapMove = calculateNextPosition(amarillo, nearEndPawn, 5);
    expect(wrapMove.newPosition).toBe(3); // 66+5 = 71 -> 71-68 = 3
  });

  it("reconoce correctamente las zonas inclusivas oficiales", () => {
    // Bienvenidas
    expect(isSquareInclusive(5)).toBe(true);
    expect(isSquareInclusive(22)).toBe(true);
    expect(isSquareInclusive(39)).toBe(true);
    expect(isSquareInclusive(56)).toBe(true);

    // Zonas inclusivas por eje
    expect(isSquareInclusive(12)).toBe(true);
    expect(isSquareInclusive(17)).toBe(true);
    expect(isSquareInclusive(21)).toBe(true);
    expect(isSquareInclusive(29)).toBe(true);
    expect(isSquareInclusive(34)).toBe(true);
    expect(isSquareInclusive(38)).toBe(true);
    expect(isSquareInclusive(46)).toBe(true);
    expect(isSquareInclusive(51)).toBe(true);
    expect(isSquareInclusive(63)).toBe(true);
    expect(isSquareInclusive(68)).toBe(true);

    // Casilleros normales no son zona inclusiva
    expect(isSquareInclusive(6)).toBe(false);
    expect(isSquareInclusive(10)).toBe(false);
    expect(isSquareInclusive(27)).toBe(false);
  });

  it("detecta formación de barrera contra la discriminación del mismo equipo", () => {
    const state = createInitialGameState(["AMARILLO", "VERDE"], 2);
    // Colocar dos fichas amarillas en casillero 15
    state.teams[0].pawns[0].position = 15;
    state.teams[0].pawns[0].isAtBase = false;
    state.teams[0].pawns[1].position = 15;
    state.teams[0].pawns[1].isAtBase = false;

    const barrierCheck = hasBarrierAtPosition(state.teams, 15);
    expect(barrierCheck.hasBarrier).toBe(true);
    expect(barrierCheck.teamColor).toBe("AMARILLO");

    // En casillero sin dos fichas iguales
    const noBarrier = hasBarrierAtPosition(state.teams, 16);
    expect(noBarrier.hasBarrier).toBe(false);
  });

  it("rebota al equipo contrario si cae en una barrera (Regla 6)", () => {
    const state = createInitialGameState(["AMARILLO", "VERDE"], 2);
    // Barrera amarilla en casillero 20
    state.teams[0].pawns[0].position = 20;
    state.teams[0].pawns[0].isAtBase = false;
    state.teams[0].pawns[1].position = 20;
    state.teams[0].pawns[1].isAtBase = false;

    // Ficha verde intenta caer en casillero 20 con un dado de 3
    const movingTeam = state.teams[1];
    const movingPawn = movingTeam.pawns[0];
    const result = evaluateLanding(state, movingTeam, movingPawn, 20, 3);

    expect(result.isBouncedByBarrier).toBe(true);
    expect(result.finalPosition).toBe(17); // 20 - 3 = 17
    expect(result.capturedPawn).toBeNull();
  });

  it("permite convivencia pacífica en Zona Inclusiva (Regla 7)", () => {
    const state = createInitialGameState(["AMARILLO", "VERDE"], 2);
    // Ficha verde en casillero 12 (Zona Inclusiva)
    state.teams[1].pawns[0].position = 12;
    state.teams[1].pawns[0].isAtBase = false;

    // Ficha amarilla llega al casillero 12
    const movingTeam = state.teams[0];
    const movingPawn = movingTeam.pawns[0];
    const result = evaluateLanding(state, movingTeam, movingPawn, 12, 4);

    expect(result.isBouncedByBarrier).toBe(false);
    expect(result.finalPosition).toBe(12);
    expect(result.capturedPawn).toBeNull(); // No se come
    expect(result.bonusAdvance).toBe(0);
  });

  it("identifica acto discriminatorio en casillero normal: captura y gana +15 (Regla 8)", () => {
    const state = createInitialGameState(["AMARILLO", "VERDE"], 2);
    // Ficha verde en casillero 14 (NO inclusivo)
    state.teams[1].pawns[0].position = 14;
    state.teams[1].pawns[0].isAtBase = false;

    // Ficha amarilla cae en casillero 14
    const movingTeam = state.teams[0];
    const movingPawn = movingTeam.pawns[0];
    const result = evaluateLanding(state, movingTeam, movingPawn, 14, 2);

    expect(result.isBouncedByBarrier).toBe(false);
    expect(result.finalPosition).toBe(14);
    expect(result.capturedPawn).not.toBeNull();
    expect(result.capturedTeam).toBe("VERDE");
    expect(result.bonusAdvance).toBe(15); // +15 casilleros de avance
  });

  it("identifica dinámicamente el equipo en mayor desventaja para solidaridad", () => {
    const state = createInitialGameState(["AMARILLO", "VERDE", "VIOLETA"], 2);
    // Amarillo ha avanzado bastante
    state.teams[0].pawns[0].stepsMoved = 30;
    state.teams[0].pawns[0].position = 35;
    state.teams[0].pawns[0].isAtBase = false;

    // Verde ha avanzado un poco
    state.teams[1].pawns[0].stepsMoved = 10;
    state.teams[1].pawns[0].position = 32;
    state.teams[1].pawns[0].isAtBase = false;

    // Violeta está todo en base (progreso = 0)
    const disadvantaged = getDisadvantagedTeams(state.teams, "AMARILLO");
    expect(disadvantaged.length).toBeGreaterThan(0);
    expect(disadvantaged[0].color).toBe("VIOLETA");
  });
});
