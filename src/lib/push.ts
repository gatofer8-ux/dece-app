import webpush from "web-push";
import { db } from "@/lib/db";
import type { PushSubscriptionRow } from "@/lib/types";

// Notificaciones push del navegador (Web Push estándar — sin costo, sin
// servicio externo). Requiere un par de llaves VAPID, generadas una sola vez
// (ver /api/push/vapid-public-key y el mensaje de configuración) y guardadas
// como variables de entorno VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY.

let configured = false;
function ensureConfigured(): boolean {
  if (configured) return true;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  webpush.setVapidDetails("mailto:soporte@dece.local", pub, priv);
  configured = true;
  return true;
}

export function isPushConfigured(): boolean {
  return ensureConfigured();
}

export async function sendPushToUser(userId: string, payload: { title: string; body: string; url?: string }) {
  if (!ensureConfigured()) {
    console.warn("[push] VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY no configurados — no se envían notificaciones push.");
    return;
  }
  const subs = db.prepare("SELECT * FROM push_subscriptions WHERE user_id = ?").all(userId) as PushSubscriptionRow[];
  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload)
      );
    } catch (err: unknown) {
      const statusCode = (err as { statusCode?: number })?.statusCode;
      if (statusCode === 404 || statusCode === 410) {
        // La suscripción ya no es válida (el usuario desinstaló/revocó el permiso) — se limpia.
        db.prepare("DELETE FROM push_subscriptions WHERE id = ?").run(sub.id);
      } else {
        console.error("[push] Error al enviar:", err);
      }
    }
  }
}

export async function sendPushToInstitutionStaff(institutionId: string, roles: string[], payload: { title: string; body: string; url?: string }) {
  const users = db
    .prepare(`SELECT id FROM users WHERE institution_id = ? AND role IN (${roles.map(() => "?").join(",")}) AND active = 1`)
    .all(institutionId, ...roles) as { id: string }[];
  for (const u of users) {
    await sendPushToUser(u.id, payload);
  }
}
