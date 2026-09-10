"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/Toast";

export default function PublicRequestLink({
  institutionId,
  serverIp,
}: {
  institutionId: string;
  serverIp?: string;
}) {
  const [networkUrl, setNetworkUrl] = useState("");
  const [localUrl, setLocalUrl] = useState("");
  const [copied, setCopied] = useState<"network" | "local" | null>(null);
  const toast = useToast();

  useEffect(() => {
    const port = window.location.port ? `:${window.location.port}` : "";
    const protocol = window.location.protocol;
    
    // URL de Red (para otros dispositivos / celulares / docentes en Wi-Fi)
    const ipHost = (window.location.hostname === "localhost" && serverIp && serverIp !== "localhost") ? serverIp : window.location.hostname;
    setNetworkUrl(`${protocol}//${ipHost}${port}/solicitar-cita`);

    // URL Local (para la misma computadora)
    setLocalUrl(`${window.location.origin}/solicitar-cita`);
  }, [institutionId, serverIp]);

  async function copyToClipboard(text: string, type: "network" | "local") {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      toast.success("Enlace copiado al portapapeles.");
      setTimeout(() => setCopied(null), 2500);
    } catch {
      toast.error("No se pudo copiar. Copia el enlace manualmente.");
    }
  }

  return (
    <div className="card p-4 mb-4 bg-gradient-to-r from-brand-50/50 via-white to-slate-50 border-brand-200 shadow-sm space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">📲</span>
          <span className="text-xs font-bold text-brand-900 uppercase tracking-wider">
            Enlace Público para Compartir (Padres, Docentes y Estudiantes)
          </span>
        </div>
        <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
          ● Listo para recibir solicitudes
        </span>
      </div>

      {/* Enlace para otros dispositivos (Wi-Fi / Red Local) */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-700 flex items-center gap-1.5">
            <span>🌐</span> Para celulares y otras computadoras en la red / Wi-Fi:
          </span>
          {copied === "network" && <span className="text-emerald-600 font-bold">✓ ¡Copiado al portapapeles!</span>}
        </div>
        <div className="flex gap-2">
          <input
            readOnly
            value={networkUrl}
            className="input text-xs font-mono font-bold text-brand-700 bg-white flex-1"
            onFocus={(e) => e.target.select()}
          />
          <button
            type="button"
            onClick={() => copyToClipboard(networkUrl, "network")}
            className="btn-primary text-xs whitespace-nowrap shadow-xs"
          >
            {copied === "network" ? "✓ Copiado" : "Copiar Enlace"}
          </button>
        </div>
      </div>

      <div className="text-[11px] text-slate-500 bg-white/80 p-2.5 rounded-lg border border-slate-200">
        💡 <strong>¿Por qué no usar <code>localhost</code> en otros dispositivos?</strong> La palabra <em>localhost</em> solo funciona en esta misma computadora. Para que un padre o docente abra el enlace desde su celular o computadora, deben usar el enlace de arriba con la IP de la institución (<strong>{networkUrl}</strong>).
      </div>
    </div>
  );
}
