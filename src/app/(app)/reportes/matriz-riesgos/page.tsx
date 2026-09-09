import Link from "next/link";
import { db } from "@/lib/db";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { PageHeader, formatDate } from "@/components/ui";
import { currentReportMonth, monthLabel } from "@/lib/riskMatrix";
import type { RiskMatrixEntryRow, CaseFileRow, StudentRow } from "@/lib/types";

export default async function MatrizRiesgosPage({ searchParams }: { searchParams: { mes?: string } }) {
  const session = await requireRole(["ADMIN", "DECE", "AUTORIDAD"]);
  const institutionId = requireInstitutionId(session);
  const mes = searchParams.mes && /^\d{4}-\d{2}$/.test(searchParams.mes) ? searchParams.mes : currentReportMonth();

  const entries = db
    .prepare(`SELECT * FROM case_risk_matrix_entries WHERE institution_id = ? AND report_month = ? ORDER BY created_at ASC`)
    .all(institutionId, mes) as RiskMatrixEntryRow[];

  const rows = entries.map((e) => {
    const caseFile = db.prepare("SELECT * FROM case_files WHERE id = ?").get(e.case_file_id) as CaseFileRow;
    const student = db.prepare("SELECT * FROM students WHERE id = ?").get(caseFile.student_id) as StudentRow;
    return { entry: e, caseFile, student };
  });

  return (
    <div>
      <PageHeader
        title="Matriz de Riesgos Psicosociales"
        description="Reporte mensual (formato MATRIZ RPS-EIS) que se envía a distrito/zona. Los casos se marcan desde cada expediente; aquí se revisa y exporta el mes seleccionado."
        action={
          <a href={`/api/reportes/matriz-riesgos?mes=${mes}`} className="btn-primary">
            ⬇ Exportar a Excel
          </a>
        }
      />

      <form className="card p-4 mb-6 flex flex-wrap items-end gap-3" method="get">
        <div>
          <label className="label text-xs">Mes de reporte</label>
          <input type="month" name="mes" defaultValue={mes} className="input" />
        </div>
        <button type="submit" className="btn-secondary">Ver</button>
        <Link href={`/reportes/matriz-riesgos?mes=${currentReportMonth()}`} className="text-xs text-brand-600 hover:underline ml-2">
          Mes actual
        </Link>
      </form>

      <h2 className="text-sm font-semibold text-slate-700 mb-3">Casos incluidos en {monthLabel(mes)}</h2>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-3">Caso</th>
              <th className="text-left px-4 py-3">Estudiante</th>
              <th className="text-left px-4 py-3">Tipo de caso</th>
              <th className="text-left px-4 py-3">Estado actual</th>
              <th className="text-left px-4 py-3">Fecha de conocimiento</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map(({ entry, caseFile, student }) => (
              <tr key={entry.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <Link href={`/casos/${caseFile.id}`} className="font-medium text-brand-700 hover:underline">{caseFile.code}</Link>
                </td>
                <td className="px-4 py-3">{student.full_name}</td>
                <td className="px-4 py-3 text-slate-600">{entry.case_type}</td>
                <td className="px-4 py-3 text-slate-600">{entry.case_current_status || "—"}</td>
                <td className="px-4 py-3 text-slate-600">{entry.knowledge_date ? formatDate(entry.knowledge_date) : "—"}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-400">Ningún caso marcado para este mes todavía. Desde el detalle de cada caso, en la sección "Matriz de Riesgos Psicosociales", puedes incluirlo.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
