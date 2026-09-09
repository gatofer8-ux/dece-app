import { NextResponse } from "next/server";
import { getSession, requireInstitutionId } from "@/lib/session";
import { getAvailableChatUsers } from "@/lib/chat";

export async function GET() {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  try {
    const institutionId = requireInstitutionId(session);
    const users = getAvailableChatUsers(institutionId, session.user.id);
    return NextResponse.json({ users });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Error al obtener usuarios" }, { status: 500 });
  }
}