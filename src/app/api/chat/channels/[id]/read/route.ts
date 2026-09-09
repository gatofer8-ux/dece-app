import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { markChannelAsRead } from "@/lib/chat";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  try {
    markChannelAsRead(params.id, session.user.id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Error al marcar como leído" }, { status: 500 });
  }
}