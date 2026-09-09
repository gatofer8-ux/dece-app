const Database = require('better-sqlite3');
const path = require('path');
const { randomUUID } = require('crypto');

const DB_PATH = process.env.DATABASE_FILE || path.join(process.cwd(), 'data', 'dece.db');
const db = new Database(DB_PATH);
db.pragma('foreign_keys = OFF');

console.log('=== INICIANDO MIGRACIÓN A SUSCRIPCIONES POR USUARIO INDIVIDUAL ===');

function safeExec(sql) {
  try {
    db.exec(sql);
  } catch (e) {
    console.warn('Nota en safeExec:', e.message);
  }
}

// 1. Crear tabla user_subscriptions
safeExec(`
  CREATE TABLE IF NOT EXISTS user_subscriptions (
    id                      TEXT PRIMARY KEY,
    user_id                 TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    status                  TEXT NOT NULL CHECK (status IN ('activo', 'en_prueba', 'suspendido', 'cancelado', 'demo')),
    package_id              TEXT REFERENCES subscription_packages(id),
    package_name            TEXT NOT NULL,
    billing_type            TEXT NOT NULL CHECK (billing_type IN ('paquete', 'prueba', 'demo', 'personalizado')),
    
    -- Valores congelados individualmente (Regla Crítica 13)
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

// 2. Crear tabla user_subscription_history
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

// 3. Obtener paquetes y datos base
const defaultPkg = db.prepare("SELECT * FROM subscription_packages WHERE id = 'pkg-anual'").get() || {
  id: 'pkg-anual',
  name: 'Plan Anual Completo',
  price: 200.00,
  duration_months: 12
};

const users = db.prepare("SELECT id, name, email, role, institution_id FROM users").all();
const adminUser = db.prepare("SELECT id FROM users WHERE role = 'SUPERADMIN' LIMIT 1").get();
const adminId = adminUser ? adminUser.id : 'superadmin';

const today = new Date().toISOString().split('T')[0];
const oneYearLater = new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().split('T')[0];

let createdCount = 0;
let demoCount = 0;

for (const u of users) {
  const existing = db.prepare("SELECT id FROM user_subscriptions WHERE user_id = ?").get(u.id);
  if (existing) continue;

  const isDemo = u.institution_id === 'demo-los-alamos' || (u.email && (u.email.includes('losalamos') || u.email.includes('demo')));
  const isSuperadmin = u.role === 'SUPERADMIN';

  let status = 'activo';
  let billingType = 'paquete';
  let pkgId = defaultPkg.id;
  let pkgName = defaultPkg.name;
  let frozenPrice = defaultPkg.price;
  let durationMonths = defaultPkg.duration_months;
  let durationDays = durationMonths * 30;
  let endDate = oneYearLater;
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
    demoCount++;
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
  } else {
    if (u.institution_id) {
      try {
        const instSub = db.prepare("SELECT * FROM institution_subscriptions WHERE institution_id = ?").get(u.institution_id);
        if (instSub) {
          pkgId = instSub.package_id || defaultPkg.id;
          pkgName = instSub.package_name || defaultPkg.name;
          frozenPrice = instSub.frozen_package_price || defaultPkg.price;
          durationMonths = instSub.frozen_duration_months || 12;
          durationDays = durationMonths * 30;
          endDate = instSub.end_date || oneYearLater;
          notes = `Migrado desde suscripción institucional previa (${instSub.package_name})`;
        }
      } catch {}
    }
    createdCount++;
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
    today, endDate, trialDays, isDemo ? 1 : 0,
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
    pkgId, pkgName, frozenPrice, today, endDate,
    adminId, 'Migración de arquitectura institucional a suscripción individual'
  );
}

db.pragma('foreign_keys = ON');

console.log('=== MIGRACIÓN COMPLETADA CON ÉXITO ===');
console.log('- Usuarios demo configurados:', demoCount);
console.log('- Suscripciones individuales creadas:', createdCount);
console.log('- Total usuarios en user_subscriptions:', db.prepare('SELECT count(*) as c FROM user_subscriptions').get().c);
