# Sistema de Gestión DECE

Software a nivel de **distrito educativo** para el Departamento de
Consejería Estudiantil (DECE), diseñado siguiendo los cuatro ejes del
**Modelo de Gestión DECE** del Ministerio de Educación del Ecuador. El
sistema soporta **varias instituciones educativas** dentro del mismo
distrito: cada institución ve y gestiona únicamente su propia información
(estudiantes, casos, citas, etc.), y el distrito accede a reportes
agregados de todas las instituciones **sin ver el relato/descripción
confidencial de los casos individuales**.

1. **Gestión** — organización, documentación y planificación del DECE.
2. **Acompañamiento psicosocial y seguimiento** — detección, intervención,
   derivación y seguimiento de estudiantes.
3. **Protección integral** — abordaje de vulneración de derechos y riesgos
   psicosociales (prevención, detección, intervención, reparación).
4. **Convivencia** — redes de colaboración y resolución de conflictos.

Todo lo que registra el equipo DECE queda digitalizado y trazable, para que
elaborar los informes mensuales/trimestrales que exige el Ministerio sea
rápido: el módulo de **Reportes** genera los indicadores automáticamente y
los exporta a Excel con un clic.

> ⚠️ Este sistema maneja información sensible de estudiantes menores de edad
> (casos de riesgo psicosocial, violencia, salud mental, etc.). Está pensado
> para instalarse dentro de la institución educativa o en un servidor privado
> controlado por ella — **no** para exponerlo directamente al internet
> público sin las protecciones adicionales descritas en la sección
> [Seguridad](#seguridad-y-protección-de-datos).

---

## 1. Módulos incluidos

| Módulo | Qué hace | Roles con acceso |
|---|---|---|
| **Instituciones** | Alta de instituciones educativas del distrito, creación de su primer usuario administrador, e indicadores agregados por institución (sin relato confidencial). | Distrito |
| **Panel general** | Indicadores en tiempo real: casos activos, prioridad alta, alertas y derivaciones pendientes, citas del día. | Administrador, DECE |
| **Estudiantes** | Registro base del estudiantado y su representante; historial de casos y citas por estudiante. | Administrador, DECE |
| **Casos y fichas** | Núcleo del sistema: ficha de atención, bitácora cronológica de acciones, plan de acompañamiento/restitución de derechos, cambio de estado, ficha imprimible en PDF. | Administrador, DECE |
| **Alertas** | Los docentes reportan situaciones observadas; el equipo DECE las revisa y puede convertirlas en un caso formal. | Todos (docentes reportan, DECE/Admin revisan) |
| **Citas y agenda** | Agenda del equipo DECE, vinculada o no a un caso; control de asistencia. | Administrador, DECE |
| **Derivaciones** | Derivaciones internas y externas (MIES, Fiscalía, salud, Junta Cantonal, etc.), consentimiento informado y seguimiento del estado. | Administrador, DECE |
| **Promoción, prevención y convivencia** | Planificación y registro de actividades institucionales (charlas, talleres, campañas). | Todos (creación: Admin/DECE) |
| **Reportes** | Indicadores por período, listos para el informe mensual/trimestral; exportación a Excel (varias hojas: resumen, casos, derivaciones, actividades, citas). | Administrador, DECE, Autoridad (sin el relato confidencial) |
| **Usuarios** | Alta y baja de cuentas de acceso, restablecimiento de contraseñas. | Administrador |
| **Auditoría** | Bitácora de todas las acciones del sistema: quién hizo qué y cuándo. | Administrador |

## 2. Roles y confidencialidad

| Rol | Para quién es | Qué puede ver |
|---|---|---|
| **Distrito** | Coordinación distrital DECE | Alta de instituciones y de sus usuarios; reportes **agregados** de todas las instituciones del distrito. **No** ve el relato/descripción confidencial de ningún caso, ni gestiona estudiantes/casos directamente — cada institución opera de forma aislada. |
| **Administrador** | Coordinación DECE / TI de la institución | Acceso completo dentro de su institución, incluida la gestión de sus propios usuarios. |
| **DECE** | Psicólogo/a, trabajador/a social del DECE | Acceso completo a casos, fichas, derivaciones, citas y reportes de su institución. |
| **Autoridad** | Rector/a, Vicerrector/a | Paneles y reportes agregados de su institución (conteos, indicadores). **No** ve el relato/descripción confidencial de cada caso — solo el equipo DECE y la administración de esa institución acceden a esa información, en cumplimiento del principio de confidencialidad del modelo DECE. |
| **Docente** | Docente tutor | Puede reportar una alerta sobre un estudiante de su institución y gestionar su propia agenda con el DECE. No tiene acceso a las fichas ni al detalle de los casos. |

Cada institución educativa ve y gestiona **únicamente su propia
información** — un usuario de una institución nunca puede ver ni editar
datos de otra institución del distrito, ni siquiera conociendo su
identificador interno (el sistema valida la pertenencia a la institución
en cada consulta y en cada acción del servidor, no solo en la interfaz).

Todas las acciones (crear, editar, exportar, iniciar sesión, etc.) quedan
registradas en la **Auditoría**, visible para el Administrador (bitácora de
su institución) y para el Distrito (bitácora de todas las instituciones).

## 3. Cómo se guardan los datos

El sistema usa **SQLite** (un solo archivo de base de datos, `data/dece.db`)
en lugar de un servidor de base de datos aparte. Esto simplifica mucho la
instalación en una sola institución: no hay que configurar ni mantener un
servidor de PostgreSQL/MySQL. El archivo vive dentro de la carpeta `data/`
(o donde indique la variable `DATABASE_FILE`) y **debe respaldarse
periódicamente** (ver sección de respaldos más abajo).

## 4. Instalación

### Opción A — Instalación directa con Node.js (recomendada para empezar)

Requisitos: Node.js 20 o superior.

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno
cp .env.example .env
# Edita .env y cambia NEXTAUTH_SECRET por una clave aleatoria y larga,
# por ejemplo generada con: openssl rand -base64 32

# 3. Crear la base de datos con usuarios de demostración
npm run db:seed

# 4. Compilar para producción
npm run build

# 5. Iniciar el servidor
npm run start
```

El sistema queda disponible en `http://localhost:3000` (o el puerto que
definas). Para que el servidor siga corriendo aunque cierres la terminal,
usa un gestor de procesos como [pm2](https://pm2.keymetrics.io/):

```bash
npm install -g pm2
pm2 start npm --name dece-app -- run start
pm2 save
```

### Opción B — Docker

Requisitos: Docker y Docker Compose.

```bash
# 1. Configurar variables de entorno
cp .env.example .env
# Edita .env: define NEXTAUTH_SECRET y, si aplica, NEXTAUTH_URL

# 2. Construir e iniciar
docker compose up -d --build

# 3. Cargar los usuarios de demostración (solo la primera vez)
docker compose exec dece-app npm run db:seed
```

> Nota: el `Dockerfile` incluido no se pudo probar dentro de este entorno de
> generación (no tenía Docker disponible), pero sigue el patrón estándar de
> una app Next.js con un módulo nativo (`better-sqlite3`). Antes de usarlo en
> producción, constrúyelo y pruébalo en tu propio equipo/servidor.

### Usuarios de demostración (creados por `npm run db:seed`)

| Rol | Correo | Contraseña | Institución |
|---|---|---|---|
| Distrito | distrito@dece.edu.ec | Distrito123! | (todas) |
| Administrador | admin.demo1@institucion.edu.ec | Admin123! | Institución Educativa Demo Uno |
| DECE | dece.demo1@institucion.edu.ec | Dece123! | Institución Educativa Demo Uno |
| Autoridad | rectorado.demo1@institucion.edu.ec | Autoridad123! | Institución Educativa Demo Uno |
| Docente | docente.demo1@institucion.edu.ec | Docente123! | Institución Educativa Demo Uno |
| Administrador | admin.demo2@institucion.edu.ec | Admin123! | Institución Educativa Demo Dos |
| DECE | dece.demo2@institucion.edu.ec | Dece123! | Institución Educativa Demo Dos |

**Cambia estas contraseñas (o crea usuarios nuevos y desactiva estos) antes
de usar el sistema con datos reales.** El seed crea dos instituciones de
ejemplo (para comprobar que cada una ve solo lo suyo) con 3 estudiantes,
1 caso y 1 actividad de ejemplo cada una, con datos ficticios; puedes
editarlos o eliminarlos desde la aplicación.

## 5. Primeros pasos recomendados

1. Inicia sesión como **Distrito** (`distrito@dece.edu.ec`) y ve a
   *Instituciones* → *+ Nueva institución* para registrar tu institución
   real. Desde la ficha de esa institución, crea su primer usuario
   **Administrador** con el correo y contraseña reales que tú definas.
2. Cierra sesión y entra como ese **Administrador** para crear las cuentas
   reales del resto del personal (Menú *Usuarios*), asignando el rol
   correcto a cada persona.
3. Desactiva o elimina las instituciones y cuentas de demostración
   (`Institución Educativa Demo Uno/Dos` y sus usuarios) una vez que tu
   institución real esté configurada.
4. Registra el estudiantado real en el módulo **Estudiantes** (puedes
   registrar uno por uno; si necesitas importación masiva desde Excel,
   ver la sección [Extensiones futuras](#7-extensiones-futuras)).
5. A partir de ahí, cada caso, cita, derivación o actividad que registres
   queda disponible automáticamente en **Reportes** para tus informes.

## 6. Seguridad y protección de datos

- Las contraseñas se guardan con hash `bcrypt` (nunca en texto plano).
- Las sesiones expiran a las 8 horas de inactividad.
- El acceso a cada módulo está controlado por rol tanto en la interfaz
  como en el servidor (no basta con ocultar un botón: cada acción se
  valida de nuevo en el backend).
- El relato/descripción confidencial de cada caso solo es visible para
  los roles DECE y Administrador.
- Toda acción queda registrada en la bitácora de auditoría.
- Recomendaciones adicionales para producción:
  - Instala el sistema en un servidor dentro de la red de la institución,
    o detrás de un proxy con HTTPS si necesitas acceso remoto.
  - Define un `NEXTAUTH_SECRET` propio y aleatorio (no uses el de ejemplo).
  - Ejecuta `npm audit` periódicamente y actualiza dependencias; al momento
    de generar este proyecto, `npm audit` reportó algunas vulnerabilidades
    en Next.js que solo se corrigen con una actualización mayor (Next 16).
    Se optó por mantener Next 14 (más estable con las librerías usadas) dado
    que el sistema está pensado para uso interno y no expuesto públicamente;
    evalúa la actualización según tu contexto de despliegue.
  - Haz respaldos periódicos de la carpeta `data/` (o el volumen de Docker),
    que contiene toda la información de los estudiantes.
  - Restringe quién tiene acceso físico/de red al servidor.

## 7. Extensiones futuras

Este sistema cubre el flujo completo del Modelo de Gestión DECE (casos,
bitácora, citas, derivaciones, promoción/prevención/convivencia, reportes,
usuarios y auditoría) como una base sólida y funcional. Algunas mejoras
naturales para siguientes iteraciones, según lo que priorice la institución:

- Importación masiva de estudiantes desde Excel (actualmente el registro
  es individual desde el formulario).
- Adjuntar archivos (documentos escaneados, consentimientos firmados) a un
  caso o derivación — el modelo de datos ya contempla una tabla de
  adjuntos (`attachments`), lista para conectar la subida de archivos.
- Notificaciones automáticas (correo/SMS) de citas próximas o derivaciones
  sin respuesta.
- Panel específico para representantes/estudiantes (portal externo).
- Exportación de la ficha individual también en PDF nativo (hoy se genera
  una vista imprimible desde el navegador — botón "Imprimir ficha" —, que
  cualquier navegador puede guardar como PDF).
- Generación de documentos en los formatos oficiales exactos usados por tu
  institución (fichas, informes, actas), a partir de las plantillas reales.
- Si el distrito crece mucho (decenas de instituciones con uso simultáneo
  intenso), migrar de SQLite a una base de datos cliente-servidor
  (PostgreSQL) — el modelo de datos ya está diseñado por institución, lo
  que facilita esa migración cuando sea necesaria.

## 8. Estructura del proyecto

```
dece-app/
├── db/schema.sql          # Esquema completo de la base de datos (SQLite)
├── scripts/seed.ts        # Datos de demostración
├── src/
│   ├── app/
│   │   ├── login/                 # Pantalla de acceso
│   │   ├── (app)/                 # Todas las páginas internas (con menú)
│   │   │   ├── instituciones/     # Alta y gestión de instituciones (rol Distrito)
│   │   │   ├── dashboard/
│   │   │   ├── estudiantes/
│   │   │   ├── casos/
│   │   │   ├── alertas/
│   │   │   ├── citas/
│   │   │   ├── derivaciones/
│   │   │   ├── actividades/
│   │   │   ├── reportes/
│   │   │   ├── usuarios/
│   │   │   └── auditoria/
│   │   └── api/
│   │       ├── auth/[...nextauth]/  # Autenticación
│   │       └── reportes/export/     # Exportación a Excel
│   ├── components/         # Componentes de interfaz reutilizables
│   └── lib/                 # Acceso a datos, sesión, permisos, auditoría
├── Dockerfile / docker-compose.yml
└── .env.example
```

## 9. Soporte técnico

Este software fue generado a la medida para tu institución. Si tu equipo de
TI necesita orientación adicional para el despliegue, personalización de
campos, o conectar un servidor de correo/SMS para notificaciones, esas son
extensiones que se pueden construir sobre esta misma base.
