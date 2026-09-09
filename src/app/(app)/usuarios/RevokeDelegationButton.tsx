"use client";

import { useTransition } from "react";
import { revokeCoordinatorDelegation } from "./delegation-actions";

export default function RevokeDelegationButton({ delegationId }: { delegationId: string }) {
  const [isPending, startTransition] = useTransition();

  const handleRevoke = () => {
    if (!window.confirm("¿Estás seguro de que deseas revertir esta delegación de coordinación?")) {
      return;
    }
    startTransition(async () => {
      const res = await revokeCoordinatorDelegation(delegationId);
      if (res.error) {
        alert(res.error);
      }
    });
  };

  return (
    <button
      onClick={handleRevoke}
      disabled={isPending}
      className="text-xs text-amber-700 hover:text-amber-900 font-medium hover:underline disabled:opacity-50"
    >
      {isPending ? "Revirtiendo..." : "Revertir"}
    </button>
  );
}
