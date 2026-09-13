"use client";

import React, { useState } from "react";
import type { Team, PawnState, TeamColor, SquareDefinition } from "@/lib/parchis/types";
import {
  MONOPOLY_BOARD_SIZE,
  MONOPOLY_TILES,
  MONOPOLY_CENTER_STAGE,
} from "@/lib/parchis/monopolyLayout";
import { SQUARES_CATALOG, EJES_INFO } from "@/lib/parchis/parchisCatalog";
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

  // Mapear fichas activas por casillero en el circuito (1..68)
  const pawnsBySquare: Record<number, PawnState[]> = {};
  teams.forEach((t) => {
    t.pawns.forEach((p) => {
      if (!p.isAtBase && !p.isAtGoal && p.position >= 1 && p.position <= 68) {
        pawnsBySquare[p.position] = pawnsBySquare[p.position] || [];
        pawnsBySquare[p.position].push(p);
      }
    });
  });

  const getTeamColorHex = (c: TeamColor) => {
    switch (c) {
      case "AMARILLO":
        return "#EAB308"; // Amarillo brillante
      case "VERDE":
        return "#10B981"; // Esmeralda
      case "VIOLETA":
        return "#8B5CF6"; // Violeta
      case "AZUL":
        return "#0284C7"; // Azul cielo
    }
  };

  const getTeamSoftBg = (c: TeamColor) => {
    switch (c) {
      case "AMARILLO":
        return "#FEF08A";
      case "VERDE":
        return "#BBF7D0";
      case "VIOLETA":
        return "#DDD6FE";
      case "AZUL":
        return "#BAE6FD";
    }
  };

  return (
    <div className="relative w-full max-w-[960px] aspect-square mx-auto select-none">
      <svg
        viewBox={`0 0 ${MONOPOLY_BOARD_SIZE} ${MONOPOLY_BOARD_SIZE}`}
        className="w-full h-full rounded-3xl shadow-2xl bg-[#0f172a] border-4 border-slate-900"
      >
        <defs>
          <filter id="tileShadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.2" />
          </filter>
          <filter id="pawnShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="1" dy="3" stdDeviation="3" floodOpacity="0.45" />
          </filter>
          <linearGradient id="boardFelt" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1e293b" />
            <stop offset="50%" stopColor="#0f172a" />
            <stop offset="100%" stopColor="#1e293b" />
          </linearGradient>
          <linearGradient id="goldTrim" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FDE047" />
            <stop offset="50%" stopColor="#CA8A04" />
            <stop offset="100%" stopColor="#FDE047" />
          </linearGradient>
        </defs>

        {/* 1. FONDO PRINCIPAL DEL TABLERO DE MONOPOLIO */}
        <rect
          x="0"
          y="0"
          width={MONOPOLY_BOARD_SIZE}
          height={MONOPOLY_BOARD_SIZE}
          fill="url(#boardFelt)"
        />

        {/* Marco dorado interior delimitador */}
        <rect
          x="116"
          y="116"
          width="888"
          height="888"
          fill="none"
          stroke="url(#goldTrim)"
          strokeWidth="3"
          rx="12"
          opacity="0.8"
        />

        {/* 2. ESCENARIO CENTRAL (CENTER STAGE) */}
        <g id="center-stage">
          {/* Logo Central de Monopolio Inclusivo */}
          <g transform="translate(560, 220)">
            {/* Cinta decorativa */}
            <rect
              x="-240"
              y="-40"
              width="480"
              height="70"
              rx="16"
              fill="#1e293b"
              stroke="#ca8a04"
              strokeWidth="2"
              filter="url(#tileShadow)"
            />
            <text
              x="0"
              y="-10"
              textAnchor="middle"
              fill="#FDE047"
              fontSize="24"
              fontWeight="900"
              letterSpacing="3"
            >
              PARCHÍS INCLUSIVO
            </text>
            <text
              x="0"
              y="15"
              textAnchor="middle"
              fill="#94a3b8"
              fontSize="12"
              fontWeight="700"
              letterSpacing="1"
            >
              PROGRAMA «RESPIRAMOS INCLUSIÓN» — WORLD VISION & ACNUR
            </text>
          </g>

          {/* Emblema central de los 4 Ejes */}
          <g transform="translate(560, 360)">
            <circle cx="0" cy="0" r="55" fill="#0f172a" stroke="#ca8a04" strokeWidth="3" />
            <text x="0" y="-8" textAnchor="middle" fontSize="30">
              🎲
            </text>
            <text
              x="0"
              y="22"
              textAnchor="middle"
              fill="#e2e8f0"
              fontSize="11"
              fontWeight="900"
            >
              TABLERO 68
            </text>
          </g>

          {/* 4 Refugios de Base de los Equipos en las esquinas del Center Stage */}
          {/* Base Amarilla (Abajo-Izquierda) */}
          <g transform="translate(140, 840)">
            <rect
              x="0"
              y="0"
              width="150"
              height="110"
              rx="14"
              fill="#FEF08A20"
              stroke="#EAB308"
              strokeWidth="2"
            />
            <text x="75" y="24" textAnchor="middle" fill="#FDE047" fontSize="12" fontWeight="900">
              BASE AMARILLO
            </text>
            <text x="75" y="42" textAnchor="middle" fill="#94a3b8" fontSize="10">
              Identidad
            </text>
            {/* Fichas en base */}
            <g transform="translate(25, 60)">
              {teams
                .find((t) => t.color === "AMARILLO")
                ?.pawns.filter((p) => p.isAtBase)
                .map((p, idx) => {
                  const isSel = selectablePawnIds.includes(p.id);
                  return (
                    <g
                      key={p.id}
                      transform={`translate(${idx * 32}, 15)`}
                      onClick={() => isSel && onPawnClick(p)}
                      className={isSel ? "cursor-pointer" : ""}
                    >
                      {isSel && (
                        <circle
                          cx="12"
                          cy="0"
                          r="18"
                          fill="none"
                          stroke="#3B82F6"
                          strokeWidth="3"
                          className="animate-ping"
                        />
                      )}
                      <circle
                        cx="12"
                        cy="0"
                        r="14"
                        fill="#EAB308"
                        stroke="#ffffff"
                        strokeWidth="2.5"
                        filter="url(#pawnShadow)"
                      />
                      <text
                        x="12"
                        y="4"
                        textAnchor="middle"
                        fill="#ffffff"
                        fontSize="11"
                        fontWeight="900"
                      >
                        {p.pawnNumber}
                      </text>
                    </g>
                  );
                })}
            </g>
          </g>

          {/* Base Verde (Abajo-Derecha) */}
          <g transform="translate(830, 840)">
            <rect
              x="0"
              y="0"
              width="150"
              height="110"
              rx="14"
              fill="#BBF7D020"
              stroke="#10B981"
              strokeWidth="2"
            />
            <text x="75" y="24" textAnchor="middle" fill="#34D399" fontSize="12" fontWeight="900">
              BASE VERDE
            </text>
            <text x="75" y="42" textAnchor="middle" fill="#94a3b8" fontSize="10">
              Diversidad
            </text>
            <g transform="translate(25, 60)">
              {teams
                .find((t) => t.color === "VERDE")
                ?.pawns.filter((p) => p.isAtBase)
                .map((p, idx) => {
                  const isSel = selectablePawnIds.includes(p.id);
                  return (
                    <g
                      key={p.id}
                      transform={`translate(${idx * 32}, 15)`}
                      onClick={() => isSel && onPawnClick(p)}
                      className={isSel ? "cursor-pointer" : ""}
                    >
                      {isSel && (
                        <circle
                          cx="12"
                          cy="0"
                          r="18"
                          fill="none"
                          stroke="#3B82F6"
                          strokeWidth="3"
                          className="animate-ping"
                        />
                      )}
                      <circle
                        cx="12"
                        cy="0"
                        r="14"
                        fill="#10B981"
                        stroke="#ffffff"
                        strokeWidth="2.5"
                        filter="url(#pawnShadow)"
                      />
                      <text
                        x="12"
                        y="4"
                        textAnchor="middle"
                        fill="#ffffff"
                        fontSize="11"
                        fontWeight="900"
                      >
                        {p.pawnNumber}
                      </text>
                    </g>
                  );
                })}
            </g>
          </g>

          {/* Base Violeta (Arriba-Derecha) */}
          <g transform="translate(830, 140)">
            <rect
              x="0"
              y="0"
              width="150"
              height="110"
              rx="14"
              fill="#DDD6FE20"
              stroke="#8B5CF6"
              strokeWidth="2"
            />
            <text x="75" y="24" textAnchor="middle" fill="#A78BFA" fontSize="12" fontWeight="900">
              BASE VIOLETA
            </text>
            <text x="75" y="42" textAnchor="middle" fill="#94a3b8" fontSize="10">
              Justicia
            </text>
            <g transform="translate(25, 60)">
              {teams
                .find((t) => t.color === "VIOLETA")
                ?.pawns.filter((p) => p.isAtBase)
                .map((p, idx) => {
                  const isSel = selectablePawnIds.includes(p.id);
                  return (
                    <g
                      key={p.id}
                      transform={`translate(${idx * 32}, 15)`}
                      onClick={() => isSel && onPawnClick(p)}
                      className={isSel ? "cursor-pointer" : ""}
                    >
                      {isSel && (
                        <circle
                          cx="12"
                          cy="0"
                          r="18"
                          fill="none"
                          stroke="#3B82F6"
                          strokeWidth="3"
                          className="animate-ping"
                        />
                      )}
                      <circle
                        cx="12"
                        cy="0"
                        r="14"
                        fill="#8B5CF6"
                        stroke="#ffffff"
                        strokeWidth="2.5"
                        filter="url(#pawnShadow)"
                      />
                      <text
                        x="12"
                        y="4"
                        textAnchor="middle"
                        fill="#ffffff"
                        fontSize="11"
                        fontWeight="900"
                      >
                        {p.pawnNumber}
                      </text>
                    </g>
                  );
                })}
            </g>
          </g>

          {/* Base Azul (Arriba-Izquierda) */}
          <g transform="translate(140, 140)">
            <rect
              x="0"
              y="0"
              width="150"
              height="110"
              rx="14"
              fill="#BAE6FD20"
              stroke="#0284C7"
              strokeWidth="2"
            />
            <text x="75" y="24" textAnchor="middle" fill="#38BDF8" fontSize="12" fontWeight="900">
              BASE AZUL
            </text>
            <text x="75" y="42" textAnchor="middle" fill="#94a3b8" fontSize="10">
              Cambio Social
            </text>
            <g transform="translate(25, 60)">
              {teams
                .find((t) => t.color === "AZUL")
                ?.pawns.filter((p) => p.isAtBase)
                .map((p, idx) => {
                  const isSel = selectablePawnIds.includes(p.id);
                  return (
                    <g
                      key={p.id}
                      transform={`translate(${idx * 32}, 15)`}
                      onClick={() => isSel && onPawnClick(p)}
                      className={isSel ? "cursor-pointer" : ""}
                    >
                      {isSel && (
                        <circle
                          cx="12"
                          cy="0"
                          r="18"
                          fill="none"
                          stroke="#3B82F6"
                          strokeWidth="3"
                          className="animate-ping"
                        />
                      )}
                      <circle
                        cx="12"
                        cy="0"
                        r="14"
                        fill="#0284C7"
                        stroke="#ffffff"
                        strokeWidth="2.5"
                        filter="url(#pawnShadow)"
                      />
                      <text
                        x="12"
                        y="4"
                        textAnchor="middle"
                        fill="#ffffff"
                        fontSize="11"
                        fontWeight="900"
                      >
                        {p.pawnNumber}
                      </text>
                    </g>
                  );
                })}
            </g>
          </g>
        </g>

        {/* 3. PISTA PERIMÉTRICA DE CASILLAS ESTILO MONOPOLIO (1 a 68) */}
        {Object.values(MONOPOLY_TILES).map((tile) => {
          const isHovered = hoveredSquare === tile.number;
          const pawnsHere = pawnsBySquare[tile.number] || [];
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
              {/* Cuerpo de la casilla de propiedad */}
              <rect
                x={tile.x}
                y={tile.y}
                width={tile.width}
                height={tile.height}
                fill={isHovered ? "#f8fafc" : "#ffffff"}
                stroke={isHovered ? "#3b82f6" : "#334155"}
                strokeWidth={isHovered ? "3" : "1.5"}
                rx="3"
              />

              {/* Banda de color tipo propiedad de Monopolio */}
              <rect
                x={tile.headerBar.x}
                y={tile.headerBar.y}
                width={tile.headerBar.width}
                height={tile.headerBar.height}
                fill={colorHex}
              />

              {/* Número y Etiqueta en la casilla */}
              {tile.isCorner ? (
                /* Diseño especial para las 4 esquinas icónicas */
                <g>
                  <text
                    x={tile.centerX}
                    y={tile.centerY - 10}
                    textAnchor="middle"
                    fill="#0f172a"
                    fontSize="13"
                    fontWeight="900"
                  >
                    #{tile.number} {tile.shortTitle}
                  </text>
                  <text
                    x={tile.centerX}
                    y={tile.centerY + 16}
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
                /* Casilla de borde regular */
                <g>
                  {/* Número de Casillero */}
                  <text
                    x={tile.side === "LEFT" || tile.side === "RIGHT" ? tile.centerX : tile.centerX}
                    y={
                      tile.side === "BOTTOM"
                        ? tile.y + 17
                        : tile.side === "TOP"
                        ? tile.y + 102
                        : tile.centerY - 8
                    }
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize="10"
                    fontWeight="900"
                  >
                    #{tile.number}
                  </text>

                  {/* Ícono de tipo de casillero */}
                  <text
                    x={tile.centerX}
                    y={tile.centerY + (tile.side === "LEFT" || tile.side === "RIGHT" ? 14 : 6)}
                    textAnchor="middle"
                    fontSize="13"
                  >
                    {tile.isInclusive && "🤝"}
                    {tile.isReturnToStart && "⚠️"}
                    {tile.isCuriosity && "💡"}
                    {tile.isSpecialAdvance && "🚀"}
                    {tile.isActivity && "🎭"}
                  </text>
                </g>
              )}

              {/* BARRERA CONTRA LA DISCRIMINACIÓN (Efecto Escudo Monopolio) */}
              {barrierInfo.hasBarrier && (
                <g>
                  <circle
                    cx={tile.centerX}
                    cy={tile.centerY}
                    r="24"
                    fill="none"
                    stroke="#EF4444"
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
                  />
                  <text
                    x={tile.centerX}
                    y={tile.centerY + 4}
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize="8"
                    fontWeight="900"
                  >
                    BARRERA
                  </text>
                </g>
              )}

              {/* FICHAS DE JUEGO (Tokens 3D de Monopolio) */}
              {pawnsHere.length > 0 && (
                <g>
                  {pawnsHere.map((pawn, pIdx) => {
                    const isSelectable = selectablePawnIds.includes(pawn.id);
                    const isActive = activePawnId === pawn.id;
                    const pColor = getTeamColorHex(pawn.teamColor);

                    // Posicionamiento de tokens
                    let px = tile.centerX;
                    let py = tile.centerY + 10;
                    if (pawnsHere.length === 2) {
                      px = tile.centerX + (pIdx === 0 ? -12 : 12);
                    } else if (pawnsHere.length > 2) {
                      px = tile.centerX + (pIdx % 2 === 0 ? -10 : 10);
                      py = tile.centerY + (pIdx < 2 ? 0 : 16);
                    }

                    return (
                      <g
                        key={pawn.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isSelectable) onPawnClick(pawn);
                        }}
                        className={`transition-all ${
                          isSelectable ? "cursor-pointer" : "cursor-default"
                        }`}
                      >
                        {/* Brillo beacon si la ficha puede moverse */}
                        {isSelectable && (
                          <circle
                            cx={px}
                            cy={py}
                            r="22"
                            fill="none"
                            stroke="#3B82F6"
                            strokeWidth="3.5"
                            className="animate-ping opacity-80"
                          />
                        )}
                        {/* Token 3D */}
                        <circle
                          cx={px}
                          cy={py}
                          r={pawnsHere.length > 1 ? 12 : 15}
                          fill={pColor}
                          stroke="#FFFFFF"
                          strokeWidth={isActive ? "4" : "2.5"}
                          filter="url(#pawnShadow)"
                        />
                        <text
                          x={px}
                          y={py + 4}
                          textAnchor="middle"
                          fill="#FFFFFF"
                          fontSize={pawnsHere.length > 1 ? "10" : "12"}
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
      </svg>
    </div>
  );
};
