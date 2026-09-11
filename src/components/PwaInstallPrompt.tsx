"use client";

import { useEffect, useState } from "react";

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Comprobar si ya está instalada o en modo aplicación
    const inStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(inStandalone);

    if (inStandalone) return;

    // Detectar iOS / iPadOS
    const ua = window.navigator.userAgent.toLowerCase();
    const isAppleDevice = /iphone|ipad|ipod/.test(ua);
    setIsIos(isAppleDevice);

    // Capturar evento nativo de instalación en Chromium/Android/Edge/Windows
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    // Escuchar cuando la app ya fue instalada
    window.addEventListener("appinstalled", () => {
      setIsInstallable(false);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIos) {
      setShowIosGuide(true);
      return;
    }

    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === "accepted") {
      setIsInstallable(false);
      setDeferredPrompt(null);
    }
  };

  // Si ya se está ejecutando instalada, no mostrar
  if (isStandalone) return null;

  // Si no es instalable y no es iOS, no mostrar nada
  if (!isInstallable && !isIos) return null;

  return (
    <>
      <button
        type="button"
        onClick={handleInstallClick}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-lg text-xs font-semibold shadow-xs hover:shadow-sm transition-all active:scale-95 cursor-pointer"
        title="Instalar el DECE como aplicación en este dispositivo"
      >
        <span className="text-xs">📥</span>
        <span className="hidden sm:inline">Instalar App</span>
      </button>

      {/* Modal de guía para dispositivos Apple iOS */}
      {showIosGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-toast-in">
          <div className="card w-full max-w-sm bg-white p-5 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-3">
              <h4 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                <span>🍏</span> Instalar en iPhone / iPad
              </h4>
              <button
                onClick={() => setShowIosGuide(false)}
                className="text-xs text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed space-y-2">
              Para instalar la app del DECE en tu dispositivo Apple:
            </p>

            <ol className="text-xs text-slate-700 space-y-2.5 my-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
              <li className="flex items-start gap-2">
                <span className="font-bold bg-white px-1.5 py-0.5 rounded border border-slate-300">1</span>
                <span>Toca el botón <strong>Compartir</strong> (ícono con flecha hacia arriba) en Safari.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold bg-white px-1.5 py-0.5 rounded border border-slate-300">2</span>
                <span>Baja y selecciona <strong>&quot;Agregar a inicio&quot;</strong> (o &quot;Add to Home Screen&quot;).</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold bg-white px-1.5 py-0.5 rounded border border-slate-300">3</span>
                <span>Confirma con <strong>&quot;Agregar&quot;</strong>. ¡Listo! Se abrirá como app nativa.</span>
              </li>
            </ol>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowIosGuide(false)}
                className="btn-primary text-xs px-3 py-1.5"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
