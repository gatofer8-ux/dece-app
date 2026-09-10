export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="fixed top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-brand-500 via-indigo-500 to-emerald-500 animate-pulse z-50" />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div className="space-y-2">
          <div className="skeleton h-7 w-48" />
          <div className="skeleton h-4 w-72" />
        </div>
        <div className="skeleton h-9 w-32 rounded-lg" />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton h-24 rounded-xl" />
        ))}
      </div>

      <div className="card p-6 space-y-4">
        <div className="skeleton h-5 w-40" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton h-12 rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}
