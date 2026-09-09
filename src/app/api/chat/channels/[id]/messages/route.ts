import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getChannelMessages, sendMessage } from "@/lib/chat";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const after = searchParams.get("after") || undefined;
  const limit = parseInt(searchParams.get("limit") || "100", 10);

  try {
    const messages = getChannelMessages(params.id, limit, after);
    return NextResponse.json({ messages });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Error al obtener mensajes" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const content = (body.content || "").trim();

    if (!content && !body.attachmentUrl) {
      return NextResponse.json({ error: "El mensaje no puede estar vacío" }, { status: 400 });
    }

    const message = await sendMessage({
      channelId: params.id,
      senderId: session.user.id,
      content,
      attachmentUrl: body.attachmentUrl,
      attachmentName: body.attachmentName,
      caseFileId: body.caseFileId,
    });

    return NextResponse.json({ message, success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Error al enviar mensaje" }, { status: 500 });
  }
}