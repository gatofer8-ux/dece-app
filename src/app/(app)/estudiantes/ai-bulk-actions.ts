"use server";

import { requireRole, requireInstitutionId } from "@/lib/session";
import { GoogleGenAI } from "@google/genai";

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
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function bulkCreateStudentsFromPDF(base64Data: string) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  const createdById = session.user.id;

  try {
    const ai = getClient();
    if (!ai) return { success: false, error: "API KEY no configurada" };
    
    const prompt = "Extrae la informacion de la lista de estudiantes de este documento.\nEl documento contiene datos generales en el encabezado (Jornada, Año Escolar/Curso, Paralelo) y una tabla con los estudiantes (Cedula, Nombres, Cuenta/Email).\n\nDevuelve EXCLUSIVAMENTE un arreglo JSON (sin formato markdown 'json') con el siguiente formato exacto:\n[\n  {\n    \"document_id\": \"1850129212\",\n    \"full_name\": \"ACUÑA OROZCO JUAN PABLO\",\n    \"course\": \"1RO DE BACHILLERATO\",\n    \"parallel\": \"A\",\n    \"jornada\": \"MATUTINA\",\n    \"rep_email\": \"acorjupa8405765@estudiantes.edu.ec\"\n  }\n]\n\nAsegurate de aplicar el Curso, Paralelo y Jornada del encabezado a TODOS los estudiantes de la tabla.";

    const MODEL_FALLBACK_CHAIN = ["gemini-3.6-flash", "gemini-3.5-flash-lite", "gemini-3.1-flash-lite", "gemini-3.7-flash"];
    const primaryModel = process.env.GEMINI_MODEL || MODEL_FALLBACK_CHAIN[0];
    const modelsToTry = [primaryModel, ...MODEL_FALLBACK_CHAIN.filter((m) => m !== primaryModel)];

    let text = "";
    let lastErr = null;
    for (const model of modelsToTry) {
      try {
        const result = await ai.models.generateContent({
          model,
          contents: [
            {
              role: "user",
              parts: [
                { text: prompt },
                {
                  inlineData: {
                    data: base64Data,
                    mimeType: "application/pdf"
                  }
                }
              ]
            }
          ],
          config: {
            systemInstruction: "Eres un asistente experto en extraer datos de PDFs a JSON de manera estricta.",
            temperature: 0.1,
          }
        });
        text = (result.text || "").trim();
        if (text) break;
      } catch (err: any) {
        lastErr = err;
        console.error("Error con modelo " + model + ":", err.message);
      }
    }
    
    if (!text && lastErr) throw lastErr;
    const match = text.match(/\[\s*\{[\s\S]*\}\s*\]/);
    if (!match) throw new Error("No se pudo extraer el arreglo JSON. Respuesta parcial: " + text.substring(0, 100));
    const studentsList = JSON.parse(match[0]);

    if (!Array.isArray(studentsList)) {
      throw new Error("El formato devuelto por la IA no es un arreglo válido.");
    }

    let createdCount = 0;
    const insertStmt = db.prepare(`
      INSERT OR IGNORE INTO students (
        id, institution_id, full_name, document_id, 
        course, parallel, jornada, rep_email, created_by_id, bachillerato_specialty
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    db.transaction(() => {
      for (const st of studentsList) {
        const fullName = st.full_name || st.NOMBRES_COMPLETOS || st.nombres || st.nombre || st.Nombres;
        if (!fullName) continue;
        const docId = st.document_id || st.cedula || st.CEDULA || st.Cédula || null;
        const course = st.course || st.curso || st.Año_Escolar || "SIN ESPECIFICAR";
        const parallel = st.parallel || st.paralelo || "A";
        const repEmail = st.rep_email || st.cuenta || st.CUENTA || null;
        const newId = crypto.randomUUID();
        const info = insertStmt.run(
          newId,
          institutionId,
          fullName.toUpperCase(),
          docId,
          (course).toUpperCase(),
          (parallel).toUpperCase(),
          st.jornada ? st.jornada.toUpperCase() : null,
          repEmail,
          createdById,
          st.bachillerato_specialty || null
        );
        if (info.changes > 0) createdCount++;
      }
    })();

    revalidatePath("/estudiantes");
    return { success: true, createdCount };

  } catch (error: any) {
    console.error("Error en bulkCreateStudentsFromPDF:", error);
    return { success: false, error: error.message || "Error al procesar el PDF con la IA." };
  }
}

