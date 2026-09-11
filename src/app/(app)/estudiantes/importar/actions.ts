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
// Un lote grande de PDF simplemente tarda demasiado para que una sola solicitud
// HTTP lo sobreviva (el navegador o el proxy cortan la conexión antes de que el
// servidor alcance a responder), sin importar cuán bien esté manejado el error
// internamente. Se limita el tamaño del lote para que siempre termine a tiempo.
const MAX_PDFS_PER_BATCH = 15;
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
const GEMINI_CALL_TIMEOUT_MS = 25_000;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`Tiempo de espera agotado (${label}).`)), ms)),
  ]);
}

// El plan gratuito de Gemini limita las solicitudes por minuto por modelo (ej. 5 RPM).
// Lanzar todos los PDF de un .zip a la vez (Promise.all sin límite) los satura de
// inmediato si son varios archivos, y la mayoría termina con error 429. Se procesan
// con un cupo máximo de solicitudes simultáneas: sigue siendo mucho más rápido que
// uno por uno, pero sin disparar toda la cuota de golpe.
const MAX_CONCURRENT_PDF_EXTRACTIONS = 3;

async function mapWithConcurrencyLimit<T, R>(items: T[], limit: number, fn: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;
  async function worker() {
    while (nextIndex < items.length) {
      const current = nextIndex++;
      results[current] = await fn(items[current], current);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return results;
}

/** El SDK de Gemini a veces entrega el error como un bloque JSON crudo en `.message` — se traduce a un mensaje legible. */
function friendlyGeminiError(err: any): string {
  const raw = String(err?.message || err || "");
  let code: number | undefined;
  let status: string | undefined;
  try {
    const parsed = JSON.parse(raw)?.error;
    code = parsed?.code;
    status = parsed?.status;
  } catch {
    /* el mensaje no era JSON, se usa tal cual más abajo */
  }
  if (code === 429 || status === "RESOURCE_EXHAUSTED") {
    return "se alcanzó el límite de solicitudes gratuitas de la IA (Gemini). Espera un minuto y vuelve a intentar con los archivos que falten.";
  }
  if (code === 503 || status === "UNAVAILABLE") {
    return "el modelo de IA está temporalmente saturado. Intenta de nuevo en un momento.";
  }
  return raw.length > 200 ? `${raw.slice(0, 200)}…` : raw || "error desconocido";
}

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
      const result = await withTimeout(
        ai.models.generateContent({
          model,
          contents: [
            {
              role: "user",
              parts: [{ text: PDF_EXTRACTION_PROMPT }, { inlineData: { data: base64Data, mimeType: "application/pdf" } }],
            },
          ],
          config: { systemInstruction: "Eres un asistente experto en extraer datos de PDFs a JSON de manera estricta.", temperature: 0.1 },
        }),
        GEMINI_CALL_TIMEOUT_MS,
        model
      );
      text = (result.text || "").trim();
      if (text) break;
    } catch (err: any) {
      lastErr = err;
    }
  }

  if (!text) {
    return { error: lastErr ? `No se pudo leer con la IA: ${friendlyGeminiError(lastErr)}` : "No se pudo leer el documento con la IA." };
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

  // Todo lo que sigue puede fallar de formas imprevistas (un .zip con una entrada
  // corrupta, un PDF ilegible, un corte de red con la IA, etc.). Se envuelve en un
  // try/catch general para que CUALQUIER excepción llegue al cliente como un
  // mensaje legible en vez de romper useFormState con un error genérico de React.
  try {
    // 1. Reunir los PDF a procesar: uno solo, o todos los que traiga el .zip.
    const pdfFiles: { label: string; base64: string }[] = [];
    const zipReadErrors: SkippedRow[] = [];
    if (isZip) {
      let zip: JSZip;
      try {
        zip = await JSZip.loadAsync(await file.arrayBuffer());
      } catch {
        return { error: "No se pudo abrir el archivo .zip. Verifica que no esté dañado ni protegido con contraseña.", result: null };
      }
      const entries = Object.values(zip.files).filter(
        (f) =>
          !f.dir &&
          f.name.toLowerCase().endsWith(".pdf") &&
          !f.name.includes("__MACOSX/") &&
          !(f.name.split("/").pop() || "").startsWith("._")
      );
      if (entries.length === 0) {
        return { error: "El .zip no contiene ningún archivo PDF.", result: null };
      }
      if (entries.length > MAX_PDFS_PER_BATCH) {
        return {
          error: `El .zip trae ${entries.length} archivos PDF. Para que la IA alcance a procesarlos sin que se corte la conexión, súbelos en tandas de máximo ${MAX_PDFS_PER_BATCH} PDF por .zip (por ejemplo, uno por paralelo o por curso).`,
          result: null,
        };
      }
      let entrySeq = 0;
      for (const entry of entries) {
        entrySeq++;
        const label = entry.name.split("/").pop() || entry.name;
        try {
          const buf = await entry.async("nodebuffer");
          pdfFiles.push({ label, base64: buf.toString("base64") });
        } catch (err: any) {
          // Una entrada dañada dentro del .zip no debe abortar el resto del lote.
          zipReadErrors.push({ row: entrySeq, name: `(archivo completo: ${label})`, reason: `No se pudo leer este archivo dentro del .zip: ${err?.message || "error desconocido"}.` });
        }
      }
      if (pdfFiles.length === 0) {
        return { error: "No se pudo leer ningún PDF dentro del .zip.", result: null };
      }
    } else {
      const buf = Buffer.from(await file.arrayBuffer());
      pdfFiles.push({ label: file.name, base64: buf.toString("base64") });
    }

    // 2. Extraer con la IA. En PARALELO (no uno por uno): con un .zip de varios
    // PDF, procesarlos en serie multiplica el tiempo de espera por cada modelo de
    // reintento y puede superar el tiempo máximo de una petición, cortando la
    // conexión a medio camino (el mismo síntoma que un cuerpo demasiado grande).
    // Si uno falla, no aborta a los demás.
    const extractions = await mapWithConcurrencyLimit(pdfFiles, MAX_CONCURRENT_PDF_EXTRACTIONS, (pdf) =>
      extractStudentsFromPdfWithAi(ai, pdf.base64)
    );

    const skipped: SkippedRow[] = [...zipReadErrors];
    const rawStudents: { source: string; data: any }[] = [];
    let seq = zipReadErrors.length;
    pdfFiles.forEach((pdf, i) => {
      const extracted = extractions[i];
      if ("error" in extracted) {
        seq++;
        skipped.push({ row: seq, name: `(archivo completo: ${pdf.label})`, reason: extracted.error });
        return;
      }
      for (const st of extracted.list) {
        seq++;
        rawStudents.push({ source: pdf.label, data: st });
      }
    });

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
      const fullNameRaw = st?.full_name || st?.NOMBRES_COMPLETOS || st?.nombres || st?.nombre || st?.Nombres;
      const fullName = fullNameRaw ? String(fullNameRaw).trim().toUpperCase() : "";
      const label = fullName ? `${prefix}${fullName}` : `${prefix}(sin nombre reconocido)`;

      if (!fullName) {
        skipped.push({ row, name: label, reason: "La IA no pudo leer el nombre completo en esta fila." });
        return;
      }

      const rawDoc = st?.document_id || st?.cedula || st?.CEDULA || st?.Cédula || null;
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
        course: String(st?.course || st?.curso || st?.Año_Escolar || "SIN ESPECIFICAR").toUpperCase(),
        parallel: String(st?.parallel || st?.paralelo || "A").toUpperCase(),
        jornada: st?.jornada ? String(st.jornada).toUpperCase() : null,
        rep_email: st?.rep_email || st?.cuenta || st?.CUENTA || null,
        bachillerato_specialty: st?.bachillerato_specialty || null,
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
  } catch (err: any) {
    return {
      error: `Ocurrió un error inesperado al procesar el archivo: ${err?.message || "error desconocido"}. Intenta de nuevo o usa la importación desde Excel.`,
      result: null,
    };
  }
}
