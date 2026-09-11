import { requireRole, requireInstitutionId } from "@/lib/session";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import { computeReporteAvances, formatPeriodoReporte } from "@/lib/eneis/eneisReporteAvances";
import type { InstitutionRow } from "@/lib/types";

export default async function EneisReporteAvancesPage({ searchParams }: { searchParams: { mes?: string } }) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  const institution = db.prepare("SELECT * FROM institutions WHERE id = ?").get(institutionId) as InstitutionRow;

  const periodo = searchParams.mes && /^\d{4}-\d{2}$/.test(searchParams.mes) ? searchParams.mes : new Date().toISOString().slice(0, 7);
  const { rows, numero } = computeReporteAvances(institutionId, periodo);

  return (
    <div className="space-y-6">
      <PageHeader
        title="ENEIS — Reporte de avances por materia"
        description='Formato propio "INFORME DE ACTIVIDADES Nº ..." por materia/docente, calculado automáticamente a partir de las fichas de aplicación ENEIS ya cargadas. Sin doble digitación.'
      />

      <form method="get" className="card p-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="label text-xs">Mes y año</label>
          <input type="month" name="mes" defaultValue={periodo} className="input text-sm" />
        </div>
        <button type="submit" className="btn-secondary text-sm">Ver mes</button>
        {rows.length > 0 && (
          <a href={`/api/eneis/reporte-avances/export-word?mes=${periodo}`} className="btn-primary text-sm ml-auto">
            📥 Descargar Word
          </a>
        )}
      </form>

      <div className="card p-5">
        <p className="text-sm font-bold">INFORME DE ACTIVIDADES Nº {numero}</p>
        <p className="text-sm font-bold">INSTITUCIÓN EDUCATIVA: {institution.name.toUpperCase()}</p>
        <p className="text-sm font-bold">CODIGO AMIE: {institution.amie_code || "—"}</p>
        <p className="text-sm font-bold mb-4">MES Y AÑO: {formatPeriodoReporte(periodo)}</p>

        {rows.length === 0 ? (
          <p className="text-sm text-slate-500">
            Todavía no hay fichas de aplicación ENEIS cargadas para {formatPeriodoReporte(periodo)}.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table text-xs">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Actividad</th>
                  <th>Estado</th>
                  <th>Herramienta utilizada</th>
                  <th>Población objetivo alcanzada</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i}>
                    <td className="whitespace-nowrap">{r.fecha ? new Date(r.fecha).toLocaleDateString("es-EC") : "—"}</td>
                    <td>
                      <strong>{r.asignatura}.</strong>
                      <br />
                      Tema: {r.tema}
                    </td>
                    <td>Finalizado</td>
                    <td className="whitespace-pre-line">{r.herramienta}</td>
                    <td>{r.poblacion}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
