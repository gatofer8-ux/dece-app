export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Top progress line */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-brand-500 via-indigo-500 to-emerald-500 animate-pulse z-50" />

      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div className="space-y-2">
          <div className="h-7 w-48 bg-slate-200 rounded-md" />
          <div className="h-4 w-72 bg-slate-100 rounded-md" />
        </div>
        <div className="h-9 w-32 bg-slate-200 rounded-lg" />
      </div>

      {/* Cards Skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="h-24 bg-slate-100 border border-slate-200/60 rounded-xl" />
        <div className="h-24 bg-slate-100 border border-slate-200/60 rounded-xl" />
        <div className="h-24 bg-slate-100 border border-slate-200/60 rounded-xl" />
        <div className="h-24 bg-slate-100 border border-slate-200/60 rounded-xl" />
      </div>

      {/* Content Skeleton */}
      <div className="card p-6 space-y-4">
        <div className="h-5 w-40 bg-slate-200 rounded" />
        <div className="space-y-3">
          <div className="h-12 bg-slate-50 border border-slate-100 rounded-lg" />
          <div className="h-12 bg-slate-50 border border-slate-100 rounded-lg" />
          <div className="h-12 bg-slate-50 border border-slate-100 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
