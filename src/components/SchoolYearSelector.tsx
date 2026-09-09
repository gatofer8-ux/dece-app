"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { SchoolYearRow } from "@/lib/types";

export default function SchoolYearSelector({
  schoolYears,
  currentYearId,
}: {
  schoolYears: SchoolYearRow[];
  currentYearId: string | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedId, setSelectedId] = useState<string>(currentYearId || "ALL");

  const handleChange = (newId: string) => {
    setSelectedId(newId);
    startTransition(async () => {
      await fetch("/api/school-year", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schoolYearId: newId }),
      });
      router.refresh();
    });
  };

  return (
    <div className="flex items-center gap-2">
      <div className="relative inline-flex items-center">
        <span className="text-xs font-semibold text-brand-900 bg-brand-50 border border-brand-200/80 px-2.5 py-1 rounded-l-md flex items-center gap-1.5 shadow-sm">
          <span>📅</span>
          <span className="hidden sm:inline">Período:</span>
        </span>
        <select
          value={selectedId}
          disabled={isPending}
          onChange={(e) => handleChange(e.target.value)}
          className="text-xs font-medium text-slate-800 bg-white border border-brand-200 border-l-0 rounded-r-md px-2.5 py-1 pr-6 focus:outline-none focus:ring-1 focus:ring-brand-500 cursor-pointer shadow-sm disabled:opacity-50"
        >
          <option value="ALL">Todos los años (Histórico global)</option>
          {schoolYears.map((y) => (
            <option key={y.id} value={y.id}>
              {y.name} {y.is_active ? "★ (Activo)" : ""}
            </option>
          ))}
        </select>
        {isPending && (
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-brand-500 animate-ping" />
        )}
      </div>
    </div>
  );
}
