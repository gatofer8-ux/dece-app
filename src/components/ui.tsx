import Link from "next/link";

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">{title}</h1>
        {description && <div className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{description}</div>}
      </div>
      {action && <div className="flex gap-2">{action}</div>}
    </div>
  );
}

const COLOR_MAP: Record<string, string> = {
  slate: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300",
  green: "bg-green-100 dark:bg-green-950/60 text-green-700 dark:text-green-300",
  amber: "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300",
  red: "bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300",
  blue: "bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300",
  purple: "bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300",
};

export function Badge({ children, color = "slate" }: { children: React.ReactNode; color?: string }) {
  return <span className={`badge ${COLOR_MAP[color] || COLOR_MAP.slate}`}>{children}</span>;
}

export function EmptyState({
  title,
  description,
  action,
  icon = "🗂️",
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: string;
}) {
  return (
    <div className="card flex flex-col items-center justify-center text-center py-16 px-6">
      <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-2xl">
        {icon}
      </div>
      <h3 className="font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
      {description && <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/** Bloque de carga. Usar en `loading.tsx` y mientras se resuelven listas. */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

/** Punto de color + texto, para estados en listas. */
export function StatusDot({ dot, children }: { dot: string; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-2 w-2 rounded-full ${dot}`} />
      <span>{children}</span>
    </span>
  );
}

export function LinkButton({ href, children, variant = "primary" }: { href: string; children: React.ReactNode; variant?: "primary" | "secondary" }) {
  return (
    <Link href={href} className={variant === "primary" ? "btn-primary" : "btn-secondary"}>
      {children}
    </Link>
  );
}

const STAT_ACCENT: Record<string, string> = {
  slate: "before:bg-slate-300",
  brand: "before:bg-brand-500",
  green: "before:bg-emerald-500",
  amber: "before:bg-amber-500",
  red: "before:bg-red-500",
  purple: "before:bg-purple-500",
};

export function StatCard({
  label,
  value,
  hint,
  color = "slate",
  icon,
}: {
  label: string;
  value: string | number;
  hint?: string;
  color?: string;
  icon?: string;
}) {
  return (
    <div
      className={`card relative overflow-hidden p-4 pl-5 before:absolute before:inset-y-0 before:left-0 before:w-1 ${
        STAT_ACCENT[color] || STAT_ACCENT.slate
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</div>
        {icon && <span className="text-base opacity-70">{icon}</span>}
      </div>
      <div className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">{value}</div>
      {hint && <div className="text-xs text-slate-400 mt-1">{hint}</div>}
    </div>
  );
}

export function parseUtcDate(value?: string | null): Date | null {
  if (!value) return null;
  const s = String(value).trim();
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  }
  const iso = s.endsWith("Z") || s.includes("+") || /-\d{2}:\d{2}$/.test(s)
    ? s
    : `${s.replace(" ", "T")}Z`;
  const dt = new Date(iso);
  return isNaN(dt.getTime()) ? null : dt;
}

export function formatDate(value?: string | null) {
  if (!value) return "—";
  try {
    const s = String(value).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      const [y, m, d] = s.split("-").map(Number);
      const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
      return dt.toLocaleDateString("es-EC", {
        year: "numeric",
        month: "short",
        day: "2-digit",
        timeZone: "America/Guayaquil",
      });
    }
    const dt = parseUtcDate(s);
    if (!dt) return value;
    return dt.toLocaleDateString("es-EC", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      timeZone: "America/Guayaquil",
    });
  } catch {
    return value;
  }
}

export function formatDateTime(value?: string | null) {
  if (!value) return "—";
  try {
    const s = String(value).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      return formatDate(s);
    }
    const dt = parseUtcDate(s);
    if (!dt) return value;
    return dt.toLocaleString("es-EC", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "America/Guayaquil",
    });
  } catch {
    return value;
  }
}

export function formatTime(value?: string | null) {
  if (!value) return "—";
  try {
    const dt = parseUtcDate(value);
    if (!dt) return value;
    return dt.toLocaleTimeString("es-EC", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "America/Guayaquil",
    });
  } catch {
    return value;
  }
}

export function getTodayEcuador(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Guayaquil",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
