#!/usr/bin/env node
/**
 * Cambia la contraseña de uno o varios usuarios de forma segura (hash bcrypt).
 *
 * Uso:
 *   node scripts/set_password.js correo@ejemplo.com                 -> genera una contraseña fuerte
 *   node scripts/set_password.js correo@ejemplo.com MiClaveSegura   -> usa la que indiques
 *   node scripts/set_password.js --superadmins                      -> genera nuevas para TODOS los SUPERADMIN
 *
 * Respeta DATABASE_FILE (por defecto ./data/dece.db). En producción, ejecútalo
 * en la consola del contenedor con DATABASE_FILE=/data/dece.db.
 */
const crypto = require("crypto");
const path = require("path");
const bcrypt = require("bcryptjs");
const Database = require("better-sqlite3");

const DB_PATH = process.env.DATABASE_FILE || path.join(process.cwd(), "data", "dece.db");
const db = new Database(DB_PATH);

function strongPassword() {
  // 16 caracteres, sin caracteres ambiguos.
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789@#%&*+=?";
  let out = "";
  const bytes = crypto.randomBytes(16);
  for (let i = 0; i < 16; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

function setPassword(email, password) {
  const normalized = email.toLowerCase().trim();
  const user = db.prepare("SELECT id, name, role FROM users WHERE email = ?").get(normalized);
  if (!user) {
    console.error(`  ✗ No existe ningún usuario con el correo ${normalized}`);
    return false;
  }
  const hash = bcrypt.hashSync(password, 10);
  db.prepare("UPDATE users SET password_hash = ?, active = 1, updated_at = datetime('now') WHERE id = ?").run(
    hash,
    user.id
  );
  console.log(`  ✓ ${user.role.padEnd(11)} ${normalized}`);
  console.log(`      nombre:     ${user.name}`);
  console.log(`      contraseña: ${password}`);
  console.log("");
  return true;
}

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("Uso: node scripts/set_password.js <correo> [contraseña]   |   --superadmins");
  process.exit(1);
}

console.log(`Base de datos: ${DB_PATH}\n`);

if (args[0] === "--superadmins") {
  const admins = db.prepare("SELECT email FROM users WHERE role = 'SUPERADMIN'").all();
  if (admins.length === 0) {
    console.error("No hay usuarios SUPERADMIN en esta base.");
    process.exit(1);
  }
  console.log("Nuevas contraseñas para los SUPERADMIN (guárdalas AHORA, no se vuelven a mostrar):\n");
  for (const a of admins) setPassword(a.email, strongPassword());
} else {
  const [email, provided] = args;
  const password = provided || strongPassword();
  console.log("Guarda esta contraseña AHORA, no se vuelve a mostrar:\n");
  setPassword(email, password);
}

db.close();
