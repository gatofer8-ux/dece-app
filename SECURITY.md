# Seguridad — Sistema de Gestión DECE

Este sistema almacena información sensible de **estudiantes menores de edad**
(casos de violencia, salud mental, riesgo psicosocial). Trátalo en consecuencia.

## ⚠️ Estado de las credenciales

El archivo `.env` estuvo con secretos reales en texto plano fuera de control de
versiones. `.gitignore` ya lo excluye.

| Credencial | Estado | Qué falta |
|---|---|---|
| `NEXTAUTH_SECRET` | ✅ **Rotada** en `.env` local | Copiar el nuevo valor a la variable del hosting (Railway/Render) |
| `VAPID_PRIVATE_KEY` / `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | ✅ **Rotadas** en `.env` local | Copiar los nuevos valores al hosting. Los navegadores se re-suscriben solos |
| `GEMINI_API_KEY` | ✅ **Rotada** (2026-09-09); la clave vieja se eliminó en Google AI Studio | Copiar el nuevo valor a la variable del hosting |

**Único paso que falta: copiar los tres valores nuevos de `.env` a las
variables de entorno de tu hosting (Railway/Render) y redesplegar.**

Al desplegar con el nuevo `NEXTAUTH_SECRET`, todas las sesiones activas se
cierran (esperado).

### Cambiar las contraseñas de los SUPERADMIN

`scripts/seed.js` crea los usuarios con contraseñas por defecto (`Admin123!`,
`Dece123!`) solo en el primer arranque de una base vacía, y **ya no las
sobreescribe** en despliegues posteriores. Para ponerles una contraseña fuerte:

```
node scripts/set_password.js --superadmins
```

(en producción: en la consola del contenedor, con `DATABASE_FILE=/data/dece.db`).
El script imprime las nuevas contraseñas una sola vez — guárdalas. También
puedes hacerlo desde el panel **Superadmin → Resetear contraseña** dentro de la
aplicación.

## Modelo de despliegue

Según el README, el sistema está pensado para instalarse **dentro de la
institución o en un servidor privado**, no expuesto directamente a internet sin
protecciones adicionales. Como mínimo en producción:

- HTTPS obligatorio (terminación TLS en el proxy / plataforma).
- `NEXTAUTH_SECRET` inyectado por el entorno (la app **no arranca sin él** —
  ver `src/lib/env.ts`).
- Copia de seguridad periódica del volumen `/data` (cifrada, fuera del servidor).
- Acceso restringido por IP / VPN si es viable.

## Cabeceras de seguridad

Configuradas en `next.config.js`: HSTS, `X-Frame-Options: DENY`,
`X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`.
Pendiente: una CSP con nonce (requiere middleware; ver `REVIEW.md`).

## Aislamiento multi-institución

Cada rol salvo `SUPERADMIN` y `DISTRITO` está limitado a su `institution_id`.
El filtro se aplica en cada consulta a mano — un olvido es una fuga entre
instituciones. La descarga del respaldo íntegro (`/api/backup/download`) quedó
restringida a `SUPERADMIN` porque el archivo contiene datos de todas las
instituciones. Ver `REVIEW.md` → "Aislamiento multi-tenant".

## Datos enviados a terceros (IA)

El asistente de redacción usa la API de Google Gemini. Protecciones aplicadas
(`src/lib/aiPrivacy.ts`):

1. **Seudonimización.** Antes de enviar cualquier texto a Google, se reemplazan
   nombre y apellidos del estudiante, del representante, del padre y de la
   madre por su rol (`[estudiante]`, `[representante]`, …), y se barren cédulas,
   RUC, teléfonos y correos. El barrido genérico se aplica además como última
   barrera en `src/lib/ai.ts` a **todo** prompt saliente.
2. **Confidencialidad reforzada.** Para los tipos de caso
   `VIOLENCIA_SEXUAL`, `SALUD_MENTAL` y `CONSUMO_SUSTANCIAS` (lista editable en
   `HEIGHTENED_CONFIDENTIALITY_RISK_TYPES`) **no se envía el relato ni los
   documentos del caso** — solo código, tipo de riesgo y estado. La interfaz lo
   avisa.
3. **Minimización.** El nombre real nunca se pasa como campo a los prompts; se
   usa "el/la estudiante".

**Riesgo residual:** si el profesional DECE escribió un nombre a mano dentro de
un campo de texto libre que el filtro no reconoce (p. ej. el de la abuela), ese
nombre puede pasar. La interfaz recuerda revisar el borrador antes de guardar.

**Pendiente / recomendado:**

- **Activar facturación** en el proyecto de Google Cloud de la clave: la API
  pasa a "nivel de pago" y Google deja de poder entrenar con los datos o
  revisarlos con personas. Es el cambio de mayor impacto y cuesta ~$0.
- Documentar la decisión (consentimiento institucional, base legal) con quien
  lleve la parte legal.

Sin `GEMINI_API_KEY`, las funciones de IA se desactivan y el resto del sistema
funciona con normalidad.

## Reportar una vulnerabilidad

Escribe a la persona responsable del mantenimiento del sistema en la
institución. No abras un issue público con detalles explotables.
