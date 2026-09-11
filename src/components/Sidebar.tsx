"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@/lib/types";
import { navGroupsFor } from "@/components/nav";
import SadexLogo from "@/components/SadexLogo";

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
  const [unreadChatCount, setUnreadChatCount] = useState(0);

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
    const interval = setInterval(checkUnread, 10000);
    return () => clearInterval(interval);
  }, []);

  const groups = navGroupsFor(role);

  return (
    <aside className="no-print hidden md:flex md:flex-col w-64 shrink-0 bg-brand-900 text-white min-h-screen">
      <div className="px-5 py-4 border-b border-white/10 space-y-3">
        {/* Marca oficial SADEX */}
        <Link href="/dashboard" className="flex items-center hover:opacity-90 transition-opacity">
          <SadexLogo variant="horizontal" size="sm" theme="dark" showSubtitle={true} />
        </Link>

        {/* Perfil de Institución Educativa */}
        <div className="flex items-center gap-2.5 pt-2 border-t border-white/10">
          {institutionLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={institutionLogo} alt={institutionName || "Logo institucional"} className="h-7 w-7 rounded-md object-contain bg-white/10 shrink-0" />
          ) : (
            <div className="h-7 w-7 rounded-md bg-white/10 flex items-center justify-center font-bold text-xs shrink-0">🏛️</div>
          )}
          <div className="min-w-0">
            <div className="font-semibold text-xs leading-tight truncate text-slate-100">{institutionName || "Institución Educativa"}</div>
            <div className="text-[10px] text-brand-300 truncate">Consejería Estudiantil</div>
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
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    prefetch
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
                    {item.href === "/chat" && unreadChatCount > 0 && (
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
