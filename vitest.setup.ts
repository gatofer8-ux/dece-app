import os from "os";
import path from "path";

/**
 * `src/lib/db.ts` abre y migra su conexión SQLite de forma EAGER al ser
 * importado (top-level `export const db = createConnection()`), sin importar
 * si el test que lo trae de rebote realmente usa esa conexión (muchos módulos
 * bajo `src/lib` importan `./db` aunque el test les pase su propia base
 * `:memory:`). Sin esto, todos esos test files apuntan por defecto al mismo
 * archivo (`data/dece.db` bajo el cwd) y, al correr en paralelo, varios
 * workers de Vitest ejecutan el schema + las migraciones sobre el mismo
 * archivo WAL a la vez -> `SQLITE_BUSY: database is locked` intermitente.
 *
 * Vitest ejecuta los `setupFiles` una vez por cada test file (con el
 * aislamiento de módulos por defecto), así que basta con darle aquí una ruta
 * de archivo temporal única antes de que el test file importe nada: cada
 * archivo de test termina con su propia base real aislada, sin tener que
 * tocar cada test individualmente. Un `vi.stubEnv("DATABASE_FILE", ...)`
 * explícito dentro de un test (patrón ya usado en varios `*.test.ts`) sigue
 * pisando este valor sin problema.
 */
const uniqueName = `dece-test-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}.db`;
process.env.DATABASE_FILE = path.join(os.tmpdir(), uniqueName);
