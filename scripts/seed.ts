import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

const DB_PATH = process.env.DATABASE_FILE || path.join(process.cwd(), "data", "dece.db");
const dir = path.dirname(DB_PATH);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const db = new Database(DB_PATH);
db.pragma("foreign_keys = ON");
db.exec(fs.readFileSync(path.join(process.cwd(), "db", "schema.sql"), "utf-8"));

function upsertInstitution(name: string, amie: string, circuit: string) {
  const existing = db.prepare("SELECT id FROM institutions WHERE name = ?").get(name) as { id: string } | undefined;
  if (existing) return existing.id;
  const id = randomUUID();
  db.prepare(`INSERT INTO institutions (id, name, amie_code, circuit) VALUES (?, ?, ?, ?)`).run(id, name, amie, circuit);
  return id;
}

function upsertUser(name: string, email: string, role: string, password: string, institutionId: string | null) {
  const normalizedEmail = email.toLowerCase().trim();
  const hash = bcrypt.hashSync(password, 10);
  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(normalizedEmail) as { id: string } | undefined;
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

function upsertStudent(fullName: string, course: string, parallel: string, representative: string, institutionId: string) {
  const existing = db
    .prepare("SELECT id FROM students WHERE full_name = ? AND institution_id = ?")
    .get(fullName, institutionId) as { id: string } | undefined;
  if (existing) return existing.id;
  const id = randomUUID();
  db.prepare(
    `INSERT INTO students (id, institution_id, full_name, course, parallel, representative, rep_phone) VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(id, institutionId, fullName, course, parallel, representative, "099" + Math.floor(1000000 + Math.random() * 8999999));
  return id;
}

// ---- Nivel distrito ----
console.log("Creando cuenta de distrito...");
upsertUser("Coordinador/a Distrital DECE", "distrito@dece.edu.ec", "DISTRITO", "Distrito123!", null);

// ---- Instituciones de demostración (para probar el aislamiento entre instituciones) ----
console.log("Creando instituciones de demostración...");
const inst1 = upsertInstitution("Institución Educativa Demo Uno", "AMIE-0001", "Circuito 1");
const inst2 = upsertInstitution("Institución Educativa Demo Dos", "AMIE-0002", "Circuito 2");

function seedInstitution(institutionId: string, slug: string) {
  console.log(`Creando usuarios y datos de demostración para ${slug}...`);
  const adminId = upsertUser(`Coordinador/a DECE (${slug})`, `admin.${slug}@institucion.edu.ec`, "ADMIN", "Admin123!", institutionId);
  const deceId = upsertUser(`Psic. DECE (${slug})`, `dece.${slug}@institucion.edu.ec`, "DECE", "Dece123!", institutionId);
  upsertUser(`Rector/a (${slug})`, `rectorado.${slug}@institucion.edu.ec`, "AUTORIDAD", "Autoridad123!", institutionId);
  upsertUser(`Docente tutor (${slug})`, `docente.${slug}@institucion.edu.ec`, "DOCENTE", "Docente123!", institutionId);
  // Crear Años Lectivos Demo
  const currentYear = new Date().getFullYear();
  const year1Id = randomUUID();
  const year2Id = randomUUID();
  const y1Name = `${currentYear - 1}-${currentYear} (Sierra-Amazonía)`;
  const y2Name = `${currentYear}-${currentYear + 1} (Sierra-Amazonía)`;

  const existingY2 = db.prepare("SELECT id FROM school_years WHERE name = ? AND institution_id = ?").get(y2Name, institutionId) as { id: string } | undefined;
  let activeYearId = existingY2 ? existingY2.id : year2Id;

  if (!existingY2) {
    db.prepare(
      `INSERT INTO school_years (id, institution_id, name, regime, start_date, end_date, is_active)
       VALUES (?, ?, ?, 'SIERRA_AMAZONIA', '${currentYear - 1}-09-01', '${currentYear}-06-30', 0)`
    ).run(year1Id, institutionId, y1Name);

    db.prepare(
      `INSERT INTO school_years (id, institution_id, name, regime, start_date, end_date, is_active)
       VALUES (?, ?, ?, 'SIERRA_AMAZONIA', '${currentYear}-09-01', '${currentYear + 1}-06-30', 1)`
    ).run(year2Id, institutionId, y2Name);
  }

  const s1 = upsertStudent("Estudiante Demo Uno", "8vo EGB", "A", "Representante Demo Uno", institutionId);
  const s2 = upsertStudent("Estudiante Demo Dos", "9vo EGB", "B", "Representante Demo Dos", institutionId);
  const s3 = upsertStudent("Estudiante Demo Tres", "1ro BGU", "A", "Representante Demo Tres", institutionId);

  // Matricular estudiantes en el año activo
  db.prepare(
    `INSERT OR IGNORE INTO student_enrollments (id, student_id, school_year_id, institution_id, course, parallel, status)
     VALUES (?, ?, ?, ?, '8vo EGB', 'A', 'MATRICULADO')`
  ).run(randomUUID(), s1, activeYearId, institutionId);

  db.prepare(
    `INSERT OR IGNORE INTO student_enrollments (id, student_id, school_year_id, institution_id, course, parallel, status)
     VALUES (?, ?, ?, ?, '9vo EGB', 'B', 'MATRICULADO')`
  ).run(randomUUID(), s2, activeYearId, institutionId);

  db.prepare(
    `INSERT OR IGNORE INTO student_enrollments (id, student_id, school_year_id, institution_id, course, parallel, status)
     VALUES (?, ?, ?, ?, '1ro BGU', 'A', 'MATRICULADO')`
  ).run(randomUUID(), s3, activeYearId, institutionId);

  const year = new Date().getFullYear();
  const demoCode = `DECE-${year}-DEMO1`;
  const existingCase = db
    .prepare("SELECT id FROM case_files WHERE code = ? AND institution_id = ?")
    .get(demoCode, institutionId) as { id: string } | undefined;
  if (!existingCase) {
    const caseId = randomUUID();
    db.prepare(
      `INSERT INTO case_files (id, institution_id, code, student_id, school_year_id, opened_by_id, assigned_to_id, status, priority, action_axis, risk_type, detection_date, detection_source, description)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'EN_SEGUIMIENTO', 'MEDIA', 'ATENCION', 'CONFLICTO_FAMILIAR', datetime('now','-10 days'), 'Docente tutor', ?)`
    ).run(
      caseId,
      institutionId,
      demoCode,
      s1,
      activeYearId,
      deceId,
      deceId,
      "Caso de ejemplo generado por el script de datos de demostración. Puedes editarlo o eliminarlo desde la aplicación."
    );
    db.prepare(
      `INSERT INTO case_actions (id, case_file_id, author_id, type, description) VALUES (?, ?, ?, 'Apertura de caso', 'Caso registrado en el sistema (dato de ejemplo).')`
    ).run(randomUUID(), caseId, deceId);
  }

  const actTitle = "Taller de convivencia escolar (ejemplo)";
  const actExists = db
    .prepare("SELECT id FROM activities WHERE title = ? AND institution_id = ?")
    .get(actTitle, institutionId);
  if (!actExists) {
    db.prepare(
      `INSERT INTO activities (id, institution_id, school_year_id, title, axis, description, target_audience, date, responsible_id, participants_count)
       VALUES (?, ?, ?, ?, 'CONVIVENCIA', 'Actividad de ejemplo generada por el script de datos de demostración.', 'Estudiantes de EGB Superior', date('now','-5 days'), ?, 30)`
    ).run(randomUUID(), institutionId, activeYearId, actTitle, deceId);
  }

  return { adminEmail: `admin.${slug}@institucion.edu.ec`, deceEmail: `dece.${slug}@institucion.edu.ec` };
}

// ---- Institución Santa Rosa Real ----
const santaRosaId = upsertInstitution("UNIDAD EDUCATIVA “SANTA ROSA”", "18H00494", "18D02");
upsertUser("Administrador General", "gatofer8@gmail.com", "ADMIN", "Admin123!", santaRosaId);
upsertUser("Mgr. Marlon Alberto Jácome S.", "marlon.jacome@dece.edu.ec", "DECE", "Dece123!", santaRosaId);

seedInstitution(inst1, "demo1");
seedInstitution(inst2, "demo2");

console.log("\nListo. Cuentas de acceso creadas:");
console.log("  DISTRITO   distrito@dece.edu.ec              / Distrito123!");
console.log("  ADMIN      gatofer8@gmail.com                / Admin123!      (Santa Rosa)");
console.log("  DECE       marlon.jacome@dece.edu.ec         / Dece123!       (Santa Rosa)");
console.log("  ADMIN      admin.demo1@institucion.edu.ec     / Admin123!      (Institución Educativa Demo Uno)");
console.log("  DECE       dece.demo1@institucion.edu.ec      / Dece123!       (Institución Educativa Demo Uno)");
console.log("  AUTORIDAD  rectorado.demo1@institucion.edu.ec / Autoridad123!  (Institución Educativa Demo Uno)");
console.log("  DOCENTE    docente.demo1@institucion.edu.ec   / Docente123!    (Institución Educativa Demo Uno)");
console.log("  ADMIN      admin.demo2@institucion.edu.ec     / Admin123!      (Institución Educativa Demo Dos)");
console.log("  DECE       dece.demo2@institucion.edu.ec      / Dece123!       (Institución Educativa Demo Dos)");
console.log("\nSistema DECE listo para producción.");
