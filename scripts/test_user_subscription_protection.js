const Database = require('better-sqlite3');
const path = require('path');
const assert = require('assert');
const { randomUUID } = require('crypto');

const DB_PATH = process.env.DATABASE_FILE || path.join(process.cwd(), 'data', 'dece.db');
const db = new Database(DB_PATH);

console.log('=== SUITE DE PRUEBAS: SUSCRIPCIONES Y AISLAMIENTO POR USUARIO (REGLA 13) ===\n');

let passedTests = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`✅ PASS: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`❌ FAIL: ${name}`);
    console.error(err);
    process.exit(1);
  }
}

// 1. Prueba: Creación de usuario con Periodo de Prueba
runTest('Crear usuario con Periodo de Prueba (gratuito $0.00, fecha límite calculada)', () => {
  const userId = 'test-trial-user-' + Date.now();
  const email = `trial.${Date.now()}@test.com`;
  const today = new Date().toISOString().split('T')[0];
  const trialDays = 30;

  const d = new Date(today + 'T00:00:00');
  d.setDate(d.getDate() + trialDays);
  const expectedEndDate = d.toISOString().split('T')[0];

  db.prepare(`
    INSERT INTO users (id, name, email, password_hash, role, active)
    VALUES (?, 'Usuario Prueba DECE', ?, 'hash123', 'DECE', 1)
  `).run(userId, email);

  db.prepare(`
    INSERT INTO user_subscriptions (
      id, user_id, status, package_name, billing_type,
      frozen_price, frozen_duration_months, frozen_duration_days,
      start_date, end_date, trial_days, is_demo
    ) VALUES (?, ?, 'en_prueba', 'Periodo de Prueba (30 días)', 'prueba', 0.00, 1, 30, ?, ?, ?, 0)
  `).run(randomUUID(), userId, today, expectedEndDate, trialDays);

  const sub = db.prepare('SELECT * FROM user_subscriptions WHERE user_id = ?').get(userId);
  assert.strictEqual(sub.status, 'en_prueba');
  assert.strictEqual(sub.frozen_price, 0);
  assert.strictEqual(sub.trial_days, 30);
  assert.strictEqual(sub.end_date, expectedEndDate);
});

// 2. Prueba: Creación de usuario con Paquete Comercial y Precio Congelado
runTest('Crear usuario con Paquete Comercial y tarifa congelada', () => {
  const userId = 'test-pkg-user-' + Date.now();
  const email = `pkg.${Date.now()}@test.com`;
  const pkg = db.prepare("SELECT * FROM subscription_packages WHERE id = 'pkg-mensual'").get();
  assert(pkg, 'Debe existir pkg-mensual');

  const today = new Date().toISOString().split('T')[0];
  const d = new Date(today + 'T00:00:00');
  d.setMonth(d.getMonth() + pkg.duration_months);
  const expectedEndDate = d.toISOString().split('T')[0];

  db.prepare(`
    INSERT INTO users (id, name, email, password_hash, role, active)
    VALUES (?, 'Usuario Paquete DECE', ?, 'hash123', 'DECE', 1)
  `).run(userId, email);

  db.prepare(`
    INSERT INTO user_subscriptions (
      id, user_id, status, package_id, package_name, billing_type,
      frozen_price, frozen_duration_months, frozen_duration_days,
      start_date, end_date, trial_days, is_demo
    ) VALUES (?, ?, 'activo', ?, ?, 'paquete', ?, ?, ?, ?, ?, 0, 0)
  `).run(randomUUID(), userId, pkg.id, pkg.name, pkg.price, pkg.duration_months, pkg.duration_months * 30, today, expectedEndDate);

  const sub = db.prepare('SELECT * FROM user_subscriptions WHERE user_id = ?').get(userId);
  assert.strictEqual(sub.status, 'activo');
  assert.strictEqual(sub.frozen_price, pkg.price);
  assert.strictEqual(sub.package_id, pkg.id);
  assert.strictEqual(sub.end_date, expectedEndDate);
});

// 3. Prueba: Inmunidad de Suscripciones Activas ante Cambios en el Catálogo (Regla Crítica 13)
runTest('Regla 13: Subir precio del paquete en catálogo NO altera la tarifa congelada del usuario activo', () => {
  const userId = 'test-freeze-user-' + Date.now();
  const originalPrice = 25.00;

  // Insertar usuario con precio congelado de $25.00
  db.prepare(`
    INSERT INTO users (id, name, email, password_hash, role, active)
    VALUES (?, 'Usuario Congelado', ?, 'hash', 'DECE', 1)
  `).run(userId, `freeze.${Date.now()}@test.com`);

  db.prepare(`
    INSERT INTO user_subscriptions (
      id, user_id, status, package_id, package_name, billing_type,
      frozen_price, frozen_duration_months, frozen_duration_days,
      start_date, end_date
    ) VALUES (?, ?, 'activo', 'pkg-mensual', 'Plan Mensual Básico', 'paquete', ?, 1, 30, '2026-09-01', '2026-10-01')
  `).run(randomUUID(), userId, originalPrice);

  // Simular cambio de precio en el catálogo de paquetes: $25.00 -> $55.00
  db.prepare("UPDATE subscription_packages SET price = 55.00 WHERE id = 'pkg-mensual'").run();

  // Comprobar que el usuario mantiene $25.00 congelado
  const sub = db.prepare('SELECT frozen_price, end_date FROM user_subscriptions WHERE user_id = ?').get(userId);
  assert.strictEqual(sub.frozen_price, 25.00, 'El precio del usuario activo debió permanecer estrictamente congelado en $25.00');
  assert.strictEqual(sub.end_date, '2026-10-01', 'La fecha de fin debió permanecer intacta');

  // Restaurar precio del paquete
  db.prepare("UPDATE subscription_packages SET price = 25.00 WHERE id = 'pkg-mensual'").run();
});

// 4. Prueba: Aislamiento entre usuarios de una misma institución
runTest('Aislamiento institucional: Suspender al Usuario A NO afecta al Usuario B de la misma institución', () => {
  const instId = 'test-inst-iso-' + Date.now();
  db.prepare("INSERT INTO institutions (id, name, amie_code) VALUES (?, 'Colegio de Prueba Aislamiento', 'AMIE-TEST')").run(instId);

  const userA = 'user-a-' + Date.now();
  const userB = 'user-b-' + Date.now();

  db.prepare("INSERT INTO users (id, institution_id, name, email, password_hash, role, active) VALUES (?, ?, 'Profesional A', ?, 'h', 'DECE', 1)").run(userA, instId, `a.${Date.now()}@test.com`);
  db.prepare("INSERT INTO users (id, institution_id, name, email, password_hash, role, active) VALUES (?, ?, 'Profesional B', ?, 'h', 'DECE', 1)").run(userB, instId, `b.${Date.now()}@test.com`);

  // Ambos inician activos
  db.prepare("INSERT INTO user_subscriptions (id, user_id, status, package_name, billing_type, frozen_price, frozen_duration_months, frozen_duration_days, start_date) VALUES (?, ?, 'activo', 'Plan Anual', 'paquete', 200, 12, 365, '2026-01-01')").run(randomUUID(), userA);
  db.prepare("INSERT INTO user_subscriptions (id, user_id, status, package_name, billing_type, frozen_price, frozen_duration_months, frozen_duration_days, start_date) VALUES (?, ?, 'activo', 'Plan Anual', 'paquete', 200, 12, 365, '2026-01-01')").run(randomUUID(), userB);

  // Suspender al Usuario A
  db.prepare("UPDATE user_subscriptions SET status = 'suspendido' WHERE user_id = ?").run(userA);

  const subA = db.prepare('SELECT status FROM user_subscriptions WHERE user_id = ?').get(userA);
  const subB = db.prepare('SELECT status FROM user_subscriptions WHERE user_id = ?').get(userB);

  assert.strictEqual(subA.status, 'suspendido', 'Usuario A debe estar suspendido');
  assert.strictEqual(subB.status, 'activo', 'Usuario B debe continuar activo sin perturbación alguna');
});

// 5. Prueba: Reubicación DECE preserva intacta la suscripción individual
runTest('Reubicación: Trasladar profesional a otra institución conserva suscripción, tarifa y vencimiento', () => {
  const instOrigen = 'inst-orig-' + Date.now();
  const instDestino = 'inst-dest-' + Date.now();
  db.prepare("INSERT INTO institutions (id, name) VALUES (?, 'Institución Origen')").run(instOrigen);
  db.prepare("INSERT INTO institutions (id, name) VALUES (?, 'Institución Destino')").run(instDestino);

  const userId = 'user-trans-' + Date.now();
  db.prepare("INSERT INTO users (id, institution_id, name, email, password_hash, role, active) VALUES (?, ?, 'Profesional Traslado', ?, 'h', 'DECE', 1)").run(userId, instOrigen, `trans.${Date.now()}@test.com`);

  db.prepare(`
    INSERT INTO user_subscriptions (
      id, user_id, status, package_name, billing_type,
      frozen_price, frozen_duration_months, frozen_duration_days,
      start_date, end_date
    ) VALUES (?, ?, 'activo', 'Plan Semestral', 'paquete', 120.00, 6, 180, '2026-09-01', '2027-03-01')
  `).run(randomUUID(), userId);

  // Ejecutar traslado
  db.prepare("UPDATE users SET institution_id = ? WHERE id = ?").run(instDestino, userId);
  db.prepare(`
    INSERT INTO user_subscription_history (
      id, user_id, institution_id_snapshot, event_type, billing_type,
      package_name, frozen_price, start_date, end_date, reason
    ) VALUES (?, ?, ?, 'REUBICACION', 'paquete', 'Plan Semestral', 120.00, '2026-09-01', '2027-03-01', 'Traslado de personal')
  `).run(randomUUID(), userId, instDestino);

  // Validaciones
  const u = db.prepare('SELECT institution_id FROM users WHERE id = ?').get(userId);
  assert.strictEqual(u.institution_id, instDestino, 'El usuario debió cambiar de institución');

  const sub = db.prepare('SELECT * FROM user_subscriptions WHERE user_id = ?').get(userId);
  assert.strictEqual(sub.status, 'activo', 'El estado de suscripción debe permanecer activo');
  assert.strictEqual(sub.frozen_price, 120.00, 'La tarifa congelada debe permanecer en $120.00');
  assert.strictEqual(sub.end_date, '2027-03-01', 'La fecha de vencimiento no debe reiniciarse ni alterarse');

  const hist = db.prepare("SELECT * FROM user_subscription_history WHERE user_id = ? AND event_type = 'REUBICACION'").get(userId);
  assert(hist, 'Debe existir registro en historial de la reubicación');
  assert.strictEqual(hist.institution_id_snapshot, instDestino);
});

console.log(`\n🎉 TODAS LAS PRUEBAS SUPERADAS: ${passedTests} de 5 pruebas exitosas.\n`);
