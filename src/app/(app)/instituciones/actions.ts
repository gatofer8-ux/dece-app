"use server";

import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { logAudit } from "@/lib/audit";

const MAX_SEAL_BYTES = 800 * 1024; // 800 KB — el sello es una imagen pequeña (logo/membrete)

/** Convierte el archivo de sello subido en un data URI, o null si no se envió uno. */
async function readSealImage(formData: FormData): Promise<{ dataUri: string | null; error: string | null }> {
  const file = formData.get("seal_image");
  if (!(file instanceof File) || file.size === 0) return { dataUri: null, error: null };
  if (!file.type.startsWith("image/")) {
    return { dataUri: null, error: "El sello institucional debe ser una imagen (PNG o JPG)." };
  }
  if (file.size > MAX_SEAL_BYTES) {
    return { dataUri: null, error: "La imagen del sello es muy pesada (máximo 800 KB). Usa una versión más liviana." };
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  return { dataUri: `data:${file.type};base64,${buffer.toString("base64")}`, error: null };
}

function str(fd: FormData, key: string): string | null {
  const v = fd.get(key);
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length ? t : null;
}

/**
 * Lee un campo de contraseña SIN recortar espacios. Es importante no usar
 * str() aquí: si se recorta al crear la clave pero el login compara el
 * valor tal cual lo escribió el usuario (sin recortar), una contraseña con
 * un espacio accidental al final quedaría guardada sin él y el usuario
 * nunca podría volver a iniciar sesión con lo que realmente escribió.
 */
function rawPassword(fd: FormData, key: string): string {
  const v = fd.get(key);
  return typeof v === "string" ? v : "";
}

/** Solo SUPERADMIN puede crear/gestionar instituciones educativas. */
export async function createInstitution(formData: FormData) {
  const session = await requireRole(["SUPERADMIN"]);
  const id = randomUUID();

  db.prepare(
    `INSERT INTO institutions (id, name, amie_code, district, circuit, zona, address)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    str(formData, "name") || "",
    str(formData, "amie_code"),
    str(formData, "district"),
    str(formData, "circuit"),
    str(formData, "zona"),
    str(formData, "address")
  );

  logAudit({ userId: session.user.id, action: "CREAR", entityType: "Institution", entityId: id, details: str(formData, "name") });
  revalidatePath("/instituciones");
  redirect(`/instituciones/${id}`);
}

export async function updateInstitution(id: string, formData: FormData) {
  const session = await requireRole(["DISTRITO"]);
  const { dataUri: sealDataUri, error: sealError } = await readSealImage(formData);
  if (sealError) throw new Error(sealError);

  db.prepare(
    `UPDATE institutions SET name=@name, amie_code=@amie_code, district=@district, circuit=@circuit, zona=@zona, address=@address,
       seal_image=COALESCE(@seal_image, seal_image), updated_at=datetime('now')
     WHERE id=@id`
  ).run({
    id,
    name: str(formData, "name") || "",
    amie_code: str(formData, "amie_code"),
    district: str(formData, "district"),
    circuit: str(formData, "circuit"),
    zona: str(formData, "zona"),
    address: str(formData, "address"),
    seal_image: sealDataUri,
  });

  logAudit({ userId: session.user.id, action: "EDITAR", entityType: "Institution", entityId: id });
  revalidatePath("/instituciones");
  revalidatePath(`/instituciones/${id}`);
}

/**
 * Permite al ADMIN (coordinador/a DECE de su propia institución) subir el
 * sello/membrete institucional que se usará al imprimir los documentos
 * oficiales, sin necesitar que Distrito lo haga por él.
 */
export async function updateOwnInstitutionSeal(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  const { dataUri: sealDataUri, error: sealError } = await readSealImage(formData);
  if (sealError) return { error: sealError };
  if (!sealDataUri) return { error: "Selecciona una imagen para el sello institucional." };

  db.prepare(`UPDATE institutions SET seal_image=?, updated_at=datetime('now') WHERE id=?`).run(sealDataUri, institutionId);

  logAudit({ userId: session.user.id, action: "EDITAR", entityType: "Institution", entityId: institutionId, details: "Sello institucional actualizado" });
  revalidatePath("/institucion");
  return { error: null };
}

export async function updateOwnInstitutionDetails(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);

  const name = str(formData, "name");
  if (!name) return { error: "El nombre de la institución es obligatorio." };

  const { dataUri: sealDataUri, error: sealError } = await readSealImage(formData);
  if (sealError) return { error: sealError };

  db.prepare(
    `UPDATE institutions SET 
       name = @name, 
       amie_code = @amie_code, 
       district = @district, 
       circuit = @circuit, 
       zona = @zona, 
       address = @address,
       seal_image = COALESCE(@seal_image, seal_image),
       updated_at = datetime('now')
     WHERE id = @id`
  ).run({
    id: institutionId,
    name,
    amie_code: str(formData, "amie_code"),
    district: str(formData, "district"),
    circuit: str(formData, "circuit"),
    zona: str(formData, "zona"),
    address: str(formData, "address"),
    seal_image: sealDataUri,
  });

  logAudit({
    userId: session.user.id,
    action: "EDITAR",
    entityType: "Institution",
    entityId: institutionId,
    details: `Datos institucionales actualizados (${name})`,
  });

  revalidatePath("/institucion");
  revalidatePath("/dashboard");
  return { error: null };
}

export async function toggleInstitutionActive(id: string, active: boolean) {
  const session = await requireRole(["DISTRITO"]);
  db.prepare(`UPDATE institutions SET active=?, updated_at=datetime('now') WHERE id=?`).run(active ? 1 : 0, id);
  logAudit({ userId: session.user.id, action: active ? "REACTIVAR" : "DESACTIVAR", entityType: "Institution", entityId: id });
  revalidatePath("/instituciones");
  revalidatePath(`/instituciones/${id}`);
}

export type ActionState = { error: string | null };

/**
 * Antes esta acción lanzaba un `throw new Error(...)` ante cualquier
 * problema (por ejemplo, correo repetido). Next.js no tenía ninguna
 * pantalla de error personalizada, así que eso se veía como un error
 * genérico de la aplicación y el usuario pensaba que "no se pudo crear" —
 * aunque a veces el usuario sí se había creado en un intento anterior.
 * Ahora se devuelve el mensaje como parte del estado del formulario
 * (`useFormState` en el cliente) para mostrarlo junto al formulario, sin
 * romper la página.
 */
export async function createInstitutionUser(institutionId: string, _prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireRole(["SUPERADMIN"]);
  try {
    const id = randomUUID();
    const email = (str(formData, "email") || "").toLowerCase();
    const password = rawPassword(formData, "password");
    const role = str(formData, "role") || "ADMIN";
    if (role === "DISTRITO") {
      return { error: "Las cuentas de distrito no se crean desde este módulo." };
    }
    if (!email) return { error: "El correo es obligatorio." };
    if (password.trim().length < 6) return { error: "La contraseña debe tener al menos 6 caracteres." };

    const institution = db.prepare("SELECT id FROM institutions WHERE id = ?").get(institutionId);
    if (!institution) return { error: "Institución no encontrada." };

    const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
    if (existing) return { error: "Ya existe un usuario con ese correo electrónico." };

    const passwordHash = await bcrypt.hash(password, 10);

    db.prepare(
      `INSERT INTO users (id, institution_id, name, email, password_hash, role, phone) VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(id, institutionId, str(formData, "name") || "", email, passwordHash, role, str(formData, "phone"));

    logAudit({ userId: session.user.id, action: "CREAR", entityType: "User", entityId: id, details: email, institutionId });
    revalidatePath(`/instituciones/${institutionId}`);
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Ocurrió un error inesperado al crear el usuario." };
  }
}

/** DISTRITO activa/desactiva un usuario de cualquier institución del distrito. */
export async function toggleInstitutionUserActive(userId: string, institutionId: string, active: boolean) {
  const session = await requireRole(["DISTRITO"]);
  db.prepare(`UPDATE users SET active=?, updated_at=datetime('now') WHERE id=? AND institution_id=?`).run(
    active ? 1 : 0,
    userId,
    institutionId
  );
  logAudit({
    userId: session.user.id,
    action: active ? "REACTIVAR" : "DESACTIVAR",
    entityType: "User",
    entityId: userId,
    institutionId,
  });
  revalidatePath(`/instituciones/${institutionId}`);
}

/**
 * DISTRITO elimina definitivamente un usuario de cualquier institución. No
 * hay ON DELETE CASCADE hacia `users` a propósito: si el usuario ya
 * registró actividad, SQLite rechaza el borrado por la restricción de
 * clave foránea, y se lo informamos sugiriendo desactivarlo en su lugar.
 */
export async function deleteInstitutionUser(
  userId: string,
  institutionId: string,
  _prevState: ActionState,
  _formData: FormData
): Promise<ActionState> {
  const session = await requireRole(["SUPERADMIN"]);
  try {
    const result = db.prepare(`DELETE FROM users WHERE id=? AND institution_id=?`).run(userId, institutionId);
    if (result.changes === 0) return { error: "Usuario no encontrado en esta institución." };
    logAudit({ userId: session.user.id, action: "ELIMINAR", entityType: "User", entityId: userId, institutionId });
  } catch (err) {
    if (err instanceof Error && /FOREIGN KEY/i.test(err.message)) {
      return {
        error:
          "No se puede eliminar: este usuario ya tiene actividad registrada (casos, fichas, derivaciones...). Desactívalo en su lugar para quitarle el acceso sin perder ese historial.",
      };
    }
    return { error: err instanceof Error ? err.message : "Ocurrió un error inesperado al eliminar el usuario." };
  }
  revalidatePath(`/instituciones/${institutionId}`);
  return { error: null };
}

/**
 * Solo SUPERADMIN puede eliminar definitivamente una institución.
 */
export async function deleteInstitution(id: string, _prevState: ActionState, _formData: FormData): Promise<ActionState> {
  const session = await requireRole(["SUPERADMIN"]);
  try {
    const result = db.prepare(`DELETE FROM institutions WHERE id=?`).run(id);
    if (result.changes === 0) return { error: "Institución no encontrada." };
    logAudit({ userId: session.user.id, action: "ELIMINAR", entityType: "Institution", entityId: id });
  } catch (err) {
    if (err instanceof Error && /FOREIGN KEY/i.test(err.message)) {
      return {
        error:
          "No se puede eliminar: esta institución todavía tiene usuarios, estudiantes, casos u otros datos asociados. Usa el Panel de Superadministrador para eliminación en cascada.",
      };
    }
    return { error: err instanceof Error ? err.message : "Ocurrió un error inesperado al eliminar la institución." };
  }
  revalidatePath("/instituciones");
  redirect("/instituciones");
}

/** DISTRITO restablece la clave de un usuario de cualquier institución. */
export async function resetInstitutionUserPassword(
  userId: string,
  institutionId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await requireRole(["DISTRITO"]);
  try {
    const password = rawPassword(formData, "password");
    if (password.trim().length < 6) return { error: "La contraseña debe tener al menos 6 caracteres." };
    const passwordHash = await bcrypt.hash(password, 10);
    const result = db
      .prepare(`UPDATE users SET password_hash=?, updated_at=datetime('now') WHERE id=? AND institution_id=?`)
      .run(passwordHash, userId, institutionId);
    if (result.changes === 0) return { error: "Usuario no encontrado en esta institución." };
    logAudit({ userId: session.user.id, action: "RESETEAR_CLAVE", entityType: "User", entityId: userId, institutionId });
    revalidatePath(`/instituciones/${institutionId}`);
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Ocurrió un error inesperado al restablecer la contraseña." };
  }
}

/** Solo SUPERADMIN crea cuentas de distrito (institution_id nulo). */
export async function createDistrictUser(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireRole(["SUPERADMIN"]);
  try {
    const id = randomUUID();
    const email = (str(formData, "email") || "").toLowerCase();
    const password = rawPassword(formData, "password");
    if (!email) return { error: "El correo es obligatorio." };
    if (password.trim().length < 6) return { error: "La contraseña debe tener al menos 6 caracteres." };

    const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
    if (existing) return { error: "Ya existe un usuario con ese correo electrónico." };

    const passwordHash = await bcrypt.hash(password, 10);

    db.prepare(
      `INSERT INTO users (id, institution_id, name, email, password_hash, role, phone) VALUES (?, NULL, ?, ?, ?, 'DISTRITO', ?)`
    ).run(id, str(formData, "name") || "", email, passwordHash, str(formData, "phone"));

    logAudit({ userId: session.user.id, action: "CREAR", entityType: "User", entityId: id, details: email });
    revalidatePath("/instituciones");
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Ocurrió un error inesperado al crear el usuario." };
  }
}
