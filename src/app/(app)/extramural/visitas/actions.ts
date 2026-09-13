"use server";

import { db } from "@/lib/db";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { v4 as uuidv4 } from "uuid";

export async function saveHomeVisit(formData: FormData) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);

  const id = formData.get("id") as string;
  const isNew = id === "nueva";

  const studentId = formData.get("student_id") as string;
  const visitDate = formData.get("visit_date") as string;
  const address = formData.get("address") as string;
  const status = formData.get("status") as string;
  
  // Optional fields
  const caseFileId = formData.get("case_file_id") as string | null;
  const latitude = formData.get("latitude") ? parseFloat(formData.get("latitude") as string) : null;
  const longitude = formData.get("longitude") ? parseFloat(formData.get("longitude") as string) : null;
  const housingConditions = formData.get("housing_conditions") as string | null;
  const familyDynamics = formData.get("family_dynamics") as string | null;

  if (!studentId || !visitDate || !address || !status) {
    throw new Error("Missing required fields");
  }

  if (isNew) {
    const newId = uuidv4();
    db.prepare(
      `INSERT INTO home_visits 
       (id, institution_id, case_file_id, student_id, professional_id, visit_date, address, latitude, longitude, housing_conditions, family_dynamics, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      newId,
      institutionId,
      caseFileId || null,
      studentId,
      session.user.id,
      visitDate,
      address,
      latitude,
      longitude,
      housingConditions,
      familyDynamics,
      status
    );
  } else {
    db.prepare(
      `UPDATE home_visits 
       SET visit_date = ?, address = ?, latitude = ?, longitude = ?, housing_conditions = ?, family_dynamics = ?, status = ?, updated_at = datetime('now')
       WHERE id = ? AND institution_id = ?`
    ).run(
      visitDate,
      address,
      latitude,
      longitude,
      housingConditions,
      familyDynamics,
      status,
      id,
      institutionId
    );
  }

  revalidatePath("/extramural/visitas");
  redirect("/extramural/visitas");
}
