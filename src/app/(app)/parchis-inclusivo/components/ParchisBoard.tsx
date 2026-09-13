"use client";

import React, { useState } from "react";
import type { Team, PawnState, TeamColor, SquareDefinition } from "@/lib/parchis/types";
import {
  MONOPOLY_BOARD_SIZE,
  MONOPOLY_TILES,
} from "@/lib/parchis/monopolyLayout";
import { SQUARES_CATALOG } from "@/lib/parchis/parchisCatalog";
import { hasBarrierAtPosition } from "@/lib/parchis/parchisEngine";

interface ParchisBoardProps {
  teams: Team[];
  currentTeam: Team;
  selectablePawnIds: string[];
  activePawnId: string | null;
  isHoppingPawnId: string | null;
  onPawnClick: (pawn: PawnState) => void;
  onInspectSquare?: (square: SquareDefinition) => void;
}

// Coordenadas fijas para los refugios de base en el escenario central marfil
const BASE_HAVEN_COORDS: Record<TeamColor, { x: number; y: number; label: string; eje: string; color: string; border: string }> = {
  AMARILLO: { x: 135, y: 845, label: "BASE AMARILLO", eje: "Identidad", color: "#EAB308", border: "#CA8A04" },
  VERDE: { x: 825, y: 845, label: "BASE VERDE", eje: "Diversidad", color: "#10B981", border: "#059669" },
  VIOLETA: { x: 825, y: 135, label: "BASE VIOLETA", eje: "Justicia", color: "#8B5CF6", border: "#7C3AED" },
  AZUL: { x: 135, y: 135, label: "BASE AZUL", eje: "Cambio Social", color: "#0284C7", border: "#0369A1" },
};

export const ParchisBoard: React.FC<ParchisBoardProps> = ({
  teams,
  currentTeam,
  selectablePawnIds,
  activePawnId,
  isHoppingPawnId,
  onPawnClick,
  onInspectSquare,
}) => {
  const [hoveredSquare, setHoveredSquare] = useState<number | null>(null);

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

  // Calcular conteo y posición de fichas en cada casillero para el cálculo de acomodación
  const squarePawnsMap: Record<number, PawnState[]> = {};
  teams.forEach((t) => {
    t.pawns.forEach((p) => {
      if (!p.isAtBase && !p.isAtGoal && p.position >= 1 && p.position <= 68) {
        squarePawnsMap[p.position] = squarePawnsMap[p.position] || [];
        squarePawnsMap[p.position].push(p);
      }
    });
  });

  // Calcular coordenadas exactas (cx, cy) de cada ficha para mantener identidad DOM estable
  const getPawnCoordinates = (pawn: PawnState): { x: number; y: number } => {
    // 1. Si está en base
    if (pawn.isAtBase || pawn.position === 0) {
      const base = BASE_HAVEN_COORDS[pawn.teamColor];
      const slotOffset = (pawn.pawnNumber - 1) * 32;
      return {
        x: base.x + 28 + slotOffset,
        y: base.y + 70,
      };
    }

    // 2. Si está en la meta
    if (pawn.isAtGoal) {
      const base = BASE_HAVEN_COORDS[pawn.teamColor];
      return {
        x: base.x + 80,
        y: base.y + 35,
      };
    }

    // 3. Si está en el circuito (1..68)
    const tile = MONOPOLY_TILES[pawn.position] || MONOPOLY_TILES[5];
    const siblings = squarePawnsMap[pawn.position] || [];
    const indexInTile = siblings.findIndex((sib) => sib.id === pawn.id);

    let offsetX = 0;
    let offsetY = 0;

    if (siblings.length === 2) {
      if (tile.side === "LEFT" || tile.side === "RIGHT") {
        offsetY = indexInTile === 0 ? -12 : 12;
      } else {
        offsetX = indexInTile === 0 ? -14 : 14;
      }
    } else if (siblings.length >= 3) {
      const positions = [
        { dx: -12, dy: -10 },
        { dx: 12, dy: -10 },
        { dx: -12, dy: 10 },
        { dx: 12, dy: 10 },
      ];
      const offset = positions[Math.min(indexInTile, 3)];
      offsetX = offset.dx;
      offsetY = offset.dy;
    }

    // Ajuste al centro de la casilla
    return {
      x: tile.centerX + offsetX,
      y: tile.centerY + offsetY + (tile.side === "BOTTOM" ? 6 : tile.side === "TOP" ? -6 : 0),
    };
  };

  return (
    <div className="relative w-full max-w-[980px] aspect-square mx-auto select-none">
      <style>{`
        @keyframes pawnHopArc {
          0% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-24px) scale(1.22); }
          100% { transform: translateY(0) scale(1); }
        }
        .animate-pawn-hop {
          animation: pawnHopArc 260ms cubic-bezier(0.34, 1.56, 0.64, 1);
        }
      `}</style>

      <svg
        viewBox={`0 0 ${MONOPOLY_BOARD_SIZE} ${MONOPOLY_BOARD_SIZE}`}
        className="w-full h-full rounded-3xl shadow-2xl bg-[#FAF7EE] border-4 border-[#111827]"
      >
        <defs>
          <filter id="monopolyShadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="1" dy="3" stdDeviation="2.5" floodOpacity="0.25" />
          </filter>
          <filter id="pawnShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="1" dy="4" stdDeviation="3" floodOpacity="0.4" />
          </filter>
        </defs>

        {/* 1. FONDO CREMA/MARFIL CLÁSICO DE TABLERO DE MONOPOLIO */}
        <rect
          x="0"
          y="0"
          width={MONOPOLY_BOARD_SIZE}
          height={MONOPOLY_BOARD_SIZE}
          fill="#FAF7EE"
        />

        {/* Marco interior negro característico */}
        <rect
          x="118"
          y="118"
          width="884"
          height="884"
          fill="none"
          stroke="#111827"
          strokeWidth="2.5"
        />

        {/* 2. ESCENARIO CENTRAL (CENTER STAGE CLÁSICO) */}
        <g id="center-stage">
          {/* Gran Rótulo Diagonal/Central "PARCHÍS INCLUSIVO" estilo Monopolio */}
          <g transform="translate(560, 480)">
            {/* Sombra de la caja roja */}
            <rect
              x="-265"
              y="-55"
              width="530"
              height="96"
              rx="12"
              fill="#991B1B"
              opacity="0.4"
              transform="translate(4, 5)"
            />
            {/* Caja roja emblemática */}
            <rect
              x="-265"
              y="-55"
              width="530"
              height="96"
              rx="12"
              fill="#DC2626"
              stroke="#FFFFFF"
              strokeWidth="4"
              filter="url(#monopolyShadow)"
            />
            {/* Texto Monopolio Clásico */}
            <text
              x="0"
              y="2"
              textAnchor="middle"
              fill="#FFFFFF"
              fontSize="34"
              fontWeight="900"
              letterSpacing="3"
              style={{ fontFamily: "Impact, Arial Black, sans-serif" }}
            >
              PARCHÍS INCLUSIVO
            </text>
            <text
              x="0"
              y="26"
              textAnchor="middle"
              fill="#FEE2E2"
              fontSize="12"
              fontWeight="800"
              letterSpacing="1"
            >
              RESPIRAMOS INCLUSIÓN — WORLD VISION & ACNUR
            </text>
          </g>

          {/* 4 Refugios de Base de los Equipos en las esquinas interiores */}
          {(["AMARILLO", "VERDE", "VIOLETA", "AZUL"] as TeamColor[]).map((color) => {
            const conf = BASE_HAVEN_COORDS[color];
            const team = teams.find((t) => t.color === color);
            const inGoalCount = team?.pawns.filter((p) => p.isAtGoal).length || 0;

            return (
              <g key={`haven-${color}`} transform={`translate(${conf.x}, ${conf.y})`}>
                <rect
                  x="0"
                  y="0"
                  width="160"
                  height="115"
                  rx="16"
                  fill="#FFFFFF"
                  stroke={conf.border}
                  strokeWidth="3"
                  filter="url(#monopolyShadow)"
                />
                {/* Cabecera del refugio */}
                <rect
                  x="0"
                  y="0"
                  width="160"
                  height="30"
                  rx="14"
                  fill={conf.color}
                />
                <text
                  x="80"
                  y="20"
                  textAnchor="middle"
                  fill="#FFFFFF"
                  fontSize="12"
                  fontWeight="900"
                  letterSpacing="1"
                >
                  {conf.label}
                </text>
                <text
                  x="80"
                  y="46"
                  textAnchor="middle"
                  fill="#4B5563"
                  fontSize="11"
                  fontWeight="800"
                >
                  Eje: {conf.eje}
                </text>
                {/* Contador de Meta */}
                {inGoalCount > 0 && (
                  <text
                    x="80"
                    y="62"
                    textAnchor="middle"
                    fill="#16A34A"
                    fontSize="11"
                    fontWeight="900"
                  >
                    🏆 {inGoalCount} en Meta
                  </text>
                )}
              </g>
            );
          })}
        </g>

        {/* 3. CASILLEROS PERIMÉTRICOS CON BORDES NEGROS GRUESOS ESTILO MONOPOLIO */}
        <g id="tiles-layer">
          {Object.values(MONOPOLY_TILES).map((tile) => {
            const isHovered = hoveredSquare === tile.number;
            const barrierInfo = hasBarrierAtPosition(teams, tile.number);
            const colorHex = getTeamColorHex(tile.zone);

            return (
              <g
                key={tile.number}
                onMouseEnter={() => setHoveredSquare(tile.number)}
                onMouseLeave={() => setHoveredSquare(null)}
                onClick={() => {
                  const def = SQUARES_CATALOG.find((s) => s.number === tile.number);
                  if (def && onInspectSquare) onInspectSquare(def);
                }}
                className="cursor-pointer transition-all"
              >
                {/* Fondo blanco de la casilla con borde negro grueso */}
                <rect
                  x={tile.x}
                  y={tile.y}
                  width={tile.width}
                  height={tile.height}
                  fill={isHovered ? "#FEF3C7" : "#FFFFFF"}
                  stroke="#111827"
                  strokeWidth="2.2"
                />

                {/* Banda de color exterior (Propiedad Monopolio) */}
                <rect
                  x={tile.headerBar.x}
                  y={tile.headerBar.y}
                  width={tile.headerBar.width}
                  height={tile.headerBar.height}
                  fill={colorHex}
                  stroke="#111827"
                  strokeWidth="1.5"
                />

                {/* Casillas de Esquina Especiales */}
                {tile.isCorner ? (
                  <g>
                    <text
                      x={tile.centerX}
                      y={tile.centerY - 14}
                      textAnchor="middle"
                      fill="#111827"
                      fontSize="11"
                      fontWeight="900"
                    >
                      #{tile.number}
                    </text>
                    <text
                      x={tile.centerX}
                      y={tile.centerY + 4}
                      textAnchor="middle"
                      fill="#111827"
                      fontSize="10"
                      fontWeight="900"
                      letterSpacing="0.5"
                    >
                      {tile.shortTitle}
                    </text>
                    <text
                      x={tile.centerX}
                      y={tile.centerY + 32}
                      textAnchor="middle"
                      fontSize="24"
                    >
                      {tile.number === 5
                        ? "🚩"
                        : tile.number === 22
                        ? "🌱"
                        : tile.number === 39
                        ? "⚖️"
                        : "🌊"}
                    </text>
                  </g>
                ) : (
                  /* Casillas Regulares de Borde */
                  <g>
                    {/* Número discreto en la banda */}
                    <text
                      x={tile.centerX}
                      y={
                        tile.side === "BOTTOM"
                          ? tile.y + 16
                          : tile.side === "TOP"
                          ? tile.y + 102
                          : tile.centerY - 10
                      }
                      textAnchor="middle"
                      fill="#FFFFFF"
                      fontSize="9"
                      fontWeight="900"
                    >
                      #{tile.number}
                    </text>

                    {/* Iconografía pedagógica clara */}
                    <text
                      x={tile.centerX}
                      y={tile.centerY + (tile.side === "LEFT" || tile.side === "RIGHT" ? 14 : 8)}
                      textAnchor="middle"
                      fontSize="14"
                    >
                      {tile.isInclusive && "🤝"}
                      {tile.isReturnToStart && "⚠️"}
                      {tile.isCuriosity && "💡"}
                      {tile.isSpecialAdvance && "🚀"}
                      {tile.isActivity && "🎭"}
                    </text>
                  </g>
                )}

                {/* Escudo visual de Barrera contra la discriminación */}
                {barrierInfo.hasBarrier && (
                  <g>
                    <circle
                      cx={tile.centerX}
                      cy={tile.centerY}
                      r="22"
                      fill="none"
                      stroke="#DC2626"
                      strokeWidth="3"
                      strokeDasharray="4 2"
                      className="animate-spin"
                    />
                    <rect
                      x={tile.centerX - 24}
                      y={tile.centerY - 8}
                      width="48"
                      height="16"
                      rx="4"
                      fill="#DC2626"
                      stroke="#FFFFFF"
                      strokeWidth="1.5"
                    />
                    <text
                      x={tile.centerX}
                      y={tile.centerY + 4}
                      textAnchor="middle"
                      fill="#FFFFFF"
                      fontSize="8"
                      fontWeight="900"
                    >
                      BARRERA
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </g>

        {/* 4. CAPA GLOBAL DE FICHAS CON IDENTIDAD ESTABLE EN EL DOM (PAWNS LAYER) */}
        <g id="pawns-layer">
          {teams.map((team) =>
            team.pawns.map((pawn) => {
              const coords = getPawnCoordinates(pawn);
              const isSelectable = selectablePawnIds.includes(pawn.id);
              const isActive = activePawnId === pawn.id;
              const isHopping = isHoppingPawnId === pawn.id;
              const pColor = getTeamColorHex(pawn.teamColor);

              return (
                <g
                  key={pawn.id}
                  style={{
                    transform: `translate(${coords.x}px, ${coords.y}px)`,
                    transition: isHopping
                      ? "transform 260ms cubic-bezier(0.34, 1.56, 0.64, 1)"
                      : "transform 320ms ease-out",
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isSelectable) onPawnClick(pawn);
                  }}
                  className={`transition-all ${
                    isSelectable ? "cursor-pointer" : "cursor-default"
                  }`}
                >
                  {/* Animación de arco vertical (Hop Bounce) en el salto */}
                  <g className={isHopping ? "animate-pawn-hop" : ""}>
                    {/* Baliza pulsante cuando la ficha puede moverse */}
                    {isSelectable && (
                      <circle
                        cx="0"
                        cy="0"
                        r="24"
                        fill="none"
                        stroke="#2563EB"
                        strokeWidth="3.5"
                        className="animate-ping opacity-75"
                      />
                    )}

                    {/* Base de la Ficha 3D tipo peón de mesa */}
                    <ellipse
                      cx="0"
                      cy="8"
                      rx="16"
                      ry="6"
                      fill="#000000"
                      opacity="0.25"
                    />

                    {/* Cuerpo circular con borde blanco grueso */}
                    <circle
                      cx="0"
                      cy="0"
                      r="16"
                      fill={pColor}
                      stroke="#FFFFFF"
                      strokeWidth={isActive ? "4" : "2.5"}
                      filter="url(#pawnShadow)"
                    />

                    {/* Número de Ficha */}
                    <text
                      x="0"
                      y="5"
                      textAnchor="middle"
                      fill="#FFFFFF"
                      fontSize="12"
                      fontWeight="900"
                    >
                      {pawn.pawnNumber}
                    </text>
                  </g>
                </g>
              );
            })
          )}
        </g>
      </svg>
    </div>
  );
};
