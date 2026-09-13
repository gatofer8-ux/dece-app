"use server";

import { db } from "@/lib/db";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { v4 as uuidv4 } from "uuid";

export async function saveCommunityRisk(formData: FormData) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);

  const id = formData.get("id") as string;
  const isNew = id === "nueva";

  const title = formData.get("title") as string;
  const riskType = formData.get("risk_type") as string;
  const severity = formData.get("severity") as string;
  const latitudeStr = formData.get("latitude") as string;
  const longitudeStr = formData.get("longitude") as string;
  const description = formData.get("description") as string | null;

  if (!title || !riskType || !severity || !latitudeStr || !longitudeStr) {
    throw new Error("Missing required fields (title, type, severity, latitude, longitude)");
  }

  const latitude = parseFloat(latitudeStr);
  const longitude = parseFloat(longitudeStr);

  if (isNew) {
    const newId = uuidv4();
    db.prepare(
      `INSERT INTO community_risks 
       (id, institution_id, title, risk_type, description, severity, latitude, longitude, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      newId,
      institutionId,
      title,
      riskType,
      description,
      severity,
      latitude,
      longitude,
      session.user.id
    );
  } else {
    db.prepare(
      `UPDATE community_risks 
       SET title = ?, risk_type = ?, description = ?, severity = ?, latitude = ?, longitude = ?, updated_at = datetime('now')
       WHERE id = ? AND institution_id = ?`
    ).run(
      title,
      riskType,
      description,
      severity,
      latitude,
      longitude,
      id,
      institutionId
    );
  }

  revalidatePath("/extramural/riesgos");
  revalidatePath("/extramural/mapa");
  redirect("/extramural/riesgos");
}
