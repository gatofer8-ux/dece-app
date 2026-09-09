"use server";

import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
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
export async function createUser(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireRole(["SUPERADMIN"]);
  const institutionId = requireInstitutionId(session);

  try {
    const id = randomUUID();
    const email = (str(formData, "email") || "").toLowerCase();
    const password = rawPassword(formData, "password");
    const role = str(formData, "role") || "DOCENTE";
    if (role === "DISTRITO") {
      return { error: "Las cuentas de distrito no se crean desde este módulo." };
    }
    if (!email) return { error: "El correo es obligatorio." };
    if (password.trim().length < 6) return { error: "La contraseña debe tener al menos 6 caracteres." };

    const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
    if (existing) {
      return { error: "Ya existe un usuario con ese correo electrónico." };
    }

    const passwordHash = await bcrypt.hash(password, 10);

    db.prepare(
      `INSERT INTO users (id, institution_id, name, email, password_hash, role, phone) VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(id, institutionId, str(formData, "name") || "", email, passwordHash, role, str(formData, "phone"));

    logAudit({ userId: session.user.id, action: "CREAR", entityType: "User", entityId: id, details: email, institutionId });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Ocurrió un error inesperado al crear el usuario." };
  }

  revalidatePath("/usuarios");
  redirect("/usuarios");
}

export async function toggleUserActive(id: string, active: boolean) {
  const session = await requireRole(["ADMIN"]);
  const institutionId = requireInstitutionId(session);
  db.prepare(`UPDATE users SET active=?, updated_at=datetime('now') WHERE id=? AND institution_id=?`).run(active ? 1 : 0, id, institutionId);
  logAudit({ userId: session.user.id, action: active ? "REACTIVAR" : "DESACTIVAR", entityType: "User", entityId: id, institutionId });
  revalidatePath("/usuarios");
}

/**
 * Solo SUPERADMIN puede eliminar usuarios.
 */
export async function deleteUser(id: string, _prevState: ActionState, _formData: FormData): Promise<ActionState> {
  const session = await requireRole(["SUPERADMIN"]);
  const institutionId = requireInstitutionId(session);
  if (id === session.user.id) {
    return { error: "No puedes eliminar tu propia cuenta." };
  }
  try {
    const result = db.prepare(`DELETE FROM users WHERE id=? AND institution_id=?`).run(id, institutionId);
    if (result.changes === 0) return { error: "Usuario no encontrado en tu institución." };
    logAudit({ userId: session.user.id, action: "ELIMINAR", entityType: "User", entityId: id, institutionId });
  } catch (err) {
    if (err instanceof Error && /FOREIGN KEY/i.test(err.message)) {
      return {
        error:
          "No se puede eliminar: este usuario ya tiene actividad registrada en el sistema (casos, fichas, derivaciones...). Desactívalo en su lugar para quitarle el acceso sin perder ese historial.",
      };
    }
    return { error: err instanceof Error ? err.message : "Ocurrió un error inesperado al eliminar el usuario." };
  }
  revalidatePath("/usuarios");
  return { error: null };
}

export async function resetPassword(id: string, _prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireRole(["ADMIN"]);
  const institutionId = requireInstitutionId(session);
  try {
    const password = rawPassword(formData, "password");
    if (password.trim().length < 6) return { error: "La contraseña debe tener al menos 6 caracteres." };
    const passwordHash = await bcrypt.hash(password, 10);
    const result = db
      .prepare(`UPDATE users SET password_hash=?, updated_at=datetime('now') WHERE id=? AND institution_id=?`)
      .run(passwordHash, id, institutionId);
    if (result.changes === 0) return { error: "Usuario no encontrado." };
    logAudit({ userId: session.user.id, action: "RESETEAR_CLAVE", entityType: "User", entityId: id, institutionId });
    revalidatePath("/usuarios");
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Ocurrió un error inesperado al restablecer la contraseña." };
  }
}
