import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { GoogleGenAI } from "@google/genai";
import { processDictationPunctuation } from "@/lib/dictation";

export const maxDuration = 30;

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
      groqBody.append(
        "prompt",
        "Dictado formal en español para el Departamento de Consejería Estudiantil (DECE), Ecuador. Respeta signos de puntuación, mayúsculas, nombres propios y redacción técnica educativa."
      );

      const groqRes = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${groqApiKey}`,
        },
        body: groqBody,
      });

      if (groqRes.ok) {
        const groqData = (await groqRes.json()) as any;
        if (groqData?.text && typeof groqData.text === "string" && groqData.text.trim()) {
          transcription = groqData.text.trim();
        }
      } else {
        const errText = await groqRes.text().catch(() => "");
        console.warn("[dictado] Groq Whisper error:", errText);
      }
    } catch (err: any) {
      console.warn("[dictado] Falló llamada a Groq Whisper:", err?.message || err);
    }
  }

  // 2. Si no se obtuvo con Groq, intentar con Gemini (multimodal audio)
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
                    "Aplica ortografía correcta y puntuación adecuada en el contexto educativo y psicológico institucional (DECE Ecuador). " +
                    "Devuelve ÚNICAMENTE el texto dictado transcrito, sin añadir explicaciones, sin comillas envolventes ni notas introductorias.",
                },
              ],
            });

            const text = response.text?.trim();
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
