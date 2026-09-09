# Migraciones de base de datos

Runner: [`src/lib/migrations.ts`](../src/lib/migrations.ts), invocado al abrir la
conexión en [`src/lib/db.ts`](../src/lib/db.ts).

## Reglas

1. Cada cambio de esquema **nuevo** va en un archivo `NNNN_descripcion.sql`
   (numeración de 4 dígitos, correlativa).
2. Se aplican en orden, **una sola vez**, cada uno dentro de una transacción.
   El registro vive en la tabla `schema_migrations`.
3. Escribe DDL idempotente cuando puedas (`CREATE TABLE IF NOT EXISTS`,
   `CREATE INDEX IF NOT EXISTS`). SQLite no permite `ADD COLUMN IF NOT EXISTS`:
   para columnas nuevas, si la base puede venir de una instalación vieja, usa un
   `PRAGMA table_info` previo o asume que el runner solo la aplica una vez.
4. **No** metas backfills de datos grandes junto al DDL sin revisarlo; si el
   volumen es alto, hazlo en un script aparte.
5. Nunca edites una migración ya publicada. Crea una nueva.

## Contexto (deuda histórica)

Antes de este runner, el esquema se gestionaba con:

- `db/schema.sql` — se re-ejecuta completo en cada conexión (idempotente).
- ~100 llamadas `safeAddColumn(...)` en `db.ts` envueltas en `try/catch` vacíos.

Ese bloque legado **se conserva** para las bases ya existentes. Las migraciones
nuevas se apilan encima. El objetivo a medio plazo es congelar `db/schema.sql`
como "migración 0000 / baseline" y no volver a tocar el bloque de `db.ts`.
Ver `REVIEW.md`.

## Crear una migración

```bash
# 1. crea el archivo
#    migrations/0002_descripcion_corta.sql
# 2. escribe el SQL
# 3. arranca la app en local: se aplica sola y aparece en logs
npm run dev
```
