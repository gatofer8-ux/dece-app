"use client";

import { useState, useEffect } from "react";

export function CopyLink({ path }: { path: string }) {
  const [url, setUrl] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setUrl(window.location.origin + path);
  }, [path]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  if (!url) return <div className="text-xs text-slate-400">Cargando enlace...</div>;

  return (
    <div className="flex items-center gap-2">
      <code className="text-xs text-slate-600 select-all overflow-hidden text-ellipsis whitespace-nowrap max-w-[200px] sm:max-w-[300px]">
        {url}
      </code>
      <button 
        onClick={handleCopy}
        className="px-2 py-1 text-xs bg-emerald-600 text-white rounded hover:bg-emerald-700 transition-colors"
      >
        {copied ? "\u00A1Copiado!" : "Copiar"}
      </button>
    </div>
  );
}
