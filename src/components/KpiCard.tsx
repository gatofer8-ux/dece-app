import Link from "next/link";
import Sparkline from "./Sparkline";
import AnimatedCounter from "./AnimatedCounter";

const TONES: Record<string, { ring: string; num: string; label: string; spark: string }> = {
  slate: { ring: "border-slate-200", num: "text-slate-900", label: "text-slate-600", spark: "text-slate-400" },
  brand: { ring: "border-brand-200 bg-gradient-to-br from-brand-50/60 to-white", num: "text-brand-800", label: "text-brand-900", spark: "text-brand-500" },
  amber: { ring: "border-amber-200 bg-gradient-to-br from-amber-50/60 to-white", num: "text-amber-700", label: "text-amber-900", spark: "text-amber-500" },
  rose: { ring: "border-rose-200 bg-gradient-to-br from-rose-50/60 to-white", num: "text-rose-600", label: "text-rose-900", spark: "text-rose-500" },
  purple: { ring: "border-purple-200 bg-gradient-to-br from-purple-50/60 to-white", num: "text-purple-700", label: "text-purple-900", spark: "text-purple-500" },
  indigo: { ring: "border-indigo-200 bg-gradient-to-br from-indigo-50/60 to-white", num: "text-indigo-700", label: "text-indigo-900", spark: "text-indigo-500" },
  red: { ring: "border-red-200 bg-gradient-to-br from-red-50/60 to-white", num: "text-red-700", label: "text-red-900", spark: "text-red-500" },
  emerald: { ring: "border-emerald-200 bg-gradient-to-br from-emerald-50/60 to-white", num: "text-emerald-700", label: "text-emerald-900", spark: "text-emerald-500" },
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

  const inner = (
    <>
      <div className="flex items-start justify-between gap-2">
        <div className={`text-[11px] font-semibold uppercase tracking-tight ${t.label}`}>{label}</div>
        {href && <span className="text-slate-300 text-xs group-hover:text-slate-500 transition-colors">→</span>}
      </div>
      <div className="mt-1 flex items-end justify-between gap-2">
        <div className={`text-2xl font-bold tabular-nums ${t.num}`}>
          <AnimatedCounter value={value} />
        </div>
        {trend && trend.length >= 2 && <Sparkline data={trend} className={t.spark} />}
      </div>
      {hint && <div className="text-[11px] text-slate-500 mt-0.5">{hint}</div>}
    </>
  );

  const cls = `card p-3.5 border ${t.ring} hover:-translate-y-1 hover:shadow-md transition-all duration-200 ${
    href ? "group cursor-pointer" : ""
  }`;

  return href ? (
    <Link href={href} className={cls}>
      {inner}
    </Link>
  ) : (
    <div className={cls}>{inner}</div>
  );
}
