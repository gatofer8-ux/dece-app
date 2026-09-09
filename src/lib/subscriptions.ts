import { randomUUID } from "crypto";
import { db } from "@/lib/db";

/**
 * Barridos periódicos que ANTES vivían dentro de `getSession()` y se
 * ejecutaban en cada petición (con `catch {}` mudos). Ahora los corre el cron
 * cada 15 minutos (ver `instrumentation-node.ts`). `getSession` solo lee.
 *
 * Consecuencia aceptada: el cambio de estado persistido puede tardar hasta
 * ~15 min. La UI sigue siendo inmediata porque `getSession` calcula
 * `days_left` / `is_overdue` a partir de `end_date` en tiempo de lectura.
 */

/** Desactiva las delegaciones temporales de coordinador cuya fecha ya venció. */
export function sweepExpiredDelegations(): number {
  try {
    const res = db
      .prepare(
        `UPDATE dece_coordinator_delegations
         SET is_active = 0, updated_at = datetime('now')
         WHERE is_active = 1 AND end_date IS NOT NULL AND date('now') > end_date`
      )
      .run();
    return res.changes;
  } catch (err) {
    console.error("[subscriptions] sweepExpiredDelegations:", err);
    return 0;
  }
}

/**
 * Suspende las suscripciones individuales vencidas (no demo) y registra el
 * evento en el historial. Devuelve cuántas se suspendieron.
 */
export function sweepExpiredSubscriptions(): number {
  let suspended = 0;
  try {
    const expired = db
      .prepare(
        `SELECT s.*, u.institution_id AS user_institution_id
         FROM user_subscriptions s
         JOIN users u ON u.id = s.user_id
         WHERE s.status IN ('activo', 'en_prueba')
           AND s.end_date IS NOT NULL
           AND date('now') > s.end_date
           AND s.is_demo = 0`
      )
      .all() as any[];

    const suspend = db.prepare(
      `UPDATE user_subscriptions SET status = 'suspendido', updated_at = datetime('now') WHERE id = ?`
    );
    const history = db.prepare(
      `INSERT INTO user_subscription_history (
        id, user_id, institution_id_snapshot, event_type, billing_type,
        package_id, package_name, frozen_price, start_date, end_date,
        executed_by_id, reason
      ) VALUES (?, ?, ?, 'SUSPENSION_AUTOMATICA', ?, ?, ?, ?, ?, ?, NULL,
        'Vencimiento automático de suscripción por falta de renovación')`
    );

    const tx = db.transaction((rows: any[]) => {
      for (const sub of rows) {
        suspend.run(sub.id);
        try {
          history.run(
            randomUUID(),
            sub.user_id,
            sub.user_institution_id ?? null,
            sub.billing_type,
            sub.package_id,
            sub.package_name,
            sub.frozen_price,
            sub.start_date,
            sub.end_date
          );
        } catch (e) {
          console.error("[subscriptions] historial de suspensión:", e);
        }
        suspended++;
      }
    });
    tx(expired);
  } catch (err) {
    console.error("[subscriptions] sweepExpiredSubscriptions:", err);
  }
  return suspended;
}

/** Ejecuta ambos barridos. Llamado por el cron. */
export function sweepSubscriptionsAndDelegations(): { suspended: number; delegations: number } {
  return {
    delegations: sweepExpiredDelegations(),
    suspended: sweepExpiredSubscriptions(),
  };
}
