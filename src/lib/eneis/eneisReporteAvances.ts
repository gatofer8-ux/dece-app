import { db } from "@/lib/db";
import type { EneisFichaRow } from "./eneisSessions";
import { getMaterialLabel } from "./eneisMaterialesCatalog";

/**
 * "Reporte de avances" mensual por materia/docente ("INFORME DE ACTIVIDADES
 * Nº ..." con columnas FECHA/ACTIVIDAD/ESTADO/HERRAMIENTA/POBLACIÓN): se
 * calcula automáticamente a partir de las fichas de aplicación ENEIS ya
 * cargadas por los docentes ese mes (Fase 1), sin doble digitación.
 */

export interface ReporteAvanceRow {
  fecha: string | null;
  asignatura: string;
  tema: string;
  herramienta: string;
  poblacion: string;
}

export interface ReporteAvancesResult {
  rows: ReporteAvanceRow[];
  numero: number;
}

function fichaFecha(f: EneisFichaRow): string {
  return f.fecha_hasta || f.fecha_desde || f.created_at.slice(0, 10);
}

export function computeReporteAvances(institutionId: string, periodo: string): ReporteAvancesResult {
  const fichas = db
    .prepare(
      `SELECT * FROM eneis_fichas
       WHERE institution_id = ?
         AND substr(COALESCE(fecha_hasta, fecha_desde, created_at), 1, 7) = ?
       ORDER BY COALESCE(fecha_hasta, fecha_desde, created_at) ASC, created_at ASC`
    )
    .all(institutionId, periodo) as EneisFichaRow[];

  const rows: ReporteAvanceRow[] = fichas.map((f) => {
    const cursoLabel = [f.curso, f.paralelo ? `"${f.paralelo}"` : ""].filter(Boolean).join(" ");
    const herramienta = [getMaterialLabel(f.material_id), f.subnivel].filter(Boolean).join("\n");
    return {
      fecha: fichaFecha(f),
      asignatura: (f.asignatura || "").toUpperCase(),
      tema: f.nombre_ficha || "",
      herramienta: herramienta || "—",
      poblacion: [cursoLabel, `Estudiantes: ${f.num_estudiantes_capacitados ?? 0}`].filter(Boolean).join(" — "),
    };
  });

  const monthsWithFichas = (
    db
      .prepare(
        `SELECT DISTINCT substr(COALESCE(fecha_hasta, fecha_desde, created_at), 1, 7) AS mes
         FROM eneis_fichas WHERE institution_id = ?
         ORDER BY mes ASC`
      )
      .all(institutionId) as { mes: string }[]
  ).map((r) => r.mes);
  const idx = monthsWithFichas.indexOf(periodo);
  const numero = idx >= 0 ? idx + 1 : monthsWithFichas.length + 1;

  return { rows, numero };
}

const MESES = [
  "ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO",
  "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE",
];

/** "2026-03" -> "MARZO 2026" */
export function formatPeriodoReporte(periodo: string | null | undefined): string {
  const m = (periodo || "").match(/^(\d{4})-(\d{2})$/);
  if (!m) return periodo || "";
  const mes = MESES[Number(m[2]) - 1] || m[2];
  return `${mes} ${m[1]}`;
}
