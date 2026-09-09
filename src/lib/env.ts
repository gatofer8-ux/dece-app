/**
 * Validación centralizada de variables de entorno.
 *
 * Se importa desde `src/lib/auth.ts` (y puede importarse desde cualquier punto
 * de arranque del servidor). El objetivo es que la aplicación falle de forma
 * ruidosa y temprana si falta una variable crítica, en lugar de arrancar con
 * un secreto por defecto inseguro.
 */

const isProd = process.env.NODE_ENV === "production";

/** Marcadores de posición que alguna vez estuvieron en el repositorio. */
const INSECURE_SECRETS = new Set([
  "dece-app-default-secret-production-2026-key",
  "cambia-esta-clave-por-una-aleatoria-y-larga",
  "secret",
  "changeme",
]);

function readSecret(): string {
  const value = process.env.NEXTAUTH_SECRET?.trim();

  if (!value) {
    const msg =
      "NEXTAUTH_SECRET no está definida. Genera una con `openssl rand -base64 32` " +
      "y configúrala como variable de entorno. La aplicación no puede firmar " +
      "sesiones de forma segura sin ella.";
    if (isProd) throw new Error(msg);
    // En desarrollo permitimos continuar con un secreto efímero por comodidad,
    // pero avisamos claramente. Cambia entre reinicios: cierra sesión y vuelve.
    console.warn(`[env] ${msg}\n[env] Usando un secreto de desarrollo temporal.`);
    return "dev-only-ephemeral-" + String(Date.now());
  }

  if (INSECURE_SECRETS.has(value) || value.length < 16) {
    const msg =
      "NEXTAUTH_SECRET tiene un valor inseguro o demasiado corto. " +
      "Debe ser una cadena aleatoria de al menos 32 caracteres.";
    if (isProd) throw new Error(msg);
    console.warn(`[env] ${msg}`);
  }

  return value;
}

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? "development",
  IS_PROD: isProd,
  NEXTAUTH_SECRET: readSecret(),
  NEXTAUTH_URL: process.env.NEXTAUTH_URL ?? "http://localhost:3000",
  DATABASE_FILE: process.env.DATABASE_FILE ?? null,

  /** Funciones opcionales: presentes solo si la variable existe. */
  GEMINI_API_KEY: process.env.GEMINI_API_KEY ?? null,
  VAPID_PUBLIC_KEY:
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? process.env.VAPID_PUBLIC_KEY ?? null,
  VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY ?? null,

  /** Sembrado de datos de demostración: solo si SEED_DEMO === "1". */
  SEED_DEMO: process.env.SEED_DEMO === "1",
} as const;
