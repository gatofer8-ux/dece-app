"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { logAudit } from "@/lib/audit";

function str(fd: FormData, key: string): string | null {
  const v = fd.get(key);
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length ? t : null;
}

export async function createActivity(formData: FormData) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  const id = randomUUID();

  db.prepare(
    `INSERT INTO activities (id, institution_id, title, axis, prevention_theme, description, target_audience, courses, date, responsible_id, participants_count, evidence_notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    institutionId,
    str(formData, "title") || "",
    str(formData, "axis") || "PREVENCION",
    str(formData, "prevention_theme"),
    str(formData, "description"),
    str(formData, "target_audience"),
    str(formData, "courses"),
    str(formData, "date") || new Date().toISOString().slice(0, 10),
    session.user.id,
    formData.get("participants_count") ? Number(formData.get("participants_count")) : null,
    str(formData, "evidence_notes")
  );

  logAudit({ userId: session.user.id, action: "CREAR", entityType: "Activity", entityId: id, institutionId });
  revalidatePath("/actividades");
  redirect("/actividades");
}
