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
        <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
        {description && <p className="text-sm text-slate-500 mt-0.5">{description}</p>}
      </div>
      {action && <div className="flex gap-2">{action}</div>}
    </div>
  );
}

const COLOR_MAP: Record<string, string> = {
  slate: "bg-slate-100 text-slate-700",
  green: "bg-green-100 text-green-700",
  amber: "bg-amber-100 text-amber-700",
  red: "bg-red-100 text-red-700",
  blue: "bg-blue-100 text-blue-700",
  purple: "bg-purple-100 text-purple-700",
};

export function Badge({ children, color = "slate" }: { children: React.ReactNode; color?: string }) {
  return <span className={`badge ${COLOR_MAP[color] || COLOR_MAP.slate}`}>{children}</span>;
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="card flex flex-col items-center justify-center text-center py-16 px-6">
      <div className="text-3xl mb-2">🗂️</div>
      <h3 className="font-medium text-slate-800">{title}</h3>
      {description && <p className="text-sm text-slate-500 mt-1 max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function LinkButton({ href, children, variant = "primary" }: { href: string; children: React.ReactNode; variant?: "primary" | "secondary" }) {
  return (
    <Link href={href} className={variant === "primary" ? "btn-primary" : "btn-secondary"}>
      {children}
    </Link>
  );
}

export function StatCard({ label, value, hint, color = "slate" }: { label: string; value: string | number; hint?: string; color?: string }) {
  return (
    <div className="card p-4">
      <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</div>
      <div className="text-2xl font-bold text-slate-900 mt-1">{value}</div>
      {hint && <div className="text-xs text-slate-400 mt-1">{hint}</div>}
    </div>
  );
}

export function formatDate(value?: string | null) {
  if (!value) return "—";
  try {
    const d = new Date(value.replace(" ", "T"));
    return d.toLocaleDateString("es-EC", { year: "numeric", month: "short", day: "2-digit" });
  } catch {
    return value;
  }
}

export function formatDateTime(value?: string | null) {
  if (!value) return "—";
  try {
    const d = new Date(value.replace(" ", "T"));
    return d.toLocaleString("es-EC", { year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" });
  } catch {
    return value;
  }
}
