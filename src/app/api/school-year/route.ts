import { NextRequest, NextResponse } from "next/server";
import { ACTIVE_YEAR_COOKIE } from "@/lib/schoolYear";
import { getSession } from "@/lib/session";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { schoolYearId } = body;

    const res = NextResponse.json({ success: true, schoolYearId });
    if (!schoolYearId || schoolYearId === "ALL") {
      res.cookies.set(ACTIVE_YEAR_COOKIE, "ALL", {
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
        sameSite: "lax",
      });
    } else {
      res.cookies.set(ACTIVE_YEAR_COOKIE, schoolYearId, {
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
        sameSite: "lax",
      });
    }

    return res;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error al procesar solicitud";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
