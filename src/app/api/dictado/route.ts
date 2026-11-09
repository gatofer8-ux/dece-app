import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { GoogleGenAI } from "@google/genai";
import { filterWhisperSegments, hasKnownHallucination, processDictationPunctuation } from "@/lib/dictation";

export const maxDuration = 30;

// Pista para Whisper: SOLO vocabulario, sin instrucciones ni listas de títulos.
// Whisper trata la pista como texto previo de la conversación: si es una orden
// ("Dictado formal en español...") o una lista de abreviaturas ("Lcda., Mgtr."),
// con audio vacío o ruidoso la repite en bucle en vez de transcribir.
const WHISPER_PROMPT =
  "Consejería estudiantil, acompañamiento psicosocial, representante legal, junta de curso, acta de reunión.";

// Contexto del dominio DECE (Ecuador) para el respaldo con Gemini, que sí entiende instrucciones.
const DECE_DOMAIN_HINT =
  "Departamento de Consejería Estudiantil (DECE), Ministerio de Educación del Ecuador. " +
  "Vocabulario frecuente: acompañamiento psicosocial, riesgo psicosocial, vulneración de derechos, " +
  "violencia intrafamiliar, violencia escolar, acoso escolar, embarazo adolescente, consumo de sustancias, " +
  "salud mental, junta de curso, acta de reunión, ficha de notificación de alerta, plan de acción, " +
  "representante legal, tutor, paralelo, jornada matutina, jornada vespertina, año lectivo. " +
  "Tratamientos y títulos comunes: Lcda., Lcdo., Mgtr., Psc., Ing., Dra., Dr. Nombres propios en español ecuatoriano.";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sesión no válida o expirada." }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch (err: any) {
    return NextResponse.json({ error: "Cuerpo de solicitud inválido." }, { status: 400 });
  }

  const audioFile = formData.get("audio") as File | Blob | null;
  if (!audioFile || typeof audioFile !== "object" || !("size" in audioFile) || audioFile.size === 0) {
    return NextResponse.json({ error: "No se recibió archivo de audio válido." }, { status: 400 });
  }

  const arrayBuffer = await audioFile.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const mimeType = audioFile.type || "audio/webm";

  let transcription = "";
  let groqAnswered = false;

  // 1. Intentar Groq Whisper si GROQ_API_KEY está configurada (velocidad <400ms)
  const groqApiKey = process.env.GROQ_API_KEY?.trim();
  if (groqApiKey) {
    try {
      const ext = mimeType.includes("mp4") ? "mp4" : mimeType.includes("ogg") ? "ogg" : mimeType.includes("wav") ? "wav" : "webm";
      const blob = new Blob([buffer], { type: mimeType });
      const groqBody = new FormData();
      groqBody.append("file", blob, `audio.${ext}`);
      groqBody.append("model", "whisper-large-v3-turbo");
      groqBody.append("language", "es");
      groqBody.append("temperature", "0.0");
      groqBody.append("response_format", "verbose_json"); // trae no_speech_prob y avg_logprob por segmento
      groqBody.append("prompt", WHISPER_PROMPT);

      const groqRes = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${groqApiKey}`,
        },
        body: groqBody,
      });

      if (groqRes.ok) {
        const groqData = (await groqRes.json()) as any;
        groqAnswered = true;
        // Descarta silencio, bucles repetitivos y texto inventado (p. ej. la propia pista).
        transcription = filterWhisperSegments(groqData ?? {}, WHISPER_PROMPT);
      } else {
        const errText = await groqRes.text().catch(() => "");
        console.warn("[dictado] Groq Whisper error:", errText);
      }
    } catch (err: any) {
      console.warn("[dictado] Falló llamada a Groq Whisper:", err?.message || err);
    }
  }

  // Si Groq respondió pero no halló voz real, es silencio: no se insiste con Gemini (inventaría texto).
  if (groqAnswered && !transcription) {
    return NextResponse.json({ text: "", rawText: "", noSpeech: true });
  }

  // 2. Si Groq no está disponible o falló, intentar con Gemini (multimodal audio)
  if (!transcription) {
    const geminiApiKey = process.env.GEMINI_API_KEY?.trim();
    if (geminiApiKey) {
      const keys = geminiApiKey.split(",").map((k) => k.trim()).filter(Boolean);
      if (keys.length > 0) {
        const client = new GoogleGenAI({ apiKey: keys[0] });
        const base64Audio = buffer.toString("base64");

        const modelsToTry = [
          "gemini-2.5-flash",
          "gemini-1.5-flash",
          "gemini-2.0-flash",
          "gemini-2.5-flash-lite",
        ];

        for (const model of modelsToTry) {
          try {
            const response = await client.models.generateContent({
              model,
              contents: [
                {
                  inlineData: {
                    mimeType,
                    data: base64Audio,
                  },
                },
                {
                  text:
                    "Transcribe con máxima fidelidad todo lo dicho en este audio en español ecuatoriano. " +
                    `Contexto del dominio: ${DECE_DOMAIN_HINT} ` +
                    "Aplica ortografía correcta y puntuación adecuada. " +
                    "Devuelve ÚNICAMENTE el texto dictado transcrito, sin añadir explicaciones, sin comillas envolventes ni notas introductorias.",
                },
              ],
            });

            const text = response.text?.trim();
            if (text && hasKnownHallucination(text)) {
              return NextResponse.json({ text: "", rawText: "", noSpeech: true });
            }
            if (text) {
              transcription = text;
              break;
            }
          } catch (geminiErr: any) {
            console.warn(`[dictado] Gemini ${model} falló:`, geminiErr?.message || geminiErr);
          }
        }
      }
    }
  }

  if (!transcription) {
    return NextResponse.json(
      {
        error:
          "No fue posible transcribir el audio en este momento. Verifica tu conexión de red o la configuración del servicio de IA.",
      },
      { status: 502 }
    );
  }

  // Normalizar puntuación y comandos por si el usuario pronunció "punto y aparte", "coma", etc.
  const finalText = processDictationPunctuation(transcription);

  return NextResponse.json({
    text: finalText,
    rawText: transcription,
  });
}
