"use client";

export default function UserSubscriptionStatusBanner({
  subscription,
}: {
  subscription?: {
    status: string;
    package_name?: string;
    days_left: number | null;
    is_trial?: boolean;
    is_read_only?: boolean;
    is_demo?: boolean;
    end_date?: string | null;
  } | null;
}) {
  if (!subscription || subscription.is_demo || subscription.status === "demo") {
    return null;
  }

  // 1. Suspendido / Cancelado (Modo solo lectura)
  if (subscription.is_read_only || subscription.status === "suspendido" || subscription.status === "cancelado") {
    return (
      <div className="no-print bg-rose-600 text-white px-4 py-2.5 text-xs flex items-center justify-between shadow-xs border-b border-rose-700">
        <div className="flex items-center gap-2">
          <span className="text-base">⛔</span>
          <div>
            <strong className="font-bold">Modo Solo Lectura:</strong> Tu suscripción individual se encuentra suspendida por falta de pago. Puedes consultar todos tus casos y estudiantes ya gestionados, pero la creación y edición están deshabilitadas hasta su renovación.
          </div>
        </div>
        <div className="text-[11px] font-semibold bg-rose-700/80 px-2.5 py-1 rounded-full shrink-0">
          Suscripción Suspendida
        </div>
      </div>
    );
  }

  // 2. Periodo de prueba
  if (subscription.is_trial || subscription.status === "en_prueba") {
    const days = subscription.days_left !== null ? subscription.days_left : 0;
    return (
      <div className="no-print bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2 text-xs flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2">
          <span className="text-base">🎁</span>
          <span>
            <strong>Periodo de Prueba Activo:</strong> Dispones de acceso completo e ilimitado al sistema. {days > 0 ? `Te quedan ${days} días de prueba gratuita (vence el ${subscription.end_date}).` : "Tu prueba gratuita vence hoy."}
          </span>
        </div>
        <span className="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0">
          {days} Días Restantes
        </span>
      </div>
    );
  }

  // 3. Vencimiento próximo en plan activo (<= 7 días)
  if (subscription.days_left !== null && subscription.days_left <= 7 && subscription.days_left >= 0) {
    return (
      <div className="no-print bg-amber-500 text-amber-950 px-4 py-2 text-xs flex items-center justify-between shadow-xs border-b border-amber-600/30">
        <div className="flex items-center gap-2">
          <span className="text-base">⏳</span>
          <span>
            <strong>Aviso de Vencimiento:</strong> Tu suscripción ({subscription.package_name || "Plan Activo"}) vence en <strong>{subscription.days_left} {subscription.days_left === 1 ? "día" : "días"}</strong> (el {subscription.end_date}). Comunícate con tu administración para gestionar la renovación.
          </span>
        </div>
        <span className="text-[10px] font-bold bg-amber-600 text-white px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0">
          Vence Pronto
        </span>
      </div>
    );
  }

  return null;
}
