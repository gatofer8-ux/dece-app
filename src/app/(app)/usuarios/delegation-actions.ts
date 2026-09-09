"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { logAudit } from "@/lib/audit";

export interface DelegationActionState {
  success?: boolean;
  error?: string | null;
}

export async function createCoordinatorDelegation(data: {
  delegatedUserId: string;
  delegationType: "TEMPORAL" | "PERMANENTE";
  reason: string;
  startDate?: string;
  endDate?: string;
}): Promise<DelegationActionState> {
  const session = await requireRole(["ADMIN", "SUPERADMIN"]);
  const institutionId = requireInstitutionId(session);

  const { delegatedUserId, delegationType, reason, startDate, endDate } = data;

  if (!delegatedUserId) {
    return { error: "Debes seleccionar a un profesional DECE para la delegación." };
  }
  if (!reason || reason.trim().length < 5) {
    return { error: "Debes ingresar un motivo o justificación de al menos 5 caracteres." };
  }

  // Verificar que el usuario delegado pertenezca a la institución
  const targetUser = db
    .prepare("SELECT id, name, email, role, active FROM users WHERE id = ? AND institution_id = ?")
    .get(delegatedUserId, institutionId) as any;

  if (!targetUser) {
    return { error: "El usuario seleccionado no pertenece a tu institución." };
  }
  if (!targetUser.active) {
    return { error: "El usuario seleccionado está inactivo y no puede recibir la delegación." };
  }
  if (targetUser.id === session.user.id) {
    return { error: "No puedes delegarte la coordinación a ti mismo." };
  }

  const id = randomUUID();
  const today = new Date().toISOString().split("T")[0];
  const start = startDate || today;

  try {
    if (delegationType === "PERMANENTE") {
      // Transferencia definitiva de la coordinación
      db.transaction(() => {
        // 1. Desactivar cualquier delegación activa previa
        db.prepare(
          `UPDATE dece_coordinator_delegations 
           SET is_active = 0, revoked_at = datetime('now'), revoked_by_id = ? 
           WHERE institution_id = ? AND is_active = 1`
        ).run(session.user.id, institutionId);

        // 2. Si el delegante es ADMIN (coordinador actual), pasa a ser rol DECE
        if (session.user.role === "ADMIN") {
          db.prepare(
            `UPDATE users SET role = 'DECE', updated_at = datetime('now') WHERE id = ?`
          ).run(session.user.id);
        }

        // 3. El usuario destino se convierte en ADMIN definitivamente
        db.prepare(
          `UPDATE users SET role = 'ADMIN', updated_at = datetime('now') WHERE id = ?`
        ).run(delegatedUserId);

        // 4. Registrar en historial de delegaciones
        db.prepare(`
          INSERT INTO dece_coordinator_delegations (
            id, institution_id, delegator_user_id, delegated_user_id, original_user_id,
            delegation_type, start_date, end_date, reason, is_active
          ) VALUES (?, ?, ?, ?, ?, 'PERMANENTE', ?, NULL, ?, 1)
        `).run(id, institutionId, session.user.id, delegatedUserId, session.user.id, start, reason.trim());
      })();

      logAudit({
        userId: session.user.id,
        action: "DELEGAR_COORDINACION_PERMANENTE",
        entityType: "User",
        entityId: delegatedUserId,
        institutionId,
        details: `Coordinación DECE transferida permanentemente a ${targetUser.name} (${targetUser.email}). Motivo: ${reason.trim()}`,
      });
    } else {
      // Delegación temporal con rango de fechas o hasta revertir
      db.transaction(() => {
        // Desactivar delegaciones temporales activas previas
        db.prepare(
          `UPDATE dece_coordinator_delegations 
           SET is_active = 0, revoked_at = datetime('now'), revoked_by_id = ? 
           WHERE institution_id = ? AND is_active = 1`
        ).run(session.user.id, institutionId);

        // Registrar nueva delegación temporal
        db.prepare(`
          INSERT INTO dece_coordinator_delegations (
            id, institution_id, delegator_user_id, delegated_user_id, original_user_id,
            delegation_type, start_date, end_date, reason, is_active
          ) VALUES (?, ?, ?, ?, ?, 'TEMPORAL', ?, ?, ?, 1)
        `).run(
          id,
          institutionId,
          session.user.id,
          delegatedUserId,
          session.user.id,
          start,
          endDate || null,
          reason.trim()
        );
      })();

      logAudit({
        userId: session.user.id,
        action: "DELEGAR_COORDINACION_TEMPORAL",
        entityType: "User",
        entityId: delegatedUserId,
        institutionId,
        details: `Coordinación DECE delegada temporalmente a ${targetUser.name} (${targetUser.email}) desde ${start} hasta ${endDate || "manual"}. Motivo: ${reason.trim()}`,
      });
    }

    revalidatePath("/usuarios");
    revalidatePath("/institucion");
    revalidatePath("/dashboard");
    return { success: true, error: null };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Error al procesar la delegación de coordinación.",
    };
  }
}

export async function revokeCoordinatorDelegation(delegationId: string): Promise<DelegationActionState> {
  const session = await requireRole(["ADMIN", "SUPERADMIN"]);
  const institutionId = requireInstitutionId(session);

  const delegation = db
    .prepare("SELECT * FROM dece_coordinator_delegations WHERE id = ? AND institution_id = ?")
    .get(delegationId, institutionId) as any;

  if (!delegation) {
    return { error: "Registro de delegación no encontrado." };
  }

  try {
    db.prepare(`
      UPDATE dece_coordinator_delegations 
      SET is_active = 0, revoked_at = datetime('now'), revoked_by_id = ? 
      WHERE id = ?
    `).run(session.user.id, delegationId);

    logAudit({
      userId: session.user.id,
      action: "REVERTIR_DELEGACION_COORDINACION",
      entityType: "User",
      entityId: delegation.delegated_user_id,
      institutionId,
      details: `Delegación #${delegationId} revocada manualmente.`,
    });

    revalidatePath("/usuarios");
    revalidatePath("/institucion");
    revalidatePath("/dashboard");
    return { success: true, error: null };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Error al revertir la delegación.",
    };
  }
}
