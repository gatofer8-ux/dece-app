"use client";

import { exitDemoModeAction } from "@/app/(app)/actions/demoMode";

export default function DemoModeBanner() {
  return (
    <div className="no-print sticky top-0 z-50 bg-gradient-to-r from-amber-600 via-amber-700 to-indigo-800 text-white px-4 py-2.5 shadow-md flex items-center justify-between border-b border-amber-300/40 text-sm">
      <div className="flex items-center gap-2.5 flex-wrap">
        <span className="inline-flex items-center gap-1 bg-amber-300 text-amber-950 text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wide animate-pulse shadow-xs">
          <span>🧪</span> MODO DEMOSTRACIÓN ACTIVO
        </span>
        <span className="text-amber-50 text-xs sm:text-sm font-medium">
          Operando con datos ficticios de la <strong>Unidad Educativa Intercultural &quot;Los Álamos&quot;</strong>. Sus datos reales están 100% protegidos.
        </span>
      </div>
      <form action={exitDemoModeAction} className="shrink-0 ml-3">
        <button
          type="submit"
          className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/20 hover:bg-white text-white hover:text-slate-900 rounded-md text-xs font-semibold transition-all shadow-sm cursor-pointer border border-white/40"
          title="Regresar a mi institución real"
        >
          <span>⬅️</span>
          <span className="hidden sm:inline">Volver a mi institución</span>
          <span className="sm:hidden">Salir de Demo</span>
        </button>
      </form>
    </div>
  );
}
