"use server";

import { db } from "@/lib/db";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { v4 as uuidv4 } from "uuid";

export async function saveSupportNetwork(formData: FormData) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);

  const id = formData.get("id") as string;
  const isNew = id === "nueva";

  const name = formData.get("name") as string;
  const type = formData.get("type") as string;
  const contactName = formData.get("contact_name") as string | null;
  const phone = formData.get("phone") as string | null;
  const email = formData.get("email") as string | null;
  const address = formData.get("address") as string | null;
  const latitude = formData.get("latitude") ? parseFloat(formData.get("latitude") as string) : null;
  const longitude = formData.get("longitude") ? parseFloat(formData.get("longitude") as string) : null;
  const agreements = formData.get("agreements") as string | null;

  if (!name || !type) {
    throw new Error("Missing required fields");
  }

  if (isNew) {
    const newId = uuidv4();
    db.prepare(
      `INSERT INTO support_networks 
       (id, institution_id, name, type, contact_name, phone, email, address, latitude, longitude, agreements)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      newId,
      institutionId,
      name,
      type,
      contactName,
      phone,
      email,
      address,
      latitude,
      longitude,
      agreements
    );
  } else {
    db.prepare(
      `UPDATE support_networks 
       SET name = ?, type = ?, contact_name = ?, phone = ?, email = ?, address = ?, latitude = ?, longitude = ?, agreements = ?, updated_at = datetime('now')
       WHERE id = ? AND institution_id = ?`
    ).run(
      name,
      type,
      contactName,
      phone,
      email,
      address,
      latitude,
      longitude,
      agreements,
      id,
      institutionId
    );
  }

  revalidatePath("/extramural/redes");
  revalidatePath("/extramural/mapa");
  redirect("/extramural/redes");
}
