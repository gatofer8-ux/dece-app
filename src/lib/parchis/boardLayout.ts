import type { TeamColor } from "./types";
import { SQUARES_CATALOG } from "./parchisCatalog";

export const BOARD_CELLS = 19;
export const BOARD_SIZE = 950;
export const CELL_SIZE = BOARD_SIZE / BOARD_CELLS; // 50px per cell

export interface CellCoord {
  col: number;
  row: number;
  x: number;
  y: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}

export interface BoardSquareCoord extends CellCoord {
  number: number;
  zone: TeamColor;
  isInclusive: boolean;
  isExit: boolean;
  isSpecialAdvance: boolean;
  isReturnToStart: boolean;
  isCuriosity: boolean;
  isActivity: boolean;
  title: string;
}

export interface RampSquareCoord extends CellCoord {
  step: number; // 1 to 7
  teamColor: TeamColor;
}

export interface BaseSlotCoord {
  slotIndex: number; // 1 to 4
  x: number;
  y: number;
}

export interface TeamBaseCoord {
  teamColor: TeamColor;
  colStart: number;
  rowStart: number;
  x: number;
  y: number;
  width: number;
  height: number;
  slots: BaseSlotCoord[];
}

function cellToCoord(col: number, row: number): CellCoord {
  const x = col * CELL_SIZE;
  const y = row * CELL_SIZE;
  return {
    col,
    row,
    x,
    y,
    width: CELL_SIZE,
    height: CELL_SIZE,
    centerX: x + CELL_SIZE / 2,
    centerY: y + CELL_SIZE / 2,
  };
}

/** Genera los 68 casilleros perimétricos con sus coordenadas en la cuadrícula 19x19 */
function generateTrackCoords(): Record<number, BoardSquareCoord> {
  const gridCells: { col: number; row: number }[] = [];

  // 1. Brazo Norte (Sector Amarillo: 17 casilleros)
  for (let r = 7; r >= 0; r--) gridCells.push({ col: 8, row: r });
  gridCells.push({ col: 9, row: 0 });
  for (let r = 0; r <= 7; r++) gridCells.push({ col: 10, row: r });

  // 2. Brazo Este (Sector Verde: 17 casilleros)
  for (let c = 11; c <= 18; c++) gridCells.push({ col: c, row: 8 });
  gridCells.push({ col: 18, row: 9 });
  for (let c = 18; c >= 11; c--) gridCells.push({ col: c, row: 10 });

  // 3. Brazo Sur (Sector Violeta: 17 casilleros)
  for (let r = 11; r <= 18; r++) gridCells.push({ col: 10, row: r });
  gridCells.push({ col: 9, row: 18 });
  for (let r = 18; r >= 11; r--) gridCells.push({ col: 8, row: r });

  // 4. Brazo Oeste (Sector Azul: 17 casilleros)
  for (let c = 7; c >= 0; c--) gridCells.push({ col: c, row: 10 });
  gridCells.push({ col: 0, row: 9 });
  for (let c = 0; c <= 7; c++) gridCells.push({ col: c, row: 8 });

  // Mapear los 68 casilleros
  // gridCells[0] corresponde al casillero 5 (Salida Amarilla)
  // gridCells[16] corresponde al casillero 21
  // gridCells[17] corresponde al casillero 22 (Salida Verde)
  // ...
  // gridCells[63] corresponde al casillero 68
  // gridCells[64] = 1, [65] = 2, [66] = 3, [67] = 4
  const map: Record<number, BoardSquareCoord> = {};

  gridCells.forEach((cell, idx) => {
    let sqNum: number;
    if (idx <= 63) {
      sqNum = idx + 5;
    } else {
      sqNum = idx - 63; // idx 64 -> 1, 65 -> 2, 66 -> 3, 67 -> 4
    }

    const def = SQUARES_CATALOG.find((s) => s.number === sqNum);
    const coord = cellToCoord(cell.col, cell.row);

    map[sqNum] = {
      ...coord,
      number: sqNum,
      zone: def?.zone || "AMARILLO",
      isInclusive: def?.isInclusiveZone || false,
      isExit: sqNum === 5 || sqNum === 22 || sqNum === 39 || sqNum === 56,
      isSpecialAdvance: !!def?.advanceBonus && !def.isInclusiveZone,
      isReturnToStart: !!def?.returnToStart,
      isCuriosity: def?.type === "DATO_CURIOSO",
      isActivity: def?.type === "ACTIVIDAD",
      title: def?.title || `Casillero ${sqNum}`,
    };
  });

  return map;
}

/** Genera las rampas privadas de 7 casilleros de cada color */
function generateRampCoords(): Record<TeamColor, RampSquareCoord[]> {
  return {
    AMARILLO: Array.from({ length: 7 }, (_, i) => {
      // Norte: col 9, rows 1..7 (acercándose al centro row 8..10)
      const coord = cellToCoord(9, i + 1);
      return { ...coord, step: i + 1, teamColor: "AMARILLO" };
    }),
    VERDE: Array.from({ length: 7 }, (_, i) => {
      // Este: row 9, cols 17..11 (acercándose al centro col 8..10)
      const coord = cellToCoord(17 - i, 9);
      return { ...coord, step: i + 1, teamColor: "VERDE" };
    }),
    VIOLETA: Array.from({ length: 7 }, (_, i) => {
      // Sur: col 9, rows 17..11 (acercándose al centro row 8..10)
      const coord = cellToCoord(9, 17 - i);
      return { ...coord, step: i + 1, teamColor: "VIOLETA" };
    }),
    AZUL: Array.from({ length: 7 }, (_, i) => {
      // Oeste: row 9, cols 1..7 (acercándose al centro col 8..10)
      const coord = cellToCoord(i + 1, 9);
      return { ...coord, step: i + 1, teamColor: "AZUL" };
    }),
  };
}

/** Genera las 4 bases ("Inicia el camino inclusivo") en las esquinas */
function generateBaseCoords(): Record<TeamColor, TeamBaseCoord> {
  const baseSize = 8 * CELL_SIZE;

  const createSlots = (baseX: number, baseY: number): BaseSlotCoord[] => {
    const cx = baseX + baseSize / 2;
    const cy = baseY + baseSize / 2;
    const offset = CELL_SIZE * 1.5;
    return [
      { slotIndex: 1, x: cx - offset, y: cy - offset },
      { slotIndex: 2, x: cx + offset, y: cy - offset },
      { slotIndex: 3, x: cx - offset, y: cy + offset },
      { slotIndex: 4, x: cx + offset, y: cy + offset },
    ];
  };

  return {
    AMARILLO: {
      teamColor: "AMARILLO",
      colStart: 0,
      rowStart: 0,
      x: 0,
      y: 0,
      width: baseSize,
      height: baseSize,
      slots: createSlots(0, 0),
    },
    VERDE: {
      teamColor: "VERDE",
      colStart: 11,
      rowStart: 0,
      x: 11 * CELL_SIZE,
      y: 0,
      width: baseSize,
      height: baseSize,
      slots: createSlots(11 * CELL_SIZE, 0),
    },
    VIOLETA: {
      teamColor: "VIOLETA",
      colStart: 11,
      rowStart: 11,
      x: 11 * CELL_SIZE,
      y: 11 * CELL_SIZE,
      width: baseSize,
      height: baseSize,
      slots: createSlots(11 * CELL_SIZE, 11 * CELL_SIZE),
    },
    AZUL: {
      teamColor: "AZUL",
      colStart: 0,
      rowStart: 11,
      x: 0,
      y: 11 * CELL_SIZE,
      width: baseSize,
      height: baseSize,
      slots: createSlots(0, 11 * CELL_SIZE),
    },
  };
}

export const TRACK_COORDS = generateTrackCoords();
export const RAMP_COORDS = generateRampCoords();
export const BASE_COORDS = generateBaseCoords();

export const CENTER_META_BOUNDS = {
  x: 8 * CELL_SIZE,
  y: 8 * CELL_SIZE,
  width: 3 * CELL_SIZE,
  height: 3 * CELL_SIZE,
  centerX: 9.5 * CELL_SIZE,
  centerY: 9.5 * CELL_SIZE,
};
