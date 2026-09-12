"use client";

import { useTransition } from "react";
import { deleteOficio } from "./actions";

export default function DeleteOficioButton({
  id,
  oficioNumber,
}: {
  id: string;
  oficioNumber: string;
}) {
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    if (
      confirm(
        `¿Estás seguro de eliminar el oficio "${oficioNumber}"?\nEsta acción no se puede deshacer y el número no será reciclado.`
      )
    ) {
      startTransition(async () => {
        await deleteOficio(id);
      });
    }
  };

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={isPending}
      className="text-xs text-rose-600 hover:text-rose-800 hover:underline disabled:opacity-50"
    >
      {isPending ? "Eliminando..." : "🗑️ Eliminar"}
    </button>
  );
}
