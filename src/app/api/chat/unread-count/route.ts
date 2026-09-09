import { NextResponse } from "next/server";
import { getSession, requireInstitutionId } from "@/lib/session";
import { getTotalUnreadCount } from "@/lib/chat";

export async function GET() {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ unreadTotal: 0 });
  }

  try {
    const institutionId = requireInstitutionId(session);
    const unreadTotal = getTotalUnreadCount(institutionId, session.user.id);
    return NextResponse.json({ unreadTotal });
  } catch {
    return NextResponse.json({ unreadTotal: 0 });
  }
}