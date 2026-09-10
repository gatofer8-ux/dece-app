"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@/lib/types";
import { navGroupsFor } from "@/components/nav";

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

  // Bloquear el scroll del fondo mientras el panel está abierto.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const groups = navGroupsFor(role);

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Abrir menú"
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 no-print">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setOpen(false)} />
          <div className="animate-toast-in absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-brand-900 text-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-4">
              <div className="min-w-0">
                <div className="truncate font-semibold leading-tight">{institutionName || "Gestión DECE"}</div>
                <div className="text-xs text-brand-200">Consejería Estudiantil</div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Cerrar menú"
                className="text-brand-200 hover:text-white text-xl leading-none"
              >
                ×
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto px-3 py-4">
              {groups.map((group, gi) => (
                <div key={group.name} className={gi > 0 ? "mt-4" : ""}>
                  {group.name !== "Principal" && group.name !== "Global" && (
                    <div className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-brand-300/80">
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
                          className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium ${
                            active ? "bg-white text-brand-900 font-semibold" : "text-brand-100 hover:bg-white/10"
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
