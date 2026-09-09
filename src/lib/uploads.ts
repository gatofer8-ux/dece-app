import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { DB_PATH } from "@/lib/db";

// Los archivos adjuntos se guardan junto a la base de datos, en el mismo
// volumen persistente de Railway (/data en producción) — así sobreviven a
// los redespliegues igual que la base de datos.
export const UPLOADS_DIR = path.join(path.dirname(DB_PATH), "uploads");

export const MAX_ATTACHMENT_SIZE = 15 * 1024 * 1024; // 15 MB

// Lista blanca de tipos permitidos — evita que se suban ejecutables u otros
// archivos potencialmente peligrosos a través de este formulario.
const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

export function isAllowedAttachmentType(mimeType: string): boolean {
  return ALLOWED_MIME_TYPES.has(mimeType);
}

function ensureUploadsDir() {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
}

function sanitizeFilename(name: string): string {
  return name.replace(/[/\\]/g, "_").replace(/[^\w.\- ]/g, "").slice(0, 150) || "archivo";
}

/**
 * Guarda un archivo subido (File del FormData) en el disco, bajo una
 * subcarpeta por caso, con un nombre único para evitar colisiones.
 * Devuelve la ruta relativa a UPLOADS_DIR (la que se guarda en la BD) — nunca
 * la ruta absoluta, para no depender de dónde esté montado el volumen.
 */
export async function saveAttachmentFile(
  file: File,
  caseId: string
): Promise<{ relativePath: string; size: number }> {
  ensureUploadsDir();
  const caseDir = path.join(UPLOADS_DIR, caseId);
  if (!fs.existsSync(caseDir)) {
    fs.mkdirSync(caseDir, { recursive: true });
  }
  const safeName = sanitizeFilename(file.name);
  const storedName = `${randomUUID()}-${safeName}`;
  const fullPath = path.join(caseDir, storedName);

  const buffer = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(fullPath, buffer);

  return { relativePath: path.join(caseId, storedName), size: buffer.length };
}

/**
 * Guarda un buffer directo en el disco bajo la carpeta del caso.
 */
export function saveAttachmentBuffer(
  buffer: Buffer,
  originalFilename: string,
  caseId: string
): { relativePath: string; size: number } {
  ensureUploadsDir();
  const caseDir = path.join(UPLOADS_DIR, caseId);
  if (!fs.existsSync(caseDir)) {
    fs.mkdirSync(caseDir, { recursive: true });
  }
  const safeName = sanitizeFilename(originalFilename);
  const storedName = `${randomUUID()}-${safeName}`;
  const fullPath = path.join(caseDir, storedName);

  fs.writeFileSync(fullPath, buffer);
  return { relativePath: path.join(caseId, storedName), size: buffer.length };
}

/** Resuelve una ruta relativa guardada en la BD a una ruta absoluta segura, dentro de UPLOADS_DIR. */
export function resolveAttachmentPath(relativePath: string): string | null {
  const full = path.normalize(path.join(UPLOADS_DIR, relativePath));
  if (!full.startsWith(UPLOADS_DIR)) return null; // evita path traversal (../..)
  return full;
}

export function deleteAttachmentFile(relativePath: string) {
  const full = resolveAttachmentPath(relativePath);
  if (full && fs.existsSync(full)) {
    try {
      fs.unlinkSync(full);
    } catch (err) {
      console.error("[uploads] No se pudo borrar el archivo:", err);
    }
  }
}
