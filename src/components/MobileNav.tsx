"use client";

import { useEffect, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import type { Role } from "@/lib/types";
import { navGroupsFor, NAV_ITEMS } from "@/components/nav";
import { ROLE_LABELS } from "@/lib/types";

interface MobileNavProps {
  role: Role;
  institutionName?: string;
  institutionLogo?: string | null;
  userName?: string | null;
}

/**
 * Navegación para dispositivos móviles:
 * - Botón de acceso rápido en la cabecera superior y sincronización con BottomNav.
 * - Panel lateral deslizable (Drawer) montado vía createPortal en document.body
 *   para garantizar aislamiento total frente a transformaciones, filtros o backdrop-blur.
 * - Prevención de pérdidas al desplegarse con z-index absoluto, alto contraste y scroll táctil aislado.
 */
export default function MobileNav({
  role,
  institutionName,
  institutionLogo,
  userName,
}: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [search, setSearch] = useState("");
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const pathname = usePathname();

  // Asegurar que el cliente esté montado antes de usar createPortal
  useEffect(() => {
    setMounted(true);
  }, []);

  // Cerrar el menú al cambiar de ruta
  useEffect(() => {
    setOpen(false);
    setSearch("");
  }, [pathname]);

  // Escuchar evento global despachado desde la barra inferior (BottomNav) u otros disparadores
  useEffect(() => {
    const handleOpenEvent = () => setOpen(true);
    window.addEventListener("dece:open-mobile-menu", handleOpenEvent);
    return () => {
      window.removeEventListener("dece:open-mobile-menu", handleOpenEvent);
    };
  }, []);

  // Bloquear scroll de la página de fondo de forma segura mientras el menú está abierto
  useEffect(() => {
    if (!open) return;
    const origOverflow = document.body.style.overflow;
    const origTouchAction = document.body.style.touchAction;
    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";
    return () => {
      document.body.style.overflow = origOverflow;
      document.body.style.touchAction = origTouchAction;
    };
  }, [open]);

  // Soporte de tecla Escape para accesibilidad
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  // Consultar mensajes no leídos para la insignia de chat
  useEffect(() => {
    const checkUnread = () => {
      fetch("/api/chat/unread-count")
        .then((res) => res.json())
        .then((data) => {
          if (typeof data.unreadTotal === "number") setUnreadChatCount(data.unreadTotal);
        })
        .catch(() => {});
    };
    checkUnread();
  }, []);

  // Gestión de grupos de navegación
  const baseGroups = useMemo(() => navGroupsFor(role), [role]);

  // Filtrar si el usuario escribe en el buscador rápido
  const displayedGroups = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return baseGroups;

    const matchingItems = NAV_ITEMS.filter(
      (item) =>
        item.roles.includes(role) &&
        (item.label.toLowerCase().includes(query) || item.group.toLowerCase().includes(query))
    );

    if (matchingItems.length === 0) return [];
    return [{ name: "Resultados encontrados", items: matchingItems }];
  }, [baseGroups, search, role]);

  // Gestos táctiles: deslizar hacia la izquierda para cerrar
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    if (touchStartX - touchEndX > 60) {
      setOpen(false);
    }
    setTouchStartX(null);
  };

  return (
    <div className="md:hidden shrink-0">
      {/* Botón superior de apertura de menú */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Abrir menú de navegación lateral"
        aria-expanded={open}
        className="flex items-center gap-1.5 h-9 px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-bold text-xs shadow-xs hover:bg-slate-50 dark:hover:bg-slate-700/80 active:scale-95 transition-all shrink-0 cursor-pointer"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
        <span>Menú</span>
      </button>

      {/* Drawer lateral montado en document.body para evitar clipping o pérdida al desplegarse */}
      {mounted &&
        open &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Menú principal de opciones DECE"
            className="fixed inset-0 z-[99999] overflow-hidden no-print"
          >
            {/* Fondo oscurecido con cierre al tocar fuera */}
            <div
              className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs transition-opacity duration-200 animate-fade-in cursor-pointer"
              onClick={() => setOpen(false)}
              aria-hidden="true"
            />

            {/* Panel lateral deslizable desde la izquierda */}
            <aside
              className="fixed inset-y-0 left-0 flex w-[85vw] max-w-xs flex-col bg-[#0b1220] text-slate-100 border-r border-slate-800 shadow-2xl z-[100000] animate-slide-in-left h-screen h-[100dvh] will-change-transform"
              onClick={(e) => e.stopPropagation()}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              {/* Cabecera del panel lateral */}
              <div className="flex items-center justify-between border-b border-slate-800/90 px-4 py-3 shrink-0 bg-[#080d17]">
                <div className="flex items-center gap-2.5 min-w-0">
                  {institutionLogo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={institutionLogo}
                      alt={institutionName || "Logo"}
                      className="h-8 w-8 rounded-lg object-contain bg-slate-800 border border-slate-700/60 shrink-0 p-0.5"
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-lg bg-slate-800 border border-slate-700/60 flex items-center justify-center font-bold text-xs shrink-0 text-slate-300">
                      🏛️
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="font-bold text-xs leading-tight truncate text-slate-100">
                      {institutionName || "Gestión DECE"}
                    </div>
                    <div className="text-[10px] text-cyan-400 font-medium truncate">
                      Opciones del Sistema
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Cerrar menú"
                  className="h-9 w-9 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center text-lg font-bold border border-slate-700/50 active:scale-95 transition-all cursor-pointer shrink-0"
                >
                  ✕
                </button>
              </div>

              {/* Buscador rápido de módulos */}
              <div className="px-3 pt-2.5 pb-2 shrink-0 bg-[#090f1d] border-b border-slate-800/60">
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400 text-xs">
                    🔍
                  </span>
                  <input
                    type="text"
                    placeholder="Buscar módulo u opción..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-8 pr-7 py-1.5 text-xs bg-slate-950/80 border border-slate-700/70 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/50"
                  />
                  {search && (
                    <button
                      type="button"
                      onClick={() => setSearch("")}
                      className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-white text-xs cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {/* Lista de navegación con scroll táctil aislado */}
              <nav className="flex-1 overflow-y-auto overscroll-contain px-3 py-3 space-y-4 min-h-0 text-slate-200">
                {displayedGroups.map((group, gi) => (
                  <div key={group.name} className={gi > 0 ? "mt-3" : ""}>
                    {group.name !== "Principal" && group.name !== "Global" && (
                      <div className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                        <span>{group.name}</span>
                        <span className="text-[9px] text-slate-500">{group.items.length}</span>
                      </div>
                    )}
                    <div className="space-y-1">
                      {group.items.map((item) => {
                        const active =
                          pathname === item.href ||
                          (item.href !== "/dashboard" && pathname.startsWith(item.href + "/"));
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setOpen(false)}
                            className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-medium transition-colors ${
                              active
                                ? "bg-cyan-950/80 text-cyan-300 font-semibold border-l-3 border-cyan-400 shadow-xs"
                                : "text-slate-300 hover:bg-slate-800/80 hover:text-white active:bg-slate-800"
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="text-base shrink-0" aria-hidden>
                                {item.icon}
                              </span>
                              <span className="truncate">{item.label}</span>
                            </div>
                            {item.href === "/chat" && unreadChatCount > 0 && (
                              <span className="px-1.5 py-0.5 bg-red-500 text-white text-[9px] font-bold rounded-full shrink-0">
                                {unreadChatCount}
                              </span>
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {displayedGroups.length === 0 && (
                  <div className="text-center py-8 text-xs text-slate-400">
                    No se encontraron opciones para &quot;{search}&quot;
                  </div>
                )}
              </nav>

              {/* Pie del menú lateral con perfil y acciones */}
              <div className="border-t border-slate-800/90 px-3.5 py-2.5 shrink-0 bg-[#080d17] flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="h-7 w-7 rounded-full bg-cyan-900/80 border border-cyan-700/60 text-cyan-200 flex items-center justify-center font-bold text-xs shrink-0">
                    {userName ? userName.slice(0, 1).toUpperCase() : "U"}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-slate-200 truncate leading-tight">
                      {userName || "Usuario"}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">
                      {ROLE_LABELS[role]}
                    </div>
                  </div>
                </div>
                <div className="shrink-0 flex items-center gap-1.5">
                  <Link
                    href="/perfil"
                    onClick={() => setOpen(false)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs border border-slate-700/50"
                    title="Mi Perfil"
                  >
                    ⚙️
                  </Link>
                  <button
                    type="button"
                    onClick={async () => {
                      await signOut({ redirect: false });
                      window.location.href = "/login";
                    }}
                    className="p-1.5 rounded-lg bg-red-950/60 hover:bg-red-900/80 text-red-300 hover:text-red-100 text-xs border border-red-800/40 cursor-pointer"
                    title="Cerrar sesión"
                  >
                    🚪
                  </button>
                </div>
              </div>
            </aside>
          </div>,
          document.body
        )}
    </div>
  );
}
