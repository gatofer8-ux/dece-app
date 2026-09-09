// Se ejecuta una sola vez cuando arranca el servidor de Next.js (no en cada
// petición). Aquí se programa el barrido periódico de recordatorios de citas
// — como el contenedor de Railway queda corriendo de forma continua (no es
// una función serverless que se apaga entre peticiones), un cron dentro del
// mismo proceso es suficiente y no requiere ningún servicio externo.
//
// El import dinámico de la lógica real vive en un archivo aparte
// (instrumentation-node.ts) para que Next.js pueda excluirlo por completo de
// la compilación para Edge Runtime (node-cron y web-push usan módulos de
// Node que no existen en ese entorno).
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startReminderCron } = await import("./instrumentation-node");
    startReminderCron();
  }
}
