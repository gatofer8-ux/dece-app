"use client";

import { useTransition } from "react";
import { deleteAnnualReportAction } from "./actions";

export default function DeleteReportButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    if (confirm("¿Estás seguro de eliminar este informe de fin de gestión? Esta acción no se puede deshacer.")) {
      startTransition(async () => {
        const res = await deleteAnnualReportAction(id);
        if (res.error) {
          alert(res.error);
        }
      });
    }
  };

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={isPending}
      className="text-red-600 hover:text-red-800 text-xs font-semibold px-2.5 py-1.5 rounded hover:bg-red-50 transition-colors"
      title="Eliminar informe"
    >
      {isPending ? "..." : "🗑️ Eliminar"}
    </button>
  );
}
