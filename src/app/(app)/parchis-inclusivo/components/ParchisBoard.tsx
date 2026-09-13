"use client";

import React, { useState } from "react";
import type { Team, PawnState, TeamColor, SquareDefinition } from "@/lib/parchis/types";
import {
  BOARD_SIZE,
  CELL_SIZE,
  TRACK_COORDS,
  RAMP_COORDS,
  BASE_COORDS,
  CENTER_META_BOUNDS,
} from "@/lib/parchis/boardLayout";
import { SQUARES_CATALOG } from "@/lib/parchis/parchisCatalog";
import { hasBarrierAtPosition } from "@/lib/parchis/parchisEngine";

interface ParchisBoardProps {
  teams: Team[];
  currentTeam: Team;
  selectablePawnIds: string[];
  activePawnId: string | null;
  onPawnClick: (pawn: PawnState) => void;
  onInspectSquare?: (square: SquareDefinition) => void;
}

export const ParchisBoard: React.FC<ParchisBoardProps> = ({
  teams,
  currentTeam,
  selectablePawnIds,
  activePawnId,
  onPawnClick,
  onInspectSquare,
}) => {
  const [hoveredSquare, setHoveredSquare] = useState<number | null>(null);

  // Mapeo de fichas por posición en el circuito (1..68)
  const pawnsByTrackSquare: Record<number, PawnState[]> = {};
  // Mapeo de fichas por rampa privada
  const pawnsByRamp: Record<TeamColor, Record<number, PawnState[]>> = {
    AMARILLO: {},
    VERDE: {},
    VIOLETA: {},
    AZUL: {},
  };

  teams.forEach((t) => {
    t.pawns.forEach((p) => {
      if (!p.isAtBase && !p.isAtGoal) {
        if (p.position >= 1 && p.position <= 68) {
          pawnsByTrackSquare[p.position] = pawnsByTrackSquare[p.position] || [];
          pawnsByTrackSquare[p.position].push(p);
        } else if (p.position >= 101 && p.position <= 107) {
          const step = p.position - 100;
          pawnsByRamp[p.teamColor][step] = pawnsByRamp[p.teamColor][step] || [];
          pawnsByRamp[p.teamColor][step].push(p);
        }
      }
    });
  });

  const getTeamColorHex = (c: TeamColor) => {
    switch (c) {
      case "AMARILLO":
        return "#EAB308";
      case "VERDE":
        return "#10B981";
      case "VIOLETA":
        return "#8B5CF6";
      case "AZUL":
        return "#0284C7";
    }
  };

  const getTeamLightHex = (c: TeamColor) => {
    switch (c) {
      case "AMARILLO":
        return "#FEF9C3";
      case "VERDE":
        return "#D1FAE5";
      case "VIOLETA":
        return "#EDE9FE";
      case "AZUL":
        return "#E0F2FE";
    }
  };

  return (
    <div className="relative w-full max-w-[850px] aspect-square mx-auto select-none">
      <svg
        viewBox={`0 0 ${BOARD_SIZE} ${BOARD_SIZE}`}
        className="w-full h-full rounded-3xl shadow-2xl bg-white border-4 border-slate-800"
      >
        <defs>
          <radialGradient id="metaGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FDE047" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#CA8A04" stopOpacity="0.2" />
          </radialGradient>
          <filter id="pawnShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="1" dy="2" stdDeviation="2" floodOpacity="0.35" />
          </filter>
        </defs>

        {/* 1. BASES EN LAS ESQUINAS ("Inicia el camino inclusivo") */}
        {(["AMARILLO", "VERDE", "VIOLETA", "AZUL"] as TeamColor[]).map((color) => {
          const base = BASE_COORDS[color];
          const team = teams.find((t) => t.color === color);
          const colorHex = getTeamColorHex(color);
          const lightHex = getTeamLightHex(color);
          const pawnsAtBase = team ? team.pawns.filter((p) => p.isAtBase) : [];

          let title = "IDENTIDAD";
          if (color === "VERDE") title = "DIVERSIDAD";
          if (color === "VIOLETA") title = "JUSTICIA";
          if (color === "AZUL") title = "CAMBIO SOCIAL";

          return (
            <g key={color} className="transition-all">
              {/* Contenedor cuadrante */}
              <rect
                x={base.x}
                y={base.y}
                width={base.width}
                height={base.height}
                fill={lightHex}
                stroke="#1E293B"
                strokeWidth="3"
              />

              {/* Círculo interior de la base */}
              <circle
                cx={base.x + base.width / 2}
                cy={base.y + base.height / 2}
                r={base.width * 0.38}
                fill="#FFFFFF"
                stroke={colorHex}
                strokeWidth="4"
              />

              {/* Título del Eje y Equipo */}
              <text
                x={base.x + base.width / 2}
                y={base.y + base.height * 0.28}
                textAnchor="middle"
                fill="#0F172A"
                fontSize="18"
                fontWeight="900"
                letterSpacing="1"
              >
                {title}
              </text>
              <text
                x={base.x + base.width / 2}
                y={base.y + base.height * 0.35}
                textAnchor="middle"
                fill={colorHex}
                fontSize="13"
                fontWeight="800"
              >
                Inicia el camino inclusivo
              </text>

              {/* Ranuras para fichas en base */}
              {base.slots.map((slot, sIdx) => {
                const pawn = pawnsAtBase[sIdx];
                const isSelectable = pawn && selectablePawnIds.includes(pawn.id);

                return (
                  <g key={slot.slotIndex}>
                    <circle
                      cx={slot.x}
                      cy={slot.y}
                      r={CELL_SIZE * 0.45}
                      fill="#F1F5F9"
                      stroke="#CBD5E1"
                      strokeWidth="2"
                    />

                    {pawn && (
                      <g
                        onClick={() => isSelectable && onPawnClick(pawn)}
                        className={`transition-all ${
                          isSelectable
                            ? "cursor-pointer hover:scale-110 active:scale-95"
                            : "cursor-default"
                        }`}
                      >
                        {isSelectable && (
                          <circle
                            cx={slot.x}
                            cy={slot.y}
                            r={CELL_SIZE * 0.6}
                            fill="none"
                            stroke="#2563EB"
                            strokeWidth="3"
                            className="animate-ping opacity-60"
                          />
                        )}
                        <circle
                          cx={slot.x}
                          cy={slot.y}
                          r={CELL_SIZE * 0.42}
                          fill={colorHex}
                          stroke="#FFFFFF"
                          strokeWidth="3"
                          filter="url(#pawnShadow)"
                        />
                        <text
                          x={slot.x}
                          y={slot.y + 5}
                          textAnchor="middle"
                          fill="#FFFFFF"
                          fontSize="15"
                          fontWeight="900"
                        >
                          {pawn.pawnNumber}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}
            </g>
          );
        })}

        {/* 2. CASILLEROS DEL CIRCUITO EXTERIOR (1 a 68) */}
        {Object.values(TRACK_COORDS).map((coord) => {
          const isHovered = hoveredSquare === coord.number;
          const zoneColor = getTeamColorHex(coord.zone);
          const pawnsHere = pawnsByTrackSquare[coord.number] || [];
          const barrierInfo = hasBarrierAtPosition(teams, coord.number);

          // Estilo de fondo del casillero
          let bgFill = "#FFFFFF";
          if (coord.isExit) {
            bgFill = getTeamLightHex(coord.zone);
          } else if (coord.isInclusive) {
            bgFill = "#F0FDF4"; // Verde suave zona inclusiva
          } else if (coord.isReturnToStart) {
            bgFill = "#FFF1F2"; // Rojo suave retroceso
          } else if (coord.isCuriosity) {
            bgFill = "#FFFBEB"; // Ámbar suave dato curioso
          }

          return (
            <g
              key={coord.number}
              onMouseEnter={() => setHoveredSquare(coord.number)}
              onMouseLeave={() => setHoveredSquare(null)}
              onClick={() => {
                const def = SQUARES_CATALOG.find((s) => s.number === coord.number);
                if (def && onInspectSquare) onInspectSquare(def);
              }}
              className="cursor-pointer transition-all"
            >
              {/* Celda */}
              <rect
                x={coord.x}
                y={coord.y}
                width={coord.width}
                height={coord.height}
                fill={isHovered ? "#F8FAFC" : bgFill}
                stroke={isHovered ? zoneColor : "#334155"}
                strokeWidth={isHovered ? "2.5" : "1.2"}
              />

              {/* Borde de zona de color */}
              <line
                x1={coord.x}
                y1={coord.y + 1}
                x2={coord.x + coord.width}
                y2={coord.y + 1}
                stroke={zoneColor}
                strokeWidth="3"
              />

              {/* Número del Casillero */}
              <text
                x={coord.x + 5}
                y={coord.y + 13}
                fill="#475569"
                fontSize="9"
                fontWeight="800"
              >
                {coord.number}
              </text>

              {/* Íconos visuales de tipo de casillero */}
              {coord.isInclusive && (
                <text
                  x={coord.centerX + 7}
                  y={coord.y + 14}
                  textAnchor="middle"
                  fontSize="12"
                >
                  <title>Zona Inclusiva</title>
                  🤝
                </text>
              )}
              {coord.isReturnToStart && (
                <text
                  x={coord.centerX + 7}
                  y={coord.y + 14}
                  textAnchor="middle"
                  fontSize="12"
                >
                  <title>Retrocede al inicio</title>
                  ⚠️
                </text>
              )}
              {coord.isCuriosity && (
                <text
                  x={coord.centerX + 7}
                  y={coord.y + 14}
                  textAnchor="middle"
                  fontSize="12"
                >
                  <title>Dato curioso</title>
                  💡
                </text>
              )}
              {coord.isSpecialAdvance && (
                <text
                  x={coord.centerX + 7}
                  y={coord.y + 14}
                  textAnchor="middle"
                  fontSize="12"
                >
                  <title>Avanza 2</title>
                  🚀
                </text>
              )}
              {coord.isActivity && (
                <text
                  x={coord.centerX + 7}
                  y={coord.y + 14}
                  textAnchor="middle"
                  fontSize="12"
                >
                  <title>Actividad grupal</title>
                  🎭
                </text>
              )}

              {/* BARRERA CONTRA LA DISCRIMINACIÓN */}
              {barrierInfo.hasBarrier && (
                <g>
                  <circle
                    cx={coord.centerX}
                    cy={coord.centerY}
                    r={CELL_SIZE * 0.45}
                    fill="none"
                    stroke="#EF4444"
                    strokeWidth="2.5"
                    strokeDasharray="3 2"
                    className="animate-spin"
                  />
                  <rect
                    x={coord.x + 2}
                    y={coord.y + coord.height - 13}
                    width={coord.width - 4}
                    height="11"
                    rx="3"
                    fill="#DC2626"
                  />
                  <text
                    x={coord.centerX}
                    y={coord.y + coord.height - 4}
                    textAnchor="middle"
                    fill="#FFFFFF"
                    fontSize="7"
                    fontWeight="900"
                  >
                    BARRERA
                  </text>
                </g>
              )}

              {/* Render de Fichas en este Casillero */}
              {pawnsHere.length > 0 && (
                <g>
                  {pawnsHere.map((pawn, pIdx) => {
                    const isSelectable = selectablePawnIds.includes(pawn.id);
                    const isActive = activePawnId === pawn.id;
                    const pColor = getTeamColorHex(pawn.teamColor);

                    // Desplazamiento si hay múltiples fichas (convivencia pacífica)
                    let px = coord.centerX;
                    let py = coord.centerY + 4;
                    if (pawnsHere.length === 2) {
                      px = coord.centerX + (pIdx === 0 ? -9 : 9);
                    } else if (pawnsHere.length > 2) {
                      px = coord.centerX + (pIdx % 2 === 0 ? -8 : 8);
                      py = coord.centerY + (pIdx < 2 ? 0 : 8);
                    }

                    return (
                      <g
                        key={pawn.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isSelectable) onPawnClick(pawn);
                        }}
                        className={`transition-all ${
                          isSelectable
                            ? "cursor-pointer hover:scale-125"
                            : "cursor-default"
                        }`}
                      >
                        {isSelectable && (
                          <circle
                            cx={px}
                            cy={py}
                            r={CELL_SIZE * 0.4}
                            fill="none"
                            stroke="#3B82F6"
                            strokeWidth="3"
                            className="animate-ping opacity-75"
                          />
                        )}
                        <circle
                          cx={px}
                          cy={py}
                          r={pawnsHere.length > 1 ? 11 : 14}
                          fill={pColor}
                          stroke="#FFFFFF"
                          strokeWidth={isActive ? "3.5" : "2"}
                          filter="url(#pawnShadow)"
                        />
                        <text
                          x={px}
                          y={py + 3.5}
                          textAnchor="middle"
                          fill="#FFFFFF"
                          fontSize={pawnsHere.length > 1 ? "9" : "11"}
                          fontWeight="900"
                        >
                          {pawn.pawnNumber}
                        </text>
                      </g>
                    );
                  })}
                </g>
              )}
            </g>
          );
        })}

        {/* 3. RAMPAS PRIVADAS HACIA LA META (Pasillos de 7 casilleros de color) */}
        {(["AMARILLO", "VERDE", "VIOLETA", "AZUL"] as TeamColor[]).map((color) => {
          const ramps = RAMP_COORDS[color];
          const colorHex = getTeamColorHex(color);
          const lightHex = getTeamLightHex(color);

          return (
            <g key={`ramp-${color}`}>
              {ramps.map((coord) => {
                const pawnsInStep = pawnsByRamp[color][coord.step] || [];

                return (
                  <g key={`ramp-${color}-${coord.step}`}>
                    <rect
                      x={coord.x}
                      y={coord.y}
                      width={coord.width}
                      height={coord.height}
                      fill={lightHex}
                      stroke={colorHex}
                      strokeWidth="1.5"
                    />
                    <text
                      x={coord.centerX}
                      y={coord.centerY + 3}
                      textAnchor="middle"
                      fill={colorHex}
                      fontSize="10"
                      fontWeight="800"
                    >
                      {coord.step}
                    </text>

                    {/* Ficha en la rampa */}
                    {pawnsInStep.map((pawn) => {
                      const isSelectable = selectablePawnIds.includes(pawn.id);
                      return (
                        <g
                          key={pawn.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isSelectable) onPawnClick(pawn);
                          }}
                          className={isSelectable ? "cursor-pointer" : "cursor-default"}
                        >
                          <circle
                            cx={coord.centerX}
                            cy={coord.centerY}
                            r="14"
                            fill={colorHex}
                            stroke="#FFFFFF"
                            strokeWidth="2"
                            filter="url(#pawnShadow)"
                          />
                          <text
                            x={coord.centerX}
                            y={coord.centerY + 4}
                            textAnchor="middle"
                            fill="#FFFFFF"
                            fontSize="11"
                            fontWeight="900"
                          >
                            {pawn.pawnNumber}
                          </text>
                        </g>
                      );
                    })}
                  </g>
                );
              })}
            </g>
          );
        })}

        {/* 4. META CENTRAL (3x3 con los 4 sectores y emblema inclusivo) */}
        <g>
          {/* Triángulo Norte (Amarillo) */}
          <polygon
            points={`${CENTER_META_BOUNDS.x},${CENTER_META_BOUNDS.y} ${
              CENTER_META_BOUNDS.x + CENTER_META_BOUNDS.width
            },${CENTER_META_BOUNDS.y} ${CENTER_META_BOUNDS.centerX},${
              CENTER_META_BOUNDS.centerY
            }`}
            fill="#FEF08A"
            stroke="#CA8A04"
            strokeWidth="2"
          />
          {/* Triángulo Este (Verde) */}
          <polygon
            points={`${CENTER_META_BOUNDS.x + CENTER_META_BOUNDS.width},${
              CENTER_META_BOUNDS.y
            } ${CENTER_META_BOUNDS.x + CENTER_META_BOUNDS.width},${
              CENTER_META_BOUNDS.y + CENTER_META_BOUNDS.height
            } ${CENTER_META_BOUNDS.centerX},${CENTER_META_BOUNDS.centerY}`}
            fill="#BBF7D0"
            stroke="#16A34A"
            strokeWidth="2"
          />
          {/* Triángulo Sur (Violeta) */}
          <polygon
            points={`${CENTER_META_BOUNDS.x + CENTER_META_BOUNDS.width},${
              CENTER_META_BOUNDS.y + CENTER_META_BOUNDS.height
            } ${CENTER_META_BOUNDS.x},${
              CENTER_META_BOUNDS.y + CENTER_META_BOUNDS.height
            } ${CENTER_META_BOUNDS.centerX},${CENTER_META_BOUNDS.centerY}`}
            fill="#DDD6FE"
            stroke="#9333EA"
            strokeWidth="2"
          />
          {/* Triángulo Oeste (Azul) */}
          <polygon
            points={`${CENTER_META_BOUNDS.x},${
              CENTER_META_BOUNDS.y + CENTER_META_BOUNDS.height
            } ${CENTER_META_BOUNDS.x},${CENTER_META_BOUNDS.y} ${
              CENTER_META_BOUNDS.centerX
            },${CENTER_META_BOUNDS.centerY}`}
            fill="#BAE6FD"
            stroke="#0284C7"
            strokeWidth="2"
          />

          {/* Círculo central brillante con emblema de meta */}
          <circle
            cx={CENTER_META_BOUNDS.centerX}
            cy={CENTER_META_BOUNDS.centerY}
            r={CELL_SIZE * 0.9}
            fill="url(#metaGlow)"
            stroke="#1E293B"
            strokeWidth="3"
          />
          <text
            x={CENTER_META_BOUNDS.centerX}
            y={CENTER_META_BOUNDS.centerY - 6}
            textAnchor="middle"
            fontSize="22"
          >
            🏆
          </text>
          <text
            x={CENTER_META_BOUNDS.centerX}
            y={CENTER_META_BOUNDS.centerY + 14}
            textAnchor="middle"
            fill="#0F172A"
            fontSize="9"
            fontWeight="900"
            letterSpacing="1"
          >
            META
          </text>
        </g>
      </svg>
    </div>
  );
};
