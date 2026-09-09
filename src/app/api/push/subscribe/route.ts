import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const endpoint = body?.endpoint as string | undefined;
  const p256dh = body?.keys?.p256dh as string | undefined;
  const auth = body?.keys?.auth as string | undefined;
  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json({ error: "Suscripción inválida" }, { status: 400 });
  }

  const existing = db.prepare("SELECT id FROM push_subscriptions WHERE endpoint = ?").get(endpoint) as { id: string } | undefined;
  if (existing) {
    db.prepare("UPDATE push_subscriptions SET user_id=?, p256dh=?, auth=? WHERE id=?").run(session.user.id, p256dh, auth, existing.id);
  } else {
    db.prepare("INSERT INTO push_subscriptions (id, user_id, endpoint, p256dh, auth) VALUES (?, ?, ?, ?, ?)").run(
      randomUUID(),
      session.user.id,
      endpoint,
      p256dh,
      auth
    );
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const endpoint = body?.endpoint as string | undefined;
  if (endpoint) {
    db.prepare("DELETE FROM push_subscriptions WHERE endpoint = ? AND user_id = ?").run(endpoint, session.user.id);
  }
  return NextResponse.json({ ok: true });
}
