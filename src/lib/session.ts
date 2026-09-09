import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "./auth";
import { roleHomePath } from "./permissions";
import type { Role } from "./types";

export async function getSession() {
  const session = await getServerSession(authOptions);
  if (session?.user) {
    try {
      const { cookies } = await import("next/headers");
      const cookieStore = cookies();
      const demoCookie = cookieStore.get("dece_demo_institution")?.value;
      if (demoCookie === "demo-los-alamos") {
        session.user.real_institution_id = session.user.institution_id;
        session.user.institution_id = "demo-los-alamos";
        session.user.is_demo_mode = true;
      }
    } catch {
      // Ignorado fuera del contexto de solicitud de Next.js
    }

    // Verificar si existe una delegación temporal de coordinador activa para este usuario
    if (session.user.institution_id && session.user.role !== "SUPERADMIN" && session.user.role !== "ADMIN") {
      try {
        const { db } = await import("./db");
        // Desactivar delegaciones temporales cuya fecha límite ya venció
        db.prepare(
          "UPDATE dece_coordinator_delegations SET is_active = 0, updated_at = datetime('now') WHERE is_active = 1 AND end_date IS NOT NULL AND date('now') > end_date"
        ).run();

        const activeDelegation = db.prepare(`
          SELECT * FROM dece_coordinator_delegations
          WHERE delegated_user_id = ?
            AND institution_id = ?
            AND is_active = 1
            AND date('now') >= start_date
            AND (end_date IS NULL OR date('now') <= end_date)
          ORDER BY created_at DESC LIMIT 1
        `).get(session.user.id, session.user.institution_id) as any;

        if (activeDelegation) {
          session.user.role = "ADMIN";
          (session.user as any).is_delegated_coordinator = true;
          (session.user as any).delegation_info = activeDelegation;
        }
      } catch {
        // Ignorar si la tabla no existe o error en CLI
      }
    }

    // Verificar estado individual de suscripción (Regla: aislamiento por usuario)
    if (session.user.role !== "SUPERADMIN") {
      try {
        const { db } = await import("./db");
        // Suspensión automática si la fecha de vencimiento ya pasó y no es cuenta demo
        const expired = db.prepare(`
          SELECT * FROM user_subscriptions
          WHERE user_id = ?
            AND status IN ('activo', 'en_prueba')
            AND end_date IS NOT NULL
            AND date('now') > end_date
            AND is_demo = 0
        `).get(session.user.id) as any;

        if (expired) {
          db.prepare(`
            UPDATE user_subscriptions
            SET status = 'suspendido', updated_at = datetime('now')
            WHERE id = ?
          `).run(expired.id);

          try {
            const { randomUUID } = await import("crypto");
            db.prepare(`
              INSERT INTO user_subscription_history (
                id, user_id, institution_id_snapshot, event_type, billing_type,
                package_id, package_name, frozen_price, start_date, end_date,
                executed_by_id, reason
              ) VALUES (?, ?, ?, 'SUSPENSION_AUTOMATICA', ?, ?, ?, ?, ?, ?, NULL, 'Vencimiento automático de suscripción por falta de renovación')
            `).run(
              randomUUID(), session.user.id, session.user.institution_id, expired.billing_type,
              expired.package_id, expired.package_name, expired.frozen_price,
              expired.start_date, expired.end_date
            );
          } catch {}
        }

        const sub = db.prepare("SELECT * FROM user_subscriptions WHERE user_id = ?").get(session.user.id) as any;
        if (sub) {
          const todayMs = new Date().setHours(0, 0, 0, 0);
          let daysLeft: number | null = null;
          let isOverdue = false;
          if (sub.end_date) {
            const endMs = new Date(sub.end_date + "T00:00:00").getTime();
            daysLeft = Math.ceil((endMs - todayMs) / (1000 * 3600 * 24));
            isOverdue = daysLeft < 0;
          }

          const isReadOnly = sub.status === "suspendido" || sub.status === "cancelado";
          (session.user as any).subscription = {
            id: sub.id,
            status: sub.status,
            package_id: sub.package_id,
            package_name: sub.package_name,
            billing_type: sub.billing_type,
            frozen_price: sub.frozen_price,
            frozen_duration_months: sub.frozen_duration_months,
            start_date: sub.start_date,
            end_date: sub.end_date,
            days_left: daysLeft,
            is_overdue: isOverdue,
            is_demo: Boolean(sub.is_demo),
            is_trial: sub.status === "en_prueba",
            is_read_only: isReadOnly,
          };
        }
      } catch {}
    } else {
      (session.user as any).subscription = {
        status: "activo",
        package_name: "Superadministrador",
        is_demo: false,
        is_trial: false,
        is_read_only: false,
        days_left: null,
      };
    }
  }
  return session;
}

/** Devuelve true si la suscripción del usuario está suspendida o cancelada (modo solo lectura) */
export function isUserSubscriptionReadOnly(session: { user?: { role?: Role; subscription?: any } } | null): boolean {
  if (!session?.user) return false;
  if (session.user.role === "SUPERADMIN") return false;
  return Boolean(session.user.subscription?.is_read_only);
}

/** Lanza excepción si el usuario no tiene suscripción activa o en prueba */
export function assertActiveSubscription(session: { user?: { role?: Role; subscription?: any } } | null) {
  if (isUserSubscriptionReadOnly(session)) {
    throw new Error("Tu suscripción individual se encuentra suspendida por falta de pago. Tu cuenta opera en modo solo lectura.");
  }
}

/** Obliga a que exista sesión; si no, redirige a /login. Devuelve la sesión. */
export async function requireSession() {
  const session = await getSession();
  if (!session?.user) {
    redirect("/login");
  }
  return session;
}

/** Obliga a que la sesión tenga uno de los roles indicados. SUPERADMIN tiene acceso universal. */
export async function requireRole(roles: Role[]) {
  const session = await requireSession();
  if (session.user.role === "SUPERADMIN") {
    return session;
  }
  if (!roles.includes(session.user.role)) {
    redirect(roleHomePath(session.user.role));
  }
  return session;
}

/**
 * Devuelve el institution_id de la sesión, exigiendo que exista.
 * Para SUPERADMIN sin institution_id explícito, se vincula dinámicamente a la primera institución o demo.
 */
export function requireInstitutionId(session: { user: { institution_id: string | null; is_demo_mode?: boolean; role?: Role } }): string {
  if (session.user.is_demo_mode) {
    return "demo-los-alamos";
  }
  try {
    const { cookies } = require("next/headers");
    const cookieStore = cookies();
    if (cookieStore.get("dece_demo_institution")?.value === "demo-los-alamos") {
      return "demo-los-alamos";
    }
  } catch {}

  if (!session.user.institution_id) {
    if (session.user.role === "SUPERADMIN") {
      try {
        const { db } = require("./db");
        const inst = db.prepare("SELECT id FROM institutions ORDER BY active DESC LIMIT 1").get() as any;
        if (inst?.id) return inst.id;
      } catch {}
      return "demo-los-alamos";
    }
    throw new Error(
      "Esta acción requiere una sesión asociada a una institución educativa."
    );
  }
  return session.user.institution_id;
}

