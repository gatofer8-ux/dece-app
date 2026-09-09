# Seguridad — Sistema de Gestión DECE

Este sistema almacena información sensible de **estudiantes menores de edad**
(casos de violencia, salud mental, riesgo psicosocial). Trátalo en consecuencia.

## ⚠️ Acción urgente pendiente (rotar credenciales expuestas)

El archivo `.env` estuvo con secretos reales en texto plano fuera de control de
versiones. Aunque ahora `.gitignore` lo excluye, **esas claves deben
considerarse comprometidas y hay que rotarlas**:

| Credencial | Dónde se rota | Luego |
|---|---|---|
| `GEMINI_API_KEY` | https://aistudio.google.com/apikey — borra la clave actual y crea otra | Actualiza la variable en el hosting |
| `VAPID_PRIVATE_KEY` / `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | `npx web-push generate-vapid-keys` | Actualiza ambas; los navegadores se re-suscriben solos |
| `NEXTAUTH_SECRET` | `openssl rand -base64 32` | Al cambiarlo, todas las sesiones activas se cierran (esperado) |

Después de rotar, **cambia las contraseñas de los usuarios SUPERADMIN**
(`gatofer8@gmail.com`, `marlon.jacome@dece.edu.ec`) desde el propio sistema:
`scripts/seed.js` las crea con contraseñas por defecto (`Admin123!`, `Dece123!`)
solo en el primer arranque de una base vacía.

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

Si `GEMINI_API_KEY` está configurada, el asistente de redacción envía a Google
Gemini el **nombre, documento y relato del caso**. Antes de activarlo en
producción:

1. Consentimiento institucional informado y documentado.
2. Revisar el acuerdo de tratamiento de datos (DPA) con Google.
3. Considerar seudonimizar el texto antes de enviarlo, o usar un modelo local.

Sin la clave, las funciones de IA se desactivan y el resto del sistema funciona
con normalidad.

## Reportar una vulnerabilidad

Escribe a la persona responsable del mantenimiento del sistema en la
institución. No abras un issue público con detalles explotables.
