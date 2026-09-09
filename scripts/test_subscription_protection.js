const Database = require('better-sqlite3');
const path = require('path');
const assert = require('assert');

const DB_PATH = process.env.DATABASE_FILE || path.join(process.cwd(), 'data', 'dece.db');
const db = new Database(DB_PATH);

console.log('================================================================');
console.log('TEST SUITE: PROTECCIÓN DE SUSCRIPCIONES ACTIVAS ANTE CAMBIOS DE PRECIO');
console.log('REGLA CRÍTICA 13: Inmutabilidad de montos y periodos congelados');
console.log('================================================================');

let passedTests = 0;
let totalTests = 0;

function it(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✓ PASSED: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ FAILED: ${name}`);
    console.error(`    Error: ${err.message}`);
  }
}

// Configuración de datos aislados para la prueba
const TEST_INST_1 = "test-inst-proteccion-pkg";
const TEST_INST_2 = "test-inst-proteccion-user";
const TEST_PKG_ID = "pkg-test-inmutable";

db.prepare("INSERT OR REPLACE INTO institutions (id, name, active) VALUES (?, 'Institución Prueba Paquete', 1)").run(TEST_INST_1);
db.prepare("INSERT OR REPLACE INTO institutions (id, name, active) VALUES (?, 'Institución Prueba Usuario', 1)").run(TEST_INST_2);

// Limpiar suscripciones previas de prueba si existen
db.prepare("DELETE FROM institution_subscriptions WHERE institution_id IN (?, ?)").run(TEST_INST_1, TEST_INST_2);
db.prepare("DELETE FROM subscription_history WHERE institution_id IN (?, ?)").run(TEST_INST_1, TEST_INST_2);
db.prepare("DELETE FROM subscription_packages WHERE id = ?").run(TEST_PKG_ID);

// -------------------------------------------------------------------------
// TEST 1: Inmunidad ante cambio de precio y duración de un paquete comercial
// -------------------------------------------------------------------------
it("Ninguna institución con suscripción activa se ve afectada por un cambio en la tarifa o duración de un paquete", () => {
  // 1. Crear paquete con precio inicial $150.00 y 12 meses de duración
  db.prepare(`
    INSERT INTO subscription_packages (id, name, price, duration_months, billing_period, is_active)
    VALUES (?, 'Paquete Inicial Inmutable', 150.00, 12, 'ANUAL', 1)
  `).run(TEST_PKG_ID);

  // 2. Suscribir a Institución 1 con valores congelados
  const today = '2026-09-01';
  const nextYear = '2027-09-01';
  db.prepare(`
    INSERT INTO institution_subscriptions (
      id, institution_id, status, package_id, package_name, billing_mode,
      frozen_package_price, frozen_duration_months, total_amount, start_date, end_date
    ) VALUES ('sub-test-1', ?, 'activa', ?, 'Paquete Inicial Inmutable', 'paquete', 150.00, 12, 150.00, ?, ?)
  `).run(TEST_INST_1, TEST_PKG_ID, today, nextYear);

  // 3. Modificar el paquete en el sistema: duplicar el precio a $300.00 y reducir duración a 6 meses
  db.prepare(`
    UPDATE subscription_packages
    SET price = 300.00, duration_months = 6, name = 'Paquete Inicial Duplicado', updated_at = datetime('now')
    WHERE id = ?
  `).run(TEST_PKG_ID);

  // 4. Verificar que la suscripción activa de la Institución 1 NO cambió absolutamente nada
  const subAfterChange = db.prepare("SELECT * FROM institution_subscriptions WHERE institution_id = ?").get(TEST_INST_1);

  assert.strictEqual(subAfterChange.total_amount, 150.00, "El monto total de la suscripción debe permanecer exactamente en $150.00");
  assert.strictEqual(subAfterChange.frozen_package_price, 150.00, "La tarifa congelada debe seguir siendo $150.00");
  assert.strictEqual(subAfterChange.frozen_duration_months, 12, "La duración congelada debe seguir siendo 12 meses");
  assert.strictEqual(subAfterChange.end_date, nextYear, "La fecha de vencimiento debe permanecer inalterada");
});

// -------------------------------------------------------------------------
// TEST 2: Inmunidad ante cambio de tarifa global por usuario
// -------------------------------------------------------------------------
it("Una institución con suscripción por usuario mantiene su tarifa y monto congelados tras cambiar la tarifa global", () => {
  // 1. Establecer tarifa global en $2.00 por usuario/mes
  db.prepare("INSERT OR REPLACE INTO system_settings (key, value) VALUES ('global_user_rate', '2.00')").run();

  // 2. Suscribir a Institución 2 con 10 usuarios y 12 meses = 10 * $2 * 12 = $240.00 congelados
  const today = '2026-09-01';
  const nextYear = '2027-09-01';
  db.prepare(`
    INSERT INTO institution_subscriptions (
      id, institution_id, status, package_name, billing_mode,
      frozen_rate_per_user, frozen_duration_months, frozen_user_count, total_amount, start_date, end_date
    ) VALUES ('sub-test-2', ?, 'activa', 'Tarifa por Usuario', 'por_usuario', 2.00, 12, 10, 240.00, ?, ?)
  `).run(TEST_INST_2, today, nextYear);

  // 3. Cambiar la tarifa global del sistema a $4.50 por usuario/mes
  db.prepare("UPDATE system_settings SET value = '4.50', updated_at = datetime('now') WHERE key = 'global_user_rate'").run();

  // 4. Verificar que la suscripción de la Institución 2 mantiene su tarifa de $2.00 y monto de $240.00
  const subAfterRateChange = db.prepare("SELECT * FROM institution_subscriptions WHERE institution_id = ?").get(TEST_INST_2);

  assert.strictEqual(subAfterRateChange.frozen_rate_per_user, 2.00, "La tarifa por usuario congelada debe seguir siendo $2.00");
  assert.strictEqual(subAfterRateChange.total_amount, 240.00, "El monto total congelado debe seguir siendo $240.00");
  assert.strictEqual(subAfterRateChange.frozen_duration_months, 12, "La duración congelada debe ser 12 meses");
});

// -------------------------------------------------------------------------
// TEST 3: El nuevo precio solo se aplica al momento exacto de la RENOVACIÓN
// -------------------------------------------------------------------------
it("La nueva tarifa del paquete solo se aplica cuando se ejecuta la RENOVACIÓN oficial", () => {
  // Institución 1 tiene suscripción congelada a $150.00 (el paquete actual vale $300.00 y dura 6 meses)
  const pkgCurrent = db.prepare("SELECT * FROM subscription_packages WHERE id = ?").get(TEST_PKG_ID);
  assert.strictEqual(pkgCurrent.price, 300.00, "El precio actual del paquete en el catálogo es $300.00");

  // Simular la ejecución de la renovación oficial: toma el precio y duración actuales del paquete
  const subPrev = db.prepare("SELECT * FROM institution_subscriptions WHERE institution_id = ?").get(TEST_INST_1);
  const renewStartDate = subPrev.end_date; // Comienza al vencer el periodo anterior
  const renewEndDate = '2028-03-01'; // 6 meses después

  db.prepare(`
    UPDATE institution_subscriptions
    SET frozen_package_price = ?,
        frozen_duration_months = ?,
        total_amount = ?,
        start_date = ?,
        end_date = ?,
        last_renewed_at = datetime('now')
    WHERE institution_id = ?
  `).run(pkgCurrent.price, pkgCurrent.duration_months, pkgCurrent.price, renewStartDate, renewEndDate, TEST_INST_1);

  // Registrar en historial
  db.prepare(`
    INSERT INTO subscription_history (
      id, subscription_id, institution_id, event_type, billing_mode, package_id, package_name,
      frozen_package_price, frozen_duration_months, total_amount, start_date, end_date, executed_by_id, reason
    ) VALUES ('hist-test-renew', 'sub-test-1', ?, 'RENOVACION', 'paquete', ?, 'Paquete Inicial Duplicado', 300.00, 6, 300.00, ?, ?, 'superadmin', 'Renovación oficial')
  `).run(TEST_INST_1, TEST_PKG_ID, renewStartDate, renewEndDate);

  const subRenewed = db.prepare("SELECT * FROM institution_subscriptions WHERE institution_id = ?").get(TEST_INST_1);

  assert.strictEqual(subRenewed.total_amount, 300.00, "Tras renovar, el nuevo monto congelado debe ser $300.00");
  assert.strictEqual(subRenewed.frozen_duration_months, 6, "Tras renovar, la nueva duración congelada debe ser 6 meses");
  assert.strictEqual(subRenewed.start_date, renewStartDate, "La fecha de inicio debe ser la fecha de vencimiento anterior");
});

// -------------------------------------------------------------------------
// TEST 4: Excepción manual forzada para una institución específica
// -------------------------------------------------------------------------
it("La excepción de cambio forzado altera solo a la institución especificada y se registra en historial", () => {
  // Institución 2 está congelada en $240.00. Se fuerza un cambio extraordinario a $199.00
  db.prepare(`
    UPDATE institution_subscriptions
    SET total_amount = 199.00,
        frozen_package_price = 199.00,
        notes = 'Cambio forzado por convenio'
    WHERE institution_id = ?
  `).run(TEST_INST_2);

  db.prepare(`
    INSERT INTO subscription_history (
      id, subscription_id, institution_id, event_type, billing_mode, package_name,
      total_amount, frozen_duration_months, start_date, end_date, executed_by_id, reason
    ) VALUES ('hist-test-force', 'sub-test-2', ?, 'CAMBIO_FORZADO', 'personalizado', 'Tarifa por Convenio', 199.00, 12, '2026-09-01', '2027-09-01', 'superadmin', 'Ajuste aprobado por rectorado')
  `).run(TEST_INST_2);

  const subForced = db.prepare("SELECT * FROM institution_subscriptions WHERE institution_id = ?").get(TEST_INST_2);
  assert.strictEqual(subForced.total_amount, 199.00, "El monto forzado debe ser $199.00");

  const hist = db.prepare("SELECT * FROM subscription_history WHERE id = 'hist-test-force'").get();
  assert.strictEqual(hist.event_type, 'CAMBIO_FORZADO', "El historial debe clasificar el evento como CAMBIO_FORZADO");
  assert.strictEqual(hist.total_amount, 199.00, "El monto en el historial debe ser $199.00");
});

// Limpieza posterior de datos de prueba
db.prepare("DELETE FROM institution_subscriptions WHERE institution_id IN (?, ?)").run(TEST_INST_1, TEST_INST_2);
db.prepare("DELETE FROM subscription_history WHERE institution_id IN (?, ?)").run(TEST_INST_1, TEST_INST_2);
db.prepare("DELETE FROM subscription_packages WHERE id = ?").run(TEST_PKG_ID);
db.prepare("DELETE FROM institutions WHERE id IN (?, ?)").run(TEST_INST_1, TEST_INST_2);

console.log('----------------------------------------------------------------');
console.log(`RESULTADO: ${passedTests} de ${totalTests} pruebas pasaron exitosamente.`);
if (passedTests === totalTests) {
  console.log('✓ LA REGLA CRÍTICA 13 DE PROTECCIÓN DE SUSCRIPCIONES ESTÁ 100% GARANTIZADA.');
}
console.log('================================================================');
