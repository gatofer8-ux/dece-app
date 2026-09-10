import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import { getTapasSessionByCode } from "@/lib/tapas/tapasSessions";
import { getDeckCards, resolveCardPath } from "@/lib/tapas/cardDeck";

/** Sirve una cartilla ilustrada a la persona que está jugando (sin login, por código de sesión). */
export async function GET(_req: NextRequest, { params }: { params: { code: string; key: string } }) {
  const s = getTapasSessionByCode(params.code);
  if (!s) return new NextResponse("Juego no encontrado", { status: 404 });

  const rel = getDeckCards(s.institution_id)[params.key];
  const abs = rel ? resolveCardPath(rel) : null;
  if (!abs || !fs.existsSync(abs)) return new NextResponse("No encontrada", { status: 404 });

  return new NextResponse(fs.readFileSync(abs), {
    headers: { "Content-Type": "image/png", "Cache-Control": "private, max-age=3600" },
  });
}
