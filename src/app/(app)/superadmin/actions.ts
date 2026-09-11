"use server";

import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import type { Role } from "@/lib/types";

function str(fd: FormData, key: string): string | null {
  const v = fd.get(key);
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length ? t : null;
}

function rawPassword(fd: FormData, key: string): string {
  const v = fd.get(key);
  return typeof v === "string" ? v : "";
}

function num(fd: FormData, key: string): number | null {
  const v = fd.get(key);
  if (!v) return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

/** Obtiene el desglose exacto de impacto antes de eliminar una institución */
export async function getInstitutionImpact(institutionId: string) {
  await requireRole(["SUPERADMIN"]);

  const inst = db.prepare("SELECT id, name FROM institutions WHERE id = ?").get(institutionId) as any;
  if (!inst) throw new Error("Institución no encontrada.");

  const usersCount = (db.prepare("SELECT COUNT(*) n FROM users WHERE institution_id = ?").get(institutionId) as any)?.n || 0;
  const studentsCount = (db.prepare("SELECT COUNT(*) n FROM students WHERE institution_id = ?").get(institutionId) as any)?.n || 0;
  const casesCount = (db.prepare("SELECT COUNT(*) n FROM case_files WHERE institution_id = ?").get(institutionId) as any)?.n || 0;
  const openCasesCount = (db.prepare("SELECT COUNT(*) n FROM case_files WHERE institution_id = ? AND status != 'CERRADO'").get(institutionId) as any)?.n || 0;
  const alertsCount = (db.prepare("SELECT COUNT(*) n FROM teacher_alerts WHERE institution_id = ?").get(institutionId) as any)?.n || 0;
  const appointmentsCount = (db.prepare("SELECT COUNT(*) n FROM appointments WHERE institution_id = ?").get(institutionId) as any)?.n || 0;

  return {
    institutionName: inst.name,
    usersCount,
    studentsCount,
    casesCount,
    openCasesCount,
    alertsCount,
    appointmentsCount,
  };
}

/** Obtiene el desglose de impacto antes de eliminar un usuario */
export async function getUserImpact(userId: string) {
  await requireRole(["SUPERADMIN"]);

  const user = db.prepare(`
    SELECT u.id, u.name, u.email, u.role, u.institution_id, i.name as institution_name
    FROM users u
    LEFT JOIN institutions i ON i.id = u.institution_id
    WHERE u.id = ?
  `).get(userId) as any;

  if (!user) throw new Error("Usuario no encontrado.");

  const casesOpened = (db.prepare("SELECT COUNT(*) n FROM case_files WHERE opened_by_id = ?").get(userId) as any)?.n || 0;
  const casesAssigned = (db.prepare("SELECT COUNT(*) n FROM case_files WHERE assigned_to_id = ?").get(userId) as any)?.n || 0;
  const actionsCount = (db.prepare("SELECT COUNT(*) n FROM case_actions WHERE author_id = ?").get(userId) as any)?.n || 0;
  const alertsCount = (db.prepare("SELECT COUNT(*) n FROM teacher_alerts WHERE reported_by_id = ?").get(userId) as any)?.n || 0;

  return {
    userName: user.name,
    userEmail: user.email,
    userRole: user.role,
    institutionName: user.institution_name || "Nivel Central / Distrito",
    casesOpened,
    casesAssigned,
    actionsCount,
    alertsCount,
  };
}

/** Elimina una institución completa en cascada tras confirmar contraseña de superadmin */
export async function deleteInstitutionSecure(data: {
  institutionId: string;
  password: string;
}) {
  const session = await requireRole(["SUPERADMIN"]);
  const { institutionId, password } = data;

  // 1. Validar contraseña del superadministrador
  const currentUser = db.prepare("SELECT password_hash FROM users WHERE id = ?").get(session.user.id) as any;
  if (!currentUser) return { success: false, error: "Usuario de sesión no encontrado." };

  const validPassword = await bcrypt.compare(password, currentUser.password_hash);
  if (!validPassword) {
    return { success: false, error: "Contraseña incorrecta. La acción destructiva fue rechazada." };
  }

  const inst = db.prepare("SELECT name FROM institutions WHERE id = ?").get(institutionId) as any;
  if (!inst) return { success: false, error: "Institución no encontrada." };

  // Validar si la institución tiene registros dependientes
  const usersCount = (db.prepare("SELECT COUNT(*) as c FROM users WHERE institution_id = ?").get(institutionId) as any)?.c || 0;
  const casesCount = (db.prepare("SELECT COUNT(*) as c FROM case_files WHERE institution_id = ?").get(institutionId) as any)?.c || 0;
  const studentsCount = (db.prepare("SELECT COUNT(*) as c FROM students WHERE institution_id = ?").get(institutionId) as any)?.c || 0;

  if (usersCount > 0 || casesCount > 0 || studentsCount > 0) {
    return {
      success: false,
      error: `No se puede eliminar permanentemente la institución porque tiene ${usersCount} usuarios, ${casesCount} casos y ${studentsCount} estudiantes asociados. Use la opción de desactivar.`,
    };
  }

  try {
    db.transaction(() => {
      // Eliminar registros dependientes en orden limpio
      db.prepare("DELETE FROM case_closure_reports WHERE institution_id = ?").run(institutionId);
      db.prepare("DELETE FROM restorative_circle_consents WHERE institution_id = ?").run(institutionId);
      db.prepare("DELETE FROM course_board_reports WHERE institution_id = ?").run(institutionId);
      db.prepare("DELETE FROM annual_management_reports WHERE institution_id = ?").run(institutionId);
      db.prepare("DELETE FROM bimonthly_reports WHERE institution_id = ?").run(institutionId);
      db.prepare("DELETE FROM action_plans WHERE institution_id = ?").run(institutionId);
      db.prepare("DELETE FROM case_corresponsibility_acts WHERE institution_id = ?").run(institutionId);
      db.prepare("DELETE FROM dece_distributivo_assignments WHERE distributivo_id IN (SELECT id FROM dece_distributivos WHERE institution_id = ?)").run(institutionId);
      db.prepare("DELETE FROM dece_distributivos WHERE institution_id = ?").run(institutionId);
      db.prepare("DELETE FROM institution_course_quotas WHERE institution_id = ?").run(institutionId);
      db.prepare("DELETE FROM violence_reports WHERE institution_id = ?").run(institutionId);
      db.prepare("DELETE FROM socialization_acts WHERE institution_id = ?").run(institutionId);
      db.prepare("DELETE FROM authority_advisory_acts WHERE institution_id = ?").run(institutionId);
      db.prepare("DELETE FROM situational_reports WHERE institution_id = ?").run(institutionId);
      db.prepare("DELETE FROM daily_attentions WHERE institution_id = ?").run(institutionId);
      db.prepare("DELETE FROM case_call_logs WHERE institution_id = ?").run(institutionId);
      db.prepare("DELETE FROM case_care_followups WHERE institution_id = ?").run(institutionId);
      db.prepare("DELETE FROM case_advisory_logs WHERE institution_id = ?").run(institutionId);
      db.prepare("DELETE FROM case_care_plans WHERE institution_id = ?").run(institutionId);
      db.prepare("DELETE FROM case_restitution_plans WHERE institution_id = ?").run(institutionId);
      db.prepare("DELETE FROM case_observation_sheets WHERE institution_id = ?").run(institutionId);
      db.prepare("DELETE FROM case_interviews WHERE institution_id = ?").run(institutionId);
      db.prepare("DELETE FROM case_risk_matrix_entries WHERE institution_id = ?").run(institutionId);

      // Eliminar acciones e intervenciones ligadas a casos de esta institucion
      db.prepare("DELETE FROM case_actions WHERE case_id IN (SELECT id FROM case_files WHERE institution_id = ?)").run(institutionId);
      db.prepare("DELETE FROM referrals WHERE case_id IN (SELECT id FROM case_files WHERE institution_id = ?)").run(institutionId);
      db.prepare("DELETE FROM intervention_plans WHERE case_id IN (SELECT id FROM case_files WHERE institution_id = ?)").run(institutionId);

      db.prepare("DELETE FROM teacher_alerts WHERE institution_id = ?").run(institutionId);
      db.prepare("DELETE FROM appointment_requests WHERE institution_id = ?").run(institutionId);
      db.prepare("DELETE FROM professional_schedule_slots WHERE institution_id = ?").run(institutionId);
      db.prepare("DELETE FROM appointments WHERE institution_id = ?").run(institutionId);
      db.prepare("DELETE FROM attachments WHERE institution_id = ?").run(institutionId);
      db.prepare("DELETE FROM student_enrollments WHERE institution_id = ?").run(institutionId);
      db.prepare("DELETE FROM case_files WHERE institution_id = ?").run(institutionId);
      db.prepare("DELETE FROM students WHERE institution_id = ?").run(institutionId);
      db.prepare("DELETE FROM school_years WHERE institution_id = ?").run(institutionId);

      // Chat
      db.prepare("DELETE FROM chat_messages WHERE channel_id IN (SELECT id FROM chat_channels WHERE institution_id = ?)").run(institutionId);
      db.prepare("DELETE FROM chat_channel_members WHERE channel_id IN (SELECT id FROM chat_channels WHERE institution_id = ?)").run(institutionId);
      db.prepare("DELETE FROM chat_channels WHERE institution_id = ?").run(institutionId);

      // Report templates
      db.prepare("DELETE FROM report_template_mappings WHERE template_id IN (SELECT id FROM report_templates WHERE institution_id = ?)").run(institutionId);
      db.prepare("DELETE FROM report_generation_history WHERE institution_id = ?").run(institutionId);
      db.prepare("DELETE FROM report_templates WHERE institution_id = ?").run(institutionId);

      // Delegations & push
      db.prepare("DELETE FROM dece_coordinator_delegations WHERE institution_id = ?").run(institutionId);
      db.prepare("DELETE FROM push_subscriptions WHERE user_id IN (SELECT id FROM users WHERE institution_id = ?)").run(institutionId);
      db.prepare("DELETE FROM audit_logs WHERE institution_id = ?").run(institutionId);

      // Usuarios de la institución
      db.prepare("DELETE FROM users WHERE institution_id = ?").run(institutionId);

      // Institución
      db.prepare("DELETE FROM institutions WHERE id = ?").run(institutionId);
    })();

    logAudit({
      userId: session.user.id,
      action: "ELIMINAR_INSTITUCION_CASCADA",
      entityType: "Institution",
      entityId: institutionId,
      details: `Institución "${inst.name}" y todos sus usuarios y casos asociados fueron eliminados definitivamente en cascada.`,
    });

    revalidatePath("/superadmin");
    revalidatePath("/instituciones");
    revalidatePath("/dashboard");
    return { success: true, error: null };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Ocurrió un error inesperado al eliminar la institución.",
    };
  }
}

/** Elimina un usuario individual tras confirmar contraseña de superadmin */
export async function deleteUserSecure(data: {
  userId: string;
  password: string;
}) {
  const session = await requireRole(["SUPERADMIN"]);
  const { userId, password } = data;

  if (userId === session.user.id) {
    return { success: false, error: "No puedes eliminar tu propia cuenta de superadministrador." };
  }

  // 1. Validar contraseña del superadministrador
  const currentUser = db.prepare("SELECT password_hash FROM users WHERE id = ?").get(session.user.id) as any;
  if (!currentUser) return { success: false, error: "Usuario de sesión no encontrado." };

  const validPassword = await bcrypt.compare(password, currentUser.password_hash);
  if (!validPassword) {
    return { success: false, error: "Contraseña incorrecta. Acción cancelada por seguridad." };
  }

  const targetUser = db.prepare("SELECT id, name, email, institution_id FROM users WHERE id = ?").get(userId) as any;
  if (!targetUser) return { success: false, error: "Usuario no encontrado." };

  // 2. Validar si el usuario tiene registros dependientes históricos
  const casesOpened = (db.prepare("SELECT COUNT(*) as c FROM case_files WHERE opened_by_id = ?").get(userId) as any)?.c || 0;
  const casesAssigned = (db.prepare("SELECT COUNT(*) as c FROM case_files WHERE assigned_to_id = ?").get(userId) as any)?.c || 0;
  const actionsCreated = (db.prepare("SELECT COUNT(*) as c FROM case_actions WHERE created_by = ?").get(userId) as any)?.c || 0;
  const actsCount = (db.prepare("SELECT COUNT(*) as c FROM case_corresponsibility_acts WHERE created_by = ?").get(userId) as any)?.c || 0;
  const closureCount = (db.prepare("SELECT COUNT(*) as c FROM case_closure_reports WHERE dece_user_id = ?").get(userId) as any)?.c || 0;
  let alertsCount = 0;
  try {
    alertsCount = (db.prepare("SELECT COUNT(*) as c FROM case_alert_notifications WHERE created_by = ?").get(userId) as any)?.c || 0;
  } catch (e) {}

  const totalCases = casesOpened + casesAssigned;
  const totalDocs = actionsCreated + actsCount + closureCount + alertsCount;

  if (totalCases > 0 || totalDocs > 0) {
    return {
      success: false,
      error: `No se puede eliminar permanentemente porque tiene ${totalCases} casos y ${totalDocs} documentos asociados. Use la opción de desactivar.`,
    };
  }

  try {
    db.transaction(() => {
      // Limpiar referencias para evitar violación de FKs
      db.prepare("DELETE FROM dece_coordinator_delegations WHERE delegated_user_id = ? OR delegator_user_id = ?").run(userId, userId);
      db.prepare("DELETE FROM push_subscriptions WHERE user_id = ?").run(userId);
      db.prepare("DELETE FROM chat_channel_members WHERE user_id = ?").run(userId);
      db.prepare("DELETE FROM chat_messages WHERE sender_id = ?").run(userId);
      db.prepare("DELETE FROM professional_schedule_slots WHERE professional_id = ?").run(userId);
      db.prepare("DELETE FROM dece_distributivo_assignments WHERE user_id = ?").run(userId);

      // Reasignar casos asignados a NULL
      db.prepare("UPDATE case_files SET assigned_to_id = NULL WHERE assigned_to_id = ?").run(userId);
      
      // Si fue el autor que abrió casos, reasignar a superadmin para preservar el caso
      db.prepare("UPDATE case_files SET opened_by_id = ? WHERE opened_by_id = ?").run(session.user.id, userId);

      // Limpiar audit logs directos de este usuario para permitir borrado limpio
      db.prepare("DELETE FROM audit_logs WHERE user_id = ?").run(userId);

      // Eliminar de users
      db.prepare("DELETE FROM users WHERE id = ?").run(userId);
    })();

    logAudit({
      userId: session.user.id,
      action: "ELIMINAR_USUARIO_SUPERADMIN",
      entityType: "User",
      entityId: userId,
      institutionId: targetUser.institution_id,
      details: `Usuario ${targetUser.name} (${targetUser.email}) eliminado por el Superadministrador.`,
    });

    revalidatePath("/superadmin");
    revalidatePath("/usuarios");
    revalidatePath("/instituciones");
    return { success: true, error: null };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Ocurrió un error inesperado al eliminar el usuario.",
    };
  }
}

/** Crea una institución educativa desde el panel de superadministrador */
export async function createInstitutionAction(formData: FormData) {
  const session = await requireRole(["SUPERADMIN"]);
  const name = str(formData, "name");
  if (!name) return { error: "El nombre de la institución es obligatorio." };

  const id = randomUUID();
  const active = str(formData, "active") === "0" ? 0 : 1;
  const deletedAt = active === 0 ? new Date().toISOString() : null;

  try {
    db.prepare(`
      INSERT INTO institutions (id, name, amie_code, district, circuit, zona, address, active, deleted_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      name,
      str(formData, "amie_code"),
      str(formData, "district"),
      str(formData, "circuit"),
      str(formData, "zona"),
      str(formData, "address"),
      active,
      deletedAt
    );

    logAudit({
      userId: session.user.id,
      action: "CREAR_INSTITUCION_SUPERADMIN",
      entityType: "Institution",
      entityId: id,
      details: `${name} (Estado: ${active === 1 ? "Activa" : "Suspendida"})`,
    });

    revalidatePath("/superadmin");
    revalidatePath("/instituciones");
    return { success: true, error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Error al crear la institución." };
  }
}

/** Crea un usuario de cualquier rol y lo asigna a cualquier institución desde el panel */
export async function createUserAction(formData: FormData) {
  const session = await requireRole(["SUPERADMIN"]);

  const name = str(formData, "name");
  const email = (str(formData, "email") || "").toLowerCase();
  const password = rawPassword(formData, "password");
  const role = (str(formData, "role") || "DECE") as Role;
  const institutionId = str(formData, "institution_id");
  const phone = str(formData, "phone");

  if (!name) return { error: "El nombre es obligatorio." };
  if (!email) return { error: "El correo es obligatorio." };
  if (password.length < 6) return { error: "La contraseña debe tener al menos 6 caracteres." };

  // Roles institucionales exigen institución
  if (["ADMIN", "DECE", "AUTORIDAD", "DOCENTE"].includes(role) && !institutionId) {
    return { error: "Para este rol debes seleccionar una institución educativa." };
  }

  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
  if (existing) {
    return { error: "Ya existe un usuario con ese correo electrónico en el sistema." };
  }

  try {
    const id = randomUUID();
    const passwordHash = await bcrypt.hash(password, 10);
    const assignedInstitution = (role === "SUPERADMIN" || role === "DISTRITO") && !institutionId ? null : institutionId;

    const subType = str(formData, "subscription_type") || "prueba"; // "prueba" | "paquete" | "ninguna"
    const trialDays = Number(str(formData, "trial_days") || "30");
    const trialPrice = num(formData, "trial_price") !== null ? (num(formData, "trial_price") || 0) : 0;
    const packageId = str(formData, "package_id");
    const customPrice = num(formData, "custom_price");
    const customMonths = num(formData, "custom_months");
    const customEndDate = str(formData, "custom_end_date");

    const today = new Date().toISOString().split("T")[0];
    const isDemo = assignedInstitution === "demo-los-alamos" || email.includes("losalamos") || email.includes("demo");
    const active = str(formData, "active") === "0" ? 0 : 1;
    const deletedAt = active === 0 ? new Date().toISOString() : null;

    db.transaction(() => {
      // 1. Crear el usuario
      db.prepare(`
        INSERT INTO users (id, institution_id, name, email, password_hash, role, phone, active, deleted_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, assignedInstitution, name, email, passwordHash, role, phone, active, deletedAt);

      // 2. Crear suscripción individual
      let status: "activo" | "en_prueba" | "suspendido" | "demo" = "activo";
      let billingType = "paquete";
      let pkgId: string | null = null;
      let pkgName = "Plan Anual Completo";
      let frozenPrice = 0.00;
      let durationMonths = 12;
      let durationDays = 365;
      let endDate: string | null = null;
      let trialDaysCount = 0;
      let notes = "Alta de usuario en el sistema";

      if (isDemo) {
        status = "demo";
        billingType = "demo";
        pkgName = "Cuenta Demo";
        frozenPrice = 0.00;
        durationMonths = 0;
        durationDays = 0;
        endDate = null;
        notes = "Usuario de institución demo (no facturable)";
      } else if (role === "SUPERADMIN") {
        status = "activo";
        billingType = "personalizado";
        pkgName = "Superadministrador Permanente";
        frozenPrice = 0.00;
        durationMonths = 120;
        durationDays = 3650;
        endDate = null;
        notes = "Acceso administrativo permanente sin caducidad";
      } else if (subType === "prueba") {
        status = "en_prueba";
        billingType = "prueba";
        trialDaysCount = trialDays > 0 ? trialDays : 30;
        frozenPrice = trialPrice >= 0 ? trialPrice : 0.00;
        pkgName = frozenPrice > 0
          ? `Periodo de Prueba Especial ($${frozenPrice.toFixed(2)} · ${trialDaysCount} días)`
          : `Periodo de Prueba (${trialDaysCount} días)`;
        durationMonths = Math.ceil(trialDaysCount / 30);
        durationDays = trialDaysCount;

        if (customEndDate) {
          endDate = customEndDate;
        } else {
          const d = new Date(today + "T00:00:00");
          d.setDate(d.getDate() + trialDaysCount);
          endDate = d.toISOString().split("T")[0];
        }
        notes = `Periodo de prueba (${trialDaysCount} días, tarifa congelada: $${frozenPrice.toFixed(2)})`;
      } else if (subType === "paquete") {
        const pkg = db.prepare("SELECT * FROM subscription_packages WHERE id = ?").get(packageId || "pkg-anual") as any;
        if (pkg) {
          status = "activo";
          billingType = "paquete";
          pkgId = pkg.id;
          pkgName = pkg.name;
          frozenPrice = customPrice !== null && customPrice !== undefined && customPrice >= 0 ? customPrice : pkg.price;
          durationMonths = customMonths !== null && customMonths !== undefined && customMonths > 0 ? customMonths : pkg.duration_months;
          durationDays = durationMonths * 30;

          if (customEndDate) {
            endDate = customEndDate;
          } else {
            const d = new Date(today + "T00:00:00");
            d.setMonth(d.getMonth() + durationMonths);
            endDate = d.toISOString().split("T")[0];
          }
          notes = `Asignación de paquete comercial ${pkg.name} ($${frozenPrice.toFixed(2)}, ${durationMonths} meses)`;
        }
      } else {
        // Ninguna / Inactivo
        status = "suspendido";
        billingType = "personalizado";
        pkgName = "Sin Suscripción Activa";
        frozenPrice = 0.00;
        durationMonths = 0;
        durationDays = 0;
        endDate = today;
        notes = "Usuario creado sin suscripción activa (solo lectura)";
      }

      db.prepare(`
        INSERT INTO user_subscriptions (
          id, user_id, status, package_id, package_name, billing_type,
          frozen_price, frozen_duration_months, frozen_duration_days,
          start_date, end_date, trial_days, is_demo,
          last_renewed_at, last_renewed_by, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), ?, ?)
      `).run(
        randomUUID(), id, status, pkgId, pkgName, billingType,
        frozenPrice, durationMonths, durationDays,
        today, endDate, trialDaysCount, isDemo ? 1 : 0,
        session.user.id, notes
      );

      db.prepare(`
        INSERT INTO user_subscription_history (
          id, user_id, institution_id_snapshot, event_type, billing_type,
          package_id, package_name, frozen_price, start_date, end_date,
          executed_by_id, reason
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        randomUUID(), id, assignedInstitution,
        status === "en_prueba" ? "ACTIVACION_PRUEBA" : "ALTA_INICIAL",
        billingType, pkgId, pkgName, frozenPrice, today, endDate,
        session.user.id, notes
      );
    })();

    logAudit({
      userId: session.user.id,
      action: "CREAR_USUARIO_SUPERADMIN",
      entityType: "User",
      entityId: id,
      institutionId: assignedInstitution,
      details: `Usuario ${name} (${email}) creado con rol ${role} y suscripción inicial: ${subType}`,
    });

    revalidatePath("/superadmin");
    revalidatePath("/usuarios");
    revalidatePath("/instituciones");
    return { success: true, error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Error al crear el usuario." };
  }
}

/** Activa o desactiva una institución */
export async function toggleInstitutionActiveSuperadmin(institutionId: string, active: boolean) {
  const session = await requireRole(["SUPERADMIN"]);
  db.prepare("UPDATE institutions SET active = ?, updated_at = datetime('now') WHERE id = ?").run(active ? 1 : 0, institutionId);
  logAudit({
    userId: session.user.id,
    action: active ? "REACTIVAR" : "DESACTIVAR",
    entityType: "Institution",
    entityId: institutionId,
  });
  revalidatePath("/superadmin");
  revalidatePath("/instituciones");
}

/** Activa o desactiva un usuario */
export async function toggleUserActiveSuperadmin(userId: string, active: boolean) {
  const session = await requireRole(["SUPERADMIN"]);
  db.prepare("UPDATE users SET active = ?, updated_at = datetime('now') WHERE id = ?").run(active ? 1 : 0, userId);
  logAudit({
    userId: session.user.id,
    action: active ? "REACTIVAR" : "DESACTIVAR",
    entityType: "User",
    entityId: userId,
  });
  revalidatePath("/superadmin");
  revalidatePath("/usuarios");
}

/** Restablece la contraseña de cualquier usuario */
export async function resetUserPasswordSuperadmin(userId: string, password: string) {
  const session = await requireRole(["SUPERADMIN"]);
  if (!password || password.length < 6) {
    return { error: "La contraseña debe tener al menos 6 caracteres." };
  }
  const passwordHash = await bcrypt.hash(password, 10);
  db.prepare("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?").run(passwordHash, userId);
  logAudit({
    userId: session.user.id,
    action: "RESETEAR_CLAVE",
    entityType: "User",
    entityId: userId,
    details: "Contraseña restablecida por Superadministrador",
  });
  revalidatePath("/superadmin");
  return { success: true, error: null };
}

/** Desactiva lógicamente un usuario (Soft Delete) */
export async function deactivateUserAction(userId: string) {
  const session = await requireRole(["SUPERADMIN"]);
  if (userId === session.user.id) {
    return { success: false, error: "No puedes desactivar tu propia cuenta de superadministrador." };
  }
  const user = db.prepare("SELECT name, email, institution_id FROM users WHERE id = ?").get(userId) as any;
  if (!user) return { success: false, error: "Usuario no encontrado." };

  db.prepare("UPDATE users SET active = 0, deleted_at = datetime('now'), updated_at = datetime('now') WHERE id = ?").run(userId);
  logAudit({
    userId: session.user.id,
    action: "DESACTIVAR_USUARIO",
    entityType: "User",
    entityId: userId,
    institutionId: user.institution_id,
    details: `Usuario ${user.name} (${user.email}) desactivado lógicamente. Sus expedientes y registros históricos se conservan intactos.`,
  });

  revalidatePath("/superadmin");
  revalidatePath("/usuarios");
  return { success: true, message: "El usuario fue desactivado. Sus casos y registros históricos se conservan intactos." };
}

/** Reactiva un usuario desactivado */
export async function reactivateUserAction(userId: string) {
  const session = await requireRole(["SUPERADMIN"]);
  const user = db.prepare("SELECT name, email, institution_id FROM users WHERE id = ?").get(userId) as any;
  if (!user) return { success: false, error: "Usuario no encontrado." };

  db.prepare("UPDATE users SET active = 1, deleted_at = NULL, updated_at = datetime('now') WHERE id = ?").run(userId);
  logAudit({
    userId: session.user.id,
    action: "REACTIVAR_USUARIO",
    entityType: "User",
    entityId: userId,
    institutionId: user.institution_id,
    details: `Usuario ${user.name} (${user.email}) reactivado por el Superadministrador.`,
  });

  revalidatePath("/superadmin");
  revalidatePath("/usuarios");
  return { success: true, message: "El usuario fue reactivado con éxito." };
}

/** Desactiva lógicamente una institución */
export async function deactivateInstitutionAction(institutionId: string) {
  const session = await requireRole(["SUPERADMIN"]);
  const inst = db.prepare("SELECT name FROM institutions WHERE id = ?").get(institutionId) as any;
  if (!inst) return { success: false, error: "Institución no encontrada." };

  db.prepare("UPDATE institutions SET active = 0, deleted_at = datetime('now'), updated_at = datetime('now') WHERE id = ?").run(institutionId);
  logAudit({
    userId: session.user.id,
    action: "DESACTIVAR_INSTITUCION",
    entityType: "Institution",
    entityId: institutionId,
    details: `Institución "${inst.name}" desactivada lógicamente.`,
  });

  revalidatePath("/superadmin");
  revalidatePath("/instituciones");
  return { success: true, message: "La institución fue desactivada. Los datos y expedientes se conservan intactos." };
}

/** Reactiva una institución desactivada */
export async function reactivateInstitutionAction(institutionId: string) {
  const session = await requireRole(["SUPERADMIN"]);
  const inst = db.prepare("SELECT name FROM institutions WHERE id = ?").get(institutionId) as any;
  if (!inst) return { success: false, error: "Institución no encontrada." };

  db.prepare("UPDATE institutions SET active = 1, deleted_at = NULL, updated_at = datetime('now') WHERE id = ?").run(institutionId);
  logAudit({
    userId: session.user.id,
    action: "REACTIVAR_INSTITUCION",
    entityType: "Institution",
    entityId: institutionId,
    details: `Institución "${inst.name}" reactivada por el Superadministrador.`,
  });

  revalidatePath("/superadmin");
  revalidatePath("/instituciones");
  return { success: true, message: "La institución fue reactivada con éxito." };
}

/** Actualiza todos los datos de un usuario existente */
export async function updateUserAction(formData: FormData) {
  const session = await requireRole(["SUPERADMIN"]);

  const id = str(formData, "id");
  if (!id) return { error: "ID de usuario no proporcionado." };

  const name = str(formData, "name");
  const email = (str(formData, "email") || "").toLowerCase();
  const role = (str(formData, "role") || "DECE") as Role;
  const institutionId = str(formData, "institution_id");
  const phone = str(formData, "phone");
  const activeStr = str(formData, "active");
  const newPassword = rawPassword(formData, "new_password");

  if (!name) return { error: "El nombre es obligatorio." };
  if (!email) return { error: "El correo es obligatorio." };

  // Validar rol institucional
  if (["ADMIN", "DECE", "AUTORIDAD", "DOCENTE"].includes(role) && !institutionId) {
    return { error: "Para este rol debes seleccionar una institución educativa." };
  }

  // Validar unicidad del correo electrónico excluyendo al propio usuario
  const duplicate = db.prepare("SELECT id FROM users WHERE email = ? AND id != ?").get(email, id);
  if (duplicate) {
    return { error: "Ya existe otro usuario con ese correo electrónico en el sistema." };
  }

  // Si se intenta desactivar al superadmin actual
  const active = activeStr === "0" ? 0 : 1;
  if (id === session.user.id && active === 0) {
    return { error: "No puedes desactivar tu propia cuenta de superadministrador." };
  }

  // Si se ingresó una nueva contraseña, validar longitud mínima
  if (newPassword && newPassword.length > 0 && newPassword.length < 6) {
    return { error: "La nueva contraseña debe tener al menos 6 caracteres." };
  }

  const assignedInstitution = (role === "SUPERADMIN" || role === "DISTRITO") && !institutionId ? null : institutionId;

  try {
    if (newPassword && newPassword.length >= 6) {
      const passwordHash = await bcrypt.hash(newPassword, 10);
      db.prepare(`
        UPDATE users 
        SET name = ?, email = ?, role = ?, institution_id = ?, phone = ?, active = ?,
            deleted_at = CASE WHEN ? = 0 THEN COALESCE(deleted_at, datetime('now')) ELSE NULL END,
            password_hash = ?,
            updated_at = datetime('now')
        WHERE id = ?
      `).run(name, email, role, assignedInstitution, phone, active, active, passwordHash, id);
    } else {
      db.prepare(`
        UPDATE users 
        SET name = ?, email = ?, role = ?, institution_id = ?, phone = ?, active = ?,
            deleted_at = CASE WHEN ? = 0 THEN COALESCE(deleted_at, datetime('now')) ELSE NULL END,
            updated_at = datetime('now')
        WHERE id = ?
      `).run(name, email, role, assignedInstitution, phone, active, active, id);
    }

    logAudit({
      userId: session.user.id,
      action: "ACTUALIZAR_DATOS_USUARIO",
      entityType: "User",
      entityId: id,
      institutionId: assignedInstitution || undefined,
      details: `Actualizados datos del usuario ${name} (${email}, Rol: ${role}, Estado: ${active === 1 ? "Activo" : "Suspendido"}${newPassword ? ", Contraseña actualizada" : ""})`,
    });

    revalidatePath("/superadmin");
    revalidatePath("/usuarios");
    return { success: true, error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Error al actualizar los datos del usuario." };
  }
}

/** Actualiza todos los datos de una institución existente */
export async function updateInstitutionAction(formData: FormData) {
  const session = await requireRole(["SUPERADMIN"]);

  const id = str(formData, "id");
  if (!id) return { error: "ID de institución no proporcionado." };

  const name = str(formData, "name");
  if (!name) return { error: "El nombre de la institución es obligatorio." };

  const amieCode = str(formData, "amie_code");
  const district = str(formData, "district");
  const circuit = str(formData, "circuit");
  const zona = str(formData, "zona");
  const address = str(formData, "address");
  const activeStr = str(formData, "active");
  const active = activeStr === "0" ? 0 : 1;

  try {
    db.prepare(`
      UPDATE institutions
      SET name = ?, amie_code = ?, district = ?, circuit = ?, zona = ?, address = ?, active = ?,
          deleted_at = CASE WHEN ? = 0 THEN COALESCE(deleted_at, datetime('now')) ELSE NULL END,
          updated_at = datetime('now')
      WHERE id = ?
    `).run(name, amieCode, district, circuit, zona, address, active, active, id);

    logAudit({
      userId: session.user.id,
      action: "ACTUALIZAR_DATOS_INSTITUCION",
      entityType: "Institution",
      entityId: id,
      details: `Actualizada institución "${name}" (AMIE: ${amieCode || "N/A"}, Estado: ${active === 1 ? "Activa" : "Suspendida"})`,
    });

    revalidatePath("/superadmin");
    revalidatePath("/instituciones");
    return { success: true, error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Error al actualizar los datos de la institución." };
  }
}

/**
 * Consulta en tiempo real los registros de auditoría del sistema para el Superadministrador,
 * permitiendo filtrar con precisión por institución, usuario, tipo de acción, entidad o búsqueda libre.
 */
export async function getSuperadminAuditLogsAction(filters?: {
  institutionId?: string;
  userId?: string;
  action?: string;
  entityType?: string;
  search?: string;
  limit?: number;
}) {
  await requireRole(["SUPERADMIN"]);

  let where = "WHERE 1=1";
  const params: any[] = [];

  if (filters?.institutionId && filters.institutionId !== "TODAS") {
    if (filters.institutionId === "GLOBAL_DISTRITO") {
      where += " AND (a.institution_id IS NULL AND u.institution_id IS NULL)";
    } else {
      where += " AND (a.institution_id = ? OR u.institution_id = ?)";
      params.push(filters.institutionId, filters.institutionId);
    }
  }

  if (filters?.userId && filters.userId !== "TODOS") {
    where += " AND a.user_id = ?";
    params.push(filters.userId);
  }

  if (filters?.action && filters.action !== "TODAS") {
    where += " AND a.action = ?";
    params.push(filters.action);
  }

  if (filters?.entityType && filters.entityType !== "TODAS") {
    where += " AND a.entity_type = ?";
    params.push(filters.entityType);
  }

  if (filters?.search?.trim()) {
    const q = `%${filters.search.trim()}%`;
    where += " AND (a.details LIKE ? OR a.entity_id LIKE ? OR a.entity_type LIKE ? OR u.name LIKE ? OR u.email LIKE ? OR i.name LIKE ? OR ui.name LIKE ?)";
    params.push(q, q, q, q, q, q, q);
  }

  const limit = Math.min(Math.max(Number(filters?.limit) || 500, 50), 2000);

  try {
    const logs = db
      .prepare(`
        SELECT a.id,
               a.user_id,
               COALESCE(a.institution_id, u.institution_id) as institution_id,
               a.action,
               a.entity_type,
               a.entity_id,
               a.details,
               a.timestamp,
               u.name as user_name,
               u.email as user_email,
               u.role as user_role,
               COALESCE(i.name, ui.name) as institution_name
        FROM audit_logs a
        LEFT JOIN users u ON u.id = a.user_id
        LEFT JOIN institutions i ON i.id = a.institution_id
        LEFT JOIN institutions ui ON ui.id = u.institution_id
        ${where}
        ORDER BY a.timestamp DESC
        LIMIT ${limit}
      `)
      .all(...params) as any[];

    return { success: true, logs, error: null };
  } catch (err) {
    return { success: false, logs: [], error: err instanceof Error ? err.message : "Error al obtener registros de auditoría." };
  }
}


