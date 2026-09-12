import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { generateStrategicPlanBianualDocx } from "@/lib/strategicPlanBianualDocx";
import type { StrategicBianualPlanRow } from "@/lib/types";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireRole(["ADMIN", "DECE", "AUTORIDAD", "DISTRITO"]);
  const institutionId = session.user.role === "DISTRITO" ? null : requireInstitutionId(session);

  let query =
    "SELECT sp.*, i.name as inst_name FROM strategic_plans_bianual sp JOIN institutions i ON i.id = sp.institution_id WHERE sp.id = ?";
  const queryParams: any[] = [params.id];

  if (institutionId) {
    query += " AND sp.institution_id = ?";
    queryParams.push(institutionId);
  }

  const plan = db.prepare(query).get(...queryParams) as
    | (StrategicBianualPlanRow & { inst_name: string })
    | undefined;

  if (!plan) {
    return new NextResponse("Plan Estratégico Bianual no encontrado", { status: 404 });
  }

  const buffer = await generateStrategicPlanBianualDocx(plan, plan.inst_name);
  const filename = `Plan_Estrategico_Bianual_DECE_${(plan.period_text || "").replace(/\s+/g, "_")}.docx`;

  return new NextResponse(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
