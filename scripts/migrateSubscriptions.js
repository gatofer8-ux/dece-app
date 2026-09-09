const Database = require('better-sqlite3');
const path = require('path');
const { randomUUID } = require('crypto');

const DB_PATH = process.env.DATABASE_FILE || path.join(process.cwd(), 'data', 'dece.db');
const db = new Database(DB_PATH);
db.pragma('foreign_keys = OFF');

console.log('=== MIGRACIÓN DE SUSCRIPCIONES Y COMPATIBILIDAD DE COLUMNAS ===');

function safeExec(sql) {
  try {
    db.exec(sql);
  } catch (e) {
    // Ignorar si ya existe
  }
}

function safeAddColumn(table, colDef) {
  try {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${colDef}`);
  } catch {}
}

// 1. Compatibilidad audit_logs y dece_coordinator_delegations
safeAddColumn('audit_logs', 'created_at TEXT');
try {
  db.exec("UPDATE audit_logs SET created_at = timestamp WHERE created_at IS NULL AND timestamp IS NOT NULL");
} catch {}

safeAddColumn('dece_coordinator_delegations', 'delegator_user_id TEXT');
try {
  db.exec("UPDATE dece_coordinator_delegations SET delegator_user_id = original_user_id WHERE delegator_user_id IS NULL");
} catch {}

// 2. Tabla system_settings (Tarifa global por usuario, etc.)
safeExec(`
  CREATE TABLE IF NOT EXISTS system_settings (
    key         TEXT PRIMARY KEY,
    value       TEXT NOT NULL,
    description TEXT,
    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// Inicializar tarifa global si no existe (ej. $2.50 / usuario)
const existingGlobalRate = db.prepare("SELECT value FROM system_settings WHERE key = 'global_user_rate'").get();
if (!existingGlobalRate) {
  db.prepare("INSERT INTO system_settings (key, value, description) VALUES ('global_user_rate', '2.50', 'Tarifa global base por usuario activo al mes')").run();
}

// 3. Tabla subscription_packages
safeExec(`
  CREATE TABLE IF NOT EXISTS subscription_packages (
    id               TEXT PRIMARY KEY,
    name             TEXT NOT NULL,
    description      TEXT,
    price            REAL NOT NULL,
    duration_months  INTEGER NOT NULL,
    billing_period   TEXT NOT NULL DEFAULT 'ANUAL',
    max_users        INTEGER DEFAULT NULL,
    is_active        INTEGER NOT NULL DEFAULT 1,
    created_at       TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// Paquetes predeterminados
const pkgCount = (db.prepare("SELECT COUNT(*) as c FROM subscription_packages").get() || { c: 0 }).c;
if (pkgCount === 0) {
  const defaultPkgs = [
    { id: 'pkg-mensual', name: 'Plan Mensual Básico', desc: 'Acceso completo con facturación mes a mes', price: 25.00, duration: 1, period: 'MENSUAL', maxUsers: 10 },
    { id: 'pkg-semestral', name: 'Plan Semestral Institucional', desc: 'Paquete de medio periodo lectivo', price: 120.00, duration: 6, period: 'SEMESTRAL', maxUsers: 30 },
    { id: 'pkg-anual', name: 'Plan Anual Completo', desc: 'Cobertura integral durante todo el año lectivo', price: 200.00, duration: 12, period: 'ANUAL', maxUsers: null },
  ];

  for (const p of defaultPkgs) {
    db.prepare(`
      INSERT INTO subscription_packages (id, name, description, price, duration_months, billing_period, max_users, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1)
    `).run(p.id, p.name, p.desc, p.price, p.duration, p.period, p.maxUsers);
  }
  console.log('-> Paquetes de suscripción iniciales creados.');
}

// 4. Tabla institution_subscriptions con valores congelados
safeExec(`
  CREATE TABLE IF NOT EXISTS institution_subscriptions (
    id                      TEXT PRIMARY KEY,
    institution_id          TEXT NOT NULL UNIQUE REFERENCES institutions(id) ON DELETE CASCADE,
    status                  TEXT NOT NULL CHECK (status IN ('activa', 'en_prueba', 'vencida', 'cancelada')),
    package_id              TEXT REFERENCES subscription_packages(id),
    package_name            TEXT NOT NULL,
    billing_mode            TEXT NOT NULL CHECK (billing_mode IN ('paquete', 'por_usuario')),
    
    -- VALORES CONGELADOS AL MOMENTO DE SUSCRIBIR/RENOVAR (REGLA CRÍTICA)
    frozen_rate_per_user    REAL,
    frozen_package_price    REAL,
    frozen_duration_months  INTEGER NOT NULL,
    frozen_user_count       INTEGER,
    total_amount            REAL NOT NULL,
    
    start_date              TEXT NOT NULL,
    end_date                TEXT NOT NULL,
    last_renewed_at         TEXT NOT NULL DEFAULT (datetime('now')),
    last_renewed_by         TEXT,
    notes                   TEXT,
    created_at              TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at              TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_inst_subs_status ON institution_subscriptions(status);
  CREATE INDEX IF NOT EXISTS idx_inst_subs_end ON institution_subscriptions(end_date);
`);

// 5. Tabla subscription_history
safeExec(`
  CREATE TABLE IF NOT EXISTS subscription_history (
    id                      TEXT PRIMARY KEY,
    subscription_id         TEXT NOT NULL,
    institution_id          TEXT NOT NULL,
    event_type              TEXT NOT NULL CHECK (event_type IN ('CREACION', 'RENOVACION', 'CAMBIO_FORZADO', 'VENCIMIENTO', 'CANCELACION')),
    billing_mode            TEXT NOT NULL,
    package_id              TEXT,
    package_name            TEXT NOT NULL,
    frozen_rate_per_user    REAL,
    frozen_package_price    REAL,
    frozen_duration_months  INTEGER NOT NULL,
    frozen_user_count       INTEGER,
    total_amount            REAL NOT NULL,
    start_date              TEXT NOT NULL,
    end_date                TEXT NOT NULL,
    executed_by_id          TEXT,
    reason                  TEXT,
    created_at              TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_sub_hist_inst ON subscription_history(institution_id);
`);

// 6. Asignar suscripciones activas iniciales a instituciones registradas que no tengan una
const institutions = db.prepare("SELECT id, name FROM institutions").all();
const adminUser = db.prepare("SELECT id FROM users WHERE role = 'SUPERADMIN' LIMIT 1").get();
const adminId = adminUser ? adminUser.id : 'superadmin';

for (const inst of institutions) {
  const existingSub = db.prepare("SELECT id FROM institution_subscriptions WHERE institution_id = ?").get(inst.id);
  if (!existingSub) {
    const subId = randomUUID();
    const today = new Date().toISOString().split('T')[0];
    const nextYear = new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().split('T')[0];

    db.prepare(`
      INSERT INTO institution_subscriptions (
        id, institution_id, status, package_id, package_name, billing_mode,
        frozen_rate_per_user, frozen_package_price, frozen_duration_months,
        frozen_user_count, total_amount, start_date, end_date, last_renewed_by, notes
      ) VALUES (?, ?, 'activa', 'pkg-anual', 'Plan Anual Completo', 'paquete', NULL, 200.00, 12, NULL, 200.00, ?, ?, ?, 'Suscripción inicial del sistema')
    `).run(subId, inst.id, today, nextYear, adminId);

    db.prepare(`
      INSERT INTO subscription_history (
        id, subscription_id, institution_id, event_type, billing_mode,
        package_id, package_name, frozen_rate_per_user, frozen_package_price,
        frozen_duration_months, frozen_user_count, total_amount, start_date,
        end_date, executed_by_id, reason
      ) VALUES (?, ?, ?, 'CREACION', 'paquete', 'pkg-anual', 'Plan Anual Completo', NULL, 200.00, 12, NULL, 200.00, ?, ?, ?, 'Alta inicial de suscripción')
    `).run(randomUUID(), subId, inst.id, today, nextYear, adminId);
  }
}

// 7. Tabla user_subscriptions y user_subscription_history (Suscripciones Individuales por Usuario)
safeExec(`
  CREATE TABLE IF NOT EXISTS user_subscriptions (
    id                      TEXT PRIMARY KEY,
    user_id                 TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    status                  TEXT NOT NULL CHECK (status IN ('activo', 'en_prueba', 'suspendido', 'cancelado', 'demo')),
    package_id              TEXT REFERENCES subscription_packages(id),
    package_name            TEXT NOT NULL,
    billing_type            TEXT NOT NULL CHECK (billing_type IN ('paquete', 'prueba', 'demo', 'personalizado')),
    frozen_price            REAL NOT NULL,
    frozen_duration_months  INTEGER NOT NULL,
    frozen_duration_days    INTEGER NOT NULL,
    start_date              TEXT NOT NULL,
    end_date                TEXT,
    trial_days              INTEGER DEFAULT 0,
    is_demo                 INTEGER NOT NULL DEFAULT 0,
    last_renewed_at         TEXT NOT NULL DEFAULT (datetime('now')),
    last_renewed_by         TEXT,
    notes                   TEXT,
    created_at              TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at              TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_user_subs_user_id ON user_subscriptions(user_id);
  CREATE INDEX IF NOT EXISTS idx_user_subs_status ON user_subscriptions(status);
  CREATE INDEX IF NOT EXISTS idx_user_subs_end_date ON user_subscriptions(end_date);
`);

safeExec(`
  CREATE TABLE IF NOT EXISTS user_subscription_history (
    id                       TEXT PRIMARY KEY,
    user_id                  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    institution_id_snapshot  TEXT,
    event_type               TEXT NOT NULL CHECK (
      event_type IN (
        'ALTA_INICIAL', 'ACTIVACION_PRUEBA', 'RENOVACION',
        'SUSPENSION_MANUAL', 'SUSPENSION_AUTOMATICA', 'REACTIVACION',
        'CAMBIO_FORZADO', 'CANCELACION', 'REUBICACION'
      )
    ),
    billing_type             TEXT NOT NULL,
    package_id               TEXT,
    package_name             TEXT NOT NULL,
    frozen_price             REAL NOT NULL,
    start_date               TEXT NOT NULL,
    end_date                 TEXT,
    executed_by_id           TEXT,
    reason                   TEXT,
    created_at               TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_user_sub_hist_user ON user_subscription_history(user_id);
`);

// 8. Backfill de suscripciones individuales a usuarios que no tengan una
const allUsers = db.prepare("SELECT id, name, email, role, institution_id FROM users").all();
const todayDate = new Date().toISOString().split('T')[0];
const oneYearOut = new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().split('T')[0];

for (const u of allUsers) {
  const existing = db.prepare("SELECT id FROM user_subscriptions WHERE user_id = ?").get(u.id);
  if (existing) continue;

  const isDemo = u.institution_id === 'demo-los-alamos' || (u.email && (u.email.includes('losalamos') || u.email.includes('demo')));
  const isSuperadmin = u.role === 'SUPERADMIN';

  let status = 'activo';
  let billingType = 'paquete';
  let pkgId = 'pkg-anual';
  let pkgName = 'Plan Anual Completo';
  let frozenPrice = 200.00;
  let durationMonths = 12;
  let durationDays = 365;
  let endDate = oneYearOut;
  let trialDays = 0;
  let notes = 'Migración inicial a suscripción por usuario individual';

  if (isDemo) {
    status = 'demo';
    billingType = 'demo';
    pkgId = null;
    pkgName = 'Cuenta Demo';
    frozenPrice = 0.00;
    durationMonths = 0;
    durationDays = 0;
    endDate = null;
    notes = 'Usuario de institución demo (no facturable)';
  } else if (isSuperadmin) {
    status = 'activo';
    billingType = 'personalizado';
    pkgId = null;
    pkgName = 'Superadministrador Permanente';
    frozenPrice = 0.00;
    durationMonths = 120;
    durationDays = 3650;
    endDate = null;
    notes = 'Acceso administrativo permanente sin caducidad';
  }

  const subId = randomUUID();

  db.prepare(`
    INSERT INTO user_subscriptions (
      id, user_id, status, package_id, package_name, billing_type,
      frozen_price, frozen_duration_months, frozen_duration_days,
      start_date, end_date, trial_days, is_demo,
      last_renewed_at, last_renewed_by, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), ?, ?)
  `).run(
    subId, u.id, status, pkgId, pkgName, billingType,
    frozenPrice, durationMonths, durationDays,
    todayDate, endDate, trialDays, isDemo ? 1 : 0,
    adminId, notes
  );

  db.prepare(`
    INSERT INTO user_subscription_history (
      id, user_id, institution_id_snapshot, event_type, billing_type,
      package_id, package_name, frozen_price, start_date, end_date,
      executed_by_id, reason
    ) VALUES (?, ?, ?, 'ALTA_INICIAL', ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    randomUUID(), u.id, u.institution_id, billingType,
    pkgId, pkgName, frozenPrice, todayDate, endDate,
    adminId, notes
  );
}

db.pragma('foreign_keys = ON');
console.log('=== MIGRACIÓN DE SUSCRIPCIONES COMPLETADA CON ÉXITO ===');
