"use client";

import { useTransition } from "react";
import { deleteEsquelaAction } from "../actions";

export default function DeleteEsquelaButton({
  id,
  caseFileId,
  citationNumber,
}: {
  id: string;
  caseFileId?: string | null;
  citationNumber: string;
}) {
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    if (
      confirm(
        `¿Estás seguro de eliminar la citación "${citationNumber}"?\nEsta acción no se puede deshacer y el número no será reciclado.`
      )
    ) {
      startTransition(async () => {
        await deleteEsquelaAction(id, caseFileId);
      });
    }
  };

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={isPending}
      className="btn-secondary text-xs text-rose-700 hover:bg-rose-50 border-rose-200"
    >
      {isPending ? "Eliminando..." : "🗑️ Eliminar"}
    </button>
  );
}
