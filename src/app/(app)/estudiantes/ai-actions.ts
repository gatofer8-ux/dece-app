"use server";

import { requireRole } from "@/lib/session";
import { GoogleGenAI } from "@google/genai";

const MODEL_FALLBACK_CHAIN = ["gemini-3.6-flash", "gemini-3.5-flash-lite", "gemini-3.1-flash-lite", "gemini-3.7-flash"];

let currentKeyIndex = 0;

function getClient(): GoogleGenAI | null {
  const apiKeyString = process.env.GEMINI_API_KEY;
  if (!apiKeyString) return null;
  const keys = apiKeyString.split(",").map(k => k.trim()).filter(Boolean);
  if (keys.length === 0) return null;
  const apiKey = keys[currentKeyIndex % keys.length];
  currentKeyIndex++;
  return new GoogleGenAI({ apiKey });
}

export async function scanExpedientePDF(base64Data: string) {
  await requireRole(["ADMIN", "DECE"]);
  
  const ai = getClient();
  if (!ai) {
    return { error: "La clave de la API de Gemini (GEMINI_API_KEY) no está configurada." };
  }

  const prompt = `
Eres un asistente experto en digitalización de expedientes estudiantiles para el DECE (Departamento de Consejería Estudiantil).
Se te proporciona el documento escaneado (PDF) del expediente de un estudiante.
Tu tarea es extraer los datos clave y devolver ÚNICAMENTE un objeto JSON válido con la siguiente estructura (usa null si un dato no está en el documento):

{
  "full_name": "Nombres y apellidos completos",
  "document_id": "Cédula de identidad (solo números)",
  "birth_date": "Fecha de nacimiento en formato YYYY-MM-DD",
  "gender": "Femenino o Masculino o null",
  "course": "Curso o grado (ej: 8vo, 1ro BGU)",
  "parallel": "Paralelo (ej: A, B)",
  "address": "Dirección domiciliaria",
  "representative_name": "Nombres y apellidos del representante legal o padre/madre",
  "representative_document": "Cédula del representante",
  "representative_phone": "Teléfono del representante",
  "representative_email": "Correo del representante",
  "lives_with": "Con quién vive (Padre y Madre, Madre, Padre, Abuelos, Otros)",
  "nee_types": "Si menciona necesidades educativas, devuelve un array de strings (ej: ['Discapacidad Intelectual']) o [] si no hay"
}

No incluyas markdown (como \`\`\`json), responde estrictamente con el JSON.
  `;

  const primaryModel = process.env.GEMINI_MODEL || MODEL_FALLBACK_CHAIN[0];
  const modelsToTry = [primaryModel, ...MODEL_FALLBACK_CHAIN.filter((m) => m !== primaryModel)];

  for (const model of modelsToTry) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: [
          prompt,
          { inlineData: { mimeType: "application/pdf", data: base64Data } }
        ],
        config: {
          temperature: 0.2, // Baja temperatura para extracción de datos
        }
      });
      
      let text = response.text || "";
      // Limpiar backticks si el modelo ignoró la instrucción
      text = text.replace(/```json/g, "").replace(/```/g, "").trim();
      
      const parsed = JSON.parse(text);
      return { data: parsed };
      
    } catch (err: any) {
      console.warn(`[scanExpediente] Falló modelo ${model}:`, err?.message || err);
    }
  }

  return { error: "No se pudo procesar el documento PDF con ninguno de los modelos disponibles." };
}


