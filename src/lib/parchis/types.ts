export type TeamColor = "AMARILLO" | "VERDE" | "VIOLETA" | "AZUL";

export type EjeType = "IDENTIDAD" | "DIVERSIDAD" | "JUSTICIA" | "CAMBIO_SOCIAL";

export type SquareType =
  | "BIENVENIDA"
  | "NORMAL"
  | "ZONA_INCLUSIVA"
  | "RETROCEDE_INICIO"
  | "DATO_CURIOSO"
  | "ACTIVIDAD"
  | "ESPECIAL_AVANCE";

export interface SquareDefinition {
  number: number; // 1 to 68
  zone: TeamColor;
  eje: EjeType;
  type: SquareType;
  tag?: string; // e.g. "[Bienvenida]", "[Zona inclusiva, avanza 2]", etc.
  title: string;
  text: string;
  isInclusiveZone: boolean;
  advanceBonus?: number;
  returnToStart?: boolean;
}

export interface BackupQuestion {
  letter: string; // 'A' to 'K'
  text: string;
}

export interface FunFact {
  id: number;
  text: string;
}

export interface PawnState {
  id: string; // e.g., "AMARILLO-1"
  pawnNumber: number; // 1, 2, 3, 4
  teamColor: TeamColor;
  /**
   * position:
   * 0 = En base / Inicio ("Inicia el camino inclusivo")
   * 1..68 = Casillero del circuito exterior
   * 101..107 = Pasillo privado hacia la meta (casilleros 1 al 7 de la rampa)
   * 999 = Llegó a la META central
   */
  position: number;
  /** Cantidad de casilleros totales recorridos desde la casilla de salida */
  stepsMoved: number;
  isAtBase: boolean;
  isAtGoal: boolean;
}

export interface Team {
  id: TeamColor;
  name: string;
  color: TeamColor;
  colorHex: string;
  badgeBg: string;
  textColor: string;
  startSquare: number; // Amarillo=5, Verde=22, Violeta=39, Azul=56
  rampEntrySquare: number; // Casilla del circuito donde ingresa a su rampa (Amarillo=4, Verde=21, Violeta=38, Azul=55)
  pawns: PawnState[];
  initialRoll?: number;
  goalsFinished: number;
}

export type TurnPhase =
  | "SETUP"
  | "ROLL_OFF" // Desempate inicial
  | "WAITING_ROLL" // Esperando lanzamiento de dado
  | "SELECTING_PAWN" // Elegir qué ficha mover
  | "CHOOSING_FIVE_ACTION" // Sacó 5: avanzar 5 casilleros o sacar/reiniciar ficha al inicio
  | "RESOLVING_QUESTION" // En el casillero: resolver pregunta o reto
  | "SELECTING_BONUS_DESTINATION" // Destino de bono (+10 de meta, o tercer 6 cedido a equipo en desventaja)
  | "CELEBRATING_GOAL" // Celebración de meta y barra inclusiva
  | "GAME_OVER"; // Un equipo coronó todas sus fichas

export interface BonusChoice {
  type: "GOAL_TEN" | "TRIPLE_SIX";
  fromTeamColor: TeamColor;
  availableOptions: {
    targetTeamColor: TeamColor;
    targetPawnId?: string;
    description: string;
    isDisadvantaged: boolean;
  }[];
}

export interface FiveChoice {
  teamColor: TeamColor;
  pawnId: string;
  advanceOption: {
    pawnId: string;
    targetSquare: number;
    description: string;
  };
  startOption?: {
    pawnId: string;
    targetSquare: number;
    description: string;
  };
}

export interface LogEntry {
  id: string;
  timestamp: string;
  teamColor: TeamColor;
  message: string;
  type: "ROLL" | "MOVE" | "QUESTION" | "BARRIER" | "CAPTURE" | "BONUS" | "GOAL" | "SOLIDARITY";
}

export interface ParchisGameState {
  teams: Team[];
  pawnCountPerTeam: number; // 2, 3 o 4
  currentTeamIndex: number;
  activePawnId: string | null;
  diceValue: number | null;
  consecutiveSixes: number;
  turnPhase: TurnPhase;
  activeSquare: SquareDefinition | null;
  activeBackupQuestion: BackupQuestion | null;
  positionBeforeTurn: number | null;
  bonusChoice: BonusChoice | null;
  fiveChoice: FiveChoice | null;
  logs: LogEntry[];
  soundEnabled: boolean;
  winnerTeam: TeamColor | null;
}
