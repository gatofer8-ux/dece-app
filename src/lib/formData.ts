/**
 * Utilidades compartidas para leer `FormData` en las server actions.
 *
 * Antes de este módulo, cada archivo de acciones (`casos/actions.ts`,
 * `estudiantes/actions.ts`, ...) redefinía sus propias funciones `str`, `int`,
 * `getAllStr`, etc. — copiadas y pegadas con variaciones sutiles. Impórtalas
 * desde aquí.
 *
 * Para validación estructurada de un formulario completo, usa `parseForm` con
 * un esquema de Zod (ya es dependencia del proyecto).
 */
import type { z } from "zod";

/** Cadena recortada, o `null` si está vacía o ausente. */
export function str(fd: FormData, key: string): string | null {
  const v = fd.get(key);
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length ? t : null;
}

/** Como `str` pero lanza si falta. */
export function requireStr(fd: FormData, key: string, label = key): string {
  const v = str(fd, key);
  if (!v) throw new Error(`El campo "${label}" es obligatorio.`);
  return v;
}

/** Entero, o `null` si no es un número válido. */
export function int(fd: FormData, key: string): number | null {
  const v = str(fd, key);
  if (v === null) return null;
  const n = Number.parseInt(v, 10);
  return Number.isNaN(n) ? null : n;
}

/** Número decimal, o `null`. */
export function num(fd: FormData, key: string): number | null {
  const v = str(fd, key);
  if (v === null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Checkbox / valor booleano ("on", "true", "1", "si"). */
export function bool(fd: FormData, key: string): boolean {
  const v = str(fd, key)?.toLowerCase();
  return v === "on" || v === "true" || v === "1" || v === "si" || v === "sí";
}

/** Todas las cadenas para una clave repetida (checkboxes múltiples, selects). */
export function getAllStr(fd: FormData, key: string): string[] {
  return fd.getAll(key).filter((v): v is string => typeof v === "string" && v.trim().length > 0);
}

/** Fecha ISO (YYYY-MM-DD) validada superficialmente, o `null`. */
export function dateStr(fd: FormData, key: string): string | null {
  const v = str(fd, key);
  if (!v) return null;
  return /^\d{4}-\d{2}-\d{2}/.test(v) ? v : null;
}

/**
 * Valida un `FormData` completo contra un esquema de Zod.
 * Convierte el FormData a un objeto plano (colapsando claves repetidas en
 * arrays) y devuelve el resultado tipado o lanza un error legible.
 */
export function parseForm<T extends z.ZodTypeAny>(fd: FormData, schema: T): z.infer<T> {
  const obj: Record<string, unknown> = {};
  for (const key of new Set(fd.keys())) {
    const all = fd.getAll(key);
    obj[key] = all.length > 1 ? all : all[0];
  }
  const result = schema.safeParse(obj);
  if (!result.success) {
    const first = result.error.issues[0];
    throw new Error(
      first ? `${first.path.join(".") || "formulario"}: ${first.message}` : "Datos de formulario inválidos."
    );
  }
  return result.data;
}
