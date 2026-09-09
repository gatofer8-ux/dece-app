"use server";

import { randomUUID } from "crypto";
import ExcelJS from "exceljs";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { logAudit } from "@/lib/audit";

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
    const document_id = cellText(row, 2);
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
    `INSERT INTO students (id, institution_id, full_name, document_id, birth_date, gender, course, parallel, representative, rep_phone, rep_email, address)
     VALUES (@id, @institution_id, @full_name, @document_id, @birth_date, @gender, @course, @parallel, @representative, @rep_phone, @rep_email, @address)`
  );

  const tx = db.transaction((rows: ParsedRow[]) => {
    for (const r of rows) {
      const id = randomUUID();
      insertStmt.run({
        id,
        institution_id: institutionId,
        full_name: r.full_name,
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
