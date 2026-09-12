// Consultas del Plan Estratégico Bianual que TOCAN la base de datos.
//
// Se mantiene aparte de `strategicPlanBianual.ts` (módulo puro y seguro para el
// cliente) siguiendo la misma separación que ya existe entre
// `alertIdentification.ts` y `alertIdentificationSessions.ts`: el formulario es
// "use client" y no debe arrastrar `better-sqlite3` al bundle del navegador.
import { db } from "./db";
import { buildBianualContextForActionPlan } from "./strategicPlanBianual";
import type { StrategicBianualPlanRow } from "./types";

/** Plan Estratégico Bianual vigente de la institución (el más reciente). */
export function getLatestBianualPlan(
  institutionId: string
): StrategicBianualPlanRow | undefined {
  try {
    return db
      .prepare(
        `SELECT * FROM strategic_plans_bianual
         WHERE institution_id = ?
         ORDER BY created_at DESC
         LIMIT 1`
      )
      .get(institutionId) as StrategicBianualPlanRow | undefined;
  } catch (err) {
    // Base sin la migración 0029 aplicada todavía: el POA sigue funcionando
    // sin contexto bianual (retrocompatibilidad).
    console.error("[getLatestBianualPlan]", err);
    return undefined;
  }
}

/** Referencia mínima del plan bianual vinculado, para insignias y enlaces. */
export function getLinkedBianualPlanRef(
  institutionId: string
): { id: string; period_text: string } | null {
  const plan = getLatestBianualPlan(institutionId);
  if (!plan) return null;
  return { id: plan.id, period_text: plan.period_text };
}

/**
 * Contexto del plan bianual vigente para inyectarlo en el prompt de generación
 * autónoma del POA anual. Devuelve cadena vacía si la institución aún no tiene
 * un plan estratégico bianual registrado.
 */
export function getBianualContextForInstitution(institutionId: string): string {
  const plan = getLatestBianualPlan(institutionId);
  if (!plan) return "";
  return buildBianualContextForActionPlan(plan);
}
