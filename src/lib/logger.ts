/**
 * Logger mínimo y estructurado.
 *
 * Objetivo: dejar de tener `catch {}` mudos. En vez de tragarse un error,
 * registra `logger.warn("ámbito", "qué pasaba", err)`.
 *
 * Punto de extensión: si algún día se añade Sentry (u otro), implementa
 * `reportError` para reenviar los errores de nivel `error`. La app no depende
 * de ningún paquete externo para esto.
 */

type Level = "info" | "warn" | "error";

function serializeError(err: unknown): string {
  if (err instanceof Error) return `${err.name}: ${err.message}`;
  if (typeof err === "string") return err;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

/** Gancho opcional para un servicio externo (Sentry, etc.). No-op por defecto. */
let reportError: ((scope: string, message: string, err: unknown) => void) | null = null;

export function setErrorReporter(fn: typeof reportError): void {
  reportError = fn;
}

function emit(level: Level, scope: string, message: string, err?: unknown): void {
  const prefix = `[${scope}]`;
  const detail = err === undefined ? "" : ` — ${serializeError(err)}`;
  const line = `${prefix} ${message}${detail}`;

  if (level === "error") {
    console.error(line);
    if (err instanceof Error && err.stack) console.error(err.stack);
    try {
      reportError?.(scope, message, err);
    } catch {
      /* el reporter no debe romper el flujo */
    }
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export const logger = {
  info: (scope: string, message: string) => emit("info", scope, message),
  warn: (scope: string, message: string, err?: unknown) => emit("warn", scope, message, err),
  error: (scope: string, message: string, err?: unknown) => emit("error", scope, message, err),
};
