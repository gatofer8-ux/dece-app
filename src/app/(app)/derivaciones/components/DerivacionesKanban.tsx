"use client";

import { useState } from "react";
import Link from "next/link";
import { updateReferralKanbanStatus } from "../actions";
import { formatDate } from "@/components/ui";

const COLUMNS = [
  { id: "PENDIENTE", label: "Pendiente" },
  { id: "EN_PROCESO", label: "En Proceso" },
  { id: "RESPONDIDA", label: "Respondida" },
  { id: "CERRADA", label: "Cerrada" },
];

export default function DerivacionesKanban({ initialReferrals }: { initialReferrals: any[] }) {
  const [referrals, setReferrals] = useState(initialReferrals);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.setData("text/plain", id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = async (e: React.DragEvent, status: string) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    if (!id || id !== draggedId) return;

    const referral = referrals.find((r) => r.id === id);
    if (!referral || referral.status === status) return;

    // Optimistic UI update
    setReferrals((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    setDraggedId(null);

    try {
      await updateReferralKanbanStatus(id, referral.case_file_id, status);
    } catch (error) {
      console.error(error);
      // Revert on error
      setReferrals((prev) => prev.map((r) => (r.id === id ? { ...r, status: referral.status } : r)));
    }
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 items-start h-[calc(100vh-200px)]">
      {COLUMNS.map((col) => (
        <div
          key={col.id}
          className="flex-shrink-0 w-80 bg-slate-100 rounded-lg flex flex-col max-h-full border border-slate-200 shadow-sm"
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, col.id)}
        >
          <div className="p-3 border-b border-slate-200 font-semibold text-slate-700 flex justify-between items-center bg-white rounded-t-lg">
            <span>{col.label}</span>
            <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full text-xs">
              {referrals.filter((r) => r.status === col.id).length}
            </span>
          </div>
          <div className="p-2 flex-1 overflow-y-auto space-y-2">
            {referrals
              .filter((r) => r.status === col.id)
              .map((r) => {
                // Determine if it needs an alert (e.g. En Proceso > 15 days)
                const isAlert =
                  col.id === "EN_PROCESO" &&
                  new Date().getTime() - new Date(r.updated_at).getTime() > 15 * 24 * 60 * 60 * 1000;

                return (
                  <div
                    key={r.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, r.id)}
                    className="bg-white p-3 rounded shadow-sm border border-slate-200 cursor-grab active:cursor-grabbing hover:border-brand-300 transition-colors relative"
                  >
                    {isAlert && (
                      <span className="absolute top-2 right-2 text-rose-500 font-bold" title="Más de 15 días en proceso">
                        ⚠️
                      </span>
                    )}
                    <Link
                      href={`/casos/${r.case_file_id}`}
                      className="text-xs font-bold text-brand-700 hover:underline"
                    >
                      {r.case_code}
                    </Link>
                    <div className="text-sm font-medium text-slate-800 mt-1">{r.student_name}</div>
                    <div className="text-xs text-slate-500 mt-1 font-mono truncate" title={r.institution}>
                      🏥 {r.institution}
                    </div>
                    <div className="flex justify-between items-center mt-3 pt-2 border-t border-slate-50 text-[10px] text-slate-400">
                      <span>{formatDate(r.referral_date)}</span>
                      <div className="flex gap-1">
                        <Link
                          href={`/casos/${r.case_file_id}/derivaciones/${r.id}/imprimir`}
                          className="px-2 py-1 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded border border-slate-200"
                        >
                          Ver
                        </Link>
                        <Link
                          href={`/casos/${r.case_file_id}/derivaciones/${r.id}/editar`}
                          className="px-2 py-1 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded border border-slate-200"
                        >
                          ✏️
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            {referrals.filter((r) => r.status === col.id).length === 0 && (
              <div className="text-center p-4 text-sm text-slate-400 border-2 border-dashed border-slate-200 rounded">
                Vacío
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
