const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = process.env.DATABASE_FILE || path.join(process.cwd(), 'data', 'dece.db');
const db = new Database(DB_PATH);
db.pragma('foreign_keys = OFF');

console.log('=== INICIANDO MIGRACIÓN DE ROLES (SUPERADMIN) Y TABLA DE DELEGACIONES ===');

// 1. Migración de tabla users para admitir 'SUPERADMIN'
const userTableSql = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='users'").get();
console.log('Current users schema:', userTableSql ? userTableSql.sql : 'None');

if (userTableSql && !userTableSql.sql.includes('SUPERADMIN')) {
  console.log('-> Actualizando restricción CHECK de tabla users para incluir SUPERADMIN...');
  
  db.transaction(() => {
    db.exec(`
      CREATE TABLE users_new (
        id             TEXT PRIMARY KEY,
        institution_id TEXT REFERENCES institutions(id),
        name           TEXT NOT NULL,
        email          TEXT NOT NULL UNIQUE,
        password_hash  TEXT NOT NULL,
        role           TEXT NOT NULL CHECK (role IN ('SUPERADMIN','DISTRITO','ADMIN','DECE','AUTORIDAD','DOCENTE')),
        active         INTEGER NOT NULL DEFAULT 1,
        phone          TEXT,
        created_at     TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
      );

      INSERT INTO users_new (id, institution_id, name, email, password_hash, role, active, phone, created_at, updated_at)
      SELECT id, institution_id, name, email, password_hash, role, active, phone, created_at, updated_at
      FROM users;

      DROP TABLE users;
      ALTER TABLE users_new RENAME TO users;
      CREATE INDEX IF NOT EXISTS idx_users_institution ON users(institution_id);
    `);
  })();
  console.log('-> Tabla users migrada exitosamente.');
} else {
  console.log('-> La tabla users ya admite SUPERADMIN o no requiere alteración.');
}

// 2. Crear tabla dece_coordinator_delegations si no existe
console.log('-> Creando tabla dece_coordinator_delegations...');
db.exec(`
  CREATE TABLE IF NOT EXISTS dece_coordinator_delegations (
    id                    TEXT PRIMARY KEY,
    institution_id        TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    original_user_id      TEXT NOT NULL REFERENCES users(id),
    original_user_name    TEXT NOT NULL,
    delegated_user_id     TEXT NOT NULL REFERENCES users(id),
    delegated_user_name   TEXT NOT NULL,
    delegation_type       TEXT NOT NULL CHECK (delegation_type IN ('PERMANENTE','TEMPORAL')),
    reason                TEXT,
    start_date            TEXT NOT NULL,
    end_date              TEXT,
    is_active             INTEGER NOT NULL DEFAULT 1,
    revoked_at            TEXT,
    revoked_by_id         TEXT REFERENCES users(id),
    created_by_id         TEXT NOT NULL REFERENCES users(id),
    created_at            TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at            TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_delegations_inst ON dece_coordinator_delegations(institution_id);
  CREATE INDEX IF NOT EXISTS idx_delegations_active ON dece_coordinator_delegations(institution_id, is_active);
`);
console.log('-> Tabla dece_coordinator_delegations lista.');

// 3. Asignar rol SUPERADMIN a gatofer8@gmail.com y marlon.jacome@dece.edu.ec
console.log('-> Asignando rol SUPERADMIN a las cuentas del usuario...');
const superEmails = ['gatofer8@gmail.com', 'marlon.jacome@dece.edu.ec'];

for (const email of superEmails) {
  const user = db.prepare('SELECT id, name, role FROM users WHERE email = ?').get(email);
  if (user) {
    db.prepare("UPDATE users SET role = 'SUPERADMIN', updated_at = datetime('now') WHERE id = ?").run(user.id);
    console.log(`✓ Usuario ${user.name} (${email}) actualizado a SUPERADMIN.`);
  } else {
    console.log(`- Usuario ${email} no encontrado en la base de datos para actualizar.`);
  }
}

db.pragma('foreign_keys = ON');

console.log('=== MIGRACIÓN FINALIZADA CON ÉXITO ===');
const updatedUsers = db.prepare("SELECT id, name, email, role FROM users WHERE role = 'SUPERADMIN'").all();
console.log('Superadministradores activos en el sistema:', updatedUsers);
