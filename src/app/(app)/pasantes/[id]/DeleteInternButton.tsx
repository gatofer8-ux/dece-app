"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteInternAction } from "@/app/pasantes/actions";

export default function DeleteInternButton({
  internId,
  internName,
}: {
  internId: string;
  internName: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    if (
      !confirm(
        `¿Estás seguro de eliminar a ${internName}? Se borrarán permanentemente sus registros de asistencia.`
      )
    ) {
      return;
    }

    startTransition(async () => {
      const res = await deleteInternAction(internId);
      if (res.success) {
        router.push("/pasantes");
        router.refresh();
      } else {
        alert(res.error || "No se pudo eliminar.");
      }
    });
  };

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={isPending}
      className="inline-flex items-center gap-1.5 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs rounded-xl border border-red-200 transition-colors shadow-xs"
    >
      <span>🗑️</span> {isPending ? "Eliminando..." : "Eliminar"}
    </button>
  );
}
