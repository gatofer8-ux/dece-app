# Revisión técnica — Sistema de Gestión DECE

Fecha: 2026-09-09 · Alcance: seguridad, arquitectura, calidad, build/despliegue,
higiene del repositorio.

La aplicación es un sistema Next.js 14 (App Router) grande y **funcional**
—356 archivos en `src`, tipado estricto que compila sin errores, RBAC coherente,
consultas parametrizadas, bitácora de auditoría— pero arrastraba problemas
serios de seguridad operativa e higiene. Este documento lista los hallazgos y el
plan. Los marcados **[hecho]** ya se aplicaron en esta ronda de cambios.

---

## 1. Seguridad

### 1.1 Secreto de sesión con fallback público — **[hecho]**
`auth.ts` y el `Dockerfile` incluían el literal
`"dece-app-default-secret-production-2026-key"`. Cualquiera con acceso al código
podía **firmar un JWT válido para cualquier usuario, incluido SUPERADMIN**.
→ `src/lib/env.ts` valida el entorno; la app **aborta en producción** si el
secreto falta o es el inseguro histórico. Eliminado del Dockerfile.

### 1.2 Secretos reales en `.env` — **[hecho]**
`GEMINI_API_KEY` y `VAPID_PRIVATE_KEY` estaban en texto plano en `.env`.
→ `.gitignore` lo excluye; `.env.example` reescrito.
→ `NEXTAUTH_SECRET`, VAPID y `GEMINI_API_KEY` **rotadas** en `.env` y en el
hosting (clave Gemini vieja eliminada en Google AI Studio; nueva verificada con
una llamada real). App redesplegada.
→ `scripts/set_password.js`: contraseñas de los SUPERADMIN cambiadas.

### 1.3 Descarga de respaldo = fuga entre instituciones — **[hecho]**
`/api/backup/download` y la página `/respaldos` permitían a **cualquier ADMIN**
de institución descargar el `dece.db` **completo**: todas las instituciones,
todos los relatos confidenciales de menores, **todos los hashes de contraseña**.
→ El `.db` completo quedó restringido a `SUPERADMIN` + registro en auditoría.
→ ADMIN/DECE tienen `/api/backup/institution`: export JSON **solo de su
institución**, sin `users` ni `audit_logs`. La página `/respaldos` muestra una
u otra opción según el rol.

### 1.4 `scripts/seed.js` reseteaba contraseñas en cada arranque — **[hecho]**
`upsertUser` hacía `UPDATE ... SET password_hash` para usuarios existentes, y
`start` ejecuta el seed en cada arranque del contenedor: cualquier cambio de
contraseña del usuario se perdía en el siguiente despliegue.
→ `upsertUser` ya **nunca** toca la contraseña de un usuario existente. Los
datos e instituciones demo requieren `SEED_DEMO=1`.

### 1.5 Sin cabeceras de seguridad — **[hecho]**
→ `next.config.js`: HSTS, `X-Frame-Options`, `X-Content-Type-Options`,
`Referrer-Policy`, `Permissions-Policy`, `poweredByHeader: false`.
→ **Pendiente:** CSP con nonce (necesita middleware).

### 1.6 Efectos secundarios en el camino de lectura — **[hecho]**
`getSession()` (en cada request) ejecutaba `UPDATE`/`INSERT` para expirar
suscripciones y desactivar delegaciones, con `catch {}` mudos.
→ `src/lib/subscriptions.ts` con los barridos; los corre el cron cada 15 min
(+ un barrido inicial al arrancar). `getSession` ya solo lee; `is_read_only`
se calcula con `is_overdue` en tiempo de lectura para que la UI sea inmediata.

### 1.7 PIN de pasantes en texto plano — **[hecho]**
→ `hashPin` / `verifyInternPin` (bcrypt) en `src/lib/pasantes.ts`. Los valores
heredados de 4 dígitos se aceptan una vez y se re-guardan hasheados.

### 1.8 Datos de menores enviados a Google Gemini — **[parcial]**
`buildCaseContext` enviaba nombre, documento y relato del caso a Gemini.
→ **[hecho]** `src/lib/aiPrivacy.ts`: seudonimización (nombres → rol; cédula,
teléfono, correo barridos), barrido genérico en `ai.ts` sobre todo prompt
saliente, **corte total del relato** para violencia sexual / salud mental /
consumo, y aviso en la interfaz. 11 tests.
→ **Pendiente (tú):** activar facturación en Google Cloud (la API pasa a nivel
de pago → Google ya no entrena ni revisa con humanos) y documentar la base
legal. Ver `SECURITY.md`.

---

## 2. Higiene del repositorio

### 2.1 Sin control de versiones — **[hecho]**
No existía `.git`. → `git init`, `.gitignore` y `.gitattributes` completos,
historia iniciada.

### 2.2 ~170 scripts de un solo uso + binarios en la raíz — **[hecho]**
`fix1.js`…`fix23.js`, `check_*.js`, `inspect_*.js`, `cloudflared.exe` (54 MB),
la copia anidada obsoleta `dece-app/`, `tmp_extracted_dumps/` (298 MB),
`scratch/`, `*.db` vacíos.
→ Movido a `.archive/` (ignorado por git, conservado localmente). La raíz pasó
de ~190 archivos sueltos a ~15 de configuración.

### 2.3 Artefactos de build versionables — **[hecho vía .gitignore]**
`.next/` (798 MB) y `node_modules/` (582 MB) quedan fuera del repo.

---

## 3. Base de datos y arquitectura

### 3.1 Migraciones inmanejables — **[parcial]**
`db.ts` son 837 líneas: `schema.sql` + ~100 `safeAddColumn` en `try/catch`
vacíos, `CREATE TABLE case_closure_reports` **duplicado** (líneas 137 y 366) con
columnas distintas, SQL como string escapado de JS, y un `INSERT…SELECT` de
backfill en cada arranque en frío.
→ **[hecho]** Runner incremental (`src/lib/migrations.ts` + `/migrations/`):
archivos numerados, transacción por archivo, tabla `schema_migrations`. Primera
migración (`0001_indices_rendimiento.sql`) verificada contra una copia de la
base real. El bloque legado se conserva; lo nuevo se apila encima.
→ **Pendiente:** congelar `schema.sql` como baseline, dejar de añadir
`safeAddColumn`, eliminar la definición duplicada de `case_closure_reports`.

### 3.2 Aislamiento multi-tenant solo por convención — **[parcial]**
El filtro `institution_id = ?` está repetido a mano en cientos de consultas.
→ **[hecho]** `src/lib/scopedDb.ts`: `requireOwned` / `findOwned` / `isOwned`
con lista blanca de tablas; `requireOwnedCase` y `requireOwnedStudent`. El
helper `requireOwnedCase` estaba copiado idéntico en 4 archivos — ahora se
importa. Test de integración (`scopedDb.test.ts`) con **dos instituciones y
base SQLite real** que verifica que A nunca ve recursos de B.
→ **Pendiente:** migrar el resto de comprobaciones de pertenencia y los
listados (`SELECT ... WHERE institution_id = ?`) al helper.

### 3.3 SQLite archivo único vs. "nivel distrital" — **[a vigilar]**
Suficiente para una institución. Para varias con concurrencia real, respaldos y
escalado, planificar migración a Postgres. Mientras tanto: cifrado en reposo
(SQLCipher o disco cifrado) y política documentada de retención/borrado.

### 3.4 Índices — **[parcial]**
`0001_indices_rendimiento.sql` añade 6 índices para las consultas más
frecuentes. Revisar el resto con `EXPLAIN QUERY PLAN` sobre las vistas pesadas
(informe de gestión, matriz de riesgos).

---

## 4. Calidad de código

### 4.1 Sin ESLint configurado — **[hecho]**
`next lint` ni siquiera tenía config (por eso `ignoreDuringBuilds: true`).
→ `.eslintrc.json` (`next/core-web-vitals`), lint **limpio**, reactivado en el
build y en CI.

### 4.2 Sin tests — **[parcial]**
→ Vitest + 30 tests: matriz de permisos RBAC, validación de entorno, helpers de
formulario, hash de PIN, y **aislamiento multi-institución con base SQLite real**
(`scopedDb.test.ts`). `npm test` / `npm run check`.
→ **Pendiente:** tests de las server actions críticas de extremo a extremo
(crear/cerrar caso, renovación de suscripciones).

### 4.3 `zod` instalado pero usado en 0 archivos — **[parcial]**
Las 42 server actions parsean `FormData` a mano sin validación.
→ **[hecho]** `src/lib/formData.ts` con helpers compartidos + `parseForm(fd,
schema)`. Migrados `casos/actions.ts` y `estudiantes/actions.ts` (este último
con `studentCoreSchema` de zod validando nombre, documento, correo y fecha).
→ **Pendiente:** esquemas zod en el resto de acciones (el bloque `str`/`int`
seguía duplicado en ~12 archivos más).

### 4.4 `(session.user as any)` ×203 — **[parcial]**
→ **[hecho]** `next-auth.d.ts` ahora tipa `subscription` y la delegación de
coordinador. Quedan casts en otras zonas (student `specialty`, filas `any` de
consultas dinámicas) — se reducen tipando las filas de la base.

### 4.5 Archivos-Dios — **[pendiente]**
`ai.ts` (1381 líneas), `db.ts` (837), `casos/actions.ts` (~1300). Dividir por
subdominio.

### 4.6 `catch {}` mudos y sin observabilidad — **[parcial]**
→ **[hecho]** `src/lib/logger.ts` (info/warn/error con ámbito y serialización de
errores) + `setErrorReporter()` como gancho para Sentry sin dependencias.
Migrados los 8 `catch {}` de `buildCaseContext` y el de la suscripción en
`session.ts`.
→ **Pendiente:** conectar un servicio real (necesita DSN) y barrer el resto de
`catch {}` (quedan ~70, muchos son *fallbacks* legítimos de `JSON.parse`).

---

## 5. Build y despliegue

### 5.1 Dockerfile — **[hecho]**
Antes: una sola etapa, `npm install --include=dev`, build dentro de la imagen de
runtime (→ 1 GB+ con toolchain y devDeps), secreto hardcodeado.
→ Multi-etapa: `builder` compila y hace `npm prune --omit=dev`; `runner` solo
lleva `node_modules` de producción, `.next`, y las dependencias de sistema que
se usan **en ejecución** (LibreOffice, Tesseract, poppler, fuentes). `npm ci`.

### 5.2 Seed en cada arranque — **[mitigado]**
`start` sigue corriendo `seed.js`, pero ahora es idempotente y no destructivo
(ver 1.4). A medio plazo: separar `migrate` (cada arranque) de `seed` (manual).

### 5.3 Cron en proceso — **[a documentar]**
`node-cron` en `instrumentation-node.ts` solo funciona con **1 réplica**
(`railway.json` ya fija `numReplicas: 1`). Si se escala, habrá recordatorios
duplicados. A largo plazo: job con lock en base o scheduler externo.

### 5.4 Configuraciones de despliegue múltiples — **[a decidir]**
`railway.json`, `render.yaml`, `docker-compose.yml`. Elegir el objetivo real y
documentar; los otros pueden quedarse como referencia pero marcados.

### 5.5 Versiones — **[menor]**
`@types/node` 20 vs Node 22 en Docker. Planificar Next 15.

---

## 6. Roadmap sugerido

**Ya hecho en esta ronda** — git + limpieza, `env.ts`, fix del secreto, backup a
SUPERADMIN, cabeceras, fix del reseteo de contraseñas, ESLint + Vitest + CI,
runner de migraciones + índices, helpers de FormData, Dockerfile multi-etapa,
documentación (`SECURITY.md`, `CONTRIBUTING.md`, este archivo).

**Rondas 2-4 de cambios — [hecho]**
- Expiración de suscripciones fuera de `getSession`, al cron (§1.6).
- `pin_code` hasheado con bcrypt (§1.7).
- Validación zod en `casos` y `estudiantes` (§4.3).
- `src/lib/scopedDb.ts` + test de aislamiento con base real (§3.2, §4.2).
- Exportación de respaldo por institución para ADMIN/DECE (§1.3).
- `NEXTAUTH_SECRET` y VAPID rotadas; `scripts/set_password.js` (§1.2).
- `src/lib/logger.ts` y fin de los `catch {}` mudos en rutas clave (§4.6).
- `citas` y `derivaciones` migradas a `scopedDb`.

**Pendiente — decisión tuya (no técnica)**
1. IA + datos de menores (§1.8): la seudonimización y el corte de relato ya
   están; falta **activar facturación en Google Cloud** (la API pasa a nivel de
   pago y Google deja de entrenar/revisar) y dejar por escrito la base legal.
2. En producción, cambiar la contraseña de los SUPERADMIN desde el panel
   Superadmin (el reset por script se hizo en la base local).

**Siguiente (código, cuando quieras)**
4. Migrar el resto de comprobaciones y listados a `scopedDb` (§3.2).
5. Conectar Sentry al gancho `setErrorReporter` (§4.6).
6. Esquemas zod en el resto de server actions (§4.3).
7. Congelar `schema.sql` como baseline; quitar el `case_closure_reports`
   duplicado en `db.ts` (§3.1) — contra una instancia real.
8. Cifrado en reposo (§3.3).

## 7. Interfaz y experiencia de usuario

**[hecho] — primera tanda**
- Fuente Inter (`next/font`) en vez de la del sistema.
- `src/components/Toast.tsx`: notificaciones flotantes + `useToast()`.
- `src/lib/statusColors.ts`: color + icono consistente por prioridad, estado y
  tipo de riesgo; aplicado en la lista de casos.
- `EmptyState` con icono, `StatCard` con franja de color, `Skeleton`,
  foco visible consistente, `loading.tsx` con la clase `.skeleton`.
- Eliminados nombres de persona reales que estaban hardcodeados como valores
  por defecto en 5 formularios.

**[hecho] — segunda y tercera tanda**
- Menú lateral agrupado por secciones.
- **Navegación móvil** (`MobileNav`): antes NO existía menú en pantallas
  pequeñas. Hamburguesa + panel deslizante.
- Dashboard: tarjetas KPI clicables (enlazan a su sección) + mini-gráfico de
  tendencia (`Sparkline`, SVG en línea) + casos recientes con badges semánticos.
- Precarga cableada en 15+ formularios; `getSignatureDefaults()` para los que
  no tienen caso.

**Pendiente**
- Adoptar `useToast()` en las server actions (hoy solo `DeleteButton`).
- Formularios oficiales por pasos/pestañas (son muy largos).
- Buscador global más visible; modo oscuro; auditoría de accesibilidad.
- Precarga en los formularios de edición y en los ~5 restantes menores.

## 8. Privacidad de la IA — configuración

`AI_HEIGHTENED_MODE` en `src/lib/aiPrivacy.ts`:
- `"seudonimizado"` (actual): los casos delicados envían el relato
  seudonimizado, igual que el resto.
- `"estricto"`: los casos delicados no envían nada del relato.

---

**Más adelante**
11. CSP con nonce vía middleware (§1.5).
12. Dividir los archivos-Dios (§4.5).
13. Evaluar Postgres si crece el número de instituciones (§3.3).
