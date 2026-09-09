"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Botón de dictado por voz para campos de texto (textarea o input).
 * Compatible con Web Speech API (Chrome, Edge, Safari, Opera, navegadores móviles).
 * Gestiona permisos de micrófono, retroalimentación visual en tiempo real
 * y sincronización con el estado de React.
 */
export default function VoiceDictationButton({
  targetId,
  lang = "es-EC",
  onResult,
  compact = false,
}: {
  targetId: string;
  lang?: string;
  onResult?: (text: string) => void;
  compact?: boolean;
}) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const isManuallyStoppedRef = useRef(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognitionCtor =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition ||
        (window as any).mozSpeechRecognition ||
        (window as any).msSpeechRecognition;

      if (!SpeechRecognitionCtor) {
        setSupported(false);
      }
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
        recognitionRef.current = null;
      }
    };
  }, []);

  function setNativeValue(element: HTMLTextAreaElement | HTMLInputElement, value: string) {
    const prototype = element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const valueSetter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
    if (valueSetter) {
      valueSetter.call(element, value);
    } else {
      element.value = value;
    }
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function getTargetElement(): HTMLTextAreaElement | HTMLInputElement | null {
    let target = document.getElementById(targetId) as HTMLTextAreaElement | HTMLInputElement | null;
    if (!target) {
      target = document.querySelector(`[name="${targetId}"]`) as HTMLTextAreaElement | HTMLInputElement | null;
    }
    return target;
  }

  function processPunctuation(text: string): string {
    return text
      .replace(/\bpunto y aparte\b/gi, ".\n\n")
      .replace(/\bpunto seguido\b/gi, ". ")
      .replace(/\bpunto y coma\b/gi, "; ")
      .replace(/\bdos puntos\b/gi, ": ")
      .replace(/\bcoma\b/gi, ", ")
      .replace(/\bpunto final\b/gi, ".")
      .replace(/\bpunto\b/gi, ".")
      .replace(/\s+/g, " ")
      .trim();
  }

  function startRecognition() {
    setErrorMessage(null);
    isManuallyStoppedRef.current = false;

    const SpeechRecognitionCtor =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition ||
      (window as any).mozSpeechRecognition ||
      (window as any).msSpeechRecognition;

    if (!SpeechRecognitionCtor) {
      setSupported(false);
      alert("Tu navegador no soporta el reconocimiento de voz por Web Speech API. Te recomendamos usar Google Chrome o Microsoft Edge.");
      return;
    }

    // Verificar contexto seguro (HTTPS o localhost)
    if (typeof window !== "undefined" && !window.isSecureContext && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
      alert("El micrófono requiere una conexión segura HTTPS. Por favor accede mediante el enlace seguro https://...");
      return;
    }

    try {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }

      const recognition = new SpeechRecognitionCtor();
      recognition.lang = lang;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setListening(true);
        setErrorMessage(null);
      };

      recognition.onresult = (event: any) => {
        const target = getTargetElement();
        if (!target) return;

        let finalTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            finalTranscript += result[0].transcript + " ";
          }
        }

        if (finalTranscript) {
          const cleanedText = processPunctuation(finalTranscript);
          const currentValue = target.value || "";
          const needsSpace = currentValue.length > 0 && !/[\s\n]$/.test(currentValue);
          const newValue = currentValue + (needsSpace ? " " : "") + cleanedText + " ";

          setNativeValue(target, newValue);
          target.focus();
          if (onResult) {
            onResult(newValue);
          }
        }
      };

      recognition.onerror = (event: any) => {
        console.warn("Speech recognition error:", event.error);
        if (event.error === "no-speech") {
          // No hacer nada si solo fue silencio momentáneo
          return;
        }

        if (event.error === "not-allowed" || event.error === "service-not-allowed") {
          setErrorMessage("Permiso denegado");
          alert("Acceso al micrófono denegado. Por favor haz clic en el ícono de candado/ajustes de la barra de direcciones de tu navegador y permite el uso del micrófono.");
        } else if (event.error === "network") {
          setErrorMessage("Error de red");
        } else {
          setErrorMessage(`Error: ${event.error}`);
        }

        setListening(false);
        recognitionRef.current = null;
      };

      recognition.onend = () => {
        // Si no se detuvo manualmente y sigue en modo escucha, intentar reiniciar si es posible
        if (!isManuallyStoppedRef.current && listening) {
          try {
            recognition.start();
            return;
          } catch {
            // ignore
          }
        }
        setListening(false);
        recognitionRef.current = null;
      };

      recognitionRef.current = recognition;
      recognition.start();
      setListening(true);
    } catch (err: any) {
      console.error("Error starting speech recognition:", err);
      setListening(false);
      recognitionRef.current = null;
      setErrorMessage("No se pudo iniciar");
    }
  }

  function stopRecognition() {
    isManuallyStoppedRef.current = true;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }
    setListening(false);
  }

  function toggle() {
    if (listening) {
      stopRecognition();
    } else {
      startRecognition();
    }
  }

  if (!supported) {
    return (
      <button
        type="button"
        disabled
        className="inline-flex items-center gap-1 text-xs rounded-full px-2 py-0.5 border border-slate-200 text-slate-400 cursor-not-allowed"
        title="Dictado por voz no soportado en este navegador. Usa Chrome o Edge."
      >
        <span aria-hidden>🎤</span> No disponible
      </button>
    );
  }

  return (
    <div className="inline-flex items-center gap-1">
      <button
        type="button"
        onClick={toggle}
        className={`inline-flex items-center gap-1.5 rounded-full font-medium border transition-all duration-200 shadow-sm ${
          compact ? "text-[11px] px-2 py-0.5" : "text-xs px-2.5 py-1"
        } ${
          listening
            ? "bg-red-600 border-red-700 text-white animate-pulse"
            : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-slate-400 active:bg-slate-100"
        }`}
        title={listening ? "Detener dictado por voz" : "Dictar por voz con micrófono"}
      >
        {listening ? (
          <>
            <span className="h-2 w-2 rounded-full bg-white animate-ping" />
            <span>Escuchando…</span>
          </>
        ) : (
          <>
            <span aria-hidden>🎤</span>
            <span>Dictar</span>
          </>
        )}
      </button>
      {errorMessage && (
        <span className="text-[10px] text-red-600 bg-red-50 border border-red-200 rounded px-1.5 py-0.5">
          {errorMessage}
        </span>
      )}
    </div>
  );
}
