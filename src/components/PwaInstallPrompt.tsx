"use client";

import { useEffect, useState } from "react";

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIos, setIsIos] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Comprobar si ya está instalada o en modo aplicación independiente
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
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    // Escuchar cuando la app ya fue instalada
    window.addEventListener("appinstalled", () => {
      setIsStandalone(true);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    // Si el navegador disparó el evento nativo de instalación, invocarlo de inmediato
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice && choice.outcome === "accepted") {
          setDeferredPrompt(null);
          return;
        }
      } catch (err) {
        console.warn("[PWA] Error en prompt nativo:", err);
      }
    }

    // En caso contrario o en iOS, mostrar la guía visual adaptada al dispositivo
    setShowModal(true);
  };

  // Si ya se está ejecutando instalada como ventana nativa, no mostrar el botón
  if (isStandalone) return null;

  return (
    <>
      <button
        type="button"
        onClick={handleInstallClick}
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-lg text-xs font-semibold shadow-xs hover:shadow-sm transition-all active:scale-95 cursor-pointer shrink-0"
        title="Instalar el sistema DECE como aplicación en este dispositivo"
      >
        <span className="text-sm leading-none">📲</span>
        <span className="hidden md:inline">Instalar App</span>
      </button>

      {/* Modal de instrucciones de instalación */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-toast-in">
          <div className="card w-full max-w-md bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 rounded-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <h4 className="font-bold text-sm sm:text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>📲</span> Instalar DECE en este dispositivo
              </h4>
              <button
                onClick={() => setShowModal(false)}
                className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
              >
                ✕
              </button>
            </div>

            {isIos ? (
              <div className="space-y-3">
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Para instalar la aplicación en tu <strong>iPhone o iPad</strong> desde Safari:
                </p>
                <ol className="text-xs text-slate-700 dark:text-slate-200 space-y-2.5 bg-slate-50 dark:bg-slate-800/80 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700">
                  <li className="flex items-start gap-2.5">
                    <span className="font-bold bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 px-2 py-0.5 rounded border border-slate-300 dark:border-slate-600 text-[11px]">1</span>
                    <span>Toca el botón <strong>Compartir</strong> (ícono cuadrado con flecha hacia arriba ⎋) en la barra de Safari.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="font-bold bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 px-2 py-0.5 rounded border border-slate-300 dark:border-slate-600 text-[11px]">2</span>
                    <span>Desliza hacia abajo y pulsa <strong>&quot;Agregar a inicio&quot;</strong> (o &quot;Add to Home Screen&quot; ➕).</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="font-bold bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 px-2 py-0.5 rounded border border-slate-300 dark:border-slate-600 text-[11px]">3</span>
                    <span>Toca <strong>&quot;Agregar&quot;</strong> en la esquina superior derecha. ¡Listo! Se abrirá como aplicación independiente.</span>
                  </li>
                </ol>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Puedes instalar el sistema como aplicación de escritorio o móvil para acceder rápidamente incluso sin conexión:
                </p>
                <div className="space-y-2.5 text-xs text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/80 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700">
                  <div className="flex items-start gap-2.5">
                    <span className="font-bold bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 px-2 py-0.5 rounded border border-slate-300 dark:border-slate-600 text-[11px]">💻</span>
                    <div>
                      <strong>En Chrome / Edge (Computadora):</strong>
                      <p className="text-slate-600 dark:text-slate-300 mt-0.5">
                        Busca el ícono de instalación <strong>⊕</strong> o pantalla con flecha en el extremo derecho de la barra de direcciones (URL), o abre el menú ⋮ ➔ <strong>&quot;Instalar DECE&quot;</strong>.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                    <span className="font-bold bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 px-2 py-0.5 rounded border border-slate-300 dark:border-slate-600 text-[11px]">📱</span>
                    <div>
                      <strong>En Android:</strong>
                      <p className="text-slate-600 dark:text-slate-300 mt-0.5">
                        Toca el menú de tres puntos (⋮) en la esquina superior de Chrome y selecciona <strong>&quot;Instalar aplicación&quot;</strong> o <strong>&quot;Agregar a pantalla principal&quot;</strong>.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end mt-4 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="btn-primary text-xs px-4 py-2"
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

