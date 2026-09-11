import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { computeInformeTablas, type InformeTablas } from "./eneisInformeCompute";

export type EneisInformeTipo = "TRIMESTRAL" | "SEMESTRAL";

export interface EneisInformeRow {
  id: string;
  institution_id: string;
  tipo: EneisInformeTipo;
  titulo: string;
  numero_informe: string | null;
  fecha_informe: string | null;
  responsable_nombre: string | null;
  responsable_contacto: string | null;
  responsable_cargo: string | null;
  dirigido_nombre: string | null;
  dirigido_contacto: string | null;
  dirigido_cargo: string | null;
  periodo_desde: string;
  periodo_hasta: string;
  padres_alcanzados: number | null;
  desarrollo_resumen: string | null;
  actividades_dece: string | null;
  buenas_practicas: string | null;
  nudos_criticos: string | null;
  conclusiones: string | null;
  recomendaciones: string | null;
  tablas_json: string;
  created_by_id: string | null;
  created_at: string;
  updated_at: string;
}

export function listInformes(institutionId: string): EneisInformeRow[] {
  return db
    .prepare("SELECT * FROM eneis_informes WHERE institution_id = ? ORDER BY created_at DESC")
    .all(institutionId) as EneisInformeRow[];
}

export function getInforme(id: string, institutionId: string): EneisInformeRow | null {
  const row = db
    .prepare("SELECT * FROM eneis_informes WHERE id = ? AND institution_id = ?")
    .get(id, institutionId) as EneisInformeRow | undefined;
  return row || null;
}

export function parseTablas(json: string): InformeTablas {
  try {
    return JSON.parse(json);
  } catch {
    return { actividadesDocentes: [], cobertura: { estudiantesAlcanzados: 0, docentesAlcanzados: 0, docentesOportunidades: 0 }, totalFichas: 0 };
  }
}

export function createInforme(input: {
  institutionId: string;
  tipo: EneisInformeTipo;
  titulo: string;
  numeroInforme: string | null;
  fechaInforme: string | null;
  responsableNombre: string | null;
  responsableContacto: string | null;
  responsableCargo: string | null;
  dirigidoNombre: string | null;
  dirigidoContacto: string | null;
  dirigidoCargo: string | null;
  periodoDesde: string;
  periodoHasta: string;
  padresAlcanzados: number | null;
  desarrolloResumen: string | null;
  actividadesDece: string | null;
  buenasPracticas: string | null;
  nudosCriticos: string | null;
  conclusiones: string | null;
  recomendaciones: string | null;
  createdBy: string | null;
}): string {
  const id = randomUUID();
  const tablas = computeInformeTablas(input.institutionId, input.periodoDesde, input.periodoHasta);
  db.prepare(
    `INSERT INTO eneis_informes (
      id, institution_id, tipo, titulo, numero_informe, fecha_informe,
      responsable_nombre, responsable_contacto, responsable_cargo,
      dirigido_nombre, dirigido_contacto, dirigido_cargo,
      periodo_desde, periodo_hasta, padres_alcanzados,
      desarrollo_resumen, actividades_dece, buenas_practicas, nudos_criticos, conclusiones, recomendaciones,
      tablas_json, created_by_id
    ) VALUES (
      @id, @institutionId, @tipo, @titulo, @numeroInforme, @fechaInforme,
      @responsableNombre, @responsableContacto, @responsableCargo,
      @dirigidoNombre, @dirigidoContacto, @dirigidoCargo,
      @periodoDesde, @periodoHasta, @padresAlcanzados,
      @desarrolloResumen, @actividadesDece, @buenasPracticas, @nudosCriticos, @conclusiones, @recomendaciones,
      @tablasJson, @createdBy
    )`
  ).run({ id, tablasJson: JSON.stringify(tablas), ...input });
  return id;
}

export function deleteInforme(id: string, institutionId: string): void {
  db.prepare("DELETE FROM eneis_informes WHERE id = ? AND institution_id = ?").run(id, institutionId);
}

/** Recalcula las tablas con las fichas actuales (por si se cargaron más después de generar el informe). */
export function refreshInformeTablas(id: string, institutionId: string): void {
  const informe = getInforme(id, institutionId);
  if (!informe) return;
  const tablas = computeInformeTablas(institutionId, informe.periodo_desde, informe.periodo_hasta);
  db.prepare("UPDATE eneis_informes SET tablas_json = ?, updated_at = datetime('now') WHERE id = ? AND institution_id = ?").run(
    JSON.stringify(tablas),
    id,
    institutionId
  );
}
