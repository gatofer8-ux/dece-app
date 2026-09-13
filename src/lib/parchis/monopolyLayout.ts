import type { TeamColor } from "./types";
import { SQUARES_CATALOG } from "./parchisCatalog";

export const MONOPOLY_BOARD_SIZE = 1120;
export const MONOPOLY_CORNER_SIZE = 120;
export const MONOPOLY_TILE_WIDTH = 55;
export const MONOPOLY_TILE_HEIGHT = 110;
export const MONOPOLY_TILES_PER_SIDE = 16;

export interface MonopolyTileCoord {
  number: number;
  x: number;
  y: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
  side: "BOTTOM" | "RIGHT" | "TOP" | "LEFT" | "CORNER";
  zone: TeamColor;
  isCorner: boolean;
  isExit: boolean;
  isInclusive: boolean;
  isSpecialAdvance: boolean;
  isReturnToStart: boolean;
  isCuriosity: boolean;
  isActivity: boolean;
  title: string;
  shortTitle: string;
  headerBar: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

/**
 * Genera las coordenadas exactas de las 68 casillas del tablero estilo Monopolio Moderno.
 * Perímetro: 4 esquinas de 120x120px + 4 lados de 16 casillas de 55x110px = 68 casillas en total.
 */
export function generateMonopolyCoords(): Record<number, MonopolyTileCoord> {
  const map: Record<number, MonopolyTileCoord> = {};

  const getDef = (num: number) => SQUARES_CATALOG.find((s) => s.number === num);

  // 1. Esquina Inferior-Izquierda: Casillero 5 (Salida Amarilla / Identidad)
  const def5 = getDef(5);
  map[5] = {
    number: 5,
    x: 0,
    y: 1000,
    width: MONOPOLY_CORNER_SIZE,
    height: MONOPOLY_CORNER_SIZE,
    centerX: 60,
    centerY: 1060,
    side: "CORNER",
    zone: "AMARILLO",
    isCorner: true,
    isExit: true,
    isInclusive: true,
    isSpecialAdvance: false,
    isReturnToStart: false,
    isCuriosity: false,
    isActivity: false,
    title: def5?.title || "Inicia el Camino Inclusivo",
    shortTitle: "SALIDA",
    headerBar: { x: 0, y: 1000, width: MONOPOLY_CORNER_SIZE, height: 26 },
  };

  // 2. Borde Inferior: Casilleros 6 al 21 (Lado Amarillo / Identidad - izquierda a derecha)
  for (let i = 0; i < 16; i++) {
    const num = 6 + i;
    const def = getDef(num);
    const x = MONOPOLY_CORNER_SIZE + i * MONOPOLY_TILE_WIDTH;
    const y = 1010;
    map[num] = {
      number: num,
      x,
      y,
      width: MONOPOLY_TILE_WIDTH,
      height: MONOPOLY_TILE_HEIGHT,
      centerX: x + MONOPOLY_TILE_WIDTH / 2,
      centerY: y + MONOPOLY_TILE_HEIGHT / 2,
      side: "BOTTOM",
      zone: def?.zone || "AMARILLO",
      isCorner: false,
      isExit: false,
      isInclusive: def?.isInclusiveZone || false,
      isSpecialAdvance: !!def?.advanceBonus && !def.isInclusiveZone,
      isReturnToStart: !!def?.returnToStart,
      isCuriosity: def?.type === "DATO_CURIOSO",
      isActivity: def?.type === "ACTIVIDAD",
      title: def?.title || `Casillero ${num}`,
      shortTitle: (def?.title || `Reto ${num}`).slice(0, 16),
      headerBar: { x, y, width: MONOPOLY_TILE_WIDTH, height: 24 },
    };
  }

  // 3. Esquina Inferior-Derecha: Casillero 22 (Bienvenida Verde / Diversidad)
  const def22 = getDef(22);
  map[22] = {
    number: 22,
    x: 1000,
    y: 1000,
    width: MONOPOLY_CORNER_SIZE,
    height: MONOPOLY_CORNER_SIZE,
    centerX: 1060,
    centerY: 1060,
    side: "CORNER",
    zone: "VERDE",
    isCorner: true,
    isExit: true,
    isInclusive: true,
    isSpecialAdvance: false,
    isReturnToStart: false,
    isCuriosity: false,
    isActivity: false,
    title: def22?.title || "Bienvenida Diversidad",
    shortTitle: "DIVERSIDAD",
    headerBar: { x: 1000, y: 1000, width: MONOPOLY_CORNER_SIZE, height: 26 },
  };

  // 4. Borde Derecho: Casilleros 23 al 38 (Lado Verde / Diversidad - abajo hacia arriba)
  for (let i = 0; i < 16; i++) {
    const num = 23 + i;
    const def = getDef(num);
    const x = 1010;
    const y = 1000 - (i + 1) * MONOPOLY_TILE_WIDTH;
    map[num] = {
      number: num,
      x,
      y,
      width: MONOPOLY_TILE_HEIGHT,
      height: MONOPOLY_TILE_WIDTH,
      centerX: x + MONOPOLY_TILE_HEIGHT / 2,
      centerY: y + MONOPOLY_TILE_WIDTH / 2,
      side: "RIGHT",
      zone: def?.zone || "VERDE",
      isCorner: false,
      isExit: false,
      isInclusive: def?.isInclusiveZone || false,
      isSpecialAdvance: !!def?.advanceBonus && !def.isInclusiveZone,
      isReturnToStart: !!def?.returnToStart,
      isCuriosity: def?.type === "DATO_CURIOSO",
      isActivity: def?.type === "ACTIVIDAD",
      title: def?.title || `Casillero ${num}`,
      shortTitle: (def?.title || `Reto ${num}`).slice(0, 16),
      headerBar: { x, y, width: 24, height: MONOPOLY_TILE_WIDTH },
    };
  }

  // 5. Esquina Superior-Derecha: Casillero 39 (Bienvenida Violeta / Justicia)
  const def39 = getDef(39);
  map[39] = {
    number: 39,
    x: 1000,
    y: 0,
    width: MONOPOLY_CORNER_SIZE,
    height: MONOPOLY_CORNER_SIZE,
    centerX: 1060,
    centerY: 60,
    side: "CORNER",
    zone: "VIOLETA",
    isCorner: true,
    isExit: true,
    isInclusive: true,
    isSpecialAdvance: false,
    isReturnToStart: false,
    isCuriosity: false,
    isActivity: false,
    title: def39?.title || "Bienvenida Justicia",
    shortTitle: "JUSTICIA",
    headerBar: { x: 1000, y: 94, width: MONOPOLY_CORNER_SIZE, height: 26 },
  };

  // 6. Borde Superior: Casilleros 40 al 55 (Lado Violeta / Justicia - derecha hacia izquierda)
  for (let i = 0; i < 16; i++) {
    const num = 40 + i;
    const def = getDef(num);
    const x = 1000 - (i + 1) * MONOPOLY_TILE_WIDTH;
    const y = 0;
    map[num] = {
      number: num,
      x,
      y,
      width: MONOPOLY_TILE_WIDTH,
      height: MONOPOLY_TILE_HEIGHT,
      centerX: x + MONOPOLY_TILE_WIDTH / 2,
      centerY: y + MONOPOLY_TILE_HEIGHT / 2,
      side: "TOP",
      zone: def?.zone || "VIOLETA",
      isCorner: false,
      isExit: false,
      isInclusive: def?.isInclusiveZone || false,
      isSpecialAdvance: !!def?.advanceBonus && !def.isInclusiveZone,
      isReturnToStart: !!def?.returnToStart,
      isCuriosity: def?.type === "DATO_CURIOSO",
      isActivity: def?.type === "ACTIVIDAD",
      title: def?.title || `Casillero ${num}`,
      shortTitle: (def?.title || `Reto ${num}`).slice(0, 16),
      headerBar: { x, y: 86, width: MONOPOLY_TILE_WIDTH, height: 24 },
    };
  }

  // 7. Esquina Superior-Izquierda: Casillero 56 (Bienvenida Azul / Cambio Social)
  const def56 = getDef(56);
  map[56] = {
    number: 56,
    x: 0,
    y: 0,
    width: MONOPOLY_CORNER_SIZE,
    height: MONOPOLY_CORNER_SIZE,
    centerX: 60,
    centerY: 60,
    side: "CORNER",
    zone: "AZUL",
    isCorner: true,
    isExit: true,
    isInclusive: true,
    isSpecialAdvance: false,
    isReturnToStart: false,
    isCuriosity: false,
    isActivity: false,
    title: def56?.title || "Bienvenida Cambio Social",
    shortTitle: "CAMBIO",
    headerBar: { x: 0, y: 94, width: MONOPOLY_CORNER_SIZE, height: 26 },
  };

  // 8. Borde Izquierdo: Casilleros 57 al 68, y continúa en 1 al 4 (Lado Azul - arriba hacia abajo)
  for (let i = 0; i < 16; i++) {
    const num = i <= 11 ? 57 + i : i - 11;
    const def = getDef(num);
    const x = 0;
    const y = MONOPOLY_CORNER_SIZE + i * MONOPOLY_TILE_WIDTH;
    map[num] = {
      number: num,
      x,
      y,
      width: MONOPOLY_TILE_HEIGHT,
      height: MONOPOLY_TILE_WIDTH,
      centerX: x + MONOPOLY_TILE_HEIGHT / 2,
      centerY: y + MONOPOLY_TILE_WIDTH / 2,
      side: "LEFT",
      zone: def?.zone || "AZUL",
      isCorner: false,
      isExit: false,
      isInclusive: def?.isInclusiveZone || false,
      isSpecialAdvance: !!def?.advanceBonus && !def.isInclusiveZone,
      isReturnToStart: !!def?.returnToStart,
      isCuriosity: def?.type === "DATO_CURIOSO",
      isActivity: def?.type === "ACTIVIDAD",
      title: def?.title || `Casillero ${num}`,
      shortTitle: (def?.title || `Reto ${num}`).slice(0, 16),
      headerBar: { x: 86, y, width: 24, height: MONOPOLY_TILE_WIDTH },
    };
  }

  return map;
}

export const MONOPOLY_TILES = generateMonopolyCoords();

export const MONOPOLY_CENTER_STAGE = {
  x: 120,
  y: 120,
  width: 880,
  height: 880,
  centerX: 560,
  centerY: 560,
};
