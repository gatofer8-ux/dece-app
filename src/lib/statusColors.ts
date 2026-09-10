/**
 * Estilos semánticos consistentes para prioridad, estado y tipo de riesgo.
 * Un solo lugar para el color/icono de cada valor, usado en listas y fichas.
 */

export interface Style {
  label: string;
  /** Clases para <span class="badge ..."> */
  badge: string;
  /** Clase de color para un punto/indicador (bg-*). */
  dot: string;
  icon?: string;
}

const FALLBACK: Style = { label: "—", badge: "bg-slate-100 text-slate-700", dot: "bg-slate-400" };

export const PRIORITY_STYLES: Record<string, Style> = {
  ALTA: { label: "Alta", badge: "bg-red-100 text-red-800", dot: "bg-red-500", icon: "🔴" },
  MEDIA: { label: "Media", badge: "bg-amber-100 text-amber-800", dot: "bg-amber-500", icon: "🟡" },
  BAJA: { label: "Baja", badge: "bg-emerald-100 text-emerald-800", dot: "bg-emerald-500", icon: "🟢" },
};

export const CASE_STATUS_STYLES: Record<string, Style> = {
  ABIERTO: { label: "Abierto", badge: "bg-brand-100 text-brand-800", dot: "bg-brand-500" },
  EN_SEGUIMIENTO: { label: "En seguimiento", badge: "bg-indigo-100 text-indigo-800", dot: "bg-indigo-500" },
  DERIVADO: { label: "Derivado", badge: "bg-purple-100 text-purple-800", dot: "bg-purple-500" },
  CERRADO: { label: "Cerrado", badge: "bg-slate-200 text-slate-600", dot: "bg-slate-400" },
};

export const RISK_TYPE_STYLES: Record<string, Style> = {
  VIOLENCIA_INTRAFAMILIAR: { label: "Violencia intrafamiliar", badge: "bg-rose-100 text-rose-800", dot: "bg-rose-500", icon: "🏠" },
  VIOLENCIA_ESCOLAR_BULLYING: { label: "Violencia escolar / acoso", badge: "bg-orange-100 text-orange-800", dot: "bg-orange-500", icon: "🎒" },
  VIOLENCIA_SEXUAL: { label: "Violencia sexual", badge: "bg-red-100 text-red-800", dot: "bg-red-600", icon: "🚨" },
  CONSUMO_SUSTANCIAS: { label: "Consumo de sustancias", badge: "bg-amber-100 text-amber-800", dot: "bg-amber-600", icon: "⚗️" },
  SALUD_MENTAL: { label: "Salud mental", badge: "bg-violet-100 text-violet-800", dot: "bg-violet-500", icon: "🧠" },
  EMBARAZO_ADOLESCENTE: { label: "Embarazo adolescente", badge: "bg-pink-100 text-pink-800", dot: "bg-pink-500", icon: "🤰" },
  VULNERACION_DERECHOS: { label: "Vulneración de derechos", badge: "bg-red-100 text-red-800", dot: "bg-red-500", icon: "⚖️" },
  DIFICULTAD_APRENDIZAJE: { label: "Dificultad de aprendizaje", badge: "bg-sky-100 text-sky-800", dot: "bg-sky-500", icon: "📚" },
  CONFLICTO_FAMILIAR: { label: "Conflicto familiar", badge: "bg-amber-100 text-amber-800", dot: "bg-amber-500", icon: "👨‍👩‍👧" },
  CONECTIVIDAD_ACCESO_EDUCATIVO: { label: "Acceso / conectividad", badge: "bg-teal-100 text-teal-800", dot: "bg-teal-500", icon: "🌐" },
  OTRO: { label: "Otro", badge: "bg-slate-100 text-slate-700", dot: "bg-slate-400", icon: "•" },
};

export function priorityStyle(v: string | null | undefined): Style {
  return (v && PRIORITY_STYLES[v]) || FALLBACK;
}
export function caseStatusStyle(v: string | null | undefined): Style {
  return (v && CASE_STATUS_STYLES[v]) || FALLBACK;
}
export function riskTypeStyle(v: string | null | undefined): Style {
  return (v && RISK_TYPE_STYLES[v]) || FALLBACK;
}
