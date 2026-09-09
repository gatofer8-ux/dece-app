"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { logAudit } from "@/lib/audit";

function str(fd: FormData, key: string): string | null {
  const v = fd.get(key);
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length ? t : null;
}

function num(fd: FormData, key: string): number | null {
  const v = fd.get(key);
  if (!v) return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

function addMonthsToDate(dateStr: string, months: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setMonth(d.getMonth() + months);
  return d.toISOString().split("T")[0];
}

function addDaysToDate(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

/**
 * REGLA CRÍTICA 13: Actualizar la tarifa global por usuario.
 * NO altera el precio congelado de ningún usuario con suscripción activa o en prueba.
 */
export async function updateGlobalUserRateAction(formData: FormData) {
  const session = await requireRole(["SUPERADMIN"]);
  const rateStr = str(formData, "global_user_rate");
  const rate = Number(rateStr);

  if (isNaN(rate) || rate < 0) {
    return { error: "Ingresa una tarifa numérica válida (mayor o igual a cero)." };
  }

  const prev = db.prepare("SELECT value FROM system_settings WHERE key = 'global_user_rate'").get() as any;

  db.prepare(`
    INSERT INTO system_settings (key, value, description, updated_at)
    VALUES ('global_user_rate', ?, 'Tarifa global base por usuario activo al mes', datetime('now'))
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')
  `).run(rate.toFixed(2));

  logAudit({
    userId: session.user.id,
    action: "ACTUALIZAR_TARIFA_GLOBAL",
    entityType: "SystemSettings",
    entityId: "global_user_rate",
    details: `Tarifa global cambiada de $${prev?.value || "0.00"} a $${rate.toFixed(2)}. Las suscripciones de usuarios activas mantienen su monto congelado.`,
  });

  revalidatePath("/superadmin");
  return { success: true, error: null };
}

/**
 * REGLA CRÍTICA 13: Actualizar precio o duración de un paquete en el catálogo.
 * NO afecta a usuarios con suscripción vigente bajo este paquete.
 * Sus valores congelados se respetan hasta su próxima renovación individual.
 */
export async function updateSubscriptionPackageAction(formData: FormData) {
  const session = await requireRole(["SUPERADMIN"]);
  const id = str(formData, "id");
  const name = str(formData, "name");
  const price = num(formData, "price");
  const durationMonths = num(formData, "duration_months");
  const billingPeriod = str(formData, "billing_period") || "ANUAL";
  const maxUsers = num(formData, "max_users");
  const description = str(formData, "description");

  if (!id || !name) return { error: "El identificador y nombre son requeridos." };
  if (price === null || price < 0) return { error: "El precio debe ser un número válido." };
  if (!durationMonths || durationMonths < 1) return { error: "La duración debe ser de al menos 1 mes." };

  const prev = db.prepare("SELECT name, price, duration_months FROM subscription_packages WHERE id = ?").get(id) as any;

  db.prepare(`
    UPDATE subscription_packages
    SET name = @name,
        price = @price,
        duration_months = @durationMonths,
        billing_period = @billingPeriod,
        max_users = @maxUsers,
        description = @description,
        updated_at = datetime('now')
    WHERE id = @id
  `).run({
    id,
    name,
    price,
    durationMonths,
    billingPeriod,
    maxUsers,
    description,
  });

  logAudit({
    userId: session.user.id,
    action: "ACTUALIZAR_PAQUETE_SUSCRIPCION",
    entityType: "SubscriptionPackage",
    entityId: id,
    details: `Paquete "${name}" modificado en catálogo: Precio $${prev?.price || 0} -> $${price}, Duración ${prev?.duration_months || 0}m -> ${durationMonths}m. Las suscripciones individuales activas permanecen congeladas.`,
  });

  revalidatePath("/superadmin");
  return { success: true, error: null };
}

/** Crear un nuevo paquete de suscripción en el catálogo */
export async function createSubscriptionPackageAction(formData: FormData) {
  const session = await requireRole(["SUPERADMIN"]);
  const name = str(formData, "name");
  const price = num(formData, "price");
  const durationMonths = num(formData, "duration_months") || 12;
  const billingPeriod = str(formData, "billing_period") || "ANUAL";
  const maxUsers = num(formData, "max_users");
  const description = str(formData, "description");

  if (!name) return { error: "El nombre del paquete es obligatorio." };
  if (price === null || price < 0) return { error: "El precio debe ser un número válido." };

  const id = "pkg-" + randomUUID().slice(0, 8);

  db.prepare(`
    INSERT INTO subscription_packages (id, name, description, price, duration_months, billing_period, max_users, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1)
  `).run(id, name, description, price, durationMonths, billingPeriod, maxUsers);

  logAudit({
    userId: session.user.id,
    action: "CREAR_PAQUETE_SUSCRIPCION",
    entityType: "SubscriptionPackage",
    entityId: id,
    details: `Nuevo paquete "${name}" creado en catálogo ($${price}, ${durationMonths} meses)`,
  });

  revalidatePath("/superadmin");
  return { success: true, error: null };
}

// =========================================================================
// GESTIÓN DE SUSCRIPCIONES POR USUARIO INDIVIDUAL
// =========================================================================

/**
 * Asigna o cambia la suscripción individual de un usuario existente
 * (periodo de prueba, paquete comercial, o plan personalizado).
 */
export async function assignUserSubscriptionAction(data: {
  userId: string;
  mode: "prueba" | "paquete" | "personalizado";
  packageId?: string;
  trialDays?: number;
  trialPrice?: number;
  customPrice?: number;
  customMonths?: number;
  customEndDate?: string;
  notes?: string;
}) {
  const session = await requireRole(["SUPERADMIN"]);
  const {
    userId,
    mode,
    packageId,
    trialDays = 30,
    trialPrice,
    customPrice,
    customMonths = 1,
    customEndDate,
    notes,
  } = data;

  const user = db.prepare("SELECT id, name, email, institution_id, role FROM users WHERE id = ?").get(userId) as any;
  if (!user) return { error: "Usuario no encontrado." };

  const today = new Date().toISOString().split("T")[0];
  let status: "activo" | "en_prueba" = "activo";
  let billingType: "prueba" | "paquete" | "personalizado" = mode;
  let pkgId: string | null = null;
  let pkgName = "Plan Personalizado";
  let frozenPrice = 0.00;
  let durationMonths = 1;
  let durationDays = 30;
  let endDate: string | null = null;
  let trialDaysCount = 0;

  if (mode === "prueba") {
    status = "en_prueba";
    billingType = "prueba";
    pkgId = null;
    trialDaysCount = trialDays > 0 ? trialDays : 30;
    frozenPrice = trialPrice !== undefined && trialPrice >= 0
      ? trialPrice
      : (customPrice !== undefined && customPrice >= 0 ? customPrice : 0.00);
    pkgName = frozenPrice > 0
      ? `Periodo de Prueba Especial ($${frozenPrice.toFixed(2)} · ${trialDaysCount} días)`
      : `Periodo de Prueba (${trialDaysCount} días)`;
    durationDays = trialDaysCount;
    durationMonths = Math.ceil(trialDaysCount / 30);
    endDate = customEndDate || addDaysToDate(today, trialDaysCount);
  } else if (mode === "paquete") {
    const pkg = db.prepare("SELECT * FROM subscription_packages WHERE id = ?").get(packageId || "pkg-anual") as any;
    if (!pkg) return { error: "Paquete comercial no encontrado en el catálogo." };

    status = "activo";
    billingType = "paquete";
    pkgId = pkg.id;
    pkgName = pkg.name;
    frozenPrice = customPrice !== undefined && customPrice >= 0 ? customPrice : pkg.price;
    durationMonths = customMonths && customMonths > 0 ? customMonths : pkg.duration_months;
    durationDays = durationMonths * 30;
    endDate = customEndDate || addMonthsToDate(today, durationMonths);
  } else {
    // Personalizado
    status = "activo";
    billingType = "personalizado";
    pkgId = null;
    pkgName = "Tarifa Especial Personalizada";
    frozenPrice = customPrice !== undefined && customPrice >= 0 ? customPrice : 0.00;
    durationMonths = customMonths || 1;
    durationDays = durationMonths * 30;
    endDate = customEndDate || addMonthsToDate(today, durationMonths);
  }

  const existingSub = db.prepare("SELECT id FROM user_subscriptions WHERE user_id = ?").get(userId) as any;
  const subId = existingSub ? existingSub.id : randomUUID();

  try {
    db.transaction(() => {
      db.prepare(`
        INSERT INTO user_subscriptions (
          id, user_id, status, package_id, package_name, billing_type,
          frozen_price, frozen_duration_months, frozen_duration_days,
          start_date, end_date, trial_days, is_demo,
          last_renewed_at, last_renewed_by, notes, updated_at
        ) VALUES (
          @id, @userId, @status, @pkgId, @pkgName, @billingType,
          @frozenPrice, @durationMonths, @durationDays,
          @startDate, @endDate, @trialDaysCount, 0,
          datetime('now'), @renewedBy, @notes, datetime('now')
        )
        ON CONFLICT(user_id) DO UPDATE SET
          status = excluded.status,
          package_id = excluded.package_id,
          package_name = excluded.package_name,
          billing_type = excluded.billing_type,
          frozen_price = excluded.frozen_price,
          frozen_duration_months = excluded.frozen_duration_months,
          frozen_duration_days = excluded.frozen_duration_days,
          start_date = excluded.start_date,
          end_date = excluded.end_date,
          trial_days = excluded.trial_days,
          is_demo = 0,
          last_renewed_at = datetime('now'),
          last_renewed_by = excluded.last_renewed_by,
          notes = excluded.notes,
          updated_at = datetime('now')
      `).run({
        id: subId,
        userId,
        status,
        pkgId,
        pkgName,
        billingType,
        frozenPrice,
        durationMonths,
        durationDays,
        startDate: today,
        endDate,
        trialDaysCount,
        renewedBy: session.user.id,
        notes: notes || `Asignación de suscripción: ${pkgName}`,
      });

      db.prepare(`
        INSERT INTO user_subscription_history (
          id, user_id, institution_id_snapshot, event_type, billing_type,
          package_id, package_name, frozen_price, start_date, end_date,
          executed_by_id, reason
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        randomUUID(),
        userId,
        user.institution_id,
        mode === "prueba" ? "ACTIVACION_PRUEBA" : "ALTA_INICIAL",
        billingType,
        pkgId,
        pkgName,
        frozenPrice,
        today,
        endDate,
        session.user.id,
        notes || `Asignación directa por superadmin: ${pkgName}`
      );
    })();

    logAudit({
      userId: session.user.id,
      action: "ASIGNAR_SUSCRIPCION_USUARIO",
      entityType: "UserSubscription",
      entityId: subId,
      institutionId: user.institution_id,
      details: `Suscripción asignada a ${user.name} (${user.email}): ${pkgName} ($${frozenPrice.toFixed(2)}, vence ${endDate})`,
    });

    revalidatePath("/superadmin");
    revalidatePath("/usuarios");
    return { success: true, error: null };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Error al asignar la suscripción al usuario.",
    };
  }
}

/**
 * REGLA CRÍTICA 13: Renovación de la suscripción de un usuario específico.
 * Se aplican los valores vigentes del paquete seleccionado y se congelan
 * para su nuevo periodo individual sin afectar a los demás usuarios.
 */
export async function renewUserSubscriptionAction(data: {
  userId: string;
  packageId?: string;
  notes?: string;
}) {
  const session = await requireRole(["SUPERADMIN"]);
  const { userId, packageId, notes } = data;

  const user = db.prepare("SELECT id, name, email, institution_id FROM users WHERE id = ?").get(userId) as any;
  if (!user) return { error: "Usuario no encontrado." };

  const currentSub = db.prepare("SELECT * FROM user_subscriptions WHERE user_id = ?").get(userId) as any;
  const pkgId = packageId || currentSub?.package_id || "pkg-anual";
  const pkg = db.prepare("SELECT * FROM subscription_packages WHERE id = ?").get(pkgId) as any;
  if (!pkg) return { error: "Paquete de suscripción no encontrado en el catálogo." };

  const today = new Date().toISOString().split("T")[0];
  let startDate = today;

  // Si la suscripción actual sigue activa y vigente, el nuevo periodo inicia al vencer la actual
  if (currentSub?.end_date && currentSub.end_date > today && currentSub.status === "activo") {
    startDate = currentSub.end_date;
  }

  const endDate = addMonthsToDate(startDate, pkg.duration_months);
  const subId = currentSub ? currentSub.id : randomUUID();

  try {
    db.transaction(() => {
      db.prepare(`
        INSERT INTO user_subscriptions (
          id, user_id, status, package_id, package_name, billing_type,
          frozen_price, frozen_duration_months, frozen_duration_days,
          start_date, end_date, trial_days, is_demo,
          last_renewed_at, last_renewed_by, notes, updated_at
        ) VALUES (
          @id, @userId, 'activo', @pkgId, @pkgName, 'paquete',
          @frozenPrice, @durationMonths, @durationDays,
          @startDate, @endDate, 0, 0,
          datetime('now'), @renewedBy, @notes, datetime('now')
        )
        ON CONFLICT(user_id) DO UPDATE SET
          status = 'activo',
          package_id = excluded.package_id,
          package_name = excluded.package_name,
          billing_type = 'paquete',
          frozen_price = excluded.frozen_price,
          frozen_duration_months = excluded.frozen_duration_months,
          frozen_duration_days = excluded.frozen_duration_days,
          start_date = excluded.start_date,
          end_date = excluded.end_date,
          trial_days = 0,
          is_demo = 0,
          last_renewed_at = datetime('now'),
          last_renewed_by = excluded.last_renewed_by,
          notes = excluded.notes,
          updated_at = datetime('now')
      `).run({
        id: subId,
        userId,
        pkgId: pkg.id,
        pkgName: pkg.name,
        frozenPrice: pkg.price,
        durationMonths: pkg.duration_months,
        durationDays: pkg.duration_months * 30,
        startDate,
        endDate,
        renewedBy: session.user.id,
        notes: notes || `Renovación individual: ${pkg.name}`,
      });

      db.prepare(`
        INSERT INTO user_subscription_history (
          id, user_id, institution_id_snapshot, event_type, billing_type,
          package_id, package_name, frozen_price, start_date, end_date,
          executed_by_id, reason
        ) VALUES (?, ?, ?, 'RENOVACION', 'paquete', ?, ?, ?, ?, ?, ?, ?)
      `).run(
        randomUUID(),
        userId,
        user.institution_id,
        pkg.id,
        pkg.name,
        pkg.price,
        startDate,
        endDate,
        session.user.id,
        notes || `Renovación individual ejecutada por el superadministrador`
      );
    })();

    logAudit({
      userId: session.user.id,
      action: "RENOVAR_SUSCRIPCION_USUARIO",
      entityType: "UserSubscription",
      entityId: subId,
      institutionId: user.institution_id,
      details: `Suscripción de ${user.name} (${user.email}) renovada hasta ${endDate}. Paquete: ${pkg.name}, Monto Congelado: $${pkg.price.toFixed(2)}`,
    });

    revalidatePath("/superadmin");
    revalidatePath("/usuarios");
    return { success: true, error: null };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Error al renovar la suscripción del usuario.",
    };
  }
}

/**
 * Renovación en lote (selección múltiple de usuarios).
 * Ejecuta una renovación individual independiente por cada usuario seleccionado,
 * congelando su respectiva tarifa y fecha.
 */
export async function batchRenewUserSubscriptionsAction(data: {
  userIds: string[];
  packageId?: string;
  notes?: string;
}) {
  const session = await requireRole(["SUPERADMIN"]);
  const { userIds, packageId, notes } = data;

  if (!userIds || userIds.length === 0) {
    return { error: "No seleccionaste ningún usuario para renovar." };
  }

  const today = new Date().toISOString().split("T")[0];
  let renewedCount = 0;

  try {
    db.transaction(() => {
      for (const userId of userIds) {
        const user = db.prepare("SELECT id, name, email, institution_id FROM users WHERE id = ?").get(userId) as any;
        if (!user) continue;

        const currentSub = db.prepare("SELECT * FROM user_subscriptions WHERE user_id = ?").get(userId) as any;
        const targetPkgId = packageId || currentSub?.package_id || "pkg-anual";
        const pkg = db.prepare("SELECT * FROM subscription_packages WHERE id = ?").get(targetPkgId) as any;
        if (!pkg) continue;

        let startDate = today;
        if (currentSub?.end_date && currentSub.end_date > today && currentSub.status === "activo") {
          startDate = currentSub.end_date;
        }
        const endDate = addMonthsToDate(startDate, pkg.duration_months);
        const subId = currentSub ? currentSub.id : randomUUID();

        db.prepare(`
          INSERT INTO user_subscriptions (
            id, user_id, status, package_id, package_name, billing_type,
            frozen_price, frozen_duration_months, frozen_duration_days,
            start_date, end_date, trial_days, is_demo,
            last_renewed_at, last_renewed_by, notes, updated_at
          ) VALUES (
            @id, @userId, 'activo', @pkgId, @pkgName, 'paquete',
            @frozenPrice, @durationMonths, @durationDays,
            @startDate, @endDate, 0, 0,
            datetime('now'), @renewedBy, @notes, datetime('now')
          )
          ON CONFLICT(user_id) DO UPDATE SET
            status = 'activo',
            package_id = excluded.package_id,
            package_name = excluded.package_name,
            billing_type = 'paquete',
            frozen_price = excluded.frozen_price,
            frozen_duration_months = excluded.frozen_duration_months,
            frozen_duration_days = excluded.frozen_duration_days,
            start_date = excluded.start_date,
            end_date = excluded.end_date,
            trial_days = 0,
            is_demo = 0,
            last_renewed_at = datetime('now'),
            last_renewed_by = excluded.last_renewed_by,
            notes = excluded.notes,
            updated_at = datetime('now')
        `).run({
          id: subId,
          userId,
          pkgId: pkg.id,
          pkgName: pkg.name,
          frozenPrice: pkg.price,
          durationMonths: pkg.duration_months,
          durationDays: pkg.duration_months * 30,
          startDate,
          endDate,
          renewedBy: session.user.id,
          notes: notes || `Renovación en lote: ${pkg.name}`,
        });

        db.prepare(`
          INSERT INTO user_subscription_history (
            id, user_id, institution_id_snapshot, event_type, billing_type,
            package_id, package_name, frozen_price, start_date, end_date,
            executed_by_id, reason
          ) VALUES (?, ?, ?, 'RENOVACION', 'paquete', ?, ?, ?, ?, ?, ?, ?)
        `).run(
          randomUUID(),
          userId,
          user.institution_id,
          pkg.id,
          pkg.name,
          pkg.price,
          startDate,
          endDate,
          session.user.id,
          notes || "Renovación en lote ejecutada por el superadministrador"
        );

        renewedCount++;
      }
    })();

    logAudit({
      userId: session.user.id,
      action: "RENOVACION_LOTE_USUARIOS",
      entityType: "UserSubscription",
      details: `Renovación en lote completada con éxito para ${renewedCount} usuarios.`,
    });

    revalidatePath("/superadmin");
    revalidatePath("/usuarios");
    return { success: true, renewedCount, error: null };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Error al procesar la renovación en lote.",
    };
  }
}

/**
 * Suspensión manual o reactivación de un usuario específico por el Superadmin.
 * Al suspenderse, el usuario pasa a modo solo lectura sin afectar a sus compañeros.
 */
export async function toggleUserSuspensionAction(userId: string, suspended: boolean, reason?: string) {
  const session = await requireRole(["SUPERADMIN"]);

  const user = db.prepare("SELECT id, name, email, institution_id FROM users WHERE id = ?").get(userId) as any;
  if (!user) return { error: "Usuario no encontrado." };

  const currentSub = db.prepare("SELECT * FROM user_subscriptions WHERE user_id = ?").get(userId) as any;
  const newStatus = suspended ? "suspendido" : "activo";

  try {
    db.transaction(() => {
      if (currentSub) {
        db.prepare(`
          UPDATE user_subscriptions
          SET status = ?, notes = ?, updated_at = datetime('now')
          WHERE id = ?
        `).run(newStatus, reason || (suspended ? "Suspensión manual por superadmin" : "Reactivación manual por superadmin"), currentSub.id);
      } else {
        const today = new Date().toISOString().split("T")[0];
        db.prepare(`
          INSERT INTO user_subscriptions (
            id, user_id, status, package_name, billing_type,
            frozen_price, frozen_duration_months, frozen_duration_days,
            start_date, last_renewed_by, notes
          ) VALUES (?, ?, ?, 'Plan Base', 'personalizado', 0.00, 1, 30, ?, ?, ?)
        `).run(randomUUID(), userId, newStatus, today, session.user.id, reason || "Alta manual");
      }

      db.prepare(`
        INSERT INTO user_subscription_history (
          id, user_id, institution_id_snapshot, event_type, billing_type,
          package_id, package_name, frozen_price, start_date, end_date,
          executed_by_id, reason
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        randomUUID(),
        userId,
        user.institution_id,
        suspended ? "SUSPENSION_MANUAL" : "REACTIVACION",
        currentSub?.billing_type || "personalizado",
        currentSub?.package_id || null,
        currentSub?.package_name || "Plan Base",
        currentSub?.frozen_price || 0.00,
        currentSub?.start_date || new Date().toISOString().split("T")[0],
        currentSub?.end_date || null,
        session.user.id,
        reason || (suspended ? "Suspensión manual por superadmin" : "Reactivación manual")
      );
    })();

    logAudit({
      userId: session.user.id,
      action: suspended ? "SUSPENDER_USUARIO_SUSCRIPCION" : "REACTIVAR_USUARIO_SUSCRIPCION",
      entityType: "UserSubscription",
      entityId: userId,
      institutionId: user.institution_id,
      details: `Usuario ${user.name} (${user.email}) ${suspended ? "suspendido (solo lectura)" : "reactivado"}. Motivo: ${reason || "N/A"}`,
    });

    revalidatePath("/superadmin");
    revalidatePath("/usuarios");
    return { success: true, error: null };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Error al cambiar estado de suspensión.",
    };
  }
}

/**
 * REGLA CRÍTICA 13 (EXCEPCIÓN ÚNICA): Forzar cambio anticipado de tarifa o fecha
 * a un usuario específico antes de su vencimiento.
 * Exige justificación explícita obligatoria.
 */
export async function forceUpdateUserSubscriptionAction(data: {
  userId: string;
  packageId?: string;
  customPrice?: number;
  customDurationMonths?: number;
  customDurationDays?: number;
  customEndDate?: string;
  reason: string;
}) {
  const session = await requireRole(["SUPERADMIN"]);
  const { userId, packageId, customPrice, customDurationMonths, customDurationDays, customEndDate, reason } = data;

  if (!reason || reason.trim().length < 5) {
    return { error: "Debes ingresar una justificación de al menos 5 caracteres para forzar el cambio anticipado." };
  }

  const user = db.prepare("SELECT id, name, email, institution_id FROM users WHERE id = ?").get(userId) as any;
  if (!user) return { error: "Usuario no encontrado." };

  const currentSub = db.prepare("SELECT * FROM user_subscriptions WHERE user_id = ?").get(userId) as any;
  if (!currentSub) return { error: "El usuario no cuenta con una suscripción previa para modificar." };

  let packageName = currentSub.package_name;
  let newPrice = customPrice !== undefined && customPrice !== null ? customPrice : currentSub.frozen_price;
  let newDuration = customDurationMonths || currentSub.frozen_duration_months;
  let newEndDate = customEndDate || currentSub.end_date;

  if (customDurationDays && customDurationDays > 0) {
    const baseDate = currentSub.start_date || new Date().toISOString().split("T")[0];
    newEndDate = addDaysToDate(baseDate, customDurationDays);
  }

  if (packageId) {
    const pkg = db.prepare("SELECT * FROM subscription_packages WHERE id = ?").get(packageId) as any;
    if (pkg) {
      packageName = pkg.name;
      if (customPrice === undefined || customPrice === null) newPrice = pkg.price;
      if (!customDurationMonths) newDuration = pkg.duration_months;
      if (!customEndDate && !customDurationDays && currentSub.start_date) {
        newEndDate = addMonthsToDate(currentSub.start_date, newDuration);
      }
    }
  }

  try {
    db.transaction(() => {
      db.prepare(`
        UPDATE user_subscriptions
        SET package_id = COALESCE(@packageId, package_id),
            package_name = @packageName,
            frozen_price = @newPrice,
            frozen_duration_months = @newDuration,
            end_date = @newEndDate,
            notes = @notes,
            updated_at = datetime('now')
        WHERE id = @id
      `).run({
        id: currentSub.id,
        packageId: packageId || null,
        packageName,
        newPrice,
        newDuration,
        newEndDate,
        notes: `Cambio forzado anticipado: ${reason.trim()}`,
      });

      db.prepare(`
        INSERT INTO user_subscription_history (
          id, user_id, institution_id_snapshot, event_type, billing_type,
          package_id, package_name, frozen_price, start_date, end_date,
          executed_by_id, reason
        ) VALUES (?, ?, ?, 'CAMBIO_FORZADO', ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        randomUUID(),
        userId,
        user.institution_id,
        currentSub.billing_type,
        packageId || currentSub.package_id,
        packageName,
        newPrice,
        currentSub.start_date,
        newEndDate,
        session.user.id,
        `Cambio forzado anticipado: ${reason.trim()}`
      );
    })();

    logAudit({
      userId: session.user.id,
      action: "FORZAR_CAMBIO_TARIFA_USUARIO",
      entityType: "UserSubscription",
      entityId: currentSub.id,
      institutionId: user.institution_id,
      details: `Cambio forzado en suscripción de ${user.name}. Nueva tarifa congelada: $${newPrice}, vence: ${newEndDate}. Motivo: ${reason.trim()}`,
    });

    revalidatePath("/superadmin");
    revalidatePath("/usuarios");
    return { success: true, error: null };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Error al forzar el cambio de tarifa del usuario.",
    };
  }
}

/**
 * REUBICACIÓN DE PROFESIONALES DECE:
 * Traslada al profesional a otra institución manteniendo INTACTA su suscripción individual,
 * su fecha de vencimiento y su tarifa congelada.
 */
export async function reassignUserInstitutionAction(data: {
  userId: string;
  newInstitutionId: string | null;
  reason?: string;
}) {
  const session = await requireRole(["SUPERADMIN"]);
  const { userId, newInstitutionId, reason } = data;

  const user = db.prepare("SELECT id, name, email, institution_id FROM users WHERE id = ?").get(userId) as any;
  if (!user) return { error: "Usuario no encontrado." };

  const oldInstName = user.institution_id
    ? (db.prepare("SELECT name FROM institutions WHERE id = ?").get(user.institution_id) as any)?.name || "Institución previa"
    : "Sin institución (Nivel Central)";

  const newInstName = newInstitutionId
    ? (db.prepare("SELECT name FROM institutions WHERE id = ?").get(newInstitutionId) as any)?.name || "Nueva institución"
    : "Sin institución (Nivel Central)";

  try {
    db.transaction(() => {
      // 1. Reubicar al usuario (solo cambia users.institution_id)
      db.prepare("UPDATE users SET institution_id = ?, updated_at = datetime('now') WHERE id = ?").run(newInstitutionId, userId);

      // 2. La suscripción se mantiene intacta, pero registramos el evento de reubicación en el historial
      const currentSub = db.prepare("SELECT * FROM user_subscriptions WHERE user_id = ?").get(userId) as any;
      if (currentSub) {
        db.prepare(`
          INSERT INTO user_subscription_history (
            id, user_id, institution_id_snapshot, event_type, billing_type,
            package_id, package_name, frozen_price, start_date, end_date,
            executed_by_id, reason
          ) VALUES (?, ?, ?, 'REUBICACION', ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          randomUUID(),
          userId,
          newInstitutionId,
          currentSub.billing_type,
          currentSub.package_id,
          currentSub.package_name,
          currentSub.frozen_price,
          currentSub.start_date,
          currentSub.end_date,
          session.user.id,
          `Reubicación de "${oldInstName}" a "${newInstName}". Suscripción y fecha intactas. ${reason ? "Motivo: " + reason : ""}`
        );
      }
    })();

    logAudit({
      userId: session.user.id,
      action: "REUBICAR_PROFESIONAL_DECE",
      entityType: "User",
      entityId: userId,
      institutionId: newInstitutionId,
      details: `Profesional ${user.name} (${user.email}) reubicado de "${oldInstName}" a "${newInstName}". Su suscripción individual permanece intacta.`,
    });

    revalidatePath("/superadmin");
    revalidatePath("/usuarios");
    return { success: true, error: null };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Error al reubicar al profesional.",
    };
  }
}

/** Compatibilidad retrocompatible institucional */
export async function renewInstitutionSubscriptionAction(data: any) {
  return { success: true, error: null };
}

export async function forceUpdateInstitutionSubscriptionAction(data: any) {
  return { success: true, error: null };
}
