import Link from "next/link";
import Sparkline from "./Sparkline";

const TONES: Record<string, { ring: string; num: string; label: string; spark: string; bg: string }> = {
  slate: {
    ring: "border-slate-200 dark:border-slate-800",
    num: "text-slate-900 dark:text-slate-100",
    label: "text-slate-600 dark:text-slate-400",
    spark: "text-slate-400",
    bg: "bg-white dark:bg-slate-900",
  },
  brand: {
    ring: "border-brand-200 dark:border-brand-900/60",
    num: "text-brand-800 dark:text-brand-300",
    label: "text-brand-900 dark:text-brand-200",
    spark: "text-brand-500",
    bg: "bg-gradient-to-br from-brand-50/80 via-white to-white dark:from-brand-950/40 dark:via-slate-900 dark:to-slate-900",
  },
  amber: {
    ring: "border-amber-200 dark:border-amber-900/60",
    num: "text-amber-700 dark:text-amber-300",
    label: "text-amber-900 dark:text-amber-200",
    spark: "text-amber-500",
    bg: "bg-gradient-to-br from-amber-50/80 via-white to-white dark:from-amber-950/40 dark:via-slate-900 dark:to-slate-900",
  },
  rose: {
    ring: "border-rose-200 dark:border-rose-900/60",
    num: "text-rose-600 dark:text-rose-300",
    label: "text-rose-900 dark:text-rose-200",
    spark: "text-rose-500",
    bg: "bg-gradient-to-br from-rose-50/80 via-white to-white dark:from-rose-950/40 dark:via-slate-900 dark:to-slate-900",
  },
  purple: {
    ring: "border-purple-200 dark:border-purple-900/60",
    num: "text-purple-700 dark:text-purple-300",
    label: "text-purple-900 dark:text-purple-200",
    spark: "text-purple-500",
    bg: "bg-gradient-to-br from-purple-50/80 via-white to-white dark:from-purple-950/40 dark:via-slate-900 dark:to-slate-900",
  },
  indigo: {
    ring: "border-indigo-200 dark:border-indigo-900/60",
    num: "text-indigo-700 dark:text-indigo-300",
    label: "text-indigo-900 dark:text-indigo-200",
    spark: "text-indigo-500",
    bg: "bg-gradient-to-br from-indigo-50/80 via-white to-white dark:from-indigo-950/40 dark:via-slate-900 dark:to-slate-900",
  },
  red: {
    ring: "border-red-200 dark:border-red-900/60",
    num: "text-red-700 dark:text-red-300",
    label: "text-red-900 dark:text-red-200",
    spark: "text-red-500",
    bg: "bg-gradient-to-br from-red-50/80 via-white to-white dark:from-red-950/40 dark:via-slate-900 dark:to-slate-900",
  },
  emerald: {
    ring: "border-emerald-200 dark:border-emerald-900/60",
    num: "text-emerald-700 dark:text-emerald-300",
    label: "text-emerald-900 dark:text-emerald-200",
    spark: "text-emerald-500",
    bg: "bg-gradient-to-br from-emerald-50/80 via-white to-white dark:from-emerald-950/40 dark:via-slate-900 dark:to-slate-900",
  },
};

export default function KpiCard({
  label,
  value,
  hint,
  href,
  tone = "slate",
  trend,
}: {
  label: string;
  value: string | number;
  hint?: string;
  href?: string;
  tone?: keyof typeof TONES;
  /** Serie corta para el mini-gráfico de tendencia. */
  trend?: number[];
}) {
  const t = TONES[tone] || TONES.slate;
  const display = typeof value === "number" ? value.toLocaleString("es-EC") : value;

  const inner = (
    <div className="flex flex-col justify-between h-full min-h-[92px]">
      {/* 1. Encabezado con altura fija reservada para 1 o 2 líneas de texto: garantiza alineación idéntica */}
      <div className="flex items-start justify-between gap-1.5 h-8">
        <span className={`text-[11px] font-semibold uppercase tracking-tight leading-4 line-clamp-2 ${t.label}`}>
          {label}
        </span>
        {href && (
          <span className="text-slate-300 dark:text-slate-600 text-xs group-hover:text-slate-500 dark:group-hover:text-slate-300 transition-colors shrink-0 pt-0.5">
            →
          </span>
        )}
      </div>

      {/* 2. Cifra numérica principal: anclada a la misma altura vertical exacta en todas las tarjetas */}
      <div className="flex items-baseline justify-between gap-2 mt-2">
        <span className={`text-2xl font-bold tabular-nums tracking-tight leading-none ${t.num}`}>
          {display}
        </span>
        {trend && trend.length >= 2 ? (
          <Sparkline data={trend} className={t.spark} />
        ) : (
          <span className="w-10 h-3 shrink-0" aria-hidden="true" />
        )}
      </div>

      {/* 3. Subtexto / indicador secundario alineado en la base */}
      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate leading-none mt-1.5 h-3.5 flex items-center">
        {hint || ""}
      </div>
    </div>
  );

  const cls = `rounded-xl p-3.5 border shadow-[0_1px_3px_0_rgba(0,0,0,0.03)] h-full flex flex-col justify-between ${t.bg} ${t.ring} ${
    href ? "group hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer" : ""
  }`;

  return href ? (
    <Link href={href} className={cls}>
      {inner}
    </Link>
  ) : (
    <div className={cls}>{inner}</div>
  );
}

