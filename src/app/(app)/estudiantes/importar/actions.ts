"use server";

import { randomUUID } from "crypto";
import ExcelJS from "exceljs";
import JSZip from "jszip";
import { GoogleGenAI } from "@google/genai";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { normalizeDocumentId, detectDocumentType, type DocumentType } from "@/lib/documentId";

export type SkippedRow = { row: number; name: string; reason: string };
export type ImportActionState = {
  error: string | null;
  result: { created: number; skipped: SkippedRow[] } | null;
};

const MAX_IMPORT_FILE_SIZE = 5 * 1024 * 1024; // 5 MB, más que suficiente para una planilla de estudiantes
const GENDER_VALUES = new Set(["Femenino", "Masculino", "Otro"]);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function cellText(row: ExcelJS.Row, col: number): string | null {
  const cell = row.getCell(col);
  let v = cell.value;
  if (v === null || v === undefined) return null;
  // exceljs puede entregar fechas como objetos Date si la celda tiene formato de fecha
  if (v instanceof Date) {
    return v.toISOString().slice(0, 10);
  }
  if (typeof v === "object" && v !== null && "result" in (v as any)) {
    // celda con fórmula: usar el resultado calculado
    v = (v as any).result;
  }
  if (typeof v === "object" && v !== null && "text" in (v as any)) {
    // celda de texto enriquecido
    v = (v as any).text;
  }
  const s = String(v).trim();
  return s.length ? s : null;
}

export async function importStudents(
  _prev: ImportActionState,
  formData: FormData
): Promise<ImportActionState> {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Selecciona un archivo Excel (.xlsx) para importar.", result: null };
  }
  if (file.size > MAX_IMPORT_FILE_SIZE) {
    return { error: "El archivo supera el tamaño máximo permitido (5 MB).", result: null };
  }

  let workbook: ExcelJS.Workbook;
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as any);
  } catch {
    return { error: "No se pudo leer el archivo. Verifica que sea un Excel (.xlsx) válido, generado con la plantilla.", result: null };
  }

  const sheet = workbook.worksheets[0];
  if (!sheet) {
    return { error: "El archivo no tiene ninguna hoja con datos.", result: null };
  }

  // Cédulas ya existentes en la institución, para detectar duplicados contra la base.
  const existingDocs = new Set(
    (db.prepare("SELECT document_id FROM students WHERE institution_id = ? AND document_id IS NOT NULL").all(institutionId) as { document_id: string }[]).map(
      (r) => r.document_id
    )
  );
  const seenInFile = new Set<string>();

  type ParsedRow = {
    row: number;
    full_name: string;
    document_type: DocumentType;
    document_id: string | null;
    birth_date: string | null;
    gender: string | null;
    course: string;
    parallel: string | null;
    representative: string | null;
    rep_phone: string | null;
    rep_email: string | null;
    address: string | null;
  };

  const toInsert: ParsedRow[] = [];
  const skipped: SkippedRow[] = [];

  const lastRow = sheet.rowCount;
  for (let r = 2; r <= lastRow; r++) {
    const row = sheet.getRow(r);
    // Fila completamente vacía: se ignora en silencio (no cuenta como error).
    if (!row.hasValues) continue;

    const full_name = cellText(row, 1);
    const rawDocId = cellText(row, 2);
    const document_id = rawDocId ? normalizeDocumentId(rawDocId) : null;
    const document_type: DocumentType = document_id ? detectDocumentType(document_id) : "CEDULA";
    let birth_date = cellText(row, 3);
    let gender = cellText(row, 4);
    const course = cellText(row, 5);
    const parallel = cellText(row, 6);
    const representative = cellText(row, 7);
    const rep_phone = cellText(row, 8);
    const rep_email = cellText(row, 9);
    const address = cellText(row, 10);

    const label = full_name || `(fila ${r}, sin nombre)`;

    if (!full_name) {
      skipped.push({ row: r, name: label, reason: "Falta el nombre completo." });
      continue;
    }
    if (!course) {
      skipped.push({ row: r, name: label, reason: "Falta el curso." });
      continue;
    }
    if (birth_date && !DATE_RE.test(birth_date)) {
      skipped.push({ row: r, name: label, reason: `Fecha de nacimiento inválida ("${birth_date}"), debe ser AAAA-MM-DD.` });
      continue;
    }
    if (gender && !GENDER_VALUES.has(gender)) {
      skipped.push({ row: r, name: label, reason: `Género inválido ("${gender}"), debe ser Femenino, Masculino u Otro.` });
      continue;
    }
    if (document_id && existingDocs.has(document_id)) {
      skipped.push({ row: r, name: label, reason: `La cédula/documento "${document_id}" ya está registrada en esta institución.` });
      continue;
    }
    if (document_id && seenInFile.has(document_id)) {
      skipped.push({ row: r, name: label, reason: `La cédula/documento "${document_id}" está repetida dentro del archivo.` });
      continue;
    }
    if (document_id) seenInFile.add(document_id);

    if (!birth_date) birth_date = null;
    if (!gender) gender = null;

    toInsert.push({
      row: r,
      full_name,
      document_type,
      document_id,
      birth_date,
      gender,
      course,
      parallel,
      representative,
      rep_phone,
      rep_email,
      address,
    });
  }

  if (toInsert.length === 0 && skipped.length === 0) {
    return { error: "El archivo no tiene filas de datos (a partir de la fila 2 de la hoja \"Estudiantes\").", result: null };
  }

  const insertStmt = db.prepare(
    `INSERT INTO students (id, institution_id, full_name, document_type, document_id, birth_date, gender, course, parallel, representative, rep_phone, rep_email, address)
     VALUES (@id, @institution_id, @full_name, @document_type, @document_id, @birth_date, @gender, @course, @parallel, @representative, @rep_phone, @rep_email, @address)`
  );

  const tx = db.transaction((rows: ParsedRow[]) => {
    for (const r of rows) {
      const id = randomUUID();
      insertStmt.run({
        id,
        institution_id: institutionId,
        full_name: r.full_name,
        document_type: r.document_type,
        document_id: r.document_id,
        birth_date: r.birth_date,
        gender: r.gender,
        course: r.course,
        parallel: r.parallel,
        representative: r.representative,
        rep_phone: r.rep_phone,
        rep_email: r.rep_email,
        address: r.address,
      });
    }
  });

  try {
    tx(toInsert);
  } catch (err: any) {
    return { error: `Error al guardar los estudiantes: ${err?.message || "error desconocido"}. No se creó ningún registro.`, result: null };
  }

  if (toInsert.length > 0) {
    logAudit({
      userId: session.user.id,
      action: "IMPORTAR",
      entityType: "Student",
      details: `Importación masiva: ${toInsert.length} creados, ${skipped.length} omitidos.`,
      institutionId,
    });
  }

  revalidatePath("/estudiantes");
  return { error: null, result: { created: toInsert.length, skipped } };
}

// ----------------------------------------------------------------------------
// Importación con IA desde PDF (o un .zip con varios PDF, ej. uno por paralelo)
// ----------------------------------------------------------------------------

const MAX_PDF_IMPORT_FILE_SIZE = 20 * 1024 * 1024; // 20 MB: un .zip con varios PDF escaneados pesa más que una sola planilla
const GEMINI_MODEL_FALLBACK_CHAIN = ["gemini-3.6-flash", "gemini-3.5-flash-lite", "gemini-3.1-flash-lite", "gemini-3.7-flash"];

let geminiKeyIndex = 0;
function getGeminiClient(): GoogleGenAI | null {
  const apiKeyString = process.env.GEMINI_API_KEY;
  if (!apiKeyString) return null;
  const keys = apiKeyString.split(",").map((k) => k.trim()).filter(Boolean);
  if (keys.length === 0) return null;
  const apiKey = keys[geminiKeyIndex % keys.length];
  geminiKeyIndex++;
  return new GoogleGenAI({ apiKey });
}

const PDF_EXTRACTION_PROMPT =
  'Extrae la informacion de la lista de estudiantes de este documento.\n' +
  'El documento contiene datos generales en el encabezado (Jornada, Año Escolar/Curso, Paralelo) y una tabla con los estudiantes (Cedula, Nombres, Cuenta/Email).\n\n' +
  'Devuelve EXCLUSIVAMENTE un arreglo JSON (sin formato markdown \'json\') con el siguiente formato exacto:\n' +
  '[\n  {\n    "document_id": "1850129212",\n    "full_name": "ACUÑA OROZCO JUAN PABLO",\n    "course": "1RO DE BACHILLERATO",\n    "parallel": "A",\n    "jornada": "MATUTINA",\n    "rep_email": "acorjupa8405765@estudiantes.edu.ec"\n  }\n]\n\n' +
  'Asegurate de aplicar el Curso, Paralelo y Jornada del encabezado a TODOS los estudiantes de la tabla.';

/** Le pide a Gemini que extraiga la lista de estudiantes de un único PDF, con reintento entre modelos. */
async function extractStudentsFromPdfWithAi(
  ai: GoogleGenAI,
  base64Data: string
): Promise<{ list: any[] } | { error: string }> {
  const primaryModel = process.env.GEMINI_MODEL || GEMINI_MODEL_FALLBACK_CHAIN[0];
  const modelsToTry = [primaryModel, ...GEMINI_MODEL_FALLBACK_CHAIN.filter((m) => m !== primaryModel)];

  let text = "";
  let lastErr: any = null;
  for (const model of modelsToTry) {
    try {
      const result = await ai.models.generateContent({
        model,
        contents: [
          {
            role: "user",
            parts: [{ text: PDF_EXTRACTION_PROMPT }, { inlineData: { data: base64Data, mimeType: "application/pdf" } }],
          },
        ],
        config: { systemInstruction: "Eres un asistente experto en extraer datos de PDFs a JSON de manera estricta.", temperature: 0.1 },
      });
      text = (result.text || "").trim();
      if (text) break;
    } catch (err: any) {
      lastErr = err;
    }
  }

  if (!text) {
    return { error: lastErr?.message ? `No se pudo leer con la IA: ${lastErr.message}` : "No se pudo leer el documento con la IA." };
  }
  const match = text.match(/\[\s*\{[\s\S]*\}\s*\]/);
  if (!match) return { error: "La IA no devolvió una lista reconocible de estudiantes." };
  try {
    const parsed = JSON.parse(match[0]);
    if (!Array.isArray(parsed)) return { error: "La respuesta de la IA no es una lista válida." };
    return { list: parsed };
  } catch {
    return { error: "La respuesta de la IA no es un JSON válido." };
  }
}

export async function importStudentsFromPdfAi(
  _prev: ImportActionState,
  formData: FormData
): Promise<ImportActionState> {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Selecciona un archivo PDF (o un .zip con varios PDF) con la lista de estudiantes.", result: null };
  }
  if (file.size > MAX_PDF_IMPORT_FILE_SIZE) {
    return { error: "El archivo supera el tamaño máximo permitido (20 MB).", result: null };
  }

  const nameLower = file.name.toLowerCase();
  const isZip = file.type === "application/zip" || file.type === "application/x-zip-compressed" || nameLower.endsWith(".zip");
  const isPdf = file.type === "application/pdf" || nameLower.endsWith(".pdf");
  if (!isZip && !isPdf) {
    return { error: "El archivo debe ser un PDF o un .zip que contenga varios PDF.", result: null };
  }

  const ai = getGeminiClient();
  if (!ai) {
    return { error: "La IA no está configurada (falta GEMINI_API_KEY). Usa la importación desde Excel mientras tanto.", result: null };
  }

  // 1. Reunir los PDF a procesar: uno solo, o todos los que traiga el .zip.
  const pdfFiles: { label: string; base64: string }[] = [];
  if (isZip) {
    let zip: JSZip;
    try {
      zip = await JSZip.loadAsync(await file.arrayBuffer());
    } catch {
      return { error: "No se pudo abrir el archivo .zip. Verifica que no esté dañado ni protegido con contraseña.", result: null };
    }
    const entries = Object.values(zip.files).filter((f) => !f.dir && f.name.toLowerCase().endsWith(".pdf"));
    if (entries.length === 0) {
      return { error: "El .zip no contiene ningún archivo PDF.", result: null };
    }
    for (const entry of entries) {
      const buf = await entry.async("nodebuffer");
      pdfFiles.push({ label: entry.name.split("/").pop() || entry.name, base64: buf.toString("base64") });
    }
  } else {
    const buf = Buffer.from(await file.arrayBuffer());
    pdfFiles.push({ label: file.name, base64: buf.toString("base64") });
  }

  // 2. Extraer con la IA, PDF por PDF (si uno falla, se sigue con los demás en vez de abortar todo).
  const skipped: SkippedRow[] = [];
  const rawStudents: { source: string; data: any }[] = [];
  let seq = 0;
  for (const pdf of pdfFiles) {
    const extracted = await extractStudentsFromPdfWithAi(ai, pdf.base64);
    if ("error" in extracted) {
      seq++;
      skipped.push({ row: seq, name: `(archivo completo: ${pdf.label})`, reason: extracted.error });
      continue;
    }
    for (const st of extracted.list) {
      seq++;
      rawStudents.push({ source: pdf.label, data: st });
    }
  }

  if (rawStudents.length === 0) {
    return { error: null, result: { created: 0, skipped } };
  }

  // 3. Validar y detectar duplicados, igual que en la importación desde Excel.
  const existingDocs = new Set(
    (
      db
        .prepare("SELECT document_id FROM students WHERE institution_id = ? AND document_id IS NOT NULL")
        .all(institutionId) as { document_id: string }[]
    ).map((r) => r.document_id)
  );
  const seenInFile = new Set<string>();
  const multipleFiles = pdfFiles.length > 1;

  type ParsedRow = {
    full_name: string;
    document_type: DocumentType;
    document_id: string | null;
    course: string;
    parallel: string;
    jornada: string | null;
    rep_email: string | null;
    bachillerato_specialty: string | null;
  };
  const toInsert: ParsedRow[] = [];

  rawStudents.forEach(({ source, data: st }, idx) => {
    const row = idx + 1;
    const prefix = multipleFiles ? `[${source}] ` : "";
    const fullNameRaw = st.full_name || st.NOMBRES_COMPLETOS || st.nombres || st.nombre || st.Nombres;
    const fullName = fullNameRaw ? String(fullNameRaw).trim().toUpperCase() : "";
    const label = fullName ? `${prefix}${fullName}` : `${prefix}(sin nombre reconocido)`;

    if (!fullName) {
      skipped.push({ row, name: label, reason: "La IA no pudo leer el nombre completo en esta fila." });
      return;
    }

    const rawDoc = st.document_id || st.cedula || st.CEDULA || st.Cédula || null;
    const document_id = rawDoc ? normalizeDocumentId(String(rawDoc)) : null;
    const document_type: DocumentType = document_id ? detectDocumentType(document_id) : "CEDULA";

    if (document_id && existingDocs.has(document_id)) {
      skipped.push({ row, name: label, reason: `La cédula/documento "${document_id}" ya está registrada en esta institución.` });
      return;
    }
    if (document_id && seenInFile.has(document_id)) {
      skipped.push({ row, name: label, reason: `La cédula/documento "${document_id}" está repetida dentro del documento.` });
      return;
    }
    if (document_id) seenInFile.add(document_id);

    toInsert.push({
      full_name: fullName,
      document_type,
      document_id,
      course: String(st.course || st.curso || st.Año_Escolar || "SIN ESPECIFICAR").toUpperCase(),
      parallel: String(st.parallel || st.paralelo || "A").toUpperCase(),
      jornada: st.jornada ? String(st.jornada).toUpperCase() : null,
      rep_email: st.rep_email || st.cuenta || st.CUENTA || null,
      bachillerato_specialty: st.bachillerato_specialty || null,
    });
  });

  if (toInsert.length === 0) {
    return { error: null, result: { created: 0, skipped } };
  }

  // 4. Guardar. INSERT directo (no OR IGNORE) para que un choque real de la base
  // se reporte como error visible en vez de perderse en silencio.
  const insertStmt = db.prepare(
    `INSERT INTO students (id, institution_id, full_name, document_type, document_id, course, parallel, jornada, rep_email, created_by_id, bachillerato_specialty)
     VALUES (@id, @institution_id, @full_name, @document_type, @document_id, @course, @parallel, @jornada, @rep_email, @created_by_id, @bachillerato_specialty)`
  );

  const tx = db.transaction((rows: ParsedRow[]) => {
    for (const r of rows) {
      insertStmt.run({
        id: randomUUID(),
        institution_id: institutionId,
        full_name: r.full_name,
        document_type: r.document_type,
        document_id: r.document_id,
        course: r.course,
        parallel: r.parallel,
        jornada: r.jornada,
        rep_email: r.rep_email,
        created_by_id: session.user.id,
        bachillerato_specialty: r.bachillerato_specialty,
      });
    }
  });

  try {
    tx(toInsert);
  } catch (err: any) {
    return { error: `Error al guardar los estudiantes: ${err?.message || "error desconocido"}. No se creó ningún registro.`, result: null };
  }

  logAudit({
    userId: session.user.id,
    action: "IMPORTAR",
    entityType: "Student",
    details: `Importación con IA desde PDF: ${toInsert.length} creados, ${skipped.length} omitidos (${pdfFiles.length} archivo(s) procesado(s)).`,
    institutionId,
  });

  revalidatePath("/estudiantes");
  return { error: null, result: { created: toInsert.length, skipped } };
}
