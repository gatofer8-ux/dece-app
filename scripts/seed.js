const { randomUUID } = require("crypto");
const bcrypt = require("bcryptjs");
const Database = require("better-sqlite3");
const fs = require("fs");
const path = require("path");

const DB_PATH = process.env.DATABASE_FILE || path.join(process.cwd(), "data", "dece.db");
const dir = path.dirname(DB_PATH);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

console.log("[DB SEED] Inicializando base de datos en:", DB_PATH);
const db = new Database(DB_PATH);
db.pragma("foreign_keys = ON");

function safeAddColumn(table, colDef) {
  try {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${colDef}`);
  } catch {}
}

// Ejecutar migraciones seguras previas a índices
safeAddColumn("institutions", "seal_image TEXT");
safeAddColumn("institutions", "zona TEXT");
safeAddColumn("institutions", "latitude REAL");
safeAddColumn("institutions", "longitude REAL");
safeAddColumn("institutions", "geofence_radius_meters INTEGER DEFAULT 250");
safeAddColumn("institutions", "require_geolocation INTEGER DEFAULT 1");
safeAddColumn("institutions", "daily_attendance_code TEXT");
safeAddColumn("institutions", "daily_code_date TEXT");

safeAddColumn("interns", "device_id TEXT");
safeAddColumn("interns", "device_name TEXT");
safeAddColumn("interns", "device_linked_at TEXT");
safeAddColumn("interns", "pin_code TEXT");

safeAddColumn("intern_attendances", "latitude REAL");
safeAddColumn("intern_attendances", "longitude REAL");
safeAddColumn("intern_attendances", "distance_meters REAL");

safeAddColumn("case_corresponsibility_acts", "agreements_and_commitments TEXT");
safeAddColumn("case_corresponsibility_acts", "updated_by TEXT");
safeAddColumn("case_corresponsibility_acts", "preview_image_path TEXT");

// Ejecutar schema si existe
const schemaPath = path.join(process.cwd(), "db", "schema.sql");
if (fs.existsSync(schemaPath)) {
  try {
    db.exec(fs.readFileSync(schemaPath, "utf-8"));
  } catch (err) {
    console.warn("[DB SEED] Nota sobre ejecución de schema.sql:", err.message);
  }
}

// Migración de roles (SUPERADMIN) y delegaciones
try {
  require("./migrateSuperadmin");
} catch (e) {
  console.warn("[DB SEED] Nota sobre migrateSuperadmin:", e.message);
}

// Migración de suscripciones y protección de precios
try {
  require("./migrateSubscriptions");
} catch (e) {
  console.warn("[DB SEED] Nota sobre migrateSubscriptions:", e.message);
}

// Generación de plantilla oficial de acta de corresponsabilidad
try {
  require("./buildCorresponsibilityTemplate");
} catch (e) {
  console.warn("[DB SEED] Nota sobre buildCorresponsibilityTemplate:", e.message);
}

function upsertInstitution(name, amie, circuit) {
  const existing = db.prepare("SELECT id FROM institutions WHERE name = ?").get(name);
  if (existing) return existing.id;
  const id = randomUUID();
  db.prepare(`INSERT INTO institutions (id, name, amie_code, circuit, active) VALUES (?, ?, ?, ?, 1)`).run(id, name, amie, circuit);
  return id;
}

function upsertUser(name, email, role, password, institutionId) {
  const normalizedEmail = email.toLowerCase().trim();
  const hash = bcrypt.hashSync(password, 10);
  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(normalizedEmail);
  if (existing) {
    db.prepare(`UPDATE users SET password_hash = ?, active = 1, role = ?, institution_id = COALESCE(?, institution_id) WHERE id = ?`).run(
      hash,
      role,
      institutionId,
      existing.id
    );
    return existing.id;
  }
  const id = randomUUID();
  db.prepare(`INSERT INTO users (id, institution_id, name, email, password_hash, role, active) VALUES (?, ?, ?, ?, ?, ?, 1)`).run(
    id,
    institutionId,
    name,
    normalizedEmail,
    hash,
    role
  );
  return id;
}

function upsertStudent(fullName, course, parallel, representative, institutionId) {
  const existing = db
    .prepare("SELECT id FROM students WHERE full_name = ? AND institution_id = ?")
    .get(fullName, institutionId);
  if (existing) return existing.id;
  const id = randomUUID();
  db.prepare(
    `INSERT INTO students (id, institution_id, full_name, course, parallel, representative, rep_phone) VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(id, institutionId, fullName, course, parallel, representative, "099" + Math.floor(1000000 + Math.random() * 8999999));
  return id;
}

// Distrito
upsertUser("Coordinador/a Distrital DECE", "distrito@dece.edu.ec", "DISTRITO", "Distrito123!", null);

// Institución Real Santa Rosa
const santaRosaId = upsertInstitution("UNIDAD EDUCATIVA “SANTA ROSA”", "18H00494", "18D02");
upsertUser("Administrador General", "gatofer8@gmail.com", "SUPERADMIN", "Admin123!", santaRosaId);
upsertUser("Mgr. Marlon Alberto Jácome S.", "marlon.jacome@dece.edu.ec", "SUPERADMIN", "Dece123!", santaRosaId);
upsertUser("Rector/a Institucional", "rectorado.demo1@institucion.edu.ec", "AUTORIDAD", "Autoridad123!", santaRosaId);
upsertUser("Docente Tutor", "docente.demo1@institucion.edu.ec", "DOCENTE", "Docente123!", santaRosaId);

// Instituciones de demostración
const inst1 = upsertInstitution("Institución Educativa Demo Uno", "AMIE-0001", "Circuito 1");
const inst2 = upsertInstitution("Institución Educativa Demo Dos", "AMIE-0002", "Circuito 2");

upsertUser("Coordinador/a DECE (demo1)", "admin.demo1@institucion.edu.ec", "ADMIN", "Admin123!", inst1);
upsertUser("Psic. DECE (demo1)", "dece.demo1@institucion.edu.ec", "DECE", "Dece123!", inst1);
upsertUser("Coordinador/a DECE (demo2)", "admin.demo2@institucion.edu.ec", "ADMIN", "Admin123!", inst2);
upsertUser("Psic. DECE (demo2)", "dece.demo2@institucion.edu.ec", "DECE", "Dece123!", inst2);
upsertUser("Rector/a (demo2)", "rectorado.demo2@institucion.edu.ec", "AUTORIDAD", "Autoridad123!", inst2);
upsertUser("Docente tutor (demo2)", "docente.demo2@institucion.edu.ec", "DOCENTE", "Docente123!", inst2);

// Sincronizar actas de corresponsabilidad existentes hacia case_actions si aún no están registradas
try {
  db.exec(`
    INSERT INTO case_actions (id, case_file_id, author_id, date, type, description, intervention_type, observations)
    SELECT 
      lower(hex(randomblob(16))),
      a.case_file_id,
      COALESCE(a.created_by, (SELECT id FROM users WHERE institution_id = a.institution_id LIMIT 1)),
      COALESCE(a.act_date, date('now')),
      'Acta de compromiso y corresponsabilidad',
      'Acta de compromiso y corresponsabilidad suscrita con ' || a.representative_name || ' (' || COALESCE(a.representative_relationship, 'Representante legal') || '). Dificultad: ' || substr(a.detected_difficulty, 1, 160),
      'Acuerdo de corresponsabilidad',
      a.observations
    FROM case_corresponsibility_acts a
    WHERE NOT EXISTS (
      SELECT 1 FROM case_actions ca 
      WHERE ca.case_file_id = a.case_file_id 
        AND (ca.type = 'Acta de compromiso y corresponsabilidad' OR ca.type = 'Acta de compromiso')
        AND ca.description LIKE '%' || a.representative_name || '%'
    );
  `);
  console.log("[DB SEED] Sincronización de actas de corresponsabilidad a case_actions ejecutada.");
} catch (e) {
  console.warn("[DB SEED] Nota sobre sincronización de actas:", e.message);
}


try {
  db.exec(`
-- ----------------------------------------------------------------------------
-- Distributivo de Cobertura DECE (Asignación por Profesional)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dece_distributivos (
  id                   TEXT PRIMARY KEY,
  institution_id       TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  school_year_id       TEXT NOT NULL REFERENCES school_years(id) ON DELETE CASCADE,
  school_year_text     TEXT NOT NULL,
  title                TEXT NOT NULL DEFAULT 'Distributivo Institucional de Cobertura DECE',
  coordinator_id       TEXT NOT NULL REFERENCES users(id),
  coordinator_name     TEXT NOT NULL,
  is_active            INTEGER NOT NULL DEFAULT 1,
  elaborated_by_name   TEXT,
  elaborated_by_role   TEXT DEFAULT 'Coordinador/a DECE',
  approved_by_name     TEXT,
  approved_by_role     TEXT DEFAULT 'Rector/a Institucional',
  general_observations TEXT,
  created_by           TEXT REFERENCES users(id),
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at           TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_dece_distributivos_inst ON dece_distributivos(institution_id);
CREATE INDEX IF NOT EXISTS idx_dece_distributivos_year ON dece_distributivos(school_year_id);

CREATE TABLE IF NOT EXISTS dece_distributivo_assignments (
  id                        TEXT PRIMARY KEY,
  distributivo_id           TEXT NOT NULL REFERENCES dece_distributivos(id) ON DELETE CASCADE,
  user_id                   TEXT NOT NULL REFERENCES users(id),
  user_name                 TEXT NOT NULL,
  user_role_label           TEXT NOT NULL DEFAULT 'Profesional DECE',
  jornada                   TEXT NOT NULL DEFAULT 'MATUTINA',
  subniveles                TEXT NOT NULL DEFAULT '[]',
  courses                   TEXT NOT NULL DEFAULT '[]',
  parallels                 TEXT NOT NULL DEFAULT '[]',
  estimated_students_count  INTEGER NOT NULL DEFAULT 0,
  specific_responsibilities TEXT,
  created_at                TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at                TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_distributivo_assign_dist ON dece_distributivo_assignments(distributivo_id);
CREATE INDEX IF NOT EXISTS idx_distributivo_assign_user ON dece_distributivo_assignments(user_id);
`);
} catch (e) {
  // tables already exist
}

console.log("[DB SEED] Usuarios y contraseñas actualizados exitosamente en la base de datos.");

// Cargar Entorno de Demostración (U.E. Los Álamos) si no existen estudiantes
try {
  const demoCheck = db.prepare("SELECT COUNT(*) as c FROM students WHERE institution_id = 'demo-los-alamos'").get();
  if (!demoCheck || demoCheck.c < 50) {
    require("./seedDemoData").runDemoSeed();
  }
} catch (e) {
  console.warn("[DB SEED] Error verificando o cargando datos demo:", e.message);
}
