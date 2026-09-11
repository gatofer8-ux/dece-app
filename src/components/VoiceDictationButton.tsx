"use client";

import { useEffect, useRef, useState } from "react";
import { processDictationPunctuation } from "@/lib/dictation";

/**
 * Botón universal de dictado por voz para campos de texto (textarea o input).
 * Compatible con TODOS los navegadores (Chrome, Safari iOS/macOS, Firefox, Edge, Opera, Brave).
 *
 * Arquitectura híbrida dual:
 * 1. Modo Web Speech API (En vivo): Transcripción en tiempo real en navegadores con soporte nativo
 *    (Chrome, Edge, Safari), con corrección de ciclo de vida, soporte específico para WebKit en Safari
 *    (cadena de enunciados sin bloqueos) y normalización de comandos de puntuación ("punto y aparte", etc.).
 * 2. Modo Grabación de Audio con IA (Universal): Utiliza MediaRecorder estándar (100% de navegadores,
 *    incluyendo Firefox y Safari) y transcribe mediante Whisper / Gemini a través de /api/dictado.
 *    Se activa automáticamente si Web Speech API no está disponible o falla por restricciones de red/dispositivo.
 */

type DictationMode = "webspeech" | "audio-record";
type DictationState = "idle" | "listening-live" | "recording-audio" | "transcribing";

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
  const [state, setState] = useState<DictationState>("idle");
  const [hasWebSpeech, setHasWebSpeech] = useState(false);
  const [hasMediaRecorder, setHasMediaRecorder] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeEngineLabel, setActiveEngineLabel] = useState<string>("");

  // Referencias para ciclo de vida de Web Speech
  const recognitionRef = useRef<any>(null);
  const isManuallyStoppedRef = useRef(false);
  const consecutiveErrorsRef = useRef(0);
  const restartTimerRef = useRef<any>(null);

  // Referencias para MediaRecorder
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordIntervalRef = useRef<any>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Detección inicial de capacidades del navegador
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognitionCtor =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition ||
        (window as any).mozSpeechRecognition ||
        (window as any).msSpeechRecognition;

      const speechAvailable = !!SpeechRecognitionCtor;
      const mediaAvailable =
        typeof navigator !== "undefined" &&
        !!navigator.mediaDevices &&
        typeof navigator.mediaDevices.getUserMedia === "function" &&
        typeof window.MediaRecorder !== "undefined";

      setHasWebSpeech(speechAvailable);
      setHasMediaRecorder(mediaAvailable);
    }

    return () => {
      cleanupAll();
    };
  }, []);

  function cleanupAll() {
    isManuallyStoppedRef.current = true;

    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }

    if (recordIntervalRef.current) {
      clearInterval(recordIntervalRef.current);
      recordIntervalRef.current = null;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // ignore
      }
      mediaRecorderRef.current = null;
    }

    if (mediaStreamRef.current) {
      try {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      } catch {
        // ignore
      }
      mediaStreamRef.current = null;
    }
  }

  function getTargetElement(): HTMLTextAreaElement | HTMLInputElement | null {
    let target = document.getElementById(targetId) as HTMLTextAreaElement | HTMLInputElement | null;
    if (!target) {
      target = document.querySelector(`[name="${targetId}"]`) as HTMLTextAreaElement | HTMLInputElement | null;
    }
    if (!target) {
      target = document.querySelector(`[id$="${targetId}"]`) as HTMLTextAreaElement | HTMLInputElement | null;
    }
    if (!target) {
      target = document.querySelector(`[name$="${targetId}"]`) as HTMLTextAreaElement | HTMLInputElement | null;
    }
    return target;
  }

  function appendTextToTarget(rawText: string) {
    const cleanedText = processDictationPunctuation(rawText);
    if (!cleanedText) return;

    const target = getTargetElement();
    if (target) {
      const prototype =
        target instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      const valueSetter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;

      const currentValue = target.value || "";
      const needsSpace = currentValue.length > 0 && !/[\s\n]$/.test(currentValue);
      const isStartOfParagraph = /[\n]$/.test(currentValue);

      // Si empieza en nuevo renglón o tras punto, capitalizar primera letra
      let textToInsert = cleanedText;
      if ((isStartOfParagraph || currentValue.length === 0) && textToInsert.length > 0) {
        textToInsert = textToInsert.charAt(0).toUpperCase() + textToInsert.slice(1);
      }

      const newValue = currentValue + (needsSpace ? " " : "") + textToInsert + " ";

      if (valueSetter) {
        valueSetter.call(target, newValue);
      } else {
        target.value = newValue;
      }

      target.dispatchEvent(new Event("input", { bubbles: true }));
      target.dispatchEvent(new Event("change", { bubbles: true }));
      target.focus();

      if (onResult) {
        onResult(newValue);
      }
    } else if (onResult) {
      onResult(cleanedText);
    }
  }

  // Detectar si el navegador es Safari / WebKit
  function isSafariBrowser(): boolean {
    if (typeof navigator === "undefined") return false;
    const ua = navigator.userAgent;
    const isSafari = /^((?!chrome|android).)*safari/i.test(ua);
    const isIOS = /iPad|iPhone|iPod/.test(ua);
    return isSafari || isIOS;
  }

  // Iniciar reconocimiento Web Speech API
  async function startWebSpeech() {
    const SpeechRecognitionCtor =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition ||
      (window as any).mozSpeechRecognition ||
      (window as any).msSpeechRecognition;

    if (!SpeechRecognitionCtor) {
      // Fallback automático a modo audio
      startAudioRecording();
      return;
    }

    setErrorMessage(null);
    isManuallyStoppedRef.current = false;
    setActiveEngineLabel("En vivo");

    // En Safari o navegadores que lo requieran, pre-inicializar micrófono para desbloquear WebAudio
    if (isSafariBrowser() && navigator.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Liberar inmediatamente el stream de comprobación para no bloquear el micrófono
        stream.getTracks().forEach((t) => t.stop());
      } catch (err: any) {
        if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
          setErrorMessage("Permiso denegado");
          alert("Permiso de micrófono denegado. Por favor permite el acceso al micrófono en la barra de direcciones o ajustes de tu navegador.");
          setState("idle");
          return;
        }
      }
    }

    function createAndStart() {
      if (isManuallyStoppedRef.current) return;

      try {
        const recognition = new SpeechRecognitionCtor();
        recognition.lang = lang;
        // En Safari, continuous: true genera bloqueos; en Chrome continuous: true funciona bien
        recognition.continuous = !isSafariBrowser();
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
          setState("listening-live");
          setErrorMessage(null);
          consecutiveErrorsRef.current = 0;
        };

        recognition.onresult = (event: any) => {
          let chunk = "";
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const res = event.results[i];
            if (res.isFinal && res[0]?.transcript) {
              chunk += res[0].transcript + " ";
            }
          }

          if (chunk.trim()) {
            appendTextToTarget(chunk);
          }
        };

        recognition.onerror = (event: any) => {
          const errType = event.error;
          console.warn("[VoiceDictation] WebSpeech error:", errType);

          if (errType === "no-speech") {
            // Silencio momentáneo, no es un error real
            return;
          }

          consecutiveErrorsRef.current++;

          if (errType === "not-allowed" || errType === "service-not-allowed") {
            if (consecutiveErrorsRef.current >= 2) {
              setErrorMessage("Permiso denegado");
              stopAll();
              // Intentar modo audio que usa getUserMedia estándar
              startAudioRecording();
              return;
            }
          } else if (errType === "network") {
            // En redes donde los servidores de voz de Google están bloqueados, pasar a audio IA automáticamente
            console.info("[VoiceDictation] Servidor de voz bloqueado por red; cambiando a modo grabación de audio...");
            stopAll();
            startAudioRecording();
            return;
          } else if (consecutiveErrorsRef.current > 3) {
            setErrorMessage("Error de dictado");
            stopAll();
            return;
          }
        };

        recognition.onend = () => {
          recognitionRef.current = null;

          // Si el usuario no presionó detener, reiniciar con una instancia nueva (imprescindible en Safari y Chrome)
          if (!isManuallyStoppedRef.current) {
            restartTimerRef.current = setTimeout(() => {
              if (!isManuallyStoppedRef.current) {
                createAndStart();
              }
            }, 120);
          } else {
            setState("idle");
          }
        };

        recognitionRef.current = recognition;
        recognition.start();
        setState("listening-live");
      } catch (err: any) {
        console.warn("[VoiceDictation] No se pudo instanciar WebSpeech:", err);
        // Fallback a grabación de audio
        stopAll();
        startAudioRecording();
      }
    }

    createAndStart();
  }

  // Iniciar grabación de audio con MediaRecorder (compatible con Firefox, Safari y cualquier red)
  async function startAudioRecording() {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setErrorMessage("No soportado");
      alert("Tu navegador no soporta captura de micrófono. Te recomendamos actualizar tu navegador.");
      setState("idle");
      return;
    }

    setErrorMessage(null);
    isManuallyStoppedRef.current = false;
    audioChunksRef.current = [];
    setRecordSeconds(0);
    setActiveEngineLabel("Audio IA");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      mediaStreamRef.current = stream;

      // Seleccionar el formato de audio mejor soportado por el navegador
      let mimeType = "";
      const candidates = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/mp4",
        "audio/aac",
        "audio/ogg;codecs=opus",
        "audio/ogg",
        "audio/wav",
      ];
      for (const c of candidates) {
        if (MediaRecorder.isTypeSupported(c)) {
          mimeType = c;
          break;
        }
      }

      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        // Detener pistas de micrófono
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach((t) => t.stop());
          mediaStreamRef.current = null;
        }

        if (audioChunksRef.current.length === 0) {
          setState("idle");
          return;
        }

        const audioBlob = new Blob(audioChunksRef.current, {
          type: recorder.mimeType || mimeType || "audio/webm",
        });

        // Enviar audio al servidor para transcripción
        setState("transcribing");

        try {
          const fd = new FormData();
          fd.append("audio", audioBlob, "dictado.webm");
          fd.append("lang", lang);

          const res = await fetch("/api/dictado", {
            method: "POST",
            body: fd,
          });

          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData?.error || `Error en el servidor (${res.status})`);
          }

          const data = await res.json();
          if (data.text) {
            appendTextToTarget(data.text);
          } else {
            setErrorMessage("Sin voz detectada");
          }
        } catch (postErr: any) {
          console.warn("[VoiceDictation] Error en transcripción:", postErr);
          setErrorMessage(postErr.message || "Error al transcribir");
        } finally {
          setState("idle");
          setRecordSeconds(0);
        }
      };

      recorder.start(250); // Emitir chunks cada 250ms
      setState("recording-audio");

      // Temporizador de duración de grabación
      const startMs = Date.now();
      recordIntervalRef.current = setInterval(() => {
        const secs = Math.floor((Date.now() - startMs) / 1000);
        setRecordSeconds(secs);
        // Límite de seguridad: 2 minutos por intervención
        if (secs >= 120) {
          stopAll();
        }
      }, 1000);
    } catch (err: any) {
      console.warn("[VoiceDictation] Error al acceder al micrófono:", err);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setErrorMessage("Permiso denegado");
        alert("Acceso al micrófono denegado. Permite el uso del micrófono en la barra de navegación para poder dictar.");
      } else {
        setErrorMessage("Micrófono no disponible");
      }
      setState("idle");
    }
  }

  function stopAll() {
    isManuallyStoppedRef.current = true;

    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }

    if (recordIntervalRef.current) {
      clearInterval(recordIntervalRef.current);
      recordIntervalRef.current = null;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // ignore
      }
      mediaRecorderRef.current = null;
    }

    if (state !== "recording-audio") {
      setState("idle");
    }
  }

  function handleButtonClick() {
    if (state === "listening-live" || state === "recording-audio") {
      stopAll();
    } else if (state === "transcribing") {
      // Bloqueado mientras transcribe
      return;
    } else {
      // Si tiene Web Speech API disponible, comenzar en vivo; si no (ej. Firefox), comenzar directamente con audio IA
      if (hasWebSpeech) {
        startWebSpeech();
      } else {
        startAudioRecording();
      }
    }
  }

  // Si ni Web Speech ni MediaRecorder están disponibles (navegadores obsoletos)
  if (!hasWebSpeech && !hasMediaRecorder) {
    return (
      <button
        type="button"
        disabled
        className="inline-flex items-center gap-1 text-xs rounded-full px-2 py-0.5 border border-slate-200 text-slate-400 cursor-not-allowed"
        title="Dictado por voz no soportado en este navegador. Te sugerimos actualizarlo a una versión reciente."
      >
        <span aria-hidden>🎤</span> No disponible
      </button>
    );
  }

  const isListening = state === "listening-live";
  const isRecording = state === "recording-audio";
  const isTranscribing = state === "transcribing";

  // Formato mm:ss para tiempo de grabación
  const formatTimer = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  return (
    <div className="inline-flex items-center gap-1.5" role="group" aria-label="Dictado por voz">
      <button
        type="button"
        onClick={handleButtonClick}
        disabled={isTranscribing}
        className={`inline-flex items-center gap-1.5 rounded-full font-medium border transition-all duration-200 shadow-sm ${
          compact ? "text-[11px] px-2 py-0.5" : "text-xs px-2.5 py-1"
        } ${
          isListening || isRecording
            ? "bg-red-600 border-red-700 text-white animate-pulse"
            : isTranscribing
            ? "bg-amber-500 border-amber-600 text-white cursor-wait"
            : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-slate-400 active:bg-slate-100"
        }`}
        title={
          isListening || isRecording
            ? "Detener y aplicar texto dictado"
            : isTranscribing
            ? "Transcribiendo dictado..."
            : "Dictar por voz (compatible con Chrome, Safari, Firefox y móviles)"
        }
      >
        {isListening ? (
          <>
            <span className="h-2 w-2 rounded-full bg-white animate-ping" />
            <span>Escuchando…</span>
          </>
        ) : isRecording ? (
          <>
            <span className="h-2 w-2 rounded-full bg-white animate-ping" />
            <span>Grabando ({formatTimer(recordSeconds)}) · Clic para terminar</span>
          </>
        ) : isTranscribing ? (
          <>
            <span className="inline-block animate-spin">⏳</span>
            <span>Transcribiendo…</span>
          </>
        ) : (
          <>
            <span aria-hidden>🎤</span>
            <span>Dictar</span>
          </>
        )}
      </button>

      {/* Si el usuario está usando Firefox o si la red forzó modo Audio IA, se indica sutilmente */}
      {isRecording && (
        <span className="text-[10px] text-red-600 bg-red-50 border border-red-200 rounded-full px-2 py-0.5 animate-pulse">
          Modo Audio IA
        </span>
      )}

      {errorMessage && (
        <span
          className="text-[10px] text-red-600 bg-red-50 border border-red-200 rounded px-1.5 py-0.5 cursor-pointer"
          onClick={() => setErrorMessage(null)}
          title="Haz clic para descartar"
        >
          {errorMessage} ✕
        </span>
      )}
    </div>
  );
}
