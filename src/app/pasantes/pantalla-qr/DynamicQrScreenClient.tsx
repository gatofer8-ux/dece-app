"use client";

import { useState, useEffect } from "react";
import QRCode from "qrcode";
import Link from "next/link";

interface Props {
  institutionId: string;
  institutionName: string;
  institutionDistrict?: string;
  institutionSeal?: string | null;
  dailyCode?: string;
  hostUrl: string;
}

export default function DynamicQrScreenClient({
  institutionId,
  institutionName,
  institutionDistrict,
  institutionSeal,
  dailyCode,
  hostUrl,
}: Props) {
  const ROTATE_INTERVAL = 45; // Segundos para rotar el código QR
  const [timeLeft, setTimeLeft] = useState<number>(ROTATE_INTERVAL);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [currentTime, setCurrentTime] = useState<string>("");
  const [currentDate, setCurrentDate] = useState<string>("");
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [rotationCount, setRotationCount] = useState<number>(1);

  // Función para generar un nuevo QR rotativo dinámico
  const generateRotatingQr = async () => {
    try {
      const timestamp = Date.now();
      const randomNonce = Math.random().toString(36).substring(2, 8);
      const url = `${hostUrl}/pasantes/marcar?inst=${institutionId}&t=${timestamp}&n=${randomNonce}`;
      const dataUrl = await QRCode.toDataURL(url, {
        width: 360,
        margin: 2,
        color: {
          dark: "#0f172a",
          light: "#ffffff",
        },
      });
      setQrDataUrl(dataUrl);
      setTimeLeft(ROTATE_INTERVAL);
      setRotationCount((prev) => prev + 1);
    } catch (err) {
      console.error("Error generating dynamic QR:", err);
    }
  };

  // Reloj digital en vivo
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString("es-EC", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      });
      const dateStr = now.toLocaleDateString("es-EC", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
      setCurrentTime(timeStr);
      setCurrentDate(dateStr.charAt(0).toUpperCase() + dateStr.slice(1));
    };

    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Generación inicial y rotación cada 45 segundos
  useEffect(() => {
    generateRotatingQr();
    const countdown = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          generateRotatingQr();
          return ROTATE_INTERVAL;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(countdown);
  }, [institutionId]);

  // Manejar pantalla completa
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  const progressPercent = Math.round((timeLeft / ROTATE_INTERVAL) * 100);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-white flex flex-col justify-between p-4 sm:p-8 relative overflow-hidden select-none">
      {/* DECORACIONES DE FONDO */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* HEADER INSTITUCIONAL */}
      <header className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-white/10 pb-4 relative z-10">
        <div className="flex items-center gap-4 text-center sm:text-left">
          {institutionSeal ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={institutionSeal}
              alt="Sello Institucional"
              className="w-14 h-14 object-contain rounded-xl bg-white/5 p-1 border border-white/10 shadow-md"
            />
          ) : (
            <div className="w-14 h-14 rounded-xl bg-white/10 flex items-center justify-center text-2xl border border-white/10">
              🏛️
            </div>
          )}
          <div>
            <div className="text-[10px] font-bold tracking-widest text-indigo-300 uppercase">
              DEPARTAMENTO DE CONSEJERÍA ESTUDIANTIL (DECE)
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-tight">
              {institutionName}
            </h1>
            {institutionDistrict && (
              <p className="text-xs text-slate-400 font-medium">
                {institutionDistrict}
              </p>
            )}
          </div>
        </div>

        {/* CONTROLES Y ENLACES */}
        <div className="flex items-center gap-3">
          <Link
            href="/pasantes"
            className="px-3.5 py-1.5 bg-white/10 hover:bg-white/20 text-slate-200 text-xs font-semibold rounded-xl border border-white/10 transition-colors"
          >
            ← Volver al Panel
          </Link>
          <button
            type="button"
            onClick={toggleFullscreen}
            className="px-3.5 py-1.5 bg-indigo-600/60 hover:bg-indigo-600 text-white text-xs font-semibold rounded-xl border border-indigo-400/30 transition-colors flex items-center gap-1.5"
          >
            <span>⛶</span> {isFullscreen ? "Salir Pantalla Completa" : "Pantalla Completa"}
          </button>
        </div>
      </header>

      {/* ÁREA CENTRAL PRINCIPAL: QR DINÁMICO + RELOJ EN VIVO */}
      <main className="my-auto py-6 flex flex-col items-center justify-center relative z-10">
        <div className="w-full max-w-2xl bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl p-6 sm:p-10 shadow-2xl flex flex-col items-center text-center space-y-6">
          
          {/* TÍTULO Y BADGE DINÁMICO */}
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-400/30 uppercase tracking-wider mb-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Modo Pantalla Dinámico Anti-Fotos</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white">
              Escanea para Marcar tu Asistencia
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto mt-1">
              Acerca la cámara de tu celular registrado. El código se renueva automáticamente para impedir fotografías remotas.
            </p>
          </div>

          {/* TARJETA DEL CÓDIGO QR */}
          <div className="p-4 sm:p-6 bg-white rounded-3xl shadow-2xl inline-block border-4 border-indigo-400/40 relative">
            {qrDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={qrDataUrl}
                alt="QR Dinámico DECE"
                className="w-64 h-64 sm:w-72 sm:h-72 mx-auto rounded-xl"
              />
            ) : (
              <div className="w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center text-slate-400 text-xs">
                Generando QR Dinámico...
              </div>
            )}

            {/* BADGE CENTRAL DEL DECE */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white p-2 rounded-2xl shadow-lg border-2 border-indigo-900 pointer-events-none">
              <span className="text-2xl">🤝</span>
            </div>
          </div>

          {/* BARRA DE RENOVACIÓN DE 45 SEGUNDOS */}
          <div className="w-full max-w-md space-y-2">
            <div className="flex justify-between text-xs text-slate-300 font-medium">
              <span className="flex items-center gap-1.5">
                <span>⏱️</span> Código válido por:
              </span>
              <span className="font-mono font-bold text-emerald-400 text-sm">
                {timeLeft}s
              </span>
            </div>
            <div className="w-full h-2.5 bg-black/40 rounded-full overflow-hidden border border-white/10">
              <div
                className="h-full bg-gradient-to-r from-emerald-400 to-indigo-500 transition-all duration-1000 ease-linear"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-400">
              <span>Rotación #{rotationCount}</span>
              <button
                type="button"
                onClick={generateRotatingQr}
                className="text-indigo-300 hover:text-indigo-200 underline cursor-pointer"
              >
                Renovar ahora
              </button>
            </div>
          </div>

          {/* CÓDIGO DEL DÍA PARA EL DECE */}
          {dailyCode && (
            <div className="inline-flex items-center gap-2.5 px-4 py-2 bg-black/40 border border-white/10 rounded-2xl">
              <span className="text-xs text-slate-300">Código de Presencia Diario:</span>
              <span className="font-mono font-black text-emerald-400 text-sm">
                #{dailyCode}
              </span>
            </div>
          )}
        </div>
      </main>

      {/* FOOTER CON RELOJ OFICIAL EN TIEMPO REAL */}
      <footer className="border-t border-white/10 pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left relative z-10">
        <div>
          <div className="text-xs text-slate-400 font-medium">
            {currentDate || "Ecuador"}
          </div>
          <div className="text-2xl sm:text-3xl font-mono font-black text-white tracking-widest drop-shadow-sm">
            {currentTime || "--:--:--"}
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>Servidor Sincronizado con Hora Oficial de Ecuador (UTC-5)</span>
        </div>
      </footer>
    </div>
  );
}
