"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@/lib/types";

interface NavItem {
  href: string;
  label: string;
  icon: string;
  roles: Role[];
  group: string;
}

const NAV_ITEMS: NavItem[] = [
  // Global
  { href: "/superadmin", label: "Superadministrador", icon: "🛡️", roles: ["SUPERADMIN"], group: "Global" },
  { href: "/instituciones", label: "Instituciones", icon: "🏫", roles: ["SUPERADMIN", "DISTRITO"], group: "Global" },

  // Principal
  { href: "/dashboard", label: "Panel general", icon: "📊", roles: ["SUPERADMIN", "ADMIN", "DECE"], group: "Principal" },
  { href: "/chat", label: "Mensajería / Chat", icon: "💬", roles: ["SUPERADMIN", "ADMIN", "DECE", "AUTORIDAD", "DOCENTE"], group: "Principal" },
  { href: "/estudiantes", label: "Estudiantes", icon: "🎓", roles: ["SUPERADMIN", "ADMIN", "DECE"], group: "Principal" },
  { href: "/casos", label: "Casos y fichas", icon: "📁", roles: ["SUPERADMIN", "ADMIN", "DECE"], group: "Principal" },
  { href: "/alertas", label: "Alertas", icon: "🚩", roles: ["SUPERADMIN", "ADMIN", "DECE", "DOCENTE"], group: "Principal" },
  { href: "/citas", label: "Citas y agenda", icon: "📅", roles: ["SUPERADMIN", "ADMIN", "DECE"], group: "Principal" },
  { href: "/derivaciones", label: "Derivaciones", icon: "🔀", roles: ["SUPERADMIN", "ADMIN", "DECE"], group: "Principal" },
  { href: "/atencion-diaria", label: "Atención diaria", icon: "📋", roles: ["SUPERADMIN", "ADMIN", "DECE"], group: "Principal" },

  // Acompañamiento y prevención
  { href: "/actividades", label: "Promoción y prevención", icon: "🌱", roles: ["SUPERADMIN", "ADMIN", "DECE", "AUTORIDAD", "DOCENTE"], group: "Acompañamiento y prevención" },
  { href: "/circulos-restaurativos", label: "Círculos restaurativos", icon: "⭕", roles: ["SUPERADMIN", "ADMIN", "DECE"], group: "Acompañamiento y prevención" },
  { href: "/plan-accion", label: "Plan de acción (POA)", icon: "🎯", roles: ["SUPERADMIN", "ADMIN", "DECE", "AUTORIDAD"], group: "Acompañamiento y prevención" },

  // Informes
  { href: "/reportes", label: "Reportes", icon: "📈", roles: ["SUPERADMIN", "ADMIN", "DECE", "AUTORIDAD"], group: "Informes" },
  { href: "/juntas-curso", label: "Juntas de curso", icon: "📑", roles: ["SUPERADMIN", "ADMIN", "DECE", "AUTORIDAD"], group: "Informes" },
  { href: "/informe-gestion", label: "Informe de fin de gestión", icon: "📊", roles: ["SUPERADMIN", "ADMIN", "DECE", "AUTORIDAD", "DISTRITO"], group: "Informes" },

  // Administración
  { href: "/distributivo", label: "Distributivo DECE", icon: "👥", roles: ["SUPERADMIN", "ADMIN", "DECE", "AUTORIDAD"], group: "Administración" },
  { href: "/anios-lectivos", label: "Años lectivos", icon: "🗓️", roles: ["SUPERADMIN", "ADMIN", "DECE"], group: "Administración" },
  { href: "/pasantes", label: "Pasantes y voluntarios", icon: "🤝", roles: ["SUPERADMIN", "ADMIN", "DECE", "AUTORIDAD"], group: "Administración" },
  { href: "/usuarios", label: "Usuarios", icon: "👤", roles: ["SUPERADMIN", "ADMIN", "DECE"], group: "Administración" },
  { href: "/institucion", label: "Mi institución", icon: "🏛️", roles: ["SUPERADMIN", "ADMIN", "DECE"], group: "Administración" },
  { href: "/respaldos", label: "Copias de seguridad", icon: "💾", roles: ["SUPERADMIN", "ADMIN", "DECE"], group: "Administración" },
  { href: "/auditoria", label: "Auditoría", icon: "📜", roles: ["SUPERADMIN", "ADMIN", "DISTRITO"], group: "Administración" },

  // Cuenta
  { href: "/perfil", label: "Mi perfil", icon: "👤", roles: ["SUPERADMIN", "ADMIN", "DECE", "AUTORIDAD", "DOCENTE"], group: "Cuenta" },
];

const GROUP_ORDER = [
  "Global",
  "Principal",
  "Acompañamiento y prevención",
  "Informes",
  "Administración",
  "Cuenta",
];

export default function Sidebar({
  role,
  institutionName,
  institutionLogo,
}: {
  role: Role;
  institutionName?: string;
  institutionLogo?: string | null;
}) {
  const pathname = usePathname();
  const items = NAV_ITEMS.filter((item) => item.roles.includes(role));
  const [unreadChatCount, setUnreadChatCount] = useState(0);

  useEffect(() => {
    const checkUnread = () => {
      fetch("/api/chat/unread-count")
        .then((res) => res.json())
        .then((data) => {
          if (typeof data.unreadTotal === "number") {
            setUnreadChatCount(data.unreadTotal);
          }
        })
        .catch(() => {});
    };

    checkUnread();
    const interval = setInterval(checkUnread, 10000);
    return () => clearInterval(interval);
  }, []);

  const groups = GROUP_ORDER.map((g) => ({
    name: g,
    items: items.filter((i) => i.group === g),
  })).filter((g) => g.items.length > 0);

  return (
    <aside className="no-print hidden md:flex md:flex-col w-64 shrink-0 bg-brand-900 text-white min-h-screen">
      <div className="px-5 py-6 border-b border-white/10">
        <div className="flex items-center gap-2">
          {institutionLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={institutionLogo} alt={institutionName || "Logo institucional"} className="h-9 w-9 rounded-lg object-contain bg-white/10" />
          ) : (
            <div className="h-9 w-9 rounded-lg bg-white/10 flex items-center justify-center font-bold text-sm">
              DECE
            </div>
          )}
          <div className="min-w-0">
            <div className="font-semibold leading-tight truncate">{institutionName || "Gestión DECE"}</div>
            <div className="text-xs text-brand-200 truncate">Consejería Estudiantil</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        {groups.map((group, gi) => (
          <div key={group.name} className={gi > 0 ? "mt-5" : ""}>
            {group.name !== "Principal" && group.name !== "Global" && (
              <div className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-brand-300/80">
                {group.name}
              </div>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = pathname === item.href || pathname.startsWith(item.href + "/");
                const isChatItem = item.href === "/chat";
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    prefetch={true}
                    className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150 active:scale-[0.98] ${
                      active
                        ? "bg-white text-brand-900 shadow-sm font-semibold"
                        : "text-brand-100 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span aria-hidden>{item.icon}</span>
                      <span>{item.label}</span>
                    </div>
                    {isChatItem && unreadChatCount > 0 && (
                      <span className="px-1.5 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full">
                        {unreadChatCount}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="px-5 py-4 text-xs text-brand-200 border-t border-white/10">
        Modelo de Gestión DECE · Ecuador
      </div>
    </aside>
  );
}
