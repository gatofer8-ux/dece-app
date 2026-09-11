"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@/lib/types";

export default function BottomNav({ role }: { role: Role }) {
  const pathname = usePathname();

  const openMobileMenu = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("dece:open-mobile-menu"));
    }
  };

  const navTabs = [
    { href: "/dashboard", label: "Inicio", icon: "🏠" },
    { href: "/casos", label: "Casos", icon: "📁" },
    { href: "/estudiantes", label: "Alumnos", icon: "🎓" },
    { href: "/offline", label: "Offline", icon: "📡" },
  ];

  return (
    <nav
      aria-label="Navegación inferior móvil"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 px-2 py-1 shadow-[0_-2px_10px_rgba(0,0,0,0.06)] no-print"
    >
      <div className="flex items-center justify-around max-w-md mx-auto">
        {navTabs.map((tab) => {
          const isActive = pathname === tab.href || (tab.href !== "/dashboard" && pathname.startsWith(tab.href + "/"));
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-xl transition-colors text-[10px] font-semibold min-w-[56px] ${
                isActive
                  ? "text-brand-600 dark:text-brand-400 font-bold"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
              }`}
            >
              <span className="text-xl leading-none mb-0.5">{tab.icon}</span>
              <span>{tab.label}</span>
            </Link>
          );
        })}

        {/* Botón especial para abrir el menú completo lateral con todas las opciones DECE */}
        <button
          type="button"
          onClick={openMobileMenu}
          className="flex flex-col items-center justify-center py-1.5 px-2 rounded-xl transition-colors text-[10px] font-semibold min-w-[56px] text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 active:scale-95 cursor-pointer"
          title="Ver todas las opciones del DECE"
        >
          <span className="text-xl leading-none mb-0.5">☰</span>
          <span className="font-bold text-slate-700 dark:text-slate-200">Menú</span>
        </button>
      </div>
    </nav>
  );
}
