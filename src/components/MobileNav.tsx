"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@/lib/types";
import { navGroupsFor } from "@/components/nav";
import SadexLogo from "@/components/SadexLogo";

/**
 * Navegación para móvil: botón hamburguesa en la cabecera + panel deslizante.
 * El menú lateral normal está oculto en pantallas pequeñas (`hidden md:flex`),
 * así que sin esto no había forma de navegar desde el celular.
 */
export default function MobileNav({ role, institutionName }: { role: Role; institutionName?: string }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Cerrar al cambiar de ruta.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Escuchar evento para abrir desde la barra inferior
  useEffect(() => {
    const handleOpenEvent = () => setOpen(true);
    window.addEventListener("dece:open-mobile-menu", handleOpenEvent);
    return () => {
      window.removeEventListener("dece:open-mobile-menu", handleOpenEvent);
    };
  }, []);

  // Bloquear el scroll del fondo mientras el panel está abierto.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const groups = navGroupsFor(role);

  return (
    <div className="md:hidden shrink-0">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Abrir menú de navegación lateral"
        className="flex items-center gap-1.5 h-9 px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-bold text-xs shadow-xs hover:bg-slate-50 dark:hover:bg-slate-700/80 active:scale-95 transition-all shrink-0 cursor-pointer"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
        <span>Menú</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 no-print">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setOpen(false)} />
          <div className="animate-toast-in absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-[#0b1220] text-slate-100 border-r border-slate-800 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3.5">
              <div className="min-w-0 space-y-1">
                <SadexLogo variant="horizontal" size="xs" theme="dark" showSubtitle={false} />
                <div className="truncate text-[11px] text-slate-400 font-medium">{institutionName || "Gestión DECE"}</div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Cerrar menú"
                className="text-slate-400 hover:text-white text-xl leading-none p-1"
              >
                ×
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto px-3 py-4">
              {groups.map((group, gi) => (
                <div key={group.name} className={gi > 0 ? "mt-4" : ""}>
                  {group.name !== "Principal" && group.name !== "Global" && (
                    <div className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      {group.name}
                    </div>
                  )}
                  <div className="space-y-0.5">
                    {group.items.map((item) => {
                      const active = pathname === item.href || pathname.startsWith(item.href + "/");
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                            active ? "bg-slate-800 text-cyan-300 font-semibold border-l-2 border-cyan-400 pl-2.5" : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
                          }`}
                        >
                          <span aria-hidden>{item.icon}</span>
                          <span>{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>
          </div>
        </div>
      )}
    </div>
  );
}
