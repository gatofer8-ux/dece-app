"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { unlinkDeviceAction, resetPinAction } from "@/app/pasantes/actions";

export default function DeviceSecurityButtons({
  internId,
  internName,
  hasDevice,
  hasPin,
}: {
  internId: string;
  internName: string;
  hasDevice: boolean;
  hasPin: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleUnlink = () => {
    if (
      !confirm(
        `¿Estás seguro de desvincular el teléfono celular de ${internName}? Esto permitirá que el pasante registre un nuevo celular en su próximo escaneo de QR.`
      )
    ) {
      return;
    }

    startTransition(async () => {
      const res = await unlinkDeviceAction(internId);
      if ("success" in res && res.success) {
        alert(res.message);
        router.refresh();
      } else if ("error" in res) {
        alert(res.error);
      }
    });
  };

  const handleResetPin = () => {
    const newPin = prompt(
      `Ingresa el nuevo PIN de 4 dígitos para ${internName}:`,
      "1234"
    );
    if (!newPin) return;

    if (!/^\d{4}$/.test(newPin.trim())) {
      alert("El PIN debe contener exactamente 4 dígitos numéricos.");
      return;
    }

    startTransition(async () => {
      const res = await resetPinAction(internId, newPin.trim());
      if ("success" in res && res.success) {
        alert("¡PIN reseteado con éxito!");
        router.refresh();
      } else if ("error" in res) {
        alert(res.error);
      }
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2 pt-1">
      {hasDevice && (
        <button
          type="button"
          onClick={handleUnlink}
          disabled={isPending}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-xs rounded-xl border border-amber-200 transition-colors shadow-xs"
        >
          <span>🔓</span> {isPending ? "Desvinculando..." : "Desvincular Teléfono Celular"}
        </button>
      )}
      {hasPin && (
        <button
          type="button"
          onClick={handleResetPin}
          disabled={isPending}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-300 transition-colors shadow-xs"
        >
          <span>🔑</span> Resetear PIN
        </button>
      )}
    </div>
  );
}
