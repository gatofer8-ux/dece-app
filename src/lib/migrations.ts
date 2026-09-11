import fs from "fs";
import path from "path";
import type Database from "better-sqlite3";

/**
 * Runner de migraciones incremental.
 *
 * Contexto: históricamente el esquema se gestionaba con `db/schema.sql`
 * (idempotente) + ~100 llamadas `safeAddColumn` en try/catch dentro de
 * `db.ts`. Eso funciona pero no deja rastro de qué versión tiene cada base y
 * mezcla DDL con backfills de datos.
 *
 * A partir de ahora, TODO cambio nuevo de esquema va como un archivo numerado
 * en `migrations/NNNN_descripcion.sql`. Cada archivo se aplica una sola vez,
 * dentro de una transacción, y queda registrado en `schema_migrations`.
 * El bloque legado de `db.ts` se conserva para bases ya existentes; las
 * migraciones nuevas se apilan encima.
 */
export function runMigrations(db: Database.Database, migrationsDir: string): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version    TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  if (!fs.existsSync(migrationsDir)) return;

  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  const applied = new Set(
    (db.prepare("SELECT version FROM schema_migrations").all() as { version: string }[]).map(
      (r) => r.version
    )
  );

  for (const file of files) {
    const version = file.replace(/\.sql$/, "");
    if (applied.has(version)) continue;

    const sql = fs
      .readFileSync(path.join(migrationsDir, file), "utf-8")
      .replace(/^﻿/, ""); // BOM: algunos editores guardan .sql con BOM y SQLite no lo tolera al inicio
    const statements = sql
      // Se quitan las líneas de comentario "--" ANTES de partir por ";" para que
      // un ";" dentro de un comentario no rompa la migración.
      .split("\n")
      .filter((line) => !line.trim().startsWith("--"))
      .join("\n")
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const tx = db.transaction(() => {
      for (const stmt of statements) {
        try {
          db.exec(stmt);
        } catch (err: any) {
          const msg = err?.message?.toLowerCase() || "";
          if (msg.includes("duplicate column name")) {
            // Idempotencia: la columna ya fue agregada previamente
            continue;
          }
          throw err;
        }
      }
      db.prepare("INSERT OR IGNORE INTO schema_migrations (version) VALUES (?)").run(version);
    });

    try {
      tx();
      console.log(`[migraciones] aplicada: ${version}`);
    } catch (err) {
      console.error(`[migraciones] FALLÓ ${version}:`, err);
      throw err;
    }
  }
}
