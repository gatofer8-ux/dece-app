import { randomUUID } from "crypto";
import { db } from "./db";

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
  const stmt = db.prepare(
    `INSERT INTO audit_logs (id, institution_id, user_id, action, entity_type, entity_id, details)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );
  stmt.run(
    randomUUID(),
    params.institutionId ?? null,
    params.userId,
    params.action,
    params.entityType,
    params.entityId ?? null,
    params.details ?? null
  );
}
