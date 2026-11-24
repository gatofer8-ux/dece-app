/**
 * Proceso TaPas con varias hojas en una misma aplicación, y su reparto en horas de clase.
 *
 * Una aplicación puede llevar una sola herramienta (como antes) o varias hojas del manual
 * (perfil de talentos, tarjetas, experimento). El DECE elige si se hacen todas en una sola
 * sesión o en varias: en ese caso habilita cada hoja en su hora de clase y el estudiante
 * retoma con el mismo código donde se quedó.
 */

import {
  TAPAS_INSTRUMENT_KEYS,
  TAPAS_NIVELES,
  isTapasInstrument,
  isTapasNivel,
  type TapasInstrument,
  type TapasNivel,
} from "./niveles";

export type TapasModo = "UNA" | "VARIAS";

export interface TapasPlan {
  /** Hojas del proceso, en el orden en que se aplican. */
  instruments: TapasInstrument[];
  /** Hojas que el estudiante ya puede abrir. En modo UNA, todas. */
  open: TapasInstrument[];
  modo: TapasModo;
  /** Duración de la hora de clase disponible, para el plan sugerido. */
  minutosHora: number;
}

/** Orden recomendado por el manual: perfil → tarjetas → experimento (el experimento usa lo anterior). */
const RECOMMENDED_ORDER: TapasInstrument[] = ["PERFIL_V1", "PERFIL_V2", "ARQUETIPOS", "EXPERIMENTO"];

export function orderInstruments(list: TapasInstrument[]): TapasInstrument[] {
  return RECOMMENDED_ORDER.filter((i) => list.includes(i));
}

/** Minutos aproximados por hoja y nivel (el experimento: cada una de sus dos sesiones). */
const MINUTES: Record<TapasInstrument, Record<TapasNivel, number>> = {
  ARQUETIPOS: { INICIAL: 15, BASICA: 35, BACHILLERATO: 45 },
  PERFIL_V1: { INICIAL: 15, BASICA: 20, BACHILLERATO: 20 },
  PERFIL_V2: { INICIAL: 0, BASICA: 20, BACHILLERATO: 25 },
  EXPERIMENTO: { INICIAL: 0, BASICA: 25, BACHILLERATO: 30 },
};

export function estimateMinutes(instrument: TapasInstrument, nivel: TapasNivel): number {
  return MINUTES[instrument][nivel];
}

interface SessionRowLike {
  instrument: string;
  nivel: string;
  plan_json?: string | null;
}

/** Plan de la aplicación. Las aplicaciones de una sola herramienta (y las antiguas) devuelven un plan de una hoja. */
export function parsePlan(s: SessionRowLike): TapasPlan {
  const single: TapasInstrument = isTapasInstrument(s.instrument) ? s.instrument : "ARQUETIPOS";
  let raw: Partial<TapasPlan> | null = null;
  try {
    raw = s.plan_json ? (JSON.parse(s.plan_json) as Partial<TapasPlan>) : null;
  } catch {
    raw = null;
  }
  const instruments = orderInstruments(
    (Array.isArray(raw?.instruments) ? raw!.instruments : [single]).filter(isTapasInstrument)
  );
  if (instruments.length === 0) instruments.push(single);
  const modo: TapasModo = raw?.modo === "VARIAS" ? "VARIAS" : "UNA";
  const open = modo === "UNA" ? instruments : instruments.filter((i) => (raw?.open || []).includes(i));
  const minutosHora = Math.min(120, Math.max(20, Number(raw?.minutosHora) || 40));
  return { instruments, open, modo, minutosHora };
}

export const isMultiHoja = (plan: TapasPlan) => plan.instruments.length > 1;

export function isHojaOpen(plan: TapasPlan, instrument: TapasInstrument): boolean {
  return plan.instruments.includes(instrument) && plan.open.includes(instrument);
}

/** Valida lo que llega del formulario de creación. */
export function buildPlan(
  instruments: unknown[],
  nivel: unknown,
  modo: unknown,
  minutosHora: unknown
): { ok: true; plan: TapasPlan; nivel: TapasNivel } | { ok: false; error: string } {
  const n: TapasNivel = isTapasNivel(nivel) ? nivel : "BACHILLERATO";
  const list = orderInstruments(Array.from(new Set(instruments.filter(isTapasInstrument))));
  if (list.length === 0) return { ok: false, error: "Elige al menos una hoja TaPas." };
  const notAllowed = list.filter((i) => !TAPAS_NIVELES[n].instruments.includes(i));
  if (notAllowed.length) return { ok: false, error: `Hay hojas que no corresponden al nivel ${TAPAS_NIVELES[n].label}.` };
  const m: TapasModo = modo === "VARIAS" ? "VARIAS" : "UNA";
  return {
    ok: true,
    nivel: n,
    plan: {
      instruments: list,
      open: m === "UNA" ? list : [list[0]],
      modo: m,
      minutosHora: Math.min(120, Math.max(20, Number(minutosHora) || 40)),
    },
  };
}

export interface ScheduleBlock {
  instrument: TapasInstrument;
  /** Parte de la hoja cuando no cabe en una hora o es la segunda sesión del experimento. */
  parte?: string;
  minutos: number;
}

export interface ScheduleSession {
  numero: number;
  bloques: ScheduleBlock[];
  minutos: number;
  /** Aviso de tiempo (p. ej. «una semana después»). */
  nota?: string;
}

/**
 * Reparte las hojas en horas de clase. Una hoja larga (las 74 tarjetas en Bachillerato) se
 * parte en dos, porque el juego guarda el avance; la sesión 2 del experimento va siempre
 * aparte, una semana después.
 */
export function suggestSchedule(plan: TapasPlan, nivel: TapasNivel): ScheduleSession[] {
  const hora = plan.minutosHora;
  const blocks: (ScheduleBlock & { alone?: string })[] = [];
  for (const i of plan.instruments) {
    const m = estimateMinutes(i, nivel);
    if (m <= 0) continue;
    if (i === "ARQUETIPOS" && m > hora) {
      const first = Math.round(m * 0.55);
      blocks.push({ instrument: i, parte: "conocer y clasificar las tarjetas", minutos: first });
      blocks.push({ instrument: i, parte: "agrupar, ordenar y cierre", minutos: m - first });
    } else if (i === "EXPERIMENTO") {
      blocks.push({ instrument: i, parte: "sesión 1: planificar", minutos: m });
      blocks.push({ instrument: i, parte: "sesión 2: evaluar", minutos: m, alone: "Una semana después de la sesión 1." });
    } else {
      blocks.push({ instrument: i, minutos: m });
    }
  }

  const sessions: ScheduleSession[] = [];
  let current: ScheduleSession | null = null;
  for (const b of blocks) {
    const { alone, ...block } = b;
    const fits = current && !current.nota && current.minutos + block.minutos <= hora;
    if (!alone && fits && current) {
      current.bloques.push(block);
      current.minutos += block.minutos;
      continue;
    }
    current = { numero: sessions.length + 1, bloques: [block], minutos: block.minutos, nota: alone };
    sessions.push(current);
  }
  return sessions;
}

export function totalMinutes(plan: TapasPlan, nivel: TapasNivel): number {
  return plan.instruments.reduce((n, i) => n + estimateMinutes(i, nivel) * (i === "EXPERIMENTO" ? 2 : 1), 0);
}

export { TAPAS_INSTRUMENT_KEYS };
