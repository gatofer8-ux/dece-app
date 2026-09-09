"use client";

import { useEffect, useState } from "react";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

export default function PushSubscribeButton() {
  const [status, setStatus] = useState<"idle" | "loading" | "on" | "off" | "unsupported">("idle");

  useEffect(() => {
    async function check() {
      if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
        setStatus("unsupported");
        return;
      }
      try {
        const reg = await navigator.serviceWorker.register("/sw.js");
        const sub = await reg.pushManager.getSubscription();
        setStatus(sub ? "on" : "off");
      } catch {
        setStatus("unsupported");
      }
    }
    check();
  }, []);

  async function enable() {
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "BEDdPaiJHvbEWnh6uNJS6pAf7E8BKKmSsgWbAej1erx_reD6M31mka2QOaPrDzg7vB-TF50W0INVuum42XGxCdQ";
    if (!vapidKey) {
      alert("Las notificaciones push aún no están configuradas en el servidor.");
      return;
    }
    setStatus("loading");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        alert("El navegador bloqueó las notificaciones. Por favor, habilítalas manualmente en la configuración del sitio o en la barra de direcciones.");
        setStatus("off");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub),
      });
      setStatus("on");
    } catch (err) {
      console.error(err);
      setStatus("off");
    }
  }

  async function disable() {
    setStatus("loading");
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setStatus("off");
    } catch (err) {
      console.error(err);
      setStatus("off");
    }
  }

  if (status === "unsupported") return null;

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={status === "on" ? disable : enable}
        disabled={status === "loading" || status === "idle"}
        className="text-xs text-brand-700 hover:underline disabled:opacity-50 whitespace-nowrap"
        title="Recibe recordatorios de citas y avisos del DECE en este dispositivo"
      >
        {status === "on" ? "🔔 Notificaciones activadas" : "🔕 Activar notificaciones"}
      </button>
      {status === "on" && (
        <button
          onClick={async () => {
            await fetch("/api/push/test", { method: "POST" });
          }}
          className="text-xs text-blue-600 hover:underline whitespace-nowrap"
        >
          (Probar)
        </button>
      )}
    </div>
  );
}
