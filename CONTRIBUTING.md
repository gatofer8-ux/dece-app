# Guía de desarrollo

## Puesta en marcha

```bash
npm install
cp .env.example .env      # completa NEXTAUTH_SECRET (openssl rand -base64 32)
npm run db:seed           # crea el esquema + usuario superadmin de arranque
npm run dev               # http://localhost:3000
```

Datos de demostración (instituciones y estudiantes ficticios):

```bash
npm run db:seed:demo
```

## Antes de cada commit / PR

```bash
npm run check     # typecheck + lint + tests
```

CI ejecuta lo mismo más `npm run build` (ver `.github/workflows/ci.yml`).

## Flujo de trabajo

- Trabaja en una rama, no en `main`.
- Un cambio = un propósito. Los commits de este repositorio usan prefijos
  `feat:`, `fix:`, `refactor:`, `chore:`, `docs:`.
- Cambios de esquema: un archivo en `migrations/` (ver `migrations/README.md`).
  Nunca añadas más `safeAddColumn` a `db.ts`.

## Convenciones de código

- **Server actions** (`"use server"`): siempre `requireRole([...])` +
  `requireInstitutionId(session)` + verificación de pertenencia del recurso a la
  institución antes de tocar la base. Consultas **parametrizadas** siempre.
- Lee `FormData` con los helpers de `src/lib/formData.ts`, no reimplementes
  `str`/`int` en cada archivo. Para formularios grandes, valida con
  `parseForm(fd, zodSchema)`.
- No introduzcas `as any` sobre `session.user`; si falta un campo, típalo en
  `src/lib/next-auth.d.ts`.
- No dejes `catch {}` vacíos: registra el error.

## Estructura

```
src/
  app/(app)/        rutas autenticadas (layout exige sesión)
  app/api/          route handlers (export .docx/.pdf, chat, push, backup)
  lib/              lógica de dominio y acceso a datos (db.ts, auth, permissions)
  components/       componentes React compartidos
migrations/         migraciones SQL incrementales
scripts/            seed y utilidades de build de plantillas
.archive/           material histórico de un solo uso (ignorado por git)
```
