import { NextRequest, NextResponse } from "next/server";
import { getSession, requireInstitutionId } from "@/lib/session";
import { getUserChannels, createGroupChannel, getOrCreateDirectChannel } from "@/lib/chat";

export async function GET() {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  try {
    const institutionId = requireInstitutionId(session);
    const channels = getUserChannels(institutionId, session.user.id);
    return NextResponse.json({ channels });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Error al obtener canales" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  try {
    const institutionId = requireInstitutionId(session);
    const body = await req.json();

    if (body.targetUserId) {
      const channelId = getOrCreateDirectChannel(institutionId, session.user.id, body.targetUserId);
      return NextResponse.json({ channelId, success: true });
    }

    if (body.name) {
      const channelId = createGroupChannel({
        institutionId,
        createdById: session.user.id,
        name: body.name,
        description: body.description,
        type: body.type || (body.caseFileId ? "CASE" : "GROUP"),
        caseFileId: body.caseFileId,
        memberUserIds: body.memberUserIds || [],
      });
      return NextResponse.json({ channelId, success: true });
    }

    return NextResponse.json({ error: "Parámetros incompletos" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Error al crear canal" }, { status: 500 });
  }
}