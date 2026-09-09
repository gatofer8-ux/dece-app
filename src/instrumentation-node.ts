// Lógica que solo debe cargarse en el runtime de Node.js (nunca en Edge) —
// separada de instrumentation.ts para que el bundler de Next.js pueda
// excluirla por completo de cualquier compilación para Edge Runtime.
import cron from "node-cron";
import { runReminderSweep } from "@/lib/reminders";
import { sweepSubscriptionsAndDelegations } from "@/lib/subscriptions";

export function startReminderCron() {
  // IMPORTANTE: este cron vive dentro del proceso. Solo funciona con 1 réplica
  // (railway.json fija numReplicas: 1). Si se escala, mover a un scheduler
  // externo o a un job con lock en base de datos.
  cron.schedule("*/15 * * * *", async () => {
    try {
      const result = await runReminderSweep();
      if (result.sent24h || result.sent1h) {
        console.log(`[recordatorios] enviados: ${result.sent24h} de 24h, ${result.sent1h} de 1h`);
      }
    } catch (err) {
      console.error("[recordatorios] Error en el barrido:", err);
    }

    try {
      const { suspended, delegations } = sweepSubscriptionsAndDelegations();
      if (suspended || delegations) {
        console.log(
          `[suscripciones] ${suspended} suspendidas por vencimiento, ${delegations} delegaciones desactivadas`
        );
      }
    } catch (err) {
      console.error("[suscripciones] Error en el barrido:", err);
    }
  });

  // Un barrido inmediato al arrancar, por si el proceso estuvo caído en el
  // momento en que vencía una suscripción.
  setTimeout(() => {
    try {
      sweepSubscriptionsAndDelegations();
    } catch (err) {
      console.error("[suscripciones] Error en el barrido inicial:", err);
    }
  }, 10_000);

  console.log("[cron] Barridos programados cada 15 minutos (recordatorios + suscripciones).");
}
