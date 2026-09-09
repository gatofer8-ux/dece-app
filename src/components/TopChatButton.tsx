"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function TopChatButton() {
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const checkUnread = () => {
      fetch("/api/chat/unread-count")
        .then((res) => res.json())
        .then((data) => {
          if (typeof data.unreadTotal === "number") {
            setUnreadCount(data.unreadTotal);
          }
        })
        .catch(() => {});
    };

    checkUnread();
    const interval = setInterval(checkUnread, 10000);
    return () => clearInterval(interval);
  }, []);

  const isActive = pathname.startsWith("/chat");

  return (
    <Link
      href="/chat"
      prefetch={true}
      title="Mensajería y Chat DECE"
      className={`relative inline-flex items-center justify-center h-9 px-3 rounded-lg text-sm font-medium transition-all ${
        isActive
          ? "bg-brand-900 text-white shadow-xs"
          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
      }`}
    >
      <span className="text-base mr-1.5">💬</span>
      <span className="hidden md:inline text-xs font-semibold">Chat</span>
      {unreadCount > 0 && (
        <span className="ml-1.5 px-1.5 py-0.2 bg-red-600 text-white text-[10px] font-bold rounded-full animate-pulse">
          {unreadCount}
        </span>
      )}
    </Link>
  );
}
