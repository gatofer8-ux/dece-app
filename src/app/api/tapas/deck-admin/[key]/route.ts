import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import { getSession } from "@/lib/session";
import { getDeckCards, resolveCardPath } from "@/lib/tapas/cardDeck";

export async function GET(_req: NextRequest, { params }: { params: { key: string } }) {
  const session = await getSession();
  const institutionId = session?.user?.institution_id;
  if (!institutionId) return new NextResponse("No autenticado", { status: 401 });

  const rel = getDeckCards(institutionId)[params.key];
  const abs = rel ? resolveCardPath(rel) : null;
  if (!abs || !fs.existsSync(abs)) return new NextResponse("No encontrada", { status: 404 });

  return new NextResponse(fs.readFileSync(abs), {
    headers: { "Content-Type": "image/png", "Cache-Control": "private, max-age=3600" },
  });
}
