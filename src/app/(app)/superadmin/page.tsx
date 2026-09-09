import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";
import SuperadminDashboard from "./SuperadminDashboard";
import type { InstitutionRow } from "@/lib/types";

export default async function SuperadminPage() {
  const session = await requireRole(["SUPERADMIN"]);

  const rawInstitutions = db
    .prepare("SELECT * FROM institutions ORDER BY name ASC")
    .all() as InstitutionRow[];

  const studentCounts = db
    .prepare("SELECT institution_id, COUNT(*) n FROM students WHERE active = 1 GROUP BY institution_id")
    .all() as { institution_id: string; n: number }[];
  const userCounts = db
    .prepare("SELECT institution_id, COUNT(*) n FROM users WHERE active = 1 AND institution_id IS NOT NULL GROUP BY institution_id")
    .all() as { institution_id: string; n: number }[];
  const caseCounts = db
    .prepare("SELECT institution_id, COUNT(*) n FROM case_files GROUP BY institution_id")
    .all() as { institution_id: string; n: number }[];
  const openCaseCounts = db
    .prepare("SELECT institution_id, COUNT(*) n FROM case_files WHERE status != 'CERRADO' GROUP BY institution_id")
    .all() as { institution_id: string; n: number }[];

  const toMap = (rows: { institution_id: string; n: number }[]) =>
    new Map(rows.map((r) => [r.institution_id, r.n]));

  const studentMap = toMap(studentCounts);
  const userMap = toMap(userCounts);
  const caseMap = toMap(caseCounts);
  const openCaseMap = toMap(openCaseCounts);

  // Suscripciones individuales por usuario unidas con usuarios e instituciones
  const rawUsers = db
    .prepare(`
      SELECT u.id, u.institution_id, u.name, u.email, u.role, u.active, u.phone, u.created_at,
             i.name as institution_name,
             s.id as sub_id,
             s.status as sub_status,
             s.package_id as sub_package_id,
             s.package_name as sub_package_name,
             s.billing_type as sub_billing_type,
             s.frozen_price as sub_frozen_price,
             s.frozen_duration_months as sub_frozen_duration_months,
             s.frozen_duration_days as sub_frozen_duration_days,
             s.start_date as sub_start_date,
             s.end_date as sub_end_date,
             s.trial_days as sub_trial_days,
             s.is_demo as sub_is_demo,
             s.last_renewed_at as sub_last_renewed_at,
             s.notes as sub_notes
      FROM users u
      LEFT JOIN institutions i ON i.id = u.institution_id
      LEFT JOIN user_subscriptions s ON s.user_id = u.id
      ORDER BY u.created_at DESC
    `)
    .all() as any[];

  const todayMs = new Date().setHours(0, 0, 0, 0);

  const users = rawUsers.map((u) => {
    let daysLeft: number | null = null;
    let isOverdue = false;
    if (u.sub_end_date) {
      const endMs = new Date(u.sub_end_date + "T00:00:00").getTime();
      daysLeft = Math.ceil((endMs - todayMs) / (1000 * 3600 * 24));
      isOverdue = daysLeft < 0;
    }

    const status = u.sub_status || (u.role === "SUPERADMIN" ? "activo" : "en_prueba");

    return {
      id: u.id,
      institution_id: u.institution_id,
      institution_name: u.institution_name,
      name: u.name,
      email: u.email,
      role: u.role,
      active: u.active,
      phone: u.phone,
      created_at: u.created_at,
      subscription: {
        id: u.sub_id,
        status,
        package_id: u.sub_package_id,
        package_name: u.sub_package_name || (status === "demo" ? "Cuenta Demo" : "Plan Anual Completo"),
        billing_type: u.sub_billing_type || (status === "demo" ? "demo" : "paquete"),
        frozen_price: u.sub_frozen_price !== undefined && u.sub_frozen_price !== null ? u.sub_frozen_price : 0,
        frozen_duration_months: u.sub_frozen_duration_months || 12,
        frozen_duration_days: u.sub_frozen_duration_days || 365,
        start_date: u.sub_start_date || u.created_at?.split("T")[0] || "",
        end_date: u.sub_end_date,
        days_left: daysLeft,
        is_overdue: isOverdue,
        is_demo: Boolean(u.sub_is_demo),
        is_trial: status === "en_prueba",
        is_read_only: status === "suspendido" || status === "cancelado",
        last_renewed_at: u.sub_last_renewed_at,
        notes: u.sub_notes,
      },
    };
  });

  // Resumen de suscripciones por institución (agregado)
  const instSubBreakdown = new Map<string, { active: number; trial: number; suspended: number; demo: number }>();
  for (const u of users) {
    if (!u.institution_id) continue;
    const current = instSubBreakdown.get(u.institution_id) || { active: 0, trial: 0, suspended: 0, demo: 0 };
    if (u.subscription.is_demo || u.subscription.status === "demo") {
      current.demo++;
    } else if (u.subscription.status === "activo") {
      current.active++;
    } else if (u.subscription.status === "en_prueba") {
      current.trial++;
    } else {
      current.suspended++;
    }
    instSubBreakdown.set(u.institution_id, current);
  }

  const institutions = rawInstitutions.map((i) => {
    const subs = instSubBreakdown.get(i.id) || { active: 0, trial: 0, suspended: 0, demo: 0 };
    return {
      id: i.id,
      name: i.name,
      amie_code: i.amie_code,
      district: i.district,
      circuit: i.circuit,
      zona: i.zona,
      address: i.address || null,
      active: i.active,
      created_at: i.created_at,
      usersCount: userMap.get(i.id) || 0,
      studentsCount: studentMap.get(i.id) || 0,
      casesCount: caseMap.get(i.id) || 0,
      openCasesCount: openCaseMap.get(i.id) || 0,
      activeSubsCount: subs.active,
      trialSubsCount: subs.trial,
      suspendedSubsCount: subs.suspended,
      demoSubsCount: subs.demo,
    };
  });

  const auditLogs = db
    .prepare(`
      SELECT a.id, a.user_id, a.action, a.entity_type, a.entity_id, a.details,
             COALESCE(a.timestamp, a.created_at) as created_at,
             u.name as user_name
      FROM audit_logs a
      LEFT JOIN users u ON u.id = a.user_id
      ORDER BY COALESCE(a.timestamp, a.created_at) DESC
      LIMIT 150
    `)
    .all() as any[];

  const globalRateSetting = db
    .prepare("SELECT value FROM system_settings WHERE key = 'global_user_rate'")
    .get() as any;
  const globalUserRate = globalRateSetting?.value || "2.50";

  const subscriptionPackages = db
    .prepare("SELECT * FROM subscription_packages ORDER BY price ASC")
    .all() as any[];

  // Historial de suscripciones individuales
  const userSubscriptionHistory = db
    .prepare(`
      SELECT h.*, u.name as user_name, u.email as user_email,
             i.name as institution_name,
             ex.name as executed_by_name
      FROM user_subscription_history h
      LEFT JOIN users u ON u.id = h.user_id
      LEFT JOIN institutions i ON i.id = h.institution_id_snapshot
      LEFT JOIN users ex ON ex.id = h.executed_by_id
      ORDER BY h.created_at DESC
      LIMIT 150
    `)
    .all() as any[];

  // Alertas de vencimiento próximo (<= 7 días) por usuario
  const upcomingExpiringUsers = users.filter(
    (u) =>
      !u.subscription.is_demo &&
      u.subscription.status !== "demo" &&
      u.role !== "SUPERADMIN" &&
      u.subscription.days_left !== null &&
      u.subscription.days_left >= 0 &&
      u.subscription.days_left <= 7
  );

  return (
    <SuperadminDashboard
      currentUserId={session.user.id}
      institutions={institutions}
      users={users}
      auditLogs={auditLogs}
      globalUserRate={globalUserRate}
      subscriptionPackages={subscriptionPackages}
      userSubscriptionHistory={userSubscriptionHistory}
      upcomingExpiringUsers={upcomingExpiringUsers}
    />
  );
}
