// Lógica que solo debe cargarse en el runtime de Node.js (nunca en Edge) —
// separada de instrumentation.ts para que el bundler de Next.js pueda
// excluirla por completo de cualquier compilación para Edge Runtime.
import cron from "node-cron";
import { runReminderSweep } from "@/lib/reminders";

export function startReminderCron() {
  cron.schedule("*/15 * * * *", async () => {
    try {
      const result = await runReminderSweep();
      if (result.sent24h || result.sent1h) {
        console.log(`[recordatorios] enviados: ${result.sent24h} de 24h, ${result.sent1h} de 1h`);
      }
    } catch (err) {
      console.error("[recordatorios] Error en el barrido:", err);
    }
  });
  console.log("[recordatorios] Barrido programado cada 15 minutos.");
}
