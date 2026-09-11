import { db } from "@/lib/db";
import type { EneisFichaRow } from "./eneisSessions";

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function mesLabelFromIso(iso: string): string {
  const m = /^(\d{4})-(\d{2})/.exec(iso);
  if (!m) return iso;
  const year = m[1];
  const monthIdx = Number(m[2]) - 1;
  return `${MESES[monthIdx] || m[2]} ${year}`;
}

export interface ActividadDocenteRow {
  area: string;
  nroPlanificaciones: number;
  mes: string;
  poblacion: string;
}

export interface CoberturaTabla {
  estudiantesAlcanzados: number;
  docentesAlcanzados: number;
  docentesOportunidades: number;
}

export interface InformeTablas {
  actividadesDocentes: ActividadDocenteRow[];
  cobertura: CoberturaTabla;
  totalFichas: number;
}

/**
 * Calcula, a partir de las fichas de aplicación ya cargadas en el sistema
 * (Fase 1), las dos tablas que hoy se compilan a mano en el informe
 * trimestral/semestral: "Actividades realizadas por docentes" (por
 * asignatura y mes) y "Cobertura" (estudiantes/docentes alcanzados).
 */
export function computeInformeTablas(institutionId: string, periodoDesde: string, periodoHasta: string): InformeTablas {
  const fichas = db
    .prepare(
      `SELECT * FROM eneis_fichas
       WHERE institution_id = ?
         AND COALESCE(fecha_hasta, fecha_desde, substr(created_at, 1, 10)) BETWEEN ? AND ?`
    )
    .all(institutionId, periodoDesde, periodoHasta) as EneisFichaRow[];

  type GroupAcc = { area: string; mes: string; mesKey: string; count: number; poblacion: Set<string> };
  const groups = new Map<string, GroupAcc>();

  for (const f of fichas) {
    const fecha = f.fecha_hasta || f.fecha_desde || f.created_at.slice(0, 10);
    const mesKey = fecha.slice(0, 7); // AAAA-MM, para ordenar cronológicamente
    const mes = mesLabelFromIso(fecha);
    const area = (f.asignatura || "SIN ESPECIFICAR").toUpperCase();
    const key = `${area}__${mesKey}`;
    if (!groups.has(key)) groups.set(key, { area, mes, mesKey, count: 0, poblacion: new Set() });
    const g = groups.get(key)!;
    g.count++;
    if (f.curso) g.poblacion.add(`${f.curso}${f.paralelo ? ` "${f.paralelo}"` : ""}`);
  }

  const actividadesDocentes: ActividadDocenteRow[] = Array.from(groups.values())
    .sort((a, b) => (a.mesKey < b.mesKey ? -1 : a.mesKey > b.mesKey ? 1 : a.area.localeCompare(b.area)))
    .map((g) => ({
      area: g.area,
      nroPlanificaciones: g.count,
      mes: g.mes,
      poblacion: Array.from(g.poblacion).join(", "),
    }));

  const estudiantesAlcanzados = fichas.reduce((a, f) => a + (f.num_estudiantes_capacitados || 0), 0);
  const docentesAlcanzados = new Set(fichas.map((f) => f.docente_nombre.trim().toUpperCase())).size;
  const docentesOportunidades = new Set(
    fichas.filter((f) => f.material_id?.startsWith("oportunidades")).map((f) => f.docente_nombre.trim().toUpperCase())
  ).size;

  return {
    actividadesDocentes,
    cobertura: { estudiantesAlcanzados, docentesAlcanzados, docentesOportunidades },
    totalFichas: fichas.length,
  };
}
