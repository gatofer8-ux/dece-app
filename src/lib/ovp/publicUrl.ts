import { headers } from "next/headers";

/** URL base pública de la plataforma, para armar enlaces que se comparten fuera del login. */
export function publicBaseUrl(): string {
  try {
    const h = headers();
    const host = h.get("x-forwarded-host") || h.get("host");
    const proto = h.get("x-forwarded-proto") || "https";
    if (host && !host.startsWith("localhost")) return `${proto}://${host}`;
    if (host) return `http://${host}`;
  } catch {
    /* fuera de contexto de request */
  }
  return (
    process.env.NEXTAUTH_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://dece-app-production.up.railway.app"
  );
}
