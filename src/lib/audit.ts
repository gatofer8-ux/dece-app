import { randomUUID } from "crypto";
import { db } from "./db";

/**
 * Dirección IP real del cliente para la petición en curso.
 *
 * `server.js` inyecta la IP del socket TCP (la real, no falsificable por el
 * cliente) como cabecera `x-real-ip` antes de entregar la petición a Next.js
 * — ver ese archivo para el detalle. Si por algún motivo no está presente
 * (por ejemplo, corriendo con `next dev` sin el servidor personalizado), se
 * recurre a `x-forwarded-for` para el caso de que la app quede detrás de un
 * proxy inverso propio de la institución.
 *
 * Se envuelve en try/catch porque `logAudit` también se invoca desde tareas
 * en segundo plano (cron de recordatorios) donde no existe una petición HTTP
 * en curso y `headers()` lanzaría un error.
 */
function currentRequestContext(): { ip: string | null; userAgent: string | null } {
  try {
    // Import perezoso: `next/headers` solo es válido dentro del ciclo de vida
    // de una petición; importarlo a nivel de módulo rompería los usos desde cron.
    const { headers } = require("next/headers") as typeof import("next/headers");
    const h = headers();
    const ip =
      h.get("x-real-ip")?.trim() ||
      h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      null;
    const userAgent = h.get("user-agent") || null;
    return { ip: ip || null, userAgent };
  } catch {
    return { ip: null, userAgent: null };
  }
}

/**
 * Registra una acción en la bitácora global de auditoría.
 * Se usa desde cada server action que crea/edita/elimina/exporta información.
 */
export function logAudit(params: {
  userId: string | null;
  action: string; // CREAR, EDITAR, ELIMINAR, VER, LOGIN, EXPORTAR, LOGIN_FALLIDO...
  entityType: string;
  entityId?: string | null;
  details?: string | null;
  institutionId?: string | null;
}) {
  const { ip, userAgent } = currentRequestContext();
  const stmt = db.prepare(
    `INSERT INTO audit_logs (id, institution_id, user_id, action, entity_type, entity_id, details, ip_address, user_agent)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  stmt.run(
    randomUUID(),
    params.institutionId ?? null,
    params.userId,
    params.action,
    params.entityType,
    params.entityId ?? null,
    params.details ?? null,
    ip,
    userAgent
  );
}
