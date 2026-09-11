"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getPendingOutboxCount, getOutboxItems, type OutboxItem } from "@/lib/offline/db";
import { syncOutboxToServer } from "@/lib/offline/syncEngine";

export default function NetworkStatusBanner() {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [outboxList, setOutboxList] = useState<OutboxItem[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Registrar Service Worker para caché PWA si está soportado
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch((err) => {
        console.warn("[PWA] Error registrando service worker:", err);
      });
    }

    setIsOnline(navigator.onLine);

    async function refreshPending() {
      const count = await getPendingOutboxCount();
      setPendingCount(count);
    }

    refreshPending();

    const handleOnline = async () => {
      setIsOnline(true);
      setSyncFeedback("Conexión restaurada.");
      setTimeout(() => setSyncFeedback(null), 3000);
      const count = await getPendingOutboxCount();
      setPendingCount(count);

      // Auto-sincronizar si hay elementos pendientes al recuperar internet
      if (count > 0) {
        handleSync();
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      refreshPending();
    };

    const handleOutboxUpdate = () => {
      refreshPending();
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("dece:outbox-updated", handleOutboxUpdate);
    window.addEventListener("dece:sync-completed", handleOutboxUpdate);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("dece:outbox-updated", handleOutboxUpdate);
      window.removeEventListener("dece:sync-completed", handleOutboxUpdate);
    };
  }, []);

  async function handleSync() {
    if (isSyncing || !navigator.onLine) return;
    setIsSyncing(true);
    setSyncFeedback("Sincronizando con el servidor...");

    try {
      const res = await syncOutboxToServer();
      if (res.synced > 0) {
        setSyncFeedback(`✓ Sincronizado(s) ${res.synced} registro(s) con éxito.`);
      } else if (res.errors.length > 0) {
        setSyncFeedback(`⚠️ No se pudo sincronizar: ${res.errors[0]}`);
      } else {
        setSyncFeedback("Todo al día.");
      }
      const count = await getPendingOutboxCount();
      setPendingCount(count);
    } catch {
      setSyncFeedback("Error de red al sincronizar.");
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncFeedback(null), 4000);
    }
  }

  async function openPendingModal() {
    const items = await getOutboxItems();
    setOutboxList(items);
    setShowModal(true);
  }

  // Si está online y no hay pendientes ni mensaje de feedback, mostrar indicador sutil en el header
  if (isOnline && pendingCount === 0 && !syncFeedback) {
    return null;
  }

  return (
    <>
      <div
        className={`w-full text-xs py-1.5 px-4 transition-colors duration-200 border-b flex flex-wrap items-center justify-between gap-2 shadow-sm z-40 ${
          !isOnline
            ? "bg-amber-500 text-amber-950 border-amber-600"
            : pendingCount > 0
            ? "bg-indigo-600 text-white border-indigo-700"
            : "bg-emerald-600 text-white border-emerald-700"
        }`}
      >
        <div className="flex items-center gap-2 font-medium">
          {!isOnline ? (
            <>
              <span className="inline-block h-2 w-2 rounded-full bg-amber-200 animate-ping" />
              <span>📡 <strong>Modo Sin Conexión</strong> — Operando con almacenamiento local.</span>
            </>
          ) : isSyncing ? (
            <>
              <span className="inline-block animate-spin">🔄</span>
              <span>Sincronizando {pendingCount} registro(s) con el servidor...</span>
            </>
          ) : syncFeedback ? (
            <span>{syncFeedback}</span>
          ) : (
            <>
              <span>🟢 En línea</span>
              <span>· {pendingCount} registro(s) pendientes de subir.</span>
            </>
          )}

          {pendingCount > 0 && (
            <button
              type="button"
              onClick={openPendingModal}
              className="underline font-semibold hover:opacity-80 ml-1"
            >
              ({pendingCount} en cola)
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/offline"
            className={`px-2 py-0.5 rounded font-semibold transition ${
              !isOnline
                ? "bg-amber-950 text-white hover:bg-black"
                : "bg-white/20 text-white hover:bg-white/30"
            }`}
          >
            📋 Centro Offline
          </Link>

          {isOnline && pendingCount > 0 && (
            <button
              type="button"
              onClick={handleSync}
              disabled={isSyncing}
              className="bg-white text-indigo-900 px-2.5 py-0.5 rounded font-semibold hover:bg-indigo-50 active:bg-indigo-100 disabled:opacity-50 transition shadow-xs flex items-center gap-1"
            >
              {isSyncing ? "Sincronizando..." : "Sincronizar ahora 🔄"}
            </button>
          )}
        </div>
      </div>

      {/* Modal de visualización de registros pendientes */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-5 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Registros pendientes de sincronizar</h3>
                <p className="text-xs text-slate-500">Guardados localmente en tu dispositivo</p>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg p-1"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto space-y-2 flex-1 pr-1 text-xs">
              {outboxList.length === 0 ? (
                <div className="text-center py-6 text-slate-400">No hay registros pendientes.</div>
              ) : (
                outboxList.map((item) => (
                  <div key={item.id} className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 flex items-start justify-between gap-2">
                    <div>
                      <div className="font-semibold text-slate-800">{item.summary}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Tipo: {item.action} · {new Date(item.createdAt).toLocaleTimeString("es-EC")}
                      </div>
                      {item.errorMessage && (
                        <div className="text-[11px] text-rose-600 mt-1 font-medium">⚠️ {item.errorMessage}</div>
                      )}
                    </div>
                    <span
                      className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded shrink-0 ${
                        item.status === "pending"
                          ? "bg-amber-100 text-amber-800"
                          : item.status === "syncing"
                          ? "bg-blue-100 text-blue-800 animate-pulse"
                          : "bg-rose-100 text-rose-800"
                      }`}
                    >
                      {item.status === "pending" ? "Pendiente" : item.status === "syncing" ? "Sincronizando" : "Falló"}
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-between items-center pt-3 border-t">
              <span className="text-xs text-slate-500">{outboxList.length} registro(s)</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-secondary text-xs py-1 px-3"
                >
                  Cerrar
                </button>
                {isOnline && outboxList.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      handleSync();
                      setShowModal(false);
                    }}
                    className="btn-primary text-xs py-1 px-3"
                  >
                    Sincronizar ahora
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
