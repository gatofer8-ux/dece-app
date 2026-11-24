"use client";

import { useEffect, useState } from "react";

/** Lee un texto en voz alta con la voz del dispositivo (Inicial y Básica). Si no hay voz, no se muestra. */
export default function ReadAloudButton({ text, label = "Escuchar", className = "" }: { text: string; label?: string; className?: string }) {
  const [supported, setSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    setSupported(typeof window !== "undefined" && "speechSynthesis" in window);
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    };
  }, []);

  if (!supported) return null;

  function toggle() {
    const synth = window.speechSynthesis;
    if (speaking) {
      synth.cancel();
      setSpeaking(false);
      return;
    }
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "es-EC";
    const voice = synth.getVoices().find((v) => v.lang.toLowerCase().startsWith("es"));
    if (voice) u.voice = voice;
    u.rate = 0.9;
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    setSpeaking(true);
    synth.speak(u);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`${label}: ${text}`}
      className={`inline-flex items-center gap-1.5 rounded-full border border-sky-300 bg-sky-50 px-3 py-1.5 text-sm font-semibold text-sky-800 ${className}`}
    >
      <span className="text-lg leading-none">{speaking ? "⏹️" : "🔊"}</span>
      {speaking ? "Parar" : label}
    </button>
  );
}
