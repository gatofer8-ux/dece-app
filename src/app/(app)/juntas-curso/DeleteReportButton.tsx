"use client";

import { useTransition } from "react";
import { deleteCourseBoardReportAction } from "./actions";

export default function DeleteReportButton({
  id,
  reportCode,
}: {
  id: string;
  reportCode: string;
}) {
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    if (confirm(`¿Estás seguro de eliminar el informe "${reportCode}"?\nEsta acción no se puede deshacer.`)) {
      startTransition(async () => {
        const res = await deleteCourseBoardReportAction(id);
        if (!res.success) {
          alert(res.error || "No se pudo eliminar el informe.");
        }
      });
    }
  };

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={isPending}
      className="px-2 py-1 rounded hover:bg-red-50 text-red-600 font-medium text-xs transition-colors disabled:opacity-50"
      title="Eliminar Informe"
    >
      {isPending ? "..." : "🗑️"}
    </button>
  );
}
