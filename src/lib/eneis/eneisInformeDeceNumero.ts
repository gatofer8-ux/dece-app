import { db } from "@/lib/db";

/** Correlativo del informe DECE dentro de la institución, por orden cronológico de periodo. */
export function getEneisInformeDeceNumero(institutionId: string, informeId: string): number {
  const rows = db
    .prepare("SELECT id FROM eneis_informes_dece WHERE institution_id = ? ORDER BY periodo ASC, created_at ASC")
    .all(institutionId) as { id: string }[];
  const idx = rows.findIndex((r) => r.id === informeId);
  return idx >= 0 ? idx + 1 : rows.length + 1;
}
